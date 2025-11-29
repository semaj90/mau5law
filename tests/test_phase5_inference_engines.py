"""
Unit Tests for Phase 5: Inference Engines

Tests for HMM Missing-Link Inference, SOM Fallback Clustering, and Recall Monitor
"""

import pytest
import numpy as np
from typing import List, Dict

from backend.services.hmm_engine import HMMEngine, MissingLink
from backend.services.som_engine import SOMEngine
from backend.services.recall_monitor import RecallMonitor, RecallMetrics


class TestHMMEngine:
    """Tests for HMM Missing-Link Inference"""

    @pytest.fixture
    def hmm(self):
        return HMMEngine(num_states=26, num_observations=26)

    def test_initialization(self, hmm):
        assert hmm is not None
        assert hmm.num_states == 26
        assert hmm.num_observations == 26
        assert len(hmm.nodes) == 26

    def test_transition_matrix_shape(self, hmm):
        assert hmm.transition_matrix.shape == (26, 26)
        assert np.allclose(hmm.transition_matrix.sum(axis=1), 1.0)

    def test_emission_matrix_shape(self, hmm):
        assert hmm.emission_matrix.shape == (26, 26)
        assert np.allclose(hmm.emission_matrix.sum(axis=1), 1.0)

    def test_state_prior_shape(self, hmm):
        assert hmm.state_prior.shape == (26,)
        assert np.allclose(hmm.state_prior.sum(), 1.0)

    def test_forward_pass(self, hmm):
        sequence = [0, 1, 2, 3]
        forward = hmm._forward_pass(sequence)
        assert forward.shape == (4, 26)
        assert np.all(forward >= 0)

    def test_backward_pass(self, hmm):
        sequence = [0, 1, 2, 3]
        backward = hmm._backward_pass(sequence)
        assert backward.shape == (4, 26)
        assert np.all(backward >= 0)

    def test_infer_missing_links(self, hmm):
        sequence = ["0", "5", "10"]
        missing_links = hmm.infer_missing_links(sequence)
        assert isinstance(missing_links, list)

    def test_score_missing_links(self, hmm):
        links = [
            MissingLink(
                from_node="0",
                to_node="1",
                probability=0.8,
                reasoning_type="causal",
                confidence=0.0,
            ),
            MissingLink(
                from_node="1",
                to_node="2",
                probability=0.6,
                reasoning_type="temporal",
                confidence=0.0,
            ),
        ]

        scored = hmm.score_missing_links(links)
        assert len(scored) == 2
        assert scored[0].confidence >= scored[1].confidence

    def test_viterbi_path(self, hmm):
        observations = [0, 1, 2, 3, 4]
        path = hmm.get_viterbi_path(observations)
        assert len(path) == len(observations)
        assert all(0 <= state < 26 for state in path)

    def test_reasoning_type_inference(self, hmm):
        reasoning_type = hmm._infer_reasoning_type("0", "1")
        assert reasoning_type in ["causal", "evidential", "logical", "temporal", "analogical"]

    def test_transition_probability(self, hmm):
        prob = hmm._get_transition_probability("0", "1")
        assert 0.0 <= prob <= 1.0

    def test_find_intermediates(self, hmm):
        intermediates = hmm._find_intermediates("0", "10")
        assert isinstance(intermediates, list)
        assert len(intermediates) <= 3


class TestSOMEngine:
    """Tests for Self-Organizing Map"""

    @pytest.fixture
    def som(self):
        return SOMEngine(grid_size=10, embedding_dim=768)

    def test_initialization(self, som):
        assert som is not None
        assert som.grid_size == 10
        assert som.num_nodes == 100
        assert len(som.nodes) == 100

    def test_node_weights_shape(self, som):
        for node in som.nodes:
            assert node.weights.shape == (768,)

    def test_find_bmu(self, som):
        embedding = np.random.randn(768)
        bmu_idx = som._find_bmu(embedding)
        assert 0 <= bmu_idx < 100

    def test_grid_distance(self, som):
        distance = som._grid_distance(0, 11)
        assert distance > 0

    def test_get_cluster_neighbors(self, som):
        embedding = np.random.randn(768)
        neighbors = som.get_cluster_neighbors(embedding, k=5)
        assert isinstance(neighbors, list)
        assert len(neighbors) <= 5

    def test_get_activation_map(self, som):
        activation_map = som.get_activation_map()
        assert activation_map.shape == (10, 10)

    def test_get_weight_map(self, som):
        weight_map = som.get_weight_map(dimension=0)
        assert weight_map.shape == (10, 10)

    def test_quantize(self, som):
        embeddings = np.random.randn(10, 768)
        quantized = som.quantize(embeddings)
        assert quantized.shape == embeddings.shape

    def test_get_stats(self, som):
        stats = som.get_stats()
        assert "grid_size" in stats
        assert "num_nodes" in stats
        assert "embedding_dim" in stats
        assert stats["grid_size"] == 10
        assert stats["num_nodes"] == 100

    def test_reset_activations(self, som):
        # Activate a node
        embedding = np.random.randn(768)
        som.get_cluster_neighbors(embedding)

        # Check activation
        assert any(node.activation_count > 0 for node in som.nodes)

        # Reset
        som.reset_activations()
        assert all(node.activation_count == 0 for node in som.nodes)


