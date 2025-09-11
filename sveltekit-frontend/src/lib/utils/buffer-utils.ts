/**
 * WebGPU Buffer Compatibility Utilities
 * Resolves TypeScript errors related to WebGPU buffer type mismatches
 * Modern patterns for SvelteKit 2 + Svelte 5 + WebGPU integration
 */

// Type definitions for buffer compatibility
export type BufferCompatible = Float32Array | Uint32Array | Uint16Array | Int8Array | number[] | ArrayBuffer;
export type TypedArrayLike = Float32Array | Uint32Array | Uint16Array | Int8Array;

/**
 * Ensures data is compatible with WebGPU buffer operations
 * Fixes: Float32Array<ArrayBufferLike> incompatible with GPUAllowSharedBufferSource
 */
export const ensureBufferCompatibility = (data: BufferCompatible): ArrayBuffer => {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  
  if (Array.isArray(data)) {
    // Convert number array to Float32Array, then to ArrayBuffer
    const typedArray = new Float32Array(data);
    return typedArray.buffer.slice(typedArray.byteOffset, typedArray.byteOffset + typedArray.byteLength);
  }
  
  // For typed arrays, extract the underlying ArrayBuffer
  if (data instanceof Float32Array || data instanceof Uint32Array || data instanceof Uint16Array || data instanceof Int8Array) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  
  throw new Error(`Unsupported buffer type: ${typeof data}`);
};

/**
 * Ensures data is a Float32Array for WebGPU operations
 * Fixes: Type 'number[]' is missing properties from Float32Array
 */
export const ensureFloat32Array = (data: BufferCompatible): Float32Array => {
  if (data instanceof Float32Array) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return new Float32Array(data);
  }
  
  if (data instanceof ArrayBuffer) {
    return new Float32Array(data);
  }
  
  if (data instanceof Uint32Array || data instanceof Uint16Array || data instanceof Int8Array) {
    return new Float32Array(data);
  }
  
  throw new Error(`Cannot convert ${typeof data} to Float32Array`);
};

/**
 * Type-safe WebGPU buffer creation with proper error handling
 * Fixes: GPUBuffer | null compatibility issues
 */
export const createWebGPUBuffer = (
  device: GPUDevice, 
  data: BufferCompatible, 
  usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
): GPUBuffer => {
  const compatibleData = ensureBufferCompatibility(data);
  
  const buffer = device.createBuffer({
    size: compatibleData.byteLength,
    usage,
  });
  
  device.queue.writeBuffer(buffer, 0, compatibleData);
  return buffer;
};

/**
 * Safe WebGPU buffer write operation with null checking
 * Fixes: Object is possibly 'null' errors
 */
export const safeWriteBuffer = (
  device: GPUDevice,
  buffer: GPUBuffer | null, 
  data: BufferCompatible,
  offset: number = 0
): boolean => {
  try {
    if (!buffer) {
      console.warn('Buffer is null - cannot write data');
      return false;
    }
    
    if (!device) {
      console.warn('Device is null - cannot write buffer');
      return false;
    }
    
    const compatibleData = ensureBufferCompatibility(data);
    device.queue.writeBuffer(buffer, offset, compatibleData);
    return true;
  } catch (error) {
    console.error('Buffer write failed:', error);
    return false;
  }
};

/**
 * Buffer size calculation utility
 * Helps with proper buffer allocation
 */
export const calculateBufferSize = (data: BufferCompatible, alignment: number = 4): number => {
  let size: number;
  
  if (data instanceof ArrayBuffer) {
    size = data.byteLength;
  } else if (Array.isArray(data)) {
    size = data.length * 4; // Assume Float32 (4 bytes per element)
  } else if (data instanceof Float32Array) {
    size = data.byteLength;
  } else if (data instanceof Uint32Array) {
    size = data.byteLength;
  } else if (data instanceof Uint16Array) {
    size = data.byteLength;
  } else if (data instanceof Int8Array) {
    size = data.byteLength;
  } else {
    throw new Error(`Cannot calculate size for ${typeof data}`);
  }
  
  // Ensure proper alignment for WebGPU
  return Math.ceil(size / alignment) * alignment;
};

/**
 * WebGPU-compatible vertex data structure
 * Fixes vertex streaming type issues
 */
export interface WebGPUVertex {
  position: [number, number, number];
  color: [number, number, number, number];
  texCoord?: [number, number];
}

/**
 * Convert vertex objects to WebGPU-compatible buffer
 */
export const verticesToBuffer = (vertices: WebGPUVertex[]): Float32Array => {
  const floatArray: number[] = [];
  
  for (const vertex of vertices) {
    floatArray.push(...vertex.position);
    floatArray.push(...vertex.color);
    if (vertex.texCoord) {
      floatArray.push(...vertex.texCoord);
    }
  }
  
  return new Float32Array(floatArray);
};

/**
 * Legal document-specific buffer utilities
 * For the legal AI platform's specific needs
 */
export interface LegalDocumentBuffer {
  documentId: string;
  embeddings: Float32Array;
  metadata: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const createLegalDocumentBuffer = (
  device: GPUDevice,
  doc: LegalDocumentBuffer
): { buffer: GPUBuffer; byteLength: number } => {
  const embeddingData = ensureBufferCompatibility(doc.embeddings);
  const buffer = createWebGPUBuffer(device, embeddingData, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
  
  return {
    buffer,
    byteLength: embeddingData.byteLength
  };
};

/**
 * Risk level color mapping with proper typing
 * Fixes index signature issues for risk level colors
 */
export const getRiskLevelColor = (riskLevel: string): [number, number, number, number] => {
  const colors: Record<string, [number, number, number, number]> = {
    low: [0.2, 0.8, 0.2, 1.0],
    medium: [1.0, 1.0, 0.4, 1.0],
    high: [1.0, 0.6, 0.2, 1.0],
    critical: [1.0, 0.2, 0.2, 1.0]
  };
  
  return colors[riskLevel] || colors.low;
};

/**
 * Document type mapping with proper typing
 * Fixes index signature issues for document types
 */
export const getDocumentTypeColor = (docType: string): [number, number, number] => {
  const colors: Record<string, [number, number, number]> = {
    contract: [0.2, 0.6, 1.0],
    evidence: [1.0, 0.4, 0.2],
    brief: [0.8, 0.8, 0.2],
    citation: [0.6, 0.2, 1.0],
    'case-law': [0.4, 1.0, 0.6]
  };
  
  return colors[docType] || colors.contract;
};

// Export all utilities as default for easy importing
export default {
  ensureBufferCompatibility,
  ensureFloat32Array,
  createWebGPUBuffer,
  safeWriteBuffer,
  calculateBufferSize,
  verticesToBuffer,
  createLegalDocumentBuffer,
  getRiskLevelColor,
  getDocumentTypeColor
};