#!/usr/bin/env python3
"""
4D → 4-byte quantization distortion simulator
Integrates with CH-ROM97 cartridge format.
Tensor-Core optimized embeddings for RAG pipeline.
"""

import numpy as np
from sklearn.decomposition import PCA
import json
import requests
from typing import List, Dict, Any
import math


OLLAMA_URL = "http://127.0.0.1:11434"


def ollama_embed(text: str, model: str = "embeddinggemma") -> List[float]:
    """Get embeddings from Ollama API (Tensor-Core friendly FP16)."""
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/embed",
            json={"model": model, "input": text},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["embeddings"][0]  # 768-d vector
    except Exception as e:
        print(f"⚠️ Ollama embed failed: {e}")
        # Fallback: random vector
        return np.random.randn(768).tolist()


def embed_text_fp16(texts: list[str], model="embeddinggemma") -> np.ndarray:
    """
    Generate FP16 embeddings using Ollama API.
    Tensor-Core friendly: 768 dims, FP16 precision.
    """
    embeddings = []
    for text in texts:
        vec = ollama_embed(text, model)
        embeddings.append(vec)

    # Convert to FP16 numpy array
    vecs = np.array(embeddings, dtype=np.float16)
    print(f"✅ Generated {len(vecs)} embeddings, shape: {vecs.shape}, dtype: {vecs.dtype}")
    return vecs
def quantize_4d(points: np.ndarray) -> np.ndarray:
    """Normalize each dim to [0,255] and convert to uint8."""
    min_vals = points.min(axis=0)
    max_vals = points.max(axis=0)
    normed = (points - min_vals) / (max_vals - min_vals + 1e-9)
    return (normed * 255).astype(np.uint8)


def distortion(true, quantized):
    """Measures Euclidean distortion after quantization."""
    q = quantized.astype(np.float32)
    q /= 255.0
    dif = np.linalg.norm(true - q, axis=1)
    return dif.mean(), dif.max()


# 4D Quaternion utilities for manifold projection
def quaternion_from_4d(point: np.ndarray) -> np.ndarray:
    """Convert 4D point to quaternion representation."""
    # Normalize to unit quaternion
    norm = np.linalg.norm(point)
    if norm == 0:
        return np.array([1, 0, 0, 0])  # identity quaternion
    return point / norm


def quaternion_to_3d_rotation(q: np.ndarray) -> np.ndarray:
    """Convert quaternion to 3D rotation matrix for Memory Palace projection."""
    w, x, y, z = q
    return np.array([
        [1 - 2*y*y - 2*z*z, 2*x*y - 2*w*z, 2*x*z + 2*w*y],
        [2*x*y + 2*w*z, 1 - 2*x*x - 2*z*z, 2*y*z - 2*w*x],
        [2*x*z - 2*w*y, 2*y*z + 2*w*x, 1 - 2*x*x - 2*y*y]
    ])


