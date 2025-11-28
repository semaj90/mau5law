"""
Unit Tests for Phase 4: Multimodal Retrieval

Tests for Query Embedding, KAG Expansion, Fusion Ranker, and Multimodal Retriever
"""

import pytest
import numpy as np
from typing import List, Dict

from backend.services.query_embedder import QueryEmbedder
from backend.services.kag_expander import KAGExpander
from backend.services.fusion_ranker import FusionRanker
from backend.services.multimodal_retriever import MultimodalRetriever


class TestQueryEmbedder:
    """Tests for QueryEmbedder service"""

    @pytest.fixture
    def embedder(self):
        return QueryEmbedder(cache_size=100, use_fp16=True)

    def test_initialization(self, embedder):
        assert embedder is not None
        assert embedder.embedding_dim == 768
        assert embedder.use_fp16 is True

    def test_embed_query_shape(self, embedder):
        query = "What is the meaning of life?"
        embedding = embedder.embed_query(query)
        assert embedding.shape == (768,)

    def test_embed_query_normalization(self, embedder):
        query = "Test query"
        embedding = embedder.embed_query(query, normalize=True)
        norm = np.linalg.norm(embedding.astype(np.float32))
        assert 0.99 <= norm <= 1.01

    def test_embed_query_caching(self, embedder):
        query = "Cached query"
        embedding1 = embedder.embed_query(query)
        cache_size_1 = len(embedder.cache)
        embedding2 = embedder.embed_query(query)
        cache_size_2 = len(embedder.cache)
        assert cache_size_1 == cache_size_2 == 1
        assert np.allclose(embedding1, embedding2)

    def test_embed_batch_shape(self, embedder):
        queries = ["Query 1", "Query 2", "Query 3"]
        embeddings = embedder.embed_batch(queries)
        assert embeddings.shape == (3, 768)

    def test_fp16_conversion(self, embedder):
        query = "FP16 test"
        embedding = embedder.embed_query(query)
        assert embedding.dtype == np.float16

    def test_cache_stats(self, embedder):
        embedder.embed_query("Query 1")
        embedder.embed_query("Query 2")
        stats = embedder.get_cache_stats()
        assert stats["cache_size"] == 2
        assert stats["embedding_dim"] == 768

    def test_clear_cache(self, embedder):
        embedder.embed_query("Query 1")
        assert len(embedder.cache) == 1
        embedder.clear_cache()
        assert len(embedder.cache) == 0


class TestKAGExpander:
    """Tests for KAGExpander service"""

    @pytest.fixture
    def expander(self):
        return KAGExpander(max_depth=2, cache_size=100)

    def test_initialization(self, expander):
        assert expander is not None
        assert expander.max_depth == 2
        assert len(expander.expansion_cache) == 0

    def test_expand_returns_list(self, expander):
        result = expander.expand("0", depth=1)
        assert isinstance(result, list)

    def test_expand_caching(self, expander):
        result1 = expander.expand("0", depth=1)
        cache_size_1 = len(expander.expansion_cache)
        result2 = expander.expand("0", depth=1)
        cache_size_2 = len(expander.expansion_cache)
        assert cache_size_1 == cache_size_2
        assert result1 == result2

    def test_get_edges_returns_list(self, expander):
        result = expander.get_edges("0")
        assert isinstance(result, list)

    def test_cache_stats(self, expander):
        expander.expand("0", depth=1)
        stats = expander.get_cache_stats()
        assert stats["max_depth"] == 2
        assert stats["max_cache_size"] == 100

    def test_clear_cache(self, expander):
        expander.expand("0", depth=1)
        expander.clear_cache()
        assert len(expander.expansion_cache) == 0


