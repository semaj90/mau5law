#!/usr/bin/env python3
"""
chr97_image_processor.py

CHR-ROM97 Image Topology Service (production-ready skeleton)

Responsibilities:
- Run YOLO (and optional SAM) over a legal document image
- Create segment-level text + visual embeddings
- Cluster segments and build a 4D manifold + quant4
- Persist to Qdrant, Postgres, MinIO
- Export `image_topology.json` for CH-ROM97 cartridge builder
"""

import os
import json
import numpy as np
import cv2
import requests
from typing import Dict, Any, List

from ultralytics import YOLO
from segment_anything import SamPredictor, sam_model_registry
from sklearn.cluster import DBSCAN

import qdrant_client
from qdrant_client.models import PointStruct, VectorParams, Distance
import psycopg2
from psycopg2.extras import execute_values
import boto3

from manifold_demo import quantize_4d

# ----------------- Ollama Embeddings -----------------

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "embeddinggemma:latest")

def ollama_embed(text: str) -> np.ndarray:
    """
    Call Ollama /api/embeddings and return a float32 numpy vector.
    Model is selected via OLLAMA_EMBED_MODEL env.
    """
    resp = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": OLLAMA_EMBED_MODEL, "prompt": text},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    if "embedding" in data:
        vec = data["embedding"]
    elif "embeddings" in data:
        vec = data["embeddings"][0]
    else:
        raise RuntimeError(f"Unexpected Ollama embeddings response: {data.keys()}")

    return np.array(vec, dtype=np.float32)

# ----------------- Main Processor -----------------