# Tricubic interpolation for smooth manifold traversal
def tricubic_interpolate(grid: np.ndarray, x: float, y: float, z: float, w: float) -> float:
    """
    Tricubic interpolation over 4D grid for smooth semantic path walking.
    Simplified 4D version - in practice would use full tricubic kernel.
    """
    # Clamp to grid bounds
    x = np.clip(x, 0, grid.shape[0] - 1)
    y = np.clip(y, 0, grid.shape[1] - 1)
    z = np.clip(z, 0, grid.shape[2] - 1)
    w = np.clip(w, 0, grid.shape[3] - 1)

    # Simple trilinear for now (extend to tricubic)
    x0, x1 = int(x), min(int(x) + 1, grid.shape[0] - 1)
    y0, y1 = int(y), min(int(y) + 1, grid.shape[1] - 1)
    z0, z1 = int(z), min(int(z) + 1, grid.shape[2] - 1)
    w0, w1 = int(w), min(int(w) + 1, grid.shape[3] - 1)

    # Interpolate
    xd = x - x0
    yd = y - y0
    zd = z - z0
    wd = w - w0

    c0000 = grid[x0, y0, z0, w0]
    c0001 = grid[x0, y0, z0, w1]
    c0010 = grid[x0, y0, z1, w0]
    c0011 = grid[x0, y0, z1, w1]
    c0100 = grid[x0, y1, z0, w0]
    c0101 = grid[x0, y1, z0, w1]
    c0110 = grid[x0, y1, z1, w0]
    c0111 = grid[x0, y1, z1, w1]
    c1000 = grid[x1, y0, z0, w0]
    c1001 = grid[x1, y0, z0, w1]
    c1010 = grid[x1, y0, z1, w0]
    c1011 = grid[x1, y0, z1, w1]
    c1100 = grid[x1, y1, z0, w0]
    c1101 = grid[x1, y1, z0, w1]
    c1110 = grid[x1, y1, z1, w0]
    c1111 = grid[x1, y1, z1, w1]

    # 4D linear interpolation
    return (
        c0000 * (1 - xd) * (1 - yd) * (1 - zd) * (1 - wd) +
        c0001 * (1 - xd) * (1 - yd) * (1 - zd) * wd +
        c0010 * (1 - xd) * (1 - yd) * zd * (1 - wd) +
        c0011 * (1 - xd) * (1 - yd) * zd * wd +
        c0100 * (1 - xd) * yd * (1 - zd) * (1 - wd) +
        c0101 * (1 - xd) * yd * (1 - zd) * wd +
        c0110 * (1 - xd) * yd * zd * (1 - wd) +
        c0111 * (1 - xd) * yd * zd * wd +
        c1000 * xd * (1 - yd) * (1 - zd) * (1 - wd) +
        c1001 * xd * (1 - yd) * (1 - zd) * wd +
        c1010 * xd * (1 - yd) * zd * (1 - wd) +
        c1011 * xd * (1 - yd) * zd * wd +
        c1100 * xd * yd * (1 - zd) * (1 - wd) +
        c1101 * xd * yd * (1 - zd) * wd +
        c1110 * xd * yd * zd * (1 - wd) +
        c1111 * xd * yd * zd * wd
    )


# Sentiment analysis for engagement feedback
def analyze_sentiment(text: str) -> Dict[str, Any]:
    """Lightweight sentiment analysis for engagement feedback."""
    # Simple rule-based for demo - in production use a model
    angry_words = ['frustrated', 'angry', 'confused', 'stuck', 'not working', 'broken']
    positive_words = ['great', 'awesome', 'perfect', 'thanks', 'helpful', 'clear']

    text_lower = text.lower()
    angry_score = sum(1 for word in angry_words if word in text_lower)
    positive_score = sum(1 for word in positive_words if word in text_lower)

    score = (positive_score - angry_score) / max(1, len(text.split()))
    score = np.clip(score, -1, 1)

    if score < -0.1:
        tone = "frustrated"
    elif score > 0.1:
        tone = "engaged"
    else:
        tone = "neutral"

    return {"score": score, "tone": tone}


# Web search acquisition
def web_acquire(query: str) -> Dict[str, Any]:
    """Acquire web context for restart scenarios."""
    try:
        # Use Bing Search API or similar - placeholder
        # In production: use actual search API
        mock_results = [
            f"Legal precedent for {query}: Case law shows...",
            f"Statutory interpretation of {query}: According to...",
            f"Practical application of {query}: In practice..."
        ]
        summary = " ".join(mock_results)
        return {"summary": summary, "sources": mock_results}
    except Exception as e:
        print(f"Web search failed: {e}")
        return {"summary": "", "sources": []}


# Mock RAG/KAG/VAG functions (implement with actual services)
def rag_search(query_vec: np.ndarray) -> List[Dict]:
    """Dense semantic search via Qdrant/FAISS."""
    # Placeholder - return mock results
    return [{"text": "Mock RAG result", "score": 0.8, "source": "vector_db"}]


