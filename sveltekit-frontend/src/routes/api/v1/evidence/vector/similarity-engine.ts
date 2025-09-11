/*
 * Lightweight AdvancedSimilarityEngine implementation
 * Provides performSimilaritySearch used by unified evidence analysis route.
 * This is a mock / placeholder; replace with real vector DB + embedding logic.
 */

export interface PerformSimilaritySearchArgs {
  query: string;
  evidenceIds: string[];
  algorithms: string[];
  clustering?: boolean;
  threshold?: number; // 0..1
}

interface ClusterResult {
  evidenceIds: string[];
  coherenceScore: number; // 0..1
  themes: string[];
}

interface SimilaritySearchResult {
  clusters?: ClusterResult[];
  algorithms: string[];
  totalEvidence: number;
  timings: { totalMs: number };
}

export class AdvancedSimilarityEngine {
  static async performSimilaritySearch(args: PerformSimilaritySearchArgs): Promise<SimilaritySearchResult> {
    const start = Date.now();
    const { evidenceIds, algorithms, clustering, threshold = 0.7 } = args;

    // Very small deterministic pseudo-random for repeatability in dev
    function pseudoRandom(seed: number) {
      let x = Math.sin(seed) * 10000; // deterministic
      return x - Math.floor(x);
    }

    let clusters: ClusterResult[] | undefined;
    if (clustering) {
      // Group evidence IDs into naive clusters of size 2-4
      clusters = [];
      let i = 0;
      let seed = evidenceIds.length;
      while (i < evidenceIds.length) {
        const groupSize = Math.min(1 + Math.floor(pseudoRandom(seed + i) * 3) + 1, evidenceIds.length - i);
        const slice = evidenceIds.slice(i, i + groupSize);
        i += groupSize;
        const coherence = Math.max(threshold, parseFloat((pseudoRandom(seed + i) * (1 - threshold) + threshold).toFixed(3)));
        clusters.push({
          evidenceIds: slice,
            coherenceScore: coherence,
          themes: deriveThemes(slice)
        });
      }
    }

    return {
      clusters,
      algorithms,
      totalEvidence: evidenceIds.length,
      timings: { totalMs: Date.now() - start }
    };
  }
}

function deriveThemes(ids: string[]): string[] {
  const baseThemes = ['contract', 'damages', 'timeline', 'entities', 'financial', 'communications'];
  // Pick up to 2 themes deterministically
  return baseThemes.filter((_, idx) => idx < 2 && idx < ids.length);
}
