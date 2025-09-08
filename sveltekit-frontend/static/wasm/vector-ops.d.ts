/** Exported memory */
export declare const memory: WebAssembly.Memory;
// Exported runtime interface
export declare function __new(size: number, id: number): number;
export declare function __pin(ptr: number): number;
export declare function __unpin(ptr: number): void;
export declare function __collect(): void;
export declare const __rtti_base: number;
/**
 * src/wasm/vector-operations/cosineSimilarity
 * @param aPtr `usize`
 * @param bPtr `usize`
 * @param length `i32`
 * @returns `f32`
 */
export declare function cosineSimilarity(aPtr: number, bPtr: number, length: number): number;
/**
 * src/wasm/vector-operations/euclideanDistance
 * @param aPtr `usize`
 * @param bPtr `usize`
 * @param length `i32`
 * @returns `f32`
 */
export declare function euclideanDistance(aPtr: number, bPtr: number, length: number): number;
/**
 * src/wasm/vector-operations/dotProduct
 * @param aPtr `usize`
 * @param bPtr `usize`
 * @param length `i32`
 * @returns `f32`
 */
export declare function dotProduct(aPtr: number, bPtr: number, length: number): number;
/**
 * src/wasm/vector-operations/manhattanDistance
 * @param aPtr `usize`
 * @param bPtr `usize`
 * @param length `i32`
 * @returns `f32`
 */
export declare function manhattanDistance(aPtr: number, bPtr: number, length: number): number;
/**
 * src/wasm/vector-operations/normalize
 * @param vectorPtr `usize`
 * @param length `i32`
 */
export declare function normalize(vectorPtr: number, length: number): void;
/**
 * src/wasm/vector-operations/computeBatchSimilarity
 * @param queryPtr `usize`
 * @param vectorsPtr `usize`
 * @param resultsPtr `usize`
 * @param vectorDim `i32`
 * @param vectorCount `i32`
 * @param algorithm `i32`
 */
export declare function computeBatchSimilarity(queryPtr: number, vectorsPtr: number, resultsPtr: number, vectorDim: number, vectorCount: number, algorithm: number): void;
/**
 * src/wasm/vector-operations/hashEmbedding
 * @param textPtr `usize`
 * @param textLen `i32`
 * @param embeddingPtr `usize`
 * @param embeddingDim `i32`
 */
export declare function hashEmbedding(textPtr: number, textLen: number, embeddingPtr: number, embeddingDim: number): void;
/**
 * src/wasm/vector-operations/normalizeVector
 * @param vectorPtr `usize`
 * @param length `i32`
 * @returns `usize`
 */
export declare function normalizeVector(vectorPtr: number, length: number): number;
/**
 * src/wasm/vector-operations/batchNormalizeVectors
 * @param vectorsPtr `usize`
 * @param numVectors `i32`
 * @param vectorLength `i32`
 * @returns `usize`
 */
export declare function batchNormalizeVectors(vectorsPtr: number, numVectors: number, vectorLength: number): number;
