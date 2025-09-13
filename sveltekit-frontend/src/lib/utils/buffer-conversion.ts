/**
 * Buffer Conversion Utilities
 * 
 * Fixes Float32Array/ArrayBuffer mismatches in GPU pipeline.
 * Provides safe, type-aware conversions between different buffer types.
 */

export type BufferLike = ArrayBuffer | Float32Array | Uint8Array | Int32Array | Uint32Array | number[];

/**
 * Safe conversion from ArrayBuffer to Float32Array
 * Handles edge cases and provides proper typing
 */
export function arrayBufferToFloat32Array(buffer: ArrayBuffer, offset = 0, length?: number): Float32Array {
  if (!buffer || buffer.byteLength === 0) {
    return new Float32Array(0);
  }
  
  // Ensure proper alignment for Float32Array (4-byte aligned)
  if (offset % 4 !== 0) {
    console.warn('ArrayBuffer offset not 4-byte aligned, copying to aligned buffer');
    const alignedBuffer = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(alignedBuffer).set(new Uint8Array(buffer));
    return new Float32Array(alignedBuffer, 0, length);
  }
  
  return length !== undefined 
    ? new Float32Array(buffer, offset, length)
    : new Float32Array(buffer, offset);
}

/**
 * Safe conversion from Float32Array to ArrayBuffer
 * Returns the underlying buffer with proper boundaries
 */
export function float32ArrayToArrayBuffer(array: Float32Array): ArrayBuffer {
  if (!array || array.length === 0) {
    return new ArrayBuffer(0);
  }
  
  // If the Float32Array is a view of a larger buffer, slice it
  if (array.byteOffset !== 0 || array.byteLength !== array.buffer.byteLength) {
    const newBuffer = new ArrayBuffer(array.byteLength);
    new Uint8Array(newBuffer).set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
    return newBuffer;
  }
  
  // Ensure we return an ArrayBuffer, not ArrayBufferLike
  if (array.buffer instanceof ArrayBuffer) {
    return array.buffer;
  } else {
    // Convert SharedArrayBuffer to ArrayBuffer
    const newBuffer = new ArrayBuffer(array.byteLength);
    new Uint8Array(newBuffer).set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
    return newBuffer;
  }
}

/**
 * Convert any BufferLike to Float32Array safely
 */
export function toFloat32Array(data: BufferLike): Float32Array {
  if (data instanceof Float32Array) {
    return data;
  }
  
  if (data instanceof ArrayBuffer) {
    return arrayBufferToFloat32Array(data);
  }
  
  if (data instanceof Uint8Array) {
    // Convert bytes to float32 values (normalized 0-1)
    const float32 = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      float32[i] = data[i] / 255.0;
    }
    return float32;
  }
  
  if (data instanceof Int32Array || data instanceof Uint32Array) {
    return new Float32Array(data);
  }
  
  if (Array.isArray(data)) {
    return new Float32Array(data);
  }
  
  throw new Error(`Unsupported buffer type: ${(data as any)?.constructor?.name || typeof data}`);
}

/**
 * Convert any BufferLike to ArrayBuffer safely
 */
export function toArrayBuffer(data: BufferLike): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  
  if (data instanceof Float32Array || 
      data instanceof Uint8Array || 
      data instanceof Int32Array || 
      data instanceof Uint32Array) {
    return float32ArrayToArrayBuffer(data as Float32Array);
  }
  
  if (Array.isArray(data)) {
    const float32Array = new Float32Array(data);
    return float32ArrayToArrayBuffer(float32Array);
  }
  
  throw new Error(`Unsupported buffer type: ${(data as any)?.constructor?.name || typeof data}`);
}

/**
 * Create a properly aligned buffer for WebGPU operations
 * WebGPU requires 4-byte alignment for most operations
 */
export function createAlignedBuffer(sizeInBytes: number): ArrayBuffer {
  const alignedSize = Math.ceil(sizeInBytes / 4) * 4; // Round up to nearest 4 bytes
  return new ArrayBuffer(alignedSize);
}

/**
 * Copy data between buffers with proper alignment
 */
export function copyBufferAligned(
  source: BufferLike, 
  target: ArrayBuffer, 
  targetOffset = 0
): void {
  const sourceUint8 = new Uint8Array(toArrayBuffer(source));
  const targetUint8 = new Uint8Array(target, targetOffset);
  
  if (targetUint8.length < sourceUint8.length) {
    throw new Error('Target buffer too small');
  }
  
  targetUint8.set(sourceUint8);
}

/**
 * WebGPU-specific buffer creation utilities
 */
export class WebGPUBufferUtils {
  /**
   * Create a Float32Array from WebGPU mapped buffer range
   * Fixes the common getMappedRange() -> Float32Array conversion issue
   */
  static createFloat32ArrayFromMappedRange(mappedRange: ArrayBuffer): Float32Array {
    // Create a copy to avoid issues with unmapped buffers
    const copy = new ArrayBuffer(mappedRange.byteLength);
    new Uint8Array(copy).set(new Uint8Array(mappedRange));
    return arrayBufferToFloat32Array(copy);
  }
  