class TestFusionRanker:
    """Tests for FusionRanker service"""

    @pytest.fixture
    def ranker(self):
        return FusionRanker(rag_weight=0.4, kag_weight=0.3, vag_weight=0.3)

    def test_initialization(self, ranker):
        assert ranker is not None
        assert abs(ranker.rag_weight - 0.4) < 0.01
        assert abs(ranker.kag_weight - 0.3) < 0.01

    def test_weight_normalization(self):
        ranker = FusionRanker(rag_weight=2.0, kag_weight=1.0, vag_weight=1.0)
        total = ranker.rag_weight + ranker.kag_weight + ranker.vag_weight
        assert abs(total - 1.0) < 0.01

    def test_normalize_scores(self, ranker):
        scores = [1.0, 2.0, 3.0, 4.0, 5.0]
        normalized = ranker._normalize_scores(scores)
        assert len(normalized) == len(scores)
        assert min(normalized) >= 0.0
        assert max(normalized) <= 1.0

    def test_normalize_scores_empty(self, ranker):
        normalized = ranker._normalize_scores([])
        assert normalized == []

    def test_compute_fusion_score(self, ranker):
        score = ranker._compute_fusion_score(0.5, 0.6, 0.7)
        expected = 0.4 * 0.5 + 0.3 * 0.6 + 0.3 * 0.7
        assert abs(score - expected) < 0.01

    def test_fusion_score_monotonicity(self, ranker):
        base_score = ranker._compute_fusion_score(0.5, 0.5, 0.5)
        rag_score = ranker._compute_fusion_score(0.6, 0.5, 0.5)
        assert rag_score > base_score

    def test_verify_monotonicity(self, ranker):
        is_monotonic = ranker.verify_monotonicity(0.5, 0.5, 0.5)
        assert is_monotonic is True

    def test_fuse_results_empty(self, ranker):
        fused = ranker.fuse_results([], [], [])
        assert fused == []

    def test_fuse_results_single_modality(self, ranker):
        rag_results = [
            {"id": "1", "text": "Result 1", "score": 0.9},
            {"id": "2", "text": "Result 2", "score": 0.7},
        ]
        fused = ranker.fuse_results(rag_results, [], [])
        assert len(fused) == 2
        assert fused[0].id == "1"

    def test_fuse_results_ranking(self, ranker):
        rag_results = [
            {"id": "1", "text": "Result 1", "score": 0.9},
            {"id": "2", "text": "Result 2", "score": 0.5},
            {"id": "3", "text": "Result 3", "score": 0.7},
        ]
        fused = ranker.fuse_results(rag_results, [], [])
        assert fused[0].rank == 1
        assert fused[1].rank == 2
        assert fused[2].rank == 3


class TestMultimodalRetriever:
    """Tests for MultimodalRetriever service"""

    @pytest.fixture
    def retriever(self):
        return MultimodalRetriever(
            qdrant_collection="embeddings",
            rag_top_k=10,
            kag_depth=2,
            vag_top_k=10,
            fusion_top_k=5,
        )

    def test_initialization(self, retriever):
        assert retriever is not None
        assert retriever.qdrant_collection == "embeddings"
        assert retriever.rag_top_k == 10

    def test_get_stats(self, retriever):
        stats = retriever.get_stats()
        assert "query_embedder" in stats
        assert "kag_expander" in stats
        assert stats["rag_top_k"] == 10


class TestPhase4Integration:
    """Integration tests for Phase 4 components"""

    def test_embedder_to_ranker(self):
        embedder = QueryEmbedder()
        ranker = FusionRanker()

        query = "What is AI?"
        embedding = embedder.embed_query(query)

        rag_results = [{"id": "1", "text": "AI Result", "score": 0.9}]
        fused = ranker.fuse_results(rag_results, [], [])

        assert len(fused) == 1
        assert fused[0].fusion_score > 0

    def test_embedder_normalization(self):
        embedder = QueryEmbedder()
        query = "Consistency test"
        embedding1 = embedder.embed_query(query, normalize=True)
        embedding2 = embedder.embed_query(query, normalize=True)

        assert np.allclose(embedding1, embedding2)
        norm = np.linalg.norm(embedding1.astype(np.float32))
        assert 0.99 <= norm <= 1.01

    def test_fusion_weight_distribution(self):
        ranker = FusionRanker(rag_weight=0.5, kag_weight=0.3, vag_weight=0.2)

        rag_results = [{"id": "1", "text": "RAG", "score": 1.0}]
        kag_results = [{"id": "1", "weight": 1.0}]
        vag_results = [{"id": "1", "score": 1.0}]

        fused = ranker.fuse_results(rag_results, kag_results, vag_results)

        assert len(fused) == 1
        assert abs(fused[0].fusion_score - 1.0) < 0.01


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
