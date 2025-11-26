"""
EmbeddingGemma Service
768-dimensional embeddings only
GPU-accelerated inference with fallback to CPU
"""

import torch
import numpy as np
from typing import List, Tuple
from transformers import AutoTokenizer, AutoModel
import logging

logger = logging.getLogger(__name__)

class EmbeddingGemmaService:
    def __init__(self, model_name: str = "nomic-ai/nomic-embed-text-1.5", device: str = None):
        """Initialize EmbeddingGemma service with 768d embeddings"""
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_name = model_name
        self.embedding_dim = 768

        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModel.from_pretrained(model_name, trust_remote_code=True)
            self.model.to(self.device)
            self.model.eval()
            logger.info(f"EmbeddingGemma loaded on {self.device}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def embed(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Generate 768-dimensional embeddings for texts

        Args:
            texts: List of text strings to embed
            batch_size: Batch size for processing

        Returns:
            numpy array of shape (len(texts), 768)
        """
        embeddings = []

        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]

                # Tokenize
                encoded = self.tokenizer(
                    batch,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors='pt'
                ).to(self.device)

                # Get embeddings
                outputs = self.model(**encoded)
                batch_embeddings = outputs.last_hidden_state[:, 0, :].cpu().numpy()
                embeddings.append(batch_embeddings)

        return np.vstack(embeddings)

    def embed_single(self, text: str) -> np.ndarray:
        """Generate embedding for single text"""
        return self.embed([text])[0]

    def cosine_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Compute cosine similarity between two embeddings"""
        dot_product = np.dot(embedding1, embedding2)
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        return dot_product / (norm1 * norm2) if norm1 > 0 and norm2 > 0 else 0.0

    def batch_similarity(self, query_embedding: np.ndarray, embeddings: np.ndarray) -> np.ndarray:
        """Compute cosine similarity between query and batch of embeddings"""
        norms = np.linalg.norm(embeddings, axis=1)
        query_norm = np.linalg.norm(query_embedding)

        similarities = np.dot(embeddings, query_embedding) / (norms * query_norm + 1e-8)
        return similarities

    def get_device_info(self) -> dict:
        """Get device and model information"""
        return {
            'device': self.device,
            'embedding_dim': self.embedding_dim,
            'model_name': self.model_name,
            'cuda_available': torch.cuda.is_available(),
            'cuda_device_count': torch.cuda.device_count() if torch.cuda.is_available() else 0,
        }

# Singleton instance
_embedding_service = None

def get_embedding_service() -> EmbeddingGemmaService:
    """Get or create singleton embedding service"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingGemmaService()
    return _embedding_service
