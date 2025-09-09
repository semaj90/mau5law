/**
 * WebGPU Compatibility Helpers
 * Fixes common WebGPU API usage issues across the codebase
 */

// Helper function to safely write buffers in WebGPU
export function safeWriteBuffer(
  queue: GPUQueue,
  buffer: GPUBuffer,
  offset: number,
  data: ArrayBufferView | ArrayBuffer
): void {
  if (data instanceof ArrayBuffer) {
    queue.writeBuffer(buffer, offset, data);
  } else {
    // Convert typed array to ArrayBuffer
    queue.writeBuffer(buffer, offset, data.buffer, data.byteOffset, data.byteLength);
  }
}

// Helper to get GPU adapter info safely
export function getAdapterInfo(adapter: GPUAdapter): { name: string; vendor?: string } {
  // GPUAdapter doesn't have a direct 'name' property in the spec
  // Use info property if available, or fallback
  const info = (adapter as any).info;
  if (info) {
    return {
      name: info.device || info.description || 'Unknown GPU',
      vendor: info.vendor
    };
  }

  return {
    name: 'Unknown GPU Device',
    vendor: 'Unknown'
  };
}

// Helper to create Float32Array from ArrayBufferLike safely
export function createFloat32Array(buffer: ArrayBufferLike, offset = 0, length?: number): Float32Array {
  if (buffer instanceof ArrayBuffer) {
    return new Float32Array(buffer, offset, length);
  }

  // For SharedArrayBuffer or other ArrayBufferLike types
  return new Float32Array(buffer as ArrayBuffer, offset, length);
}

// WebGPU feature detection
export async function checkWebGPUSupport(): Promise<{
  supported: boolean;
  adapter?: GPUAdapter;
  device?: GPUDevice;
  features: string[];
}> {
  if (!navigator.gpu) {
    return { supported: false, features: [] };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return { supported: false, features: [] };
    }

    const device = await adapter.requestDevice();
    const features = Array.from(adapter.features);

    return {
      supported: true,
      adapter,
      device,
      features
    };
  } catch (error) {
    console.warn('WebGPU not supported:', error);
    return { supported: false, features: [] };
  }
}

export default {
  safeWriteBuffer,
  getAdapterInfo,
  createFloat32Array,
  checkWebGPUSupport
};