  /**
   * Prepare data for WebGPU buffer upload
   */
  static prepareForUpload(data: BufferLike): {
    buffer: ArrayBuffer;
    byteLength: number;
    elementCount: number;
  } {
    const buffer = toArrayBuffer(data);
    const byteLength = buffer.byteLength;
    const elementCount = data instanceof Float32Array ? data.length : byteLength / 4;
    
    return { buffer, byteLength, elementCount };
  }
  
  /**
   * Calculate proper buffer size with padding for WebGPU
   */
  static calculateBufferSize(elementCount: number, bytesPerElement = 4): number {
    const baseSize = elementCount * bytesPerElement;
    // WebGPU buffers should be aligned to 4 bytes
    return Math.ceil(baseSize / 4) * 4;
  }
}

/**
 * Type guards for buffer types
 */
export const BufferTypeGuards = {
  isArrayBuffer: (data: any): data is ArrayBuffer => data instanceof ArrayBuffer,
  isFloat32Array: (data: any): data is Float32Array => data instanceof Float32Array,
  isTypedArray: (data: any): data is Float32Array | Uint8Array | Int32Array | Uint32Array => {
    return data instanceof Float32Array ||
           data instanceof Uint8Array ||
           data instanceof Int32Array ||
           data instanceof Uint32Array;
  },
  isBufferLike: (data: any): data is BufferLike => {
    return data instanceof ArrayBuffer || BufferTypeGuards.isTypedArray(data);
  }
};

/**
 * Debug utilities for buffer inspection
 */
export const BufferDebugUtils = {
  /**
   * Get detailed info about a buffer
   */
  inspectBuffer(data: BufferLike): {
    type: string;
    byteLength: number;
    elementCount?: number;
    alignment: number;
    isAligned: boolean;
  } {
    const type = data.constructor.name;
    let byteLength: number;
    let elementCount: number | undefined;
    
    if (data instanceof ArrayBuffer) {
      byteLength = data.byteLength;
    } else if (Array.isArray(data)) {
      // Handle number[] case
      elementCount = data.length;
      byteLength = data.length * 4; // Assuming 4 bytes per number
    } else {
      // Handle typed arrays
      byteLength = data.byteLength;
      elementCount = data.length;
    }
    
    const alignment = byteLength % 4;
    
    return {
      type,
      byteLength,
      elementCount,
      alignment,
      isAligned: alignment === 0
    };
  },
  
  /**
   * Log buffer info for debugging
   */
  logBuffer(data: BufferLike, label = 'Buffer'): void {
    const info = this.inspectBuffer(data);
    console.log(`${label}:`, {
      ...info,
      preview: data instanceof Float32Array 
        ? `[${Array.from(data.slice(0, 5)).map(n => n.toFixed(3)).join(', ')}...]`
        : `${info.byteLength} bytes`
    });
  }
};

/**
 * Extended WebGPU Buffer Utilities with Quantization Support
 */
export class WebGPUBufferUtils_Advanced {
  /**
   * Create a Float32Array from WebGPU mapped buffer with quantization awareness
   */
  static createFloat32ArrayFromMappedRangeWithQuantization(
    mappedRange: ArrayBuffer,
    originalQuantization?: 'fp32' | 'fp16' | 'int8'
  ): Float32Array {
    // For now, treat all as Float32Array - quantization handling is in typed-array-quantization.ts
    const copy = new ArrayBuffer(mappedRange.byteLength);
    new Uint8Array(copy).set(new Uint8Array(mappedRange));
    return arrayBufferToFloat32Array(copy);
  }

  /**
   * Enhanced buffer preparation that considers quantization needs
   */
  static prepareForUploadAdvanced(
    data: BufferLike,
    options: {
      alignment?: number;
      quantizationHint?: 'precision' | 'performance' | 'storage';
    } = {}
  ): {
    buffer: ArrayBuffer;
    byteLength: number;
    elementCount: number;
    recommendedQuantization: 'fp32' | 'fp16' | 'int8_symmetric';
  } {
    const buffer = toArrayBuffer(data);
    const byteLength = buffer.byteLength;
    const elementCount = data instanceof Float32Array ? data.length : byteLength / 4;
    
    // Recommend quantization based on size and hint
    let recommendedQuantization: 'fp32' | 'fp16' | 'int8_symmetric' = 'fp32';
    
    if (options.quantizationHint === 'storage' || byteLength > 10 * 1024 * 1024) {
      recommendedQuantization = 'int8_symmetric';
    } else if (options.quantizationHint === 'performance' || byteLength > 1024 * 1024) {
      recommendedQuantization = 'fp16';
    }
    
    return { buffer, byteLength, elementCount, recommendedQuantization };
  }
}

export default {
  arrayBufferToFloat32Array,
  float32ArrayToArrayBuffer,
  toFloat32Array,
  toArrayBuffer,
  createAlignedBuffer,
  copyBufferAligned,
  WebGPUBufferUtils,
  WebGPUBufferUtils_Advanced,
  BufferTypeGuards,
  BufferDebugUtils
};