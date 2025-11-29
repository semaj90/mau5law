"""
Unit Tests for Phase 6: GPU Manifold Processing

Tests for Quaternion Transformer, Tricubic Interpolation, and Manifold Projector
"""

import pytest
import numpy as np
from typing import List, Dict

from backend.services.manifold_projector import (
    QuaternionTransformer,
    TricubicInterpolator,
    ManifoldProjector,
    Point3D,
)


class TestQuaternionTransformer:
    """Tests for Quaternion Transformer"""

    @pytest.fixture
    def transformer(self):
        return QuaternionTransformer()

    def test_initialization(self, transformer):
        assert transformer is not None
        assert transformer.rotation_quat is not None
        assert len(transformer.rotation_quat) == 4

    def test_identity_quaternion(self, transformer):
        # Identity quaternion should not rotate
        quat = np.array([1.0, 0.0, 0.0, 0.0])
        transformer.set_rotation(quat)
        assert np.allclose(transformer.rotation_quat, quat)

    def test_quaternion_normalization(self, transformer):
        # Non-normalized quaternion should be normalized
        quat = np.array([2.0, 0.0, 0.0, 0.0])
        transformer.set_rotation(quat)
        norm = np.linalg.norm(transformer.rotation_quat)
        assert np.isclose(norm, 1.0)

    def test_set_euler_angles(self, transformer):
        transformer.set_euler_angles(0.0, 0.0, 0.0)
        # Identity rotation
        assert np.allclose(transformer.rotation_quat, [1.0, 0.0, 0.0, 0.0], atol=1e-6)

    def test_project_4d_to_3d_shape(self, transformer):
        point_4d = np.array([1.0, 2.0, 3.0, 0.5])
        point_3d = transformer.project_4d_to_3d(point_4d)
        assert point_3d.shape == (3,)

    def test_project_4d_to_3d_identity(self, transformer):
        # With identity rotation, 3D part should be preserved (with scaling)
        point_4d = np.array([1.0, 0.0, 0.0, 0.0])
        point_3d = transformer.project_4d_to_3d(point_4d)
        assert len(point_3d) == 3

    def test_project_batch_shape(self, transformer):
        points_4d = np.random.randn(10, 4)
        points_3d = transformer.project_batch(points_4d)
        assert points_3d.shape == (10, 3)

    def test_quaternion_multiply(self, transformer):
        q1 = np.array([1.0, 0.0, 0.0, 0.0])
        q2 = np.array([1.0, 0.0, 0.0, 0.0])
        result = transformer._quaternion_multiply(q1, q2)
        assert np.allclose(result, q1)

    def test_rotate_vector_identity(self, transformer):
        v = np.array([1.0, 0.0, 0.0])
        q = np.array([1.0, 0.0, 0.0, 0.0])  # Identity
        rotated = transformer._rotate_vector(v, q)
        assert np.allclose(rotated, v, atol=1e-6)


class TestTricubicInterpolator:
    """Tests for Tricubic Interpolation"""

    def test_tricubic_kernel_at_zero(self):
        h00, h10, h01, h11 = TricubicInterpolator.tricubic_kernel(0.0)
        assert np.isclose(h00, 1.0)
        assert np.isclose(h10, 0.0)
        assert np.isclose(h01, 0.0)
        assert np.isclose(h11, 0.0)

    def test_tricubic_kernel_at_one(self):
        h00, h10, h01, h11 = TricubicInterpolator.tricubic_kernel(1.0)
        assert np.isclose(h00, 0.0)
        assert np.isclose(h10, 0.0)
        assert np.isclose(h01, 1.0)
        assert np.isclose(h11, 0.0)

    def test_tricubic_kernel_at_half(self):
        h00, h10, h01, h11 = TricubicInterpolator.tricubic_kernel(0.5)
        # At t=0.5, should be roughly balanced
        assert 0.0 <= h00 <= 1.0
        assert 0.0 <= h01 <= 1.0

    def test_interpolate_cubic_endpoints(self):
        p0, p1, p2, p3 = 0.0, 1.0, 2.0, 3.0

        # At t=0, should be close to p1
        val_0 = TricubicInterpolator.interpolate_cubic(p0, p1, p2, p3, 0.0)
        assert np.isclose(val_0, p1, atol=0.1)

        # At t=1, should be close to p2
        val_1 = TricubicInterpolator.interpolate_cubic(p0, p1, p2, p3, 1.0)
        assert np.isclose(val_1, p2, atol=0.1)

    def test_interpolate_path_length(self):
        start = np.array([0.0, 0.0, 0.0])
        end = np.array([1.0, 1.0, 1.0])
        path = TricubicInterpolator.interpolate_path(start, end, num_points=10)
        assert len(path) == 10

    def test_interpolate_path_endpoints(self):
        start = np.array([0.0, 0.0, 0.0])
        end = np.array([1.0, 1.0, 1.0])
        path = TricubicInterpolator.interpolate_path(start, end, num_points=10)

        # First point should be close to start
        assert np.allclose(path[0], start, atol=0.1)

        # Last point should be close to end
        assert np.allclose(path[-1], end, atol=0.1)

    def test_interpolate_path_monotonic(self):
        start = np.array([0.0, 0.0, 0.0])
        end = np.array([1.0, 1.0, 1.0])
        path = TricubicInterpolator.interpolate_path(start, end, num_points=10)

        # Path should be monotonically increasing in each dimension
        for dim in range(3):
            values = [p[dim] for p in path]
            for i in range(len(values) - 1):
                assert values[i] <= values[i + 1] + 1e-6


