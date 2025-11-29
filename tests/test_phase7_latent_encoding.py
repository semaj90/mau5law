"""
Unit Tests for Phase 7: Latent Encoding & Cartridges

Tests for Latent Collapse, Latent Marker Encoding, and Cartridge Builder
"""

import pytest
import numpy as np
import json
from typing import List, Dict

from backend.services.latent_collapse import LatentCollapser, LatentMarker
from backend.services.cartridge_builder import CartridgeBuilder, Cartridge


class TestLatentCollapser:
    """Tests for Latent Collapse Service"""

    @pytest.fixture
    def collapser(self):
        return LatentCollapser(num_runes=26, latent_dim=768)

    def test_initialization(self, collapser):
        assert collapser is not None
        assert collapser.num_runes == 26
        assert collapser.latent_dim == 768
        assert collapser.rune_centroids.shape == (26, 768)

    def test_collapse_to_rune(self, collapser):
        context = np.random.randn(768)
        rune_id, confidence = collapser.collapse_to_rune(context)

        assert 0 <= rune_id < 26
        assert 0.0 <= confidence <= 1.0

    def test_collapse_batch(self, collapser):
        contexts = np.random.randn(10, 768)
        results = collapser.collapse_batch(contexts)

        assert len(results) == 10
        for rune_id, confidence in results:
            assert 0 <= rune_id < 26
            assert 0.0 <= confidence <= 1.0

    def test_quantize_context(self, collapser):
        context = np.random.randn(768)
        quantized = collapser.quantize_context(context)

        assert isinstance(quantized, bytes)
        assert len(quantized) > 0

    def test_dequantize_context(self, collapser):
        context = np.random.randn(768)
        quantized = collapser.quantize_context(context)
        dequantized = collapser.dequantize_context(quantized, dim=768)

        assert dequantized.shape == (768,)
        assert np.all(np.isfinite(dequantized))

    def test_quantize_dequantize_roundtrip(self, collapser):
        context = np.random.randn(768)
        quantized = collapser.quantize_context(context)
        dequantized = collapser.dequantize_context(quantized, dim=768)

        # Should be close (within quantization error)
        error = np.mean(np.abs(context - dequantized))
        assert error < 0.5  # Reasonable error for INT4

    def test_create_latent_marker(self, collapser):
        context = np.random.randn(768)
        marker = collapser.create_latent_marker(context, timestamp=0.0)

        assert isinstance(marker, LatentMarker)
        assert 0 <= marker.rune_id < 26
        assert 0.0 <= marker.confidence <= 1.0
        assert len(marker.quantized_context) > 0

    def test_encode_marker_to_hex(self, collapser):
        context = np.random.randn(768)
        marker = collapser.create_latent_marker(context, timestamp=0.0)
        hex_str = collapser.encode_marker_to_hex(marker)

        assert isinstance(hex_str, str)
        assert len(hex_str) > 0
        assert all(c in "0123456789abcdef" for c in hex_str)

    def test_decode_marker_from_hex(self, collapser):
        context = np.random.randn(768)
        marker = collapser.create_latent_marker(context, timestamp=0.0)
        hex_str = collapser.encode_marker_to_hex(marker)
        decoded = collapser.decode_marker_from_hex(hex_str)

        assert decoded is not None
        assert decoded.rune_id == marker.rune_id
        assert abs(decoded.confidence - marker.confidence) < 0.001

    def test_marker_roundtrip(self, collapser):
        context = np.random.randn(768)
        marker = collapser.create_latent_marker(context, timestamp=0.0)

        # Encode and decode
        hex_str = collapser.encode_marker_to_hex(marker)
        decoded = collapser.decode_marker_from_hex(hex_str)

        # Should match
        assert decoded.rune_id == marker.rune_id
        assert abs(decoded.confidence - marker.confidence) < 0.001

    def test_get_stats(self, collapser):
        stats = collapser.get_stats()
        assert "num_runes" in stats
        assert "latent_dim" in stats
        assert stats["num_runes"] == 26
        assert stats["latent_dim"] == 768


