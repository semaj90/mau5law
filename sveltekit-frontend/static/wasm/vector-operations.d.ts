/** Exported memory */
export declare const memory: WebAssembly.Memory;
/**
 * src/wasm/vector-operations-basic/cosineSimilarity
 * @param aPtr `usize`
 * @param bPtr `usize`
 * @param length `i32`
 * @returns `f32`
 */
export declare function cosineSimilarity(aPtr: number, bPtr: number, length: number): number;
/**
 * src/wasm/vector-operations-basic/euclideanDistance
 * @param aPtr `usize`
 * @param bPtr `usize`
 * @param length `i32`
 * @returns `f32`
 */
export declare function euclideanDistance(aPtr: number, bPtr: number, length: number): number;
/**
 * src/wasm/vector-operations-basic/dotProduct
 * @param aPtr `usize`
 * @param bPtr `usize`
 * @param length `i32`
 * @returns `f32`
 */
export declare function dotProduct(aPtr: number, bPtr: number, length: number): number;
/**
 * src/wasm/vector-operations-basic/manhattanDistance
 * @param aPtr `usize`
 * @param bPtr `usize`
 * @param length `i32`
 * @returns `f32`
 */
export declare function manhattanDistance(aPtr: number, bPtr: number, length: number): number;
/**
 * src/wasm/vector-operations-basic/normalize
 * @param vectorPtr `usize`
 * @param length `i32`
 */
export declare function normalize(vectorPtr: number, length: number): void;
/**
 * src/wasm/vector-operations-basic/computeBatchSimilarity
 * @param queryPtr `usize`
 * @param vectorsPtr `usize`
 * @param resultsPtr `usize`
 * @param vectorDim `i32`
 * @param vectorCount `i32`
 * @param algorithm `i32`
 */
export declare function computeBatchSimilarity(queryPtr: number, vectorsPtr: number, resultsPtr: number, vectorDim: number, vectorCount: number, algorithm: number): void;
/**
 * src/wasm/vector-operations-basic/hashEmbedding
 * @param textPtr `usize`
 * @param textLen `i32`
 * @param embeddingPtr `usize`
 * @param embeddingDim `i32`
 */
export declare function hashEmbedding(textPtr: number, textLen: number, embeddingPtr: number, embeddingDim: number): void;
