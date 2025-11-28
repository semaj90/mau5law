"""
HMM Missing-Link Inference Engine

Identifies missing steps in legal reasoning chains using Hidden Markov Models.
Integrated from existing behavior_router.py implementation.

Usage:
    engine = HMMEngine()
    missing_links = engine.infer_missing_links(graph_results)
"""

import logging
from typing import List, Dict, Optional, Tuple
import numpy as np

try:
    from hmmlearn.hmm import MultinomialHMM, GaussianHMM
except ImportError:
    MultinomialHMM = None
    GaussianHMM = None

logger = logging.getLogger(__name__)


class HMMEngine:
    """Hidden Markov Model for missing-link inference"""

    def __init__(self, n_components: int = 3, n_iter: int = 50):
        """
        Initialize HMM engine.

        Args:
            n_components: Number of hidden states
            n_iter: Number of EM iterations
        """
        self.n_components = n_components
        self.n_iter = n_iter
        self.models: Dict[str, MultinomialHMM] = {}

    def infer_missing_links(
        self, graph_results: List[Dict], sequence_window: int = 64
    ) -> List[Dict]:
        """
        Infer missing links in reasoning chain.

        Args:
            graph_results: List of graph nodes from KAG expansion
            sequence_window: Maximum sequence length

        Returns:
            List of inferred missing links with scores
        """
        if not graph_results or len(graph_results) < 2:
            return []

        try:
            # Extract sequence of node IDs
            sequence = self._extract_sequence(graph_results, sequence_window)

            if len(sequence) < 2:
                return []

            # Train HMM on sequence
            model = self._train_hmm(sequence)
            if model is None:
                return []

            # Predict missing links
            missing_links = self._predict_missing_links(model, sequence, graph_results)

            return missing_links

        except Exception as e:
            logger.error(f"HMM inference failed: {e}")
            return []

    def _extract_sequence(self, graph_results: List[Dict], max_length: int) -> List[int]:
        """
        Extract sequence of node IDs from graph results.

        Args:
            graph_results: List of graph nodes
            max_length: Maximum sequence length

        Returns:
            List of node IDs
        """
        sequence = []
        for result in graph_results[:max_length]:
            node_id = result.get("id") or result.get("node_id")
            if node_id is not None:
                # Convert to integer if possible
                try:
                    sequence.append(int(node_id) % 256)  # Modulo for HMM alphabet
                except (ValueError, TypeError):
                    pass

        return sequence

    def _train_hmm(self, sequence: List[int]) -> Optional[MultinomialHMM]:
        """
        Train HMM on sequence.

        Args:
            sequence: List of observations

        Returns:
            Trained HMM model or None
        """
        if MultinomialHMM is None:
            logger.warning("hmmlearn not installed, skipping HMM training")
            return None

        if len(set(sequence)) == 1:
            logger.debug("Degenerate sequence (all same value), cannot train HMM")
            return None

        try:
            # Prepare data for HMM
            data = np.array(sequence).reshape(-1, 1)

            # Determine number of components
            n_components = min(self.n_components, len(set(sequence)))

            # Train model
            model = MultinomialHMM(
                n_components=n_components,
                n_iter=self.n_iter,
                random_state=42,
            )

            model.fit(data)
            return model

        except Exception as e:
            logger.debug(f"HMM training failed: {e}")
            return None

    def _predict_missing_links(
        self, model: MultinomialHMM, sequence: List[int], graph_results: List[Dict]
    ) -> List[Dict]:
        """
        Predict missing links using HMM.

        Args:
            model: Trained HMM model
            sequence: Original sequence
            graph_results: Original graph results

        Returns:
            List of missing links with scores
        """
        missing_links = []

        try:
            # Decode sequence to get hidden states
            data = np.array(sequence).reshape(-1, 1)
            hidden_states = model.predict(data)

            # Find transitions that might have missing steps
            for i in range(len(hidden_states) - 1):
                current_state = hidden_states[i]
                next_state = hidden_states[i + 1]

                # If states are different, there might be a missing link
                if current_state != next_state:
                    # Compute transition probability
                    trans_prob = model.transmat_[current_state, next_state]

                    # Create missing link entry
                    missing_link = {
                        "from_node": graph_results[i].get("id", i),
                        "to_node": graph_results[i + 1].get("id", i + 1),
                        "from_state": int(current_state),
                        "to_state": int(next_state),
                        "probability": float(trans_prob),
                        "type": "state_transition",
                    }

                    missing_links.append(missing_link)

            # Sort by probability (descending)
            missing_links.sort(key=lambda x: x["probability"], reverse=True)

            # Return top-3
            return missing_links[:3]

        except Exception as e:
            logger.debug(f"HMM prediction failed: {e}")
            return []

    def score_missing_link(self, link: Dict) -> float:
        """
        Score a missing link by probability.

        Args:
            link: Missing link entry

        Returns:
            Score (0-1)
        """
        return link.get("probability", 0.0)

    def get_top_missing_links(self, missing_links: List[Dict], k: int = 3) -> List[Dict]:
        """
        Get top-k missing links by score.

        Args:
            missing_links: List of missing links
            k: Number of top links to return

        Returns:
            Top-k missing links
        """
        sorted_links = sorted(
            missing_links, key=lambda x: self.score_missing_link(x), reverse=True
        )
        return sorted_links[:k]


# Convenience functions

def infer_missing_links(graph_results: List[Dict]) -> List[Dict]:
    """Infer missing links (convenience function)."""
    engine = HMMEngine()
    return engine.infer_missing_links(graph_results)


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)

    # Create sample graph results
    graph_results = [
        {"id": 0, "name": "Statute PC 187"},
        {"id": 1, "name": "Statute PC 207"},
        {"id": 2, "name": "POI John Doe"},
        {"id": 3, "name": "Evidence Weapon"},
        {"id": 4, "name": "Statute PC 245"},
    ]

    engine = HMMEngine()
    missing_links = engine.infer_missing_links(graph_results)

    print(f"Found {len(missing_links)} missing links:")
    for link in missing_links:
        print(f"  {link['from_node']} → {link['to_node']}: {link['probability']:.3f}")