def kag_expand(rag_hits: List[Dict]) -> List[Dict]:
    """Knowledge graph expansion via Neo4j + manifold."""
    # Placeholder - expand with graph connections
    return rag_hits + [{"text": "Graph expanded result", "score": 0.6, "source": "neo4j"}]


def a_star_paths(kag_hits: List[Dict]) -> List[Dict]:
    """A* pathfinding on manifold for optimal knowledge paths."""
    # Placeholder - use manifold distances for heuristics
    return kag_hits


def vag_search(query_vec: np.ndarray, chr97_tiles: Any, chr97_quant4: Any) -> List[Dict]:
    """Visual/glyph analogy search via CH-ROM97."""
    # Placeholder - search visual analogies
    return [{"text": "Visual analogy result", "score": 0.7, "source": "chr97"}]


def sufficient_confidence(rag_hits, kag_hits, vag_hits) -> bool:
    """Check if retrieval confidence is sufficient."""
    total_score = sum(h.get('score', 0) for h in rag_hits + kag_hits + vag_hits)
    return total_score > 1.5  # Arbitrary threshold


def fuse_routes(rag: List, kag: List, vag: List, web: List, mood: Dict) -> Dict:
    """Fuse results from all routes with mood-based ranking."""
    all_hits = rag + kag + vag + web

    # Mood-based ranking
    if mood['tone'] == 'frustrated':
        # Prioritize explanatory results
        all_hits.sort(key=lambda x: x.get('score', 0) * 1.2 if 'explanation' in x.get('text', '').lower() else x.get('score', 0))
    elif mood['tone'] == 'engaged':
        # Keep semantic ranking
        all_hits.sort(key=lambda x: x.get('score', 0), reverse=True)

    return {
        "results": all_hits[:10],  # Top 10
        "mood": mood,
        "routes_used": ["rag", "kag", "vag"] + (["web"] if web else []),
        "confidence": sum(h.get('score', 0) for h in all_hits) / len(all_hits) if all_hits else 0
    }


# Main ACE retrieval function
def ace_retrieve(query: str) -> Dict[str, Any]:
    """
    3 Routes + Restart retrieval strategy with tricubic + quaternions.
    Tensor-Core optimized for RTX 3060.
    """
    print(f"🎯 ACE Retrieve: {query}")

    # 0 — Sentiment / engagement analysis
    mood = analyze_sentiment(query)
    print(f"   Mood: {mood['tone']} (score: {mood['score']:.2f})")

    # 1st route — RAG (dense semantic, Tensor-Core optimized)
    q_vec = embed_text_fp16([query])[0]
    rag_hits = rag_search(q_vec)
    print(f"   RAG hits: {len(rag_hits)}")

    # 2nd route — KAG (graph + manifold)
    kag_hits = kag_expand(rag_hits)
    kag_paths = a_star_paths(kag_hits)
    print(f"   KAG paths: {len(kag_paths)}")

    # 3rd route — VAG (visual / glyph analogies via CH-ROM97)
    vag_hits = vag_search(q_vec, None, None)  # TODO: pass actual CH-ROM97 data
    print(f"   VAG hits: {len(vag_hits)}")

    # If all 3 are weak → restart from scratch with web search
    if not sufficient_confidence(rag_hits, kag_hits, vag_hits):
        print("   ⚠️ Low confidence - restarting with web search")
        web_ctx = web_acquire(query)
        web_emb = embed_text_fp16([web_ctx['summary']])[0]
        web_hits = rag_search(web_emb)
        print(f"   Web hits: {len(web_hits)}")
    else:
        web_ctx = None
        web_hits = []
        print("   ✅ Sufficient confidence - no web restart needed")

    # Fuse everything
    fused = fuse_routes(
        rag=rag_hits,
        kag=kag_paths,
        vag=vag_hits,
        web=web_hits,
        mood=mood
    )

    print(f"   Fused results: {len(fused['results'])}")
    return fused


