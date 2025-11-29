"""
Unit Tests for Phase 8: Visual Context & Hybrid Search

Tests for YOLO Detection, SAM Segmentation, Visual Context Enhancement, and FAISS Re-ranking
"""

import pytest
import numpy as np
from typing import List, Dict

from backend.services.visual_context import (
    YOLODetector,
    SAMSegmenter,
    VisualContextEnhancer,
    Detection,
    Segment,
)
from backend.services.faiss_reranker import FAISSReranker


class TestYOLODetector:
    """Tests for YOLO Object Detector"""

    @pytest.fixture
    def detector(self):
        return YOLODetector()

    def test_initialization(self, detector):
        assert detector is not None
        assert detector.model_name == "yolov8n"
        assert detector.device == "cuda"

    def test_detect_returns_list(self, detector):
        # Create dummy image
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        detections = detector.detect(image)
        assert isinstance(detections, list)

    def test_detection_structure(self, detector):
        # Create dummy image
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        detections = detector.detect(image)

        for detection in detections:
            assert isinstance(detection, Detection)
            assert hasattr(detection, "class_id")
            assert hasattr(detection, "class_name")
            assert hasattr(detection, "confidence")
            assert hasattr(detection, "bbox")
            assert 0.0 <= detection.confidence <= 1.0

    def test_detect_with_threshold(self, detector):
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        detections_low = detector.detect(image, conf_threshold=0.1)
        detections_high = detector.detect(image, conf_threshold=0.9)

        # Higher threshold should give fewer or equal detections
        assert len(detections_high) <= len(detections_low)


class TestSAMSegmenter:
    """Tests for SAM Segmenter"""

    @pytest.fixture
    def segmenter(self):
        return SAMSegmenter()

    def test_initialization(self, segmenter):
        assert segmenter is not None
        assert segmenter.device == "cuda"

    def test_segment_returns_list(self, segmenter):
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        bboxes = [(10, 10, 100, 100), (200, 200, 150, 150)]
        segments = segmenter.segment(image, bboxes)
        assert isinstance(segments, list)

    def test_segment_structure(self, segmenter):
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        bboxes = [(10, 10, 100, 100)]
        segments = segmenter.segment(image, bboxes)

        for segment in segments:
            assert isinstance(segment, Segment)
            assert hasattr(segment, "segment_id")
            assert hasattr(segment, "class_name")
            assert hasattr(segment, "confidence")
            assert 0.0 <= segment.confidence <= 1.0

    def test_segment_count_matches_bbox_count(self, segmenter):
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        bboxes = [(10, 10, 100, 100), (200, 200, 150, 150), (50, 50, 80, 80)]
        segments = segmenter.segment(image, bboxes)
        assert len(segments) == len(bboxes)


class TestVisualContextEnhancer:
    """Tests for Visual Context Enhancement"""

    @pytest.fixture
    def enhancer(self):
        return VisualContextEnhancer(vision_weight=0.3)

    def test_initialization(self, enhancer):
        assert enhancer is not None
        assert enhancer.vision_weight == 0.3
        assert enhancer.detector is not None
        assert enhancer.segmenter is not None

    def test_enhance_without_image(self, enhancer):
        results = [
            {"id": "1", "text": "Result 1", "score": 0.9},
            {"id": "2", "text": "Result 2", "score": 0.7},
        ]
        enhanced = enhancer.enhance_with_vision(results, image_data=None)
        assert len(enhanced) == len(results)

    def test_enhance_with_image(self, enhancer):
        results = [
            {"id": "1", "text": "Result 1", "score": 0.9},
            {"id": "2", "text": "Result 2", "score": 0.7},
        ]
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        enhanced = enhancer.enhance_with_vision(results, image_data=image)

        assert isinstance(enhanced, list)
        for result in enhanced:
            assert "vision_score" in result
            assert "blended_score" in result

    def test_blended_score_computation(self, enhancer):
        results = [{"id": "1", "text": "Result 1", "score": 0.8}]
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        enhanced = enhancer.enhance_with_vision(results, image_data=image)

        if enhanced:
            blended = enhanced[0]["blended_score"]
            original = enhanced[0]["score"]
            vision = enhanced[0]["vision_score"]

            # Verify blending formula
            expected = (1.0 - 0.3) * original + 0.3 * vision
            assert abs(blended - expected) < 0.01

    def test_get_visual_metadata(self, enhancer):
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        metadata = enhancer.get_visual_metadata(image)

        assert isinstance(metadata, dict)
        assert "num_detections" in metadata
        assert "num_segments" in metadata
        assert "detections" in metadata
        assert "segments" in metadata


