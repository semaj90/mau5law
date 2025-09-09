/** Exported memory */
export declare const memory: WebAssembly.Memory;
/**
 * src/wasm/legal-parser/allocateMemory
 * @param size `i32`
 * @returns `usize`
 */
export declare function allocateMemory(size: number): number;
/**
 * src/wasm/legal-parser/freeMemory
 * @param ptr `usize`
 */
export declare function freeMemory(ptr: number): void;
/**
 * src/wasm/legal-parser/parseDocuments
 * @param jsonPtr `usize`
 * @param jsonLength `i32`
 * @returns `bool`
 */
export declare function parseDocuments(jsonPtr: number, jsonLength: number): boolean;
/**
 * src/wasm/legal-parser/getResultCount
 * @returns `i32`
 */
export declare function getResultCount(): number;
/**
 * src/wasm/legal-parser/getProcessingTime
 * @returns `f32`
 */
export declare function getProcessingTime(): number;
/**
 * src/wasm/legal-parser/getDocument
 * @param index `i32`
 * @param outputPtr `usize`
 * @param maxLength `i32`
 * @returns `i32`
 */
export declare function getDocument(index: number, outputPtr: number, maxLength: number): number;
/**
 * src/wasm/legal-parser/initializeParser
 * @returns `bool`
 */
export declare function initializeParser(): boolean;
/**
 * src/wasm/legal-parser/cleanupParser
 */
export declare function cleanupParser(): void;
/**
 * src/wasm/legal-parser/getMemoryUsage
 * @returns `i32`
 */
export declare function getMemoryUsage(): number;
