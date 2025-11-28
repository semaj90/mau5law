"""
Self-Organizing Map (SOM) Fallback Clustering Engine

Provides fallback clustering when semantic recall is weak.
Integrated from existing distributed_train.py SOM autoencoder.

Usage:
    engine = SOMEngine()
    som_nodes = engine.som_map(query_embedding)
"""

import logging
from typing import List, Dict, Optional, Tuple
import numpy as np

try:
    import torch
    import torch.nn as nn
except ImportError:
    torch = None
    nn = None

logger = logging.getLogger(__name__)


class SOMAutoEncoder(nn.Module):
    """SOM-based autoencoder for latent encoding"""

    def __init__(self, input_dim: int, latent_dim: int = 64):
        """
        Initialize SOM autoencoder.

        Args:
            input_dim: Input embedding dimension (768)
            latent_dim: Latent dimension (64)
        """
        if nn is None:
            raise RuntimeError("PyTorch not installed")

        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.ReLU(),
            nn.Linear(512, latent_dim),
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 512),
            nn.ReLU(),
            nn.Linear(512, input_dim),
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass.

        Args:
            x: Input tensor

        Returns:
            Tuple of (reconstruction, latent)
        """
        latent = self.encoder(x)
        reconstruction = self.decoder(latent)
        return reconstruction, latent

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """Encode to latent space."""
        return self.encoder(x)

    def decode(self, z: torch.Tensor) -> torch.Tensor:
        """Decode from latent space."""
        return self.decoder(z)


class SOMEngine:
    """Self-Organizing Map for fallback clustering"""

    def __init__(self, grid_size: int = 10, learning_rate: float = 0.1):
        """
        Initialize SOM engine.

        Args:
            grid_size: SOM grid size (10×10)
            learning_rate: Learning rate for SOM updates
        """
        self.grid_size = grid_size
        self.learning_rate = learning_rate
        self.som_weights: Optional[np.ndarray] = None
        self.autoencoder: Optional[SOMAutoEncoder] = None
        self.device = None

        if torch is not None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def initialize_som(self, data: np.ndarray) -> None:
        """
        Initialize SOM weights from data.

        Args:
            data: Training data (N × D)
        """
        n_samples, n_features = data.shape

        # Initialize weights randomly from data
        indices = np.random.choice(n_samples, self.grid_size * self.grid_size, replace=True)
        self.som_weights = data[indices].reshape(self.grid_size, self.grid_size, n_features)

        logger.info(f"Initialized SOM: {self.grid_size}×{self.grid_size} grid, {n_features} features")

    def train_autoencoder(self, data: np.ndarray, epochs: int = 5, batch_size: int = 32) -> None:
        """
        Train SOM autoencoder.

        Args:
            data: Training data (N × D)
            epochs: Number of epochs
            batch_size: Batch size
        """
        if torch is None or nn is None:
            logger.warning("PyTorch not installed, skipping autoencoder training")
            return

        try:
            input_dim = data.shape[1]
            self.autoencoder = SOMAutoEncoder(input_dim, latent_dim=64).to(self.device)

            optimizer = torch.optim.Adam(self.autoencoder.parameters(), lr=1e-4)
            criterion = nn.MSELoss()

            data_tensor = torch.from_numpy(data).float().to(self.device)

            for epoch in range(epochs):
                total_loss = 0.0
                n_batches = 0

                for i in range(0, len(data), batch_size):
                    batch = data_tensor[i : i + batch_size]

                    # Forward pass
                    reconstruction, _ = self.autoencoder(batch)
                    loss = criterion(reconstruction, batch)

                    # Backward pass
                    optimizer.zero_grad()
                    loss.backward()
                    optimizer.step()

                    total_loss += loss.item()
                    n_batches += 1

                avg_loss = total_loss / n_batches
                if (epoch + 1) % 2 == 0:
                    logger.info(f"Epoch {epoch + 1}/{epochs}, Loss: {avg_loss:.6f}")

            logger.info("Autoencoder training complete")

        except Exception as e:
            logger.error(f"Autoencoder training failed: {e}")

    def som_map(self, query_vec: np.ndarray) -> List[Dict]:
        """
        Map query to nearest SOM node.

        Args:
            query_vec: Query embedding (D,)

        Returns:
            List of cluster neighbors ranked by distance
        """
        if self.som_weights is None:
            logger.warning("SOM not initialized")
            return []

        try:
            # Find nearest SOM node (BMU - Best Matching Unit)
            distances = np.linalg.norm(self.som_weights - query_vec, axis=2)
            bmu_idx = np.unravel_index(np.argmin(distances), distances.shape)

            # Get neighbors in grid
            neighbors = self._get_som_neighbors(bmu_idx, distances)

            return neighbors

        except Exception as e:
            logger.error(f"SOM mapping failed: {e}")
            return []

    def _get_som_neighbors(self, bmu_idx: Tuple[int, int], distances: np.ndarray) -> List[Dict]:
        """
        Get SOM neighbors ranked by distance.

        Args:
            bmu_idx: Best matching unit index
            distances: Distance matrix

        Returns:
            List of neighbors
        """
        neighbors = []

        # Get all nodes with their distances
        for i in range(self.grid_size):
            for j in range(self.grid_size):
                distance = distances[i, j]
                neighbors.append(
                    {
                        "node_id": f"som_{i}_{j}",
                        "position": (i, j),
                        "distance": float(distance),
                        "is_bmu": (i, j) == bmu_idx,
                    }
                )

        # Sort by distance
        neighbors.sort(key=lambda x: x["distance"])

        # Return top-10
        return neighbors[:10]

    def get_som_neighbors(self, node_id: str) -> List[Dict]:
        """
        Get neighbors of a SOM node.

        Args:
            node_id: Node ID (e.g., "som_5_3")

        Returns:
            List of neighbors
        """
        try:
            # Parse node ID
            parts = node_id.split("_")
            if len(parts) != 3:
                return []

            i, j = int(parts[1]), int(parts[2])

            # Get neighbors in grid (8-neighborhood)
            neighbors = []
            for di in [-1, 0, 1]:
                for dj in [-1, 0, 1]:
                    if di == 0 and dj == 0:
                        continue

                    ni, nj = i + di, j + dj
                    if 0 <= ni < self.grid_size and 0 <= nj < self.grid_size:
                        neighbors.append(
                            {
                                "node_id": f"som_{ni}_{nj}",
                                "position": (ni, nj),
                                "distance": float(np.sqrt(di**2 + dj**2)),
                            }
                        )

            return neighbors

        except Exception as e:
            logger.error(f"Failed to get SOM neighbors: {e}")
            return []

    def encode_to_latent(self, embedding: np.ndarray) -> Optional[np.ndarray]:
        """
        Encode embedding to latent space using autoencoder.

        Args:
            embedding: Input embedding

        Returns:
            Latent vector or None
        """
        if self.autoencoder is None or torch is None:
            return None

        try:
            with torch.no_grad():
                x = torch.from_numpy(embedding).float().unsqueeze(0).to(self.device)
                latent = self.autoencoder.encode(x)
                return latent.cpu().numpy().squeeze()

        except Exception as e:
            logger.error(f"Latent encoding failed: {e}")
            return None

    def decode_from_latent(self, latent: np.ndarray) -> Optional[np.ndarray]:
        """
        Decode latent vector back to embedding space.

        Args:
            latent: Latent vector

        Returns:
            Reconstructed embedding or None
        """
        if self.autoencoder is None or torch is None:
            return None

        try:
            with torch.no_grad():
                z = torch.from_numpy(latent).float().unsqueeze(0).to(self.device)
                reconstruction = self.autoencoder.decode(z)
                return reconstruction.cpu().numpy().squeeze()

        except Exception as e:
            logger.error(f"Latent decoding failed: {e}")
            return None


# Convenience functions

def som_map(query_vec: np.ndarray, grid_size: int = 10) -> List[Dict]:
    """Map query to SOM (convenience function)."""
    engine = SOMEngine(grid_size=grid_size)
    return engine.som_map(query_vec)


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)

    # Create sample data
    np.random.seed(42)
    data = np.random.randn(1000, 768)  # 1000 samples, 768-dim

    engine = SOMEngine(grid_size=10)
    engine.initialize_som(data)

    # Map a query
    query = np.random.randn(768)
    neighbors = engine.som_map(query)

    print(f"Found {len(neighbors)} SOM neighbors:")
    for neighbor in neighbors[:5]:
        print(f"  {neighbor['node_id']}: distance={neighbor['distance']:.3f}")