class TestManifoldProjector:
    """Tests for Manifold Projector"""

    @pytest.fixture
    def projector(self):
        return ManifoldProjector()

    def test_initialization(self, projector):
        assert projector is not None
        assert projector.quaternion is not None
        assert projector.interpolator is not None

    def test_project_embeddings_shape(self, projector):
        embeddings_4d = np.random.randn(10, 4)
        embeddings_3d = projector.project_embeddings(embeddings_4d)
        assert embeddings_3d.shape == (10, 3)

    def test_project_embeddings_normalized(self, projector):
        embeddings_4d = np.random.randn(10, 4)
        embeddings_3d = projector.project_embeddings(embeddings_4d)

        # Check normalization (should be close to unit sphere)
        norms = np.linalg.norm(embeddings_3d, axis=1)
        assert np.allclose(norms, 1.0, atol=0.1)

    def test_interpolate_path_shape(self, projector):
        start = np.array([1.0, 0.0, 0.0, 0.0])
        end = np.array([0.0, 1.0, 0.0, 0.0])
        path = projector.interpolate_path(start, end, num_points=10)

        assert len(path) == 10
        assert all(isinstance(p, Point3D) for p in path)

    def test_interpolate_path_3d_input(self, projector):
        start = np.array([1.0, 0.0, 0.0])
        end = np.array([0.0, 1.0, 0.0])
        path = projector.interpolate_path(start, end, num_points=10)

        assert len(path) == 10

    def test_set_rotation(self, projector):
        projector.set_rotation(0.1, 0.2, 0.3)
        # Should not raise exception

    def test_get_3d_coordinates_4d_input(self, projector):
        embeddings = np.random.randn(5, 4)
        coords = projector.get_3d_coordinates(embeddings)

        assert len(coords) == 5
        assert all("x" in c and "y" in c and "z" in c for c in coords)

    def test_get_3d_coordinates_3d_input(self, projector):
        embeddings = np.random.randn(5, 3)
        coords = projector.get_3d_coordinates(embeddings)

        assert len(coords) == 5
        assert all("x" in c and "y" in c and "z" in c for c in coords)

    def test_get_stats(self, projector):
        stats = projector.get_stats()
        assert "cache_size" in stats
        assert "max_cache_size" in stats
        assert "rotation_quat" in stats

    def test_point3d_to_dict(self):
        point = Point3D(1.0, 2.0, 3.0)
        d = point.to_dict()
        assert d["x"] == 1.0
        assert d["y"] == 2.0
        assert d["z"] == 3.0

    def test_point3d_to_array(self):
        point = Point3D(1.0, 2.0, 3.0)
        arr = point.to_array()
        assert np.allclose(arr, [1.0, 2.0, 3.0])


class TestPhase6Integration:
    """Integration tests for Phase 6 components"""

    def test_quaternion_to_tricubic_pipeline(self):
        transformer = QuaternionTransformer()
        interpolator = TricubicInterpolator()

        # Project 4D points to 3D
        point_4d_1 = np.array([1.0, 0.0, 0.0, 0.0])
        point_4d_2 = np.array([0.0, 1.0, 0.0, 0.0])

        point_3d_1 = transformer.project_4d_to_3d(point_4d_1)
        point_3d_2 = transformer.project_4d_to_3d(point_4d_2)

        # Interpolate path
        path = interpolator.interpolate_path(point_3d_1, point_3d_2, num_points=10)

        assert len(path) == 10
        assert all(len(p) == 3 for p in path)

    def test_full_manifold_projection_pipeline(self):
        projector = ManifoldProjector()

        # Generate random embeddings
        embeddings_4d = np.random.randn(20, 4)

        # Project to 3D
        coords_3d = projector.project_embeddings(embeddings_4d)

        # Get 3D coordinates
        coords = projector.get_3d_coordinates(embeddings_4d)

        assert len(coords) == 20
        assert all("x" in c for c in coords)

    def test_rotation_and_interpolation(self):
        projector = ManifoldProjector()

        # Set rotation
        projector.set_rotation(0.1, 0.2, 0.3)

        # Project embeddings
        embeddings = np.random.randn(10, 4)
        coords_1 = projector.project_embeddings(embeddings)

        # Change rotation
        projector.set_rotation(0.3, 0.2, 0.1)
        coords_2 = projector.project_embeddings(embeddings)

        # Coordinates should be different
        assert not np.allclose(coords_1, coords_2)

    def test_memory_palace_visualization_data(self):
        projector = ManifoldProjector()

        # Generate 26 rune embeddings
        rune_embeddings = np.random.randn(26, 4)

        # Get 3D coordinates for memory palace
        coords = projector.get_3d_coordinates(rune_embeddings)

        # Verify data structure for visualization
        assert len(coords) == 26
        for coord in coords:
            assert "id" in coord
            assert "x" in coord
            assert "y" in coord
            assert "z" in coord
            assert isinstance(coord["x"], float)
            assert isinstance(coord["y"], float)
            assert isinstance(coord["z"], float)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