class TestFAISSReranker:
    """Tests for FAISS Re-ranking"""

    @pytest.fixture
    def reranker(self):
        return FAISSReranker()

    def test_initialization(self, reranker):
        assert reranker is not None

    def test_rerank_empty_results(self, reranker):
        query = np.random.randn(768)
        results = reranker.rerank_with_exact(query, [])
        assert results == []

    def test_rerank_with_embeddings(self, reranker):
        query = np.random.randn(768)
        results = [
            {
                "id": "1",
                "text": "Result 1",
                "score": 0.7,
                "embedding": np.random.randn(768).tolist(),
            },
            {
                "id": "2",
                "text": "Result 2",
                "score": 0.9,
                "embedding": np.random.randn(768).tolist(),
            },
        ]

        reranked = reranker.rerank_with_exact(query, results)

        assert len(reranked) == 2
        for result in reranked:
            assert "exact_score" in result
            assert "original_score" in result
            assert "rank" in result

    def test_rerank_ordering(self, reranker):
        query = np.random.randn(768)
        results = [
            {
                "id": str(i),
                "text": f"Result {i}",
                "score": 0.5,
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(5)
        ]

        reranked = reranker.rerank_with_exact(query, results)

        # Check that scores are monotonically decreasing
        for i in range(len(reranked) - 1):
            assert reranked[i]["exact_score"] >= reranked[i + 1]["exact_score"]

    def test_rerank_with_top_k(self, reranker):
        query = np.random.randn(768)
        results = [
            {
                "id": str(i),
                "text": f"Result {i}",
                "score": 0.5,
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(10)
        ]

        reranked = reranker.rerank_with_exact(query, results, top_k=5)
        assert len(reranked) == 5

    def test_verify_ranking_correctness(self, reranker):
        query = np.random.randn(768)
        results = [
            {
                "id": str(i),
                "text": f"Result {i}",
                "score": 0.5,
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(5)
        ]

        reranked = reranker.rerank_with_exact(query, results)
        is_correct, errors = reranker.verify_ranking_correctness(reranked)

        assert is_correct is True
        assert len(errors) == 0

    def test_compute_ranking_quality(self, reranker):
        query = np.random.randn(768)
        ann_results = [
            {
                "id": str(i),
                "text": f"Result {i}",
                "score": 0.5 - i * 0.05,
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(5)
        ]

        reranked = reranker.rerank_with_exact(query, ann_results)
        quality = reranker.compute_ranking_quality(ann_results, reranked)

        assert "num_results" in quality
        assert "num_reordered" in quality
        assert "avg_rank_change" in quality
        assert "max_rank_change" in quality
        assert "avg_score_improvement" in quality

    def test_get_stats(self, reranker):
        stats = reranker.get_stats()
        assert "service" in stats
        assert stats["service"] == "FAISSReranker"


class TestPhase8Integration:
    """Integration tests for Phase 8 components"""

    def test_visual_enhancement_to_reranking(self):
        enhancer = VisualContextEnhancer()
        reranker = FAISSReranker()

        # Create results
        results = [
            {
                "id": "1",
                "text": "Result 1",
                "score": 0.8,
                "embedding": np.random.randn(768).tolist(),
            },
            {
                "id": "2",
                "text": "Result 2",
                "score": 0.7,
                "embedding": np.random.randn(768).tolist(),
            },
        ]

        # Enhance with vision
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        enhanced = enhancer.enhance_with_vision(results, image_data=image)

        # Re-rank with exact similarity
        query = np.random.randn(768)
        reranked = reranker.rerank_with_exact(query, enhanced)

        assert len(reranked) > 0
        assert all("exact_score" in r for r in reranked)

    def test_full_visual_hybrid_search_pipeline(self):
        enhancer = VisualContextEnhancer()
        reranker = FAISSReranker()

        # Simulate retrieval results
        results = [
            {
                "id": str(i),
                "text": f"Result {i}",
                "score": 0.9 - i * 0.1,
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(5)
        ]

        # Get visual metadata
        image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        visual_metadata = enhancer.get_visual_metadata(image)

        # Enhance with vision
        enhanced = enhancer.enhance_with_vision(results, image_data=image)

        # Re-rank
        query = np.random.randn(768)
        reranked = reranker.rerank_with_exact(query, enhanced)

        # Verify quality
        is_correct, errors = reranker.verify_ranking_correctness(reranked)
        quality = reranker.compute_ranking_quality(results, reranked)

        assert is_correct is True
        assert len(errors) == 0
        assert quality["num_results"] > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
