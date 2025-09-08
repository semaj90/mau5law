// AssemblyScript module for high-performance vector operations
// Compiles to WebAssembly for client-side acceleration

// Vector similarity calculation
export function cosineSimilarity(aPtr: usize, bPtr: usize, length: i32): f32 {
  if (length <= 0) return 0.0;

  let dotProduct: f32 = 0.0;
  let normA: f32 = 0.0;
  let normB: f32 = 0.0;

  for (let i = 0; i < length; i++) {
    let aVal = load<f32>(aPtr + (i << 2)); // i * 4 bytes
    let bVal = load<f32>(bPtr + (i << 2));

    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  if (normA == 0.0 || normB == 0.0) return 0.0;

  return dotProduct / (Mathf.sqrt(normA) * Mathf.sqrt(normB));
}

// Euclidean distance calculation
export function euclideanDistance(aPtr: usize, bPtr: usize, length: i32): f32 {
  if (length <= 0) return <f32>Infinity;

  let sum: f32 = 0.0;
  for (let i = 0; i < length; i++) {
    let aVal = load<f32>(aPtr + (i << 2));
    let bVal = load<f32>(bPtr + (i << 2));
    let diff = aVal - bVal;
    sum += diff * diff;
  }

  return Mathf.sqrt(sum);
}

// Dot product calculation
export function dotProduct(aPtr: usize, bPtr: usize, length: i32): f32 {
  if (length <= 0) return 0.0;

  let result: f32 = 0.0;
  for (let i = 0; i < length; i++) {
    let aVal = load<f32>(aPtr + (i << 2));
    let bVal = load<f32>(bPtr + (i << 2));
    result += aVal * bVal;
  }

  return result;
}

// Manhattan distance
export function manhattanDistance(aPtr: usize, bPtr: usize, length: i32): f32 {
  if (length <= 0) return <f32>Infinity;

  let sum: f32 = 0.0;
  for (let i = 0; i < length; i++) {
    let aVal = load<f32>(aPtr + (i << 2));
    let bVal = load<f32>(bPtr + (i << 2));
    sum += Mathf.abs(aVal - bVal);
  }

  return sum;
}

// Vector normalization in place
export function normalize(vectorPtr: usize, length: i32): void {
  if (length <= 0) return;

  let norm: f32 = 0.0;

  // Calculate norm
  for (let i = 0; i < length; i++) {
    let val = load<f32>(vectorPtr + (i << 2));
    norm += val * val;
  }
  norm = Mathf.sqrt(norm);

  if (norm == 0.0) return;

  // Normalize in place
  for (let i = 0; i < length; i++) {
    let addr = vectorPtr + (i << 2);
    let val = load<f32>(addr);
    store<f32>(addr, val / norm);
  }
}

// Batch vector similarity computation
export function computeBatchSimilarity(
  queryPtr: usize,
  vectorsPtr: usize,
  resultsPtr: usize,
  vectorDim: i32,
  vectorCount: i32,
  algorithm: i32 // 0: cosine, 1: euclidean, 2: dot, 3: manhattan
): void {
  for (let i = 0; i < vectorCount; i++) {
    let vectorPtr = vectorsPtr + (i * vectorDim * 4); // 4 bytes per f32
    let result: f32 = 0.0;

    switch (algorithm) {
      case 0: // cosine
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

// Simple hash function for text to embedding
export function hashEmbedding(textPtr: usize, textLen: i32, embeddingPtr: usize, embeddingDim: i32): void {
  if (textLen <= 0 || embeddingDim <= 0) return;

  // Clear the embedding first
  for (let i = 0; i < embeddingDim; i++) {
    store<f32>(embeddingPtr + (i << 2), 0.0);
  }

  let hash: u32 = 2166136261; // FNV offset basis

  for (let i = 0; i < textLen; i++) {
    let char = load<u8>(textPtr + i);
    hash ^= char;
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);

    let idx = hash % <u32>embeddingDim;
    let addr = embeddingPtr + (idx << 2);
    let currentVal = load<f32>(addr);
    store<f32>(addr, currentVal + 1.0);
  }

  // Normalize the embedding
  normalize(embeddingPtr, embeddingDim);
}

/**
 * Z-score normalization with tanh activation for tensor processing
 * Returns pointer to new normalized vector
 */
export function normalizeVector(vectorPtr: usize, length: i32): usize {
  if (length <= 0) return 0;

  const resultPtr = __new(length * 4, 0); // Allocate for f32 array

  // Calculate mean
  let sum: f32 = 0.0;
  for (let i = 0; i < length; i++) {
    sum += load<f32>(vectorPtr + (i << 2));
  }
  const mean = sum / f32(length);

  // Calculate variance
  let sumSquares: f32 = 0.0;
  for (let i = 0; i < length; i++) {
    const val = load<f32>(vectorPtr + (i << 2));
    const diff = val - mean;
    sumSquares += diff * diff;
  }
  const variance = sumSquares / f32(length);
  const stdDev = Mathf.sqrt(variance + 1e-8); // Add epsilon for stability

  // Normalize and apply tanh activation
  for (let i = 0; i < length; i++) {
    const val = load<f32>(vectorPtr + (i << 2));
    const normalized = (val - mean) / stdDev;
    const activated = Mathf.tanh(normalized * 0.5);
    store<f32>(resultPtr + (i << 2), activated);
  }

  return resultPtr;
}

/**
 * Batch normalize multiple vectors for tensor processing
 */
export function batchNormalizeVectors(vectorsPtr: usize, numVectors: i32, vectorLength: i32): usize {
  if (numVectors <= 0 || vectorLength <= 0) return 0;

  const resultPtr = __new(numVectors * vectorLength * 4, 0); // Allocate for f32 array

  for (let v = 0; v < numVectors; v++) {
    const vectorOffset = v * vectorLength * 4;
    const currentVectorPtr = vectorsPtr + vectorOffset;
    const normalizedPtr = normalizeVector(currentVectorPtr, vectorLength);

    // Copy normalized vector to result
    for (let i = 0; i < vectorLength; i++) {
      const val = load<f32>(normalizedPtr + (i << 2));
      store<f32>(resultPtr + vectorOffset + (i << 2), val);
    }

    // Clean up temporary normalized vector
    __unpin(normalizedPtr);
  }

  return resultPtr;
}