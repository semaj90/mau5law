/**
 * High-Performance Vector Operations in AssemblyScript
 * Compiles to WebAssembly for client-side acceleration
 * Optimized for legal document embeddings and similarity search
 */

// === Core Vector Math Functions ===

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 (opposite) and 1 (identical)
 */
export function cosineSimilarity(aPtr: usize, bPtr: usize, length: i32): f32 {
  if (length <= 0) return 0.0;

  let dotProduct: f32 = 0.0;
  let normA: f32 = 0.0;
  let normB: f32 = 0.0;

  for (let i = 0; i < length; i++) {
    const aVal = load<f32>(aPtr + (i << 2)); // i * 4 bytes
    const bVal = load<f32>(bPtr + (i << 2));

    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  if (normA < 1e-12 || normB < 1e-12) return 0.0;

  return dotProduct / (Mathf.sqrt(normA) * Mathf.sqrt(normB));
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(aPtr: usize, bPtr: usize, length: i32): f32 {
  if (length <= 0) return f32.POSITIVE_INFINITY;

  let sum: f32 = 0.0;
  for (let i = 0; i < length; i++) {
    const aVal = load<f32>(aPtr + (i << 2));
    const bVal = load<f32>(bPtr + (i << 2));
    const diff = aVal - bVal;
    sum += diff * diff;
  }

  return Mathf.sqrt(sum);
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(aPtr: usize, bPtr: usize, length: i32): f32 {
  if (length <= 0) return 0.0;

  let result: f32 = 0.0;
  for (let i = 0; i < length; i++) {
    const aVal = load<f32>(aPtr + (i << 2));
    const bVal = load<f32>(bPtr + (i << 2));
    result += aVal * bVal;
  }

  return result;
}

/**
 * Calculate Manhattan (L1) distance between two vectors
 */
export function manhattanDistance(aPtr: usize, bPtr: usize, length: i32): f32 {
  if (length <= 0) return f32.POSITIVE_INFINITY;

  let sum: f32 = 0.0;
  for (let i = 0; i < length; i++) {
    const aVal = load<f32>(aPtr + (i << 2));
    const bVal = load<f32>(bPtr + (i << 2));
    sum += Mathf.abs(aVal - bVal);
  }

  return sum;
}

// === Vector Normalization ===

/**
 * Normalize vector in place (unit length)
 */
export function normalize(vectorPtr: usize, length: i32): void {
  if (length <= 0) return;

  let norm: f32 = 0.0;

  // Calculate norm
  for (let i = 0; i < length; i++) {
    const val = load<f32>(vectorPtr + (i << 2));
    norm += val * val;
  }
  norm = Mathf.sqrt(norm);

  if (norm < 1e-12) return; // Avoid division by zero

  // Normalize in place
  for (let i = 0; i < length; i++) {
    const addr = vectorPtr + (i << 2);
    const val = load<f32>(addr);
    store<f32>(addr, val / norm);
  }
}

/**
 * Z-score normalization with tanh activation
 */
export function zScoreNormalize(vectorPtr: usize, length: i32): void {
  if (length <= 0) return;

  // Calculate mean
  let sum: f32 = 0.0;
  for (let i = 0; i < length; i++) {
    sum += load<f32>(vectorPtr + (i << 2));
  }
  const mean = sum / f32(length);

  // Calculate variance
  let variance: f32 = 0.0;
  for (let i = 0; i < length; i++) {
    const val = load<f32>(vectorPtr + (i << 2));
    const diff = val - mean;
    variance += diff * diff;
  }
  const stdDev = Mathf.sqrt(variance / f32(length) + 1e-8); // Add epsilon for stability

  // Normalize and apply tanh activation in place
  for (let i = 0; i < length; i++) {
    const addr = vectorPtr + (i << 2);
    const val = load<f32>(addr);
    const normalized = (val - mean) / stdDev;
    const activated = Mathf.tanh(normalized * 0.5);
    store<f32>(addr, activated);
  }
}

// === Batch Operations ===

/**
 * Compute similarities between query vector and batch of vectors
 * Algorithm: 0=cosine, 1=euclidean, 2=dot, 3=manhattan
 */
export function computeBatchSimilarity(
  queryPtr: usize,
  vectorsPtr: usize,
  resultsPtr: usize,
  vectorDim: i32,
  vectorCount: i32,
  algorithm: i32
): void {
  for (let i = 0; i < vectorCount; i++) {
    const vectorPtr = vectorsPtr + i * vectorDim * 4; // 4 bytes per f32
    let result: f32 = 0.0;

    switch (algorithm) {
      case 0: // cosine similarity
        result = cosineSimilarity(queryPtr, vectorPtr, vectorDim);
        break;
      case 1: // euclidean (inverted for similarity)
        result = 1.0 / (1.0 + euclideanDistance(queryPtr, vectorPtr, vectorDim));
        break;
      case 2: // dot product
        result = dotProduct(queryPtr, vectorPtr, vectorDim);
        break;
      case 3: // manhattan (inverted for similarity)
        result = 1.0 / (1.0 + manhattanDistance(queryPtr, vectorPtr, vectorDim));
        break;
      default:
        result = 0.0;
    }

    store<f32>(resultsPtr + (i << 2), result);
  }
}

/**
 * Batch normalize multiple vectors in place
 */
export function batchNormalizeVectors(vectorsPtr: usize, numVectors: i32, vectorLength: i32): void {
  for (let v = 0; v < numVectors; v++) {
    const vectorOffset = v * vectorLength * 4;
    const currentVectorPtr = vectorsPtr + vectorOffset;
    zScoreNormalize(currentVectorPtr, vectorLength);
  }
}

// === Text to Vector Embedding ===

/**
 * Simple hash-based text to embedding conversion
 * Useful for quick similarity search on legal document text
 */
export function hashEmbedding(
  textPtr: usize,
  textLen: i32,
  embeddingPtr: usize,
  embeddingDim: i32
): void {
  if (textLen <= 0 || embeddingDim <= 0) return;

  // Clear the embedding first
  for (let i = 0; i < embeddingDim; i++) {
    store<f32>(embeddingPtr + (i << 2), 0.0);
  }

  let hash: u32 = 2166136261; // FNV-1a offset basis

  for (let i = 0; i < textLen; i++) {
    const char = load<u8>(textPtr + i);
    hash ^= char;
    hash = hash * 16777619; // FNV-1a prime

    // Distribute hash across embedding dimensions
    const idx = hash % u32(embeddingDim);
    const addr = embeddingPtr + (idx << 2);
    const currentVal = load<f32>(addr);
    store<f32>(addr, currentVal + 1.0);
  }

  // Normalize the embedding
  normalize(embeddingPtr, embeddingDim);
}

// === Memory Management Utilities ===

/**
 * Allocate aligned memory for vector operations
 */
export function allocateVectorMemory(length: i32): usize {
  return heap.alloc(length * 4); // 4 bytes per f32
}

/**
 * Free allocated vector memory
 */
export function freeVectorMemory(ptr: usize): void {
  heap.free(ptr);
}

// === SIMD-Enhanced Operations (when available) ===

/**
 * SIMD-optimized dot product for 4-element chunks
 * Falls back to scalar if SIMD not available
 */
export function dotProductSIMD(aPtr: usize, bPtr: usize, length: i32): f32 {
  let result: f32 = 0.0;

  // Process 4 elements at a time with SIMD when possible
  const simdLength = length & ~3; // Round down to multiple of 4

  for (let i = 0; i < simdLength; i += 4) {
    // Load 4 f32 values at once
    const aVec = v128.load(aPtr + (i << 2));
    const bVec = v128.load(bPtr + (i << 2));

    // Multiply and accumulate
    const product = f32x4.mul(aVec, bVec);
    result += f32x4.extract_lane(product, 0);
    result += f32x4.extract_lane(product, 1);
    result += f32x4.extract_lane(product, 2);
    result += f32x4.extract_lane(product, 3);
  }

  // Handle remaining elements
  for (let i = simdLength; i < length; i++) {
    const aVal = load<f32>(aPtr + (i << 2));
    const bVal = load<f32>(bPtr + (i << 2));
    result += aVal * bVal;
  }

  return result;
}

/**
 * SIMD-optimized cosine similarity
 */
export function cosineSimilaritySIMD(aPtr: usize, bPtr: usize, length: i32): f32 {
  if (length <= 0) return 0.0;

  let dotProduct: f32 = 0.0;
  let normA: f32 = 0.0;
  let normB: f32 = 0.0;

  const simdLength = length & ~3;

  // SIMD processing
  for (let i = 0; i < simdLength; i += 4) {
    const aVec = v128.load(aPtr + (i << 2));
    const bVec = v128.load(bPtr + (i << 2));

    const product = f32x4.mul(aVec, bVec);
    const aSquared = f32x4.mul(aVec, aVec);
    const bSquared = f32x4.mul(bVec, bVec);

    dotProduct +=
      f32x4.extract_lane(product, 0) +
      f32x4.extract_lane(product, 1) +
      f32x4.extract_lane(product, 2) +
      f32x4.extract_lane(product, 3);
    normA +=
      f32x4.extract_lane(aSquared, 0) +
      f32x4.extract_lane(aSquared, 1) +
      f32x4.extract_lane(aSquared, 2) +
      f32x4.extract_lane(aSquared, 3);
    normB +=
      f32x4.extract_lane(bSquared, 0) +
      f32x4.extract_lane(bSquared, 1) +
      f32x4.extract_lane(bSquared, 2) +
      f32x4.extract_lane(bSquared, 3);
  }

  // Handle remaining elements
  for (let i = simdLength; i < length; i++) {
    const aVal = load<f32>(aPtr + (i << 2));
    const bVal = load<f32>(bPtr + (i << 2));

    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  if (normA < 1e-12 || normB < 1e-12) return 0.0;

  return dotProduct / (Mathf.sqrt(normA) * Mathf.sqrt(normB));
}

// === JavaScript-Friendly Wrappers ===

/**
 * JS-callable cosine similarity wrapper
 */
export function cosineSimJS(aPtr: usize, bPtr: usize, length: i32): f32 {
  return cosineSimilarity(aPtr, bPtr, length);
}

/**
 * JS-callable dot product wrapper
 */
export function dotProductJS(aPtr: usize, bPtr: usize, length: i32): f32 {
  return dotProduct(aPtr, bPtr, length);
}

/**
 * JS-callable SIMD cosine similarity wrapper
 */
export function cosineSimSIMDJS(aPtr: usize, bPtr: usize, length: i32): f32 {
  return cosineSimilaritySIMD(aPtr, bPtr, length);
}

/**
 * Get memory usage statistics
 */
export function getMemoryStats(): i32 {
  return memory.size() * 65536; // Pages to bytes
}
