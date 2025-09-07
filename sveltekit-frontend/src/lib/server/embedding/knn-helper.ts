// k-NN helper utilities for embeddings

export type Vector = number[];

/**
 * Compute dot product of two vectors.
 */
export function dot(a: Vector, b: Vector): number {
  if (a.length !== b.length) throw new Error('dot: vectors must have same length');
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Compute L2 norm (magnitude) of a vector.
 */
export function norm(a: Vector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * a[i];
  return Math.sqrt(sum);
}

/**
 * Cosine similarity in range [-1, 1]. Returns 0 for zero-length vectors.
 */
export function cosineSimilarity(a: Vector, b: Vector): number {
  if (a.length !== b.length) throw new Error('cosineSimilarity: vectors must have same length');
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

/**
 * Euclidean distance between two vectors.
 */
export function euclideanDistance(a: Vector, b: Vector): number {
  if (a.length !== b.length) throw new Error('euclideanDistance: vectors must have same length');
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
	const d = a[i] - b[i];
	sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Find top-K nearest items by cosine similarity.
 * Returns array sorted by descending score (best first).
 */
export function topKNearest<T extends string | number | symbol = string>(
  query: Vector,
  items: { id: T; embedding: Vector }[],
  k = 5
): { id: T; score: number }[] {
  if (!Array.isArray(query)) return [];
  const results = items.map(item => {
	const score = cosineSimilarity(query, item.embedding);
	return { id: item.id, score };
  });
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, Math.max(0, Math.min(k, results.length)));
}

export default {
  dot,
  norm,
  cosineSimilarity,
  euclideanDistance,
  topKNearest
};