class TestRecallMonitor:
    """Tests for Semantic Recall Monitor"""

    @pytest.fixture
    def monitor(self):
        return RecallMonitor(threshold=0.5, min_results=5)

    def test_initialization(self, monitor):
        assert monitor is not None
        assert monitor.threshold == 0.5
        assert monitor.min_results == 5

    def test_check_recall_empty_results(self, monitor):
        should_fallback, metrics = monitor.check_recall([])
        assert should_fallback is True
        assert metrics.recall_score == 0.0
        assert metrics.num_results == 0

    def test_check_recall_good_results(self, monitor):
        results = [
            {"id": "1", "score": 0.9},
            {"id": "2", "score": 0.85},
            {"id": "3", "score": 0.8},
            {"id": "4", "score": 0.75},
            {"id": "5", "score": 0.7},
        ]
        should_fallback, metrics = monitor.check_recall(results)
        assert metrics.num_results == 5
        assert metrics.avg_score > 0.7
        assert metrics.max_score == 0.9

    def test_check_recall_poor_results(self, monitor):
        results = [
            {"id": "1", "score": 0.3},
            {"id": "2", "score": 0.25},
        ]
        should_fallback, metrics = monitor.check_recall(results)
        assert metrics.avg_score < 0.5

    def test_get_fallback_results(self, monitor):
        embedding = np.random.randn(768)
        results = monitor.get_fallback_results(embedding, top_k=5)
        assert isinstance(results, list)

    def test_blend_results(self, monitor):
        semantic_results = [
            {"id": "1", "text": "Result 1", "score": 0.9},
            {"id": "2", "text": "Result 2", "score": 0.8},
        ]
        fallback_results = [
            {"id": "3", "text": "Result 3", "score": 0.7},
            {"id": "1", "text": "Result 1", "score": 0.6},
        ]

        blended = monitor.blend_results(semantic_results, fallback_results)
        assert len(blended) >= 2
        assert all("final_score" in r for r in blended)

    def test_metrics_recording(self, monitor):
        results = [{"id": "1", "score": 0.8}]
        monitor.check_recall(results)
        monitor.check_recall(results)

        assert len(monitor.metrics_history) == 2

    def test_get_metrics_summary(self, monitor):
        results = [{"id": "1", "score": 0.8}]
        monitor.check_recall(results)

        summary = monitor.get_metrics_summary()
        assert "avg_recall" in summary
        assert "fallback_rate" in summary
        assert "num_samples" in summary

    def test_clear_history(self, monitor):
        results = [{"id": "1", "score": 0.8}]
        monitor.check_recall(results)
        assert len(monitor.metrics_history) > 0

        monitor.clear_history()
        assert len(monitor.metrics_history) == 0


class TestPhase5Integration:
    """Integration tests for Phase 5 components"""

    def test_hmm_to_som_pipeline(self):
        hmm = HMMEngine()
        som = SOMEngine()

        # Get missing links from HMM
        sequence = ["0", "5", "10"]
        missing_links = hmm.infer_missing_links(sequence)

        # Use SOM for clustering
        embedding = np.random.randn(768)
        neighbors = som.get_cluster_neighbors(embedding)

        assert isinstance(missing_links, list)
        assert isinstance(neighbors, list)

    def test_recall_monitor_with_som(self):
        monitor = RecallMonitor(threshold=0.5)
        som = SOMEngine()

        # Check recall
        poor_results = [{"id": "1", "score": 0.3}]
        should_fallback, metrics = monitor.check_recall(poor_results)

        if should_fallback:
            # Get fallback results
            embedding = np.random.randn(768)
            fallback = monitor.get_fallback_results(embedding)
            assert isinstance(fallback, list)

    def test_end_to_end_inference_pipeline(self):
        hmm = HMMEngine()
        som = SOMEngine()
        monitor = RecallMonitor()

        # Simulate query
        query_embedding = np.random.randn(768)

        # Check semantic recall
        semantic_results = [
            {"id": "1", "score": 0.4},
            {"id": "2", "score": 0.35},
        ]
        should_fallback, metrics = monitor.check_recall(semantic_results)

        # If fallback needed, use SOM
        if should_fallback:
            fallback_results = monitor.get_fallback_results(query_embedding)
            blended = monitor.blend_results(semantic_results, fallback_results)
            assert len(blended) > 0

        # Get missing links
        sequence = ["0", "5"]
        missing_links = hmm.infer_missing_links(sequence)
        assert isinstance(missing_links, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