class TestCartridgeBuilder:
    """Tests for Cartridge Builder"""

    @pytest.fixture
    def builder(self):
        return CartridgeBuilder()

    def test_initialization(self, builder):
        assert builder is not None
        assert builder.MAGIC == 0x4348524F
        assert builder.VERSION == 97

    def test_build_ch_rom97(self, builder):
        runes = [
            {
                "id": i,
                "uuid": f"uuid-{i}",
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(5)
        ]
        tiles = [b"tile_data" for _ in range(5)]
        edges = [(0, 1, 0.8), (1, 2, 0.7), (2, 3, 0.9)]

        cartridge = builder.build_ch_rom97(runes, tiles, edges)

        assert cartridge.num_runes == 5
        assert cartridge.num_edges == 3
        assert len(cartridge.runes) == 5
        assert len(cartridge.edges) == 3

    def test_serialize_cartridge(self, builder):
        runes = [
            {
                "id": i,
                "uuid": f"uuid-{i}",
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(3)
        ]
        tiles = []
        edges = [(0, 1, 0.8), (1, 2, 0.7)]
        metadata = {"query": "test", "timestamp": "2024-01-01"}

        cartridge = builder.build_ch_rom97(runes, tiles, edges, metadata)
        serialized = builder.serialize_cartridge(cartridge)

        assert isinstance(serialized, bytes)
        assert len(serialized) > 0

    def test_deserialize_cartridge(self, builder):
        runes = [
            {
                "id": i,
                "uuid": f"uuid-{i}",
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(3)
        ]
        tiles = []
        edges = [(0, 1, 0.8), (1, 2, 0.7)]
        metadata = {"query": "test"}

        cartridge = builder.build_ch_rom97(runes, tiles, edges, metadata)
        serialized = builder.serialize_cartridge(cartridge)
        deserialized = builder.deserialize_cartridge(serialized)

        assert deserialized is not None
        assert deserialized.num_runes == 3
        assert deserialized.num_edges == 2
        assert deserialized.version == 97

    def test_cartridge_roundtrip(self, builder):
        runes = [
            {
                "id": i,
                "uuid": f"uuid-{i}",
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(5)
        ]
        tiles = []
        edges = [(i, (i + 1) % 5, 0.8) for i in range(5)]
        metadata = {"query": "test query", "num_results": 5}

        # Build and serialize
        cartridge = builder.build_ch_rom97(runes, tiles, edges, metadata)
        serialized = builder.serialize_cartridge(cartridge)

        # Deserialize
        deserialized = builder.deserialize_cartridge(serialized)

        # Verify
        assert deserialized.num_runes == cartridge.num_runes
        assert deserialized.num_edges == cartridge.num_edges
        assert deserialized.metadata == cartridge.metadata

    def test_get_cartridge_size(self, builder):
        runes = [
            {
                "id": i,
                "uuid": f"uuid-{i}",
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(10)
        ]
        tiles = []
        edges = [(i, (i + 1) % 10, 0.8) for i in range(10)]

        cartridge = builder.build_ch_rom97(runes, tiles, edges)
        size_breakdown = builder.get_cartridge_size(cartridge)

        assert "header" in size_breakdown
        assert "runes" in size_breakdown
        assert "edges" in size_breakdown
        assert "total" in size_breakdown
        assert size_breakdown["total"] > 0

    def test_cartridge_size_calculation(self, builder):
        runes = [
            {
                "id": i,
                "uuid": f"uuid-{i}",
                "embedding": np.random.randn(768).tolist(),
            }
            for i in range(26)
        ]
        tiles = []
        edges = [(i, (i + 1) % 26, 0.8) for i in range(26)]

        cartridge = builder.build_ch_rom97(runes, tiles, edges)
        size_breakdown = builder.get_cartridge_size(cartridge)

        # Verify size calculation
        expected_rune_size = 26 * (1 + 16 + 1536)
        assert size_breakdown["runes"] == expected_rune_size


class TestPhase7Integration:
    """Integration tests for Phase 7 components"""

    def test_latent_collapse_to_cartridge(self):
        collapser = LatentCollapser()
        builder = CartridgeBuilder()

        # Create multimodal context
        context = np.random.randn(768)

        # Collapse to rune
        rune_id, confidence = collapser.collapse_to_rune(context)

        # Create rune for cartridge
        rune = {
            "id": rune_id,
            "uuid": f"uuid-{rune_id}",
            "embedding": context.tolist(),
        }

        # Build cartridge
        cartridge = builder.build_ch_rom97([rune], [], [])

        assert cartridge.num_runes == 1
        assert cartridge.runes[0]["id"] == rune_id

    def test_full_latent_encoding_pipeline(self):
        collapser = LatentCollapser()
        builder = CartridgeBuilder()

        # Generate multimodal contexts
        contexts = np.random.randn(26, 768)

        # Collapse to runes
        runes = []
        for i, context in enumerate(contexts):
            rune_id, confidence = collapser.collapse_to_rune(context)
            runes.append(
                {
                    "id": rune_id,
                    "uuid": f"uuid-{rune_id}",
                    "embedding": context.tolist(),
                }
            )

        # Create edges
        edges = [(i, (i + 1) % 26, 0.8) for i in range(26)]

        # Build cartridge
        cartridge = builder.build_ch_rom97(runes, [], edges)

        # Serialize
        serialized = builder.serialize_cartridge(cartridge)

        # Deserialize
        deserialized = builder.deserialize_cartridge(serialized)

        assert deserialized.num_runes == 26
        assert deserialized.num_edges == 26

    def test_latent_marker_to_cartridge_metadata(self):
        collapser = LatentCollapser()
        builder = CartridgeBuilder()

        # Create latent marker
        context = np.random.randn(768)
        marker = collapser.create_latent_marker(context, timestamp=0.0)

        # Encode marker
        hex_str = collapser.encode_marker_to_hex(marker)

        # Create cartridge with marker in metadata
        metadata = {"latent_marker": hex_str, "query": "test"}
        cartridge = builder.build_ch_rom97([], [], [], metadata)

        # Serialize and deserialize
        serialized = builder.serialize_cartridge(cartridge)
        deserialized = builder.deserialize_cartridge(serialized)

        # Verify marker is preserved
        assert deserialized.metadata["latent_marker"] == hex_str

        # Decode marker
        decoded_marker = collapser.decode_marker_from_hex(
            deserialized.metadata["latent_marker"]
        )
        assert decoded_marker.rune_id == marker.rune_id


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