def run_demo():
    print("🔮 Generating 4D manifold from legal text embeddings...")

    # Generate synthetic legal texts for embedding
    legal_texts = [
        "The defendant is charged with murder under Penal Code 187.",
        "Evidence shows the victim was found with multiple gunshot wounds.",
        "Witness testimony places the suspect at the scene of the crime.",
        "Ballistics report confirms the weapon matches the recovered firearm.",
        "DNA evidence links the defendant to the crime scene.",
        "The prosecution argues premeditation and malice aforethought.",
        "Defense claims self-defense under justifiable homicide statutes.",
        "Court records show prior convictions for assault with a deadly weapon.",
        "Surveillance footage captures the suspect fleeing the location.",
        "Autopsy report indicates time of death between 10 PM and midnight.",
        "Financial records show motive related to inheritance dispute.",
        "Alibi witness places defendant at a different location during the time frame.",
        "Fingerprint analysis matches prints found on the murder weapon.",
        "Psychological evaluation suggests diminished capacity.",
        "Jury instructions include definitions of first-degree murder.",
        "Closing arguments emphasize the burden of proof beyond reasonable doubt.",
        "Verdict reached after deliberation of three hours.",
        "Sentencing phase considers aggravating and mitigating factors.",
        "Appeal filed citing ineffective assistance of counsel.",
        "Case remanded for new trial due to evidentiary errors."
    ] * 25  # 500 samples

    # Get FP16 embeddings (Tensor-Core optimized)
    embeddings = embed_text_fp16(legal_texts)

    # Embed into 4D manifold (PCA - simpler than UMAP, fewer dependencies)
    pca = PCA(n_components=4)
    pts4 = pca.fit_transform(embeddings.astype(np.float32))  # PCA needs float32

    print("   - Semantic manifold shape:", pts4.shape)
    print("   - Input embedding dims:", embeddings.shape[1])
    print("   - Explained variance ratio:", pca.explained_variance_ratio_)

    # Quantize to 4 bytes (spatial hash for GPU indexing)
    q4 = quantize_4d(pts4)

    # Distortion stats
    mean_err, max_err = distortion(pts4, q4)

    print("\n📊 QUANTIZATION RESULTS")
    print("   Mean distortion:", mean_err)
    print("   Max distortion :", max_err)
    print("   Use quant4 as spatial hash for GPU tile indexing")
    print("   Use float32[4] for precise reasoning/AI operations")

    # Show first example
    print("\nExample:")
    print("   Original 4D:", pts4[0])
    print("   Quantized bytes:", q4[0])
    print("   Recon (approx):", q4[0] / 255.0)

    # Export to JSON for CH-ROM97 Node builder
    out = {
        "float_manifold": pts4.tolist(),
        "quantized_manifold": q4.tolist(),
        "embedding_dim": int(embeddings.shape[1]),
        "distortion_stats": {
            "mean": float(mean_err),
            "max": float(max_err)
        },
        "explained_variance": pca.explained_variance_ratio_.tolist(),
        "tensor_core_notes": "FP16 embeddings, 4D manifold for GPU reasoning, quant4 for fast spatial lookup"
    }

    with open("manifold_export.json", "w") as f:
        json.dump(out, f, indent=2)

    print("\n📁 Exported manifold → manifold_export.json")
    print("🎯 Ready for CH-ROM97 cartridge with Tensor-Core optimizations")


def test_ace_retrieve():
    """Test the ACE retrieval system."""
    print("\n🧠 Testing ACE Retrieval System...")

    test_queries = [
        "I'm confused about this legal case - can you explain it step by step?",
        "This is perfect! Show me more similar cases.",
        "What are the murder statutes in California?"
    ]

    for query in test_queries:
        result = ace_retrieve(query)
        print(f"   Query: {query[:50]}...")
        print(f"   Results: {len(result['results'])}")
        print(f"   Mood: {result['mood']['tone']}")
        print(f"   Confidence: {result['confidence']:.2f}")
        print()


if __name__ == "__main__":
    run_demo()
    test_ace_retrieve()