class CHR97ImageProcessor:
    """
    CHR-ROM97 Image Topology Service

    External dependencies:
    - YOLO weights: yolov8n.pt
    - Optional SAM checkpoint: sam_vit_b_01ec64.pth
    - Qdrant: host/port from env
    - Postgres: host/db/user/password from env
    - MinIO: endpoint/access/secret from env
    """

    def __init__(self) -> None:
        # Config
        self.qdrant_host = os.getenv("QDRANT_HOST", "localhost")
        self.qdrant_port = int(os.getenv("QDRANT_PORT", "6333"))

        self.pg_conn = psycopg2.connect(
            host=os.getenv("PG_HOST", "localhost"),
            database=os.getenv("PG_DB", "legal_ai_db"),
            user=os.getenv("PG_USER", "postgres"),
            password=os.getenv("PG_PASSWORD", "password"),
        )

        self.minio = boto3.client(
            "s3",
            endpoint_url=os.getenv("MINIO_URL", "http://localhost:9000"),
            aws_access_key_id=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
            aws_secret_access_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
        )
        self.topology_bucket = os.getenv(
            "MINIO_TOPOLOGY_BUCKET", "minio_topology_cluster_bucket"
        )

        # YOLO
        self.yolo = YOLO("yolov8n.pt")

        # SAM (optional)
        try:
            sam = sam_model_registry["vit_b"](checkpoint="sam_vit_b_01ec64.pth")
            self.sam = SamPredictor(sam)
            print("✅ SAM initialized")
        except Exception as e:
            self.sam = None
            print(f"⚠️ SAM unavailable ({e}); using full-image segment fallback")

        # Qdrant: 768-d text embeddings
        self.qdrant = qdrant_client.QdrantClient(
            host=self.qdrant_host,
            port=self.qdrant_port,
        )
        self.qdrant.recreate_collection(
            collection_name="legal_images",
            vectors_config=VectorParams(size=768, distance=Distance.COSINE),
        )

        # MinIO bucket
        try:
            self.minio.create_bucket(Bucket=self.topology_bucket)
        except Exception:
            pass  # bucket likely exists already

    # ---------- Public API ----------

    def process_legal_image(self, image_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main pipeline entrypoint.

        Steps:
        1. YOLO detection
        2. SAM segmentation (or full-image fallback)
        3. Generate per-segment mock text (or OCR later)
        4. Compute multimodal embeddings (Ollama + visual)
        5. Build topology (DBSCAN + 4D manifold + quant4)
        6. Store vectors in Qdrant + Postgres
        7. Store cluster summaries in MinIO
        8. Write image_topology.json to disk

        Returns the topology dict.
        """
        print(f"🔍 Processing legal image: {image_path}")

        image = cv2.imread(image_path)
        if image is None:
            raise FileNotFoundError(f"Could not read image: {image_path}")
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        detections = self._run_yolo(image_rgb)
        segments = self._run_sam_or_fallback(image_rgb, detections)
        segment_texts = self._mock_segment_texts(segments)

        embeddings = self._generate_multimodal_embeddings(
            segment_texts, segments, image_rgb
        )
        topology = self._create_topology_structure(embeddings, segments, metadata)

        self._store_in_vector_databases(embeddings, topology, metadata)
        summaries = self._generate_topology_summaries(topology, metadata)
        self._store_summaries_in_minio(summaries, metadata)

        with open("image_topology.json", "w", encoding="utf-8") as f:
            json.dump(topology, f, indent=2)
        print("💾 Exported image topology → image_topology.json")

        return topology

    # ---------- Internals (YOLO, SAM, embeddings, etc.) ----------

    def _run_yolo(self, image_rgb) -> List[Dict[str, Any]]:
        results = self.yolo(image_rgb)
        detections = []
        for result in results:
            for box in result.boxes:
                detections.append({
                    "bbox": box.xyxy[0].cpu().numpy().tolist(),
                    "confidence": box.conf[0].cpu().item(),
                    "class": int(box.cls[0].cpu().item()),
                })
        return detections

    def _run_sam_or_fallback(self, image_rgb, detections) -> List[Dict[str, Any]]:
        if self.sam is None:
            # Fallback: treat whole image as one segment
            return [{"mask": np.ones(image_rgb.shape[:2], dtype=bool), "bbox": [0, 0, image_rgb.shape[1], image_rgb.shape[0]]}]

        self.sam.set_image(image_rgb)
        segments = []
        for det in detections:
            masks, _, _ = self.sam.predict(box=np.array(det["bbox"]))
            for mask in masks:
                segments.append({"mask": mask, "bbox": det["bbox"]})
        return segments

    def _mock_segment_texts(self, segments) -> List[str]:
        # Mock text generation - replace with OCR later
        return [f"Segment {i}: Legal text content here..." for i in range(len(segments))]

    def _generate_multimodal_embeddings(self, texts, segments, image_rgb):
        embeddings = []
        for text, segment in zip(texts, segments):
            # Text embedding via Ollama
            text_vec = ollama_embed(text)

            # Visual features (simple histogram)
            mask = segment["mask"]
            masked_img = image_rgb * mask[:, :, np.newaxis]
            hist = cv2.calcHist([masked_img], [0, 1, 2], mask.astype(np.uint8), [8, 8, 8], [0, 256, 0, 256, 0, 256])
            visual_vec = hist.flatten().astype(np.float32)
            visual_vec /= np.linalg.norm(visual_vec) + 1e-9  # Normalize

            # Combine (simple concat for now)
            combined = np.concatenate([text_vec, visual_vec])
            embeddings.append({
                "text": text,
                "text_embedding": text_vec,
                "visual_features": visual_vec,
                "combined_embedding": combined,
            })
        return embeddings

    def _create_topology_structure(self, embeddings, segments, metadata):
        # Extract embeddings for clustering
        vecs = np.array([emb["combined_embedding"] for emb in embeddings])

        # DBSCAN clustering
        dbscan = DBSCAN(eps=0.5, min_samples=2)
        clusters = dbscan.fit_predict(vecs)

        # Build 4D manifold from cluster centroids
        unique_clusters = np.unique(clusters[clusters != -1])
        centroids = []
        for cluster_id in unique_clusters:
            cluster_vecs = vecs[clusters == cluster_id]
            centroid = cluster_vecs.mean(axis=0)
            centroids.append(centroid)

        centroids = np.array(centroids)
        if len(centroids) < 4:
            # Pad with zeros if needed
            centroids = np.pad(centroids, ((0, 4 - len(centroids)), (0, 0)), mode='constant')

        # Simple PCA to 4D
        from sklearn.decomposition import PCA
        pca = PCA(n_components=4)
        topo_4d = pca.fit_transform(centroids)

        # Quantize
        quantized_topology = quantize_4d(topo_4d)

        return {
            "embeddings": embeddings,
            "clusters": clusters.tolist(),
            "topology_4d": topo_4d.tolist(),
            "quantized_topology": quantized_topology.tolist(),
            "segments": segments,
            "metadata": metadata,
        }

    def _store_in_vector_databases(self, embeddings, topology, metadata):
        # Qdrant
        points = []
        for i, emb in enumerate(embeddings):
            points.append(PointStruct(
                id=i,
                vector=emb["text_embedding"].tolist(),
                payload={
                    "text": emb["text"],
                    "cluster": topology["clusters"][i],
                    "metadata": metadata,
                }
            ))
        self.qdrant.upsert(collection_name="legal_images", points=points)

        # Postgres
        with self.pg_conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS legal_image_texts (
                    id SERIAL PRIMARY KEY,
                    text TEXT,
                    cluster_id INTEGER,
                    case_id TEXT,
                    embedding VECTOR(768)
                );
            """)
            values = [
                (emb["text"], topology["clusters"][i], metadata.get("case_id"), emb["text_embedding"].tolist())
                for i, emb in enumerate(embeddings)
            ]
            execute_values(cur, "INSERT INTO legal_image_texts (text, embedding, cluster_id, case_id) VALUES %s", values)
        self.pg_conn.commit()

    def _generate_topology_summaries(self, topology, metadata):
        summaries = {}
        for cluster_id in set(topology["clusters"]):
            if cluster_id == -1:
                continue
            cluster_texts = [emb["text"] for i, emb in enumerate(topology["embeddings"]) if topology["clusters"][i] == cluster_id]
            summaries[f"cluster_{cluster_id}"] = {
                "count": len(cluster_texts),
                "sample_texts": cluster_texts[:3],
                "metadata": metadata,
            }
        return summaries

    def _store_summaries_in_minio(self, summaries, metadata):
        for cluster_key, summary in summaries.items():
            key = f"topology_summary_{cluster_key}_{metadata.get('case_id', 'unknown')}.json"
            self.minio.put_object(
                Bucket=self.topology_bucket,
                Key=key,
                Body=json.dumps(summary),
                ContentType="application/json",
            )

# ----------------- CLI entry -----------------

def main() -> None:
    processor = CHR97ImageProcessor()

    metadata = {
        "case_id": os.getenv("CASE_ID", "LEGAL-IMG-001"),
        "document_type": os.getenv("DOC_TYPE", "contract"),
        "confidentiality": os.getenv("DOC_CONFIDENTIALITY", "privileged"),
    }

    print("✅ CH-ROM97 Image Processing Pipeline (Ollama) initialized")
    # Example usage (replace with argparse if you want a real CLI)
    # processor.process_legal_image("sample_legal_document.jpg", metadata)

if __name__ == "__main__":
    main()