/**
 * WebGPU Buffer Uploader
 * 
 * Automatically picks the right typed array format and creates optimized GPUBuffers
 * Integrates with buffer-conversion.ts and typed-array-quantization.ts
 */

import { 
  WebGPUBufferUtils,
  toArrayBuffer,
  type BufferLike,
  BufferTypeGuards,
  createAlignedBuffer,
  copyBufferAligned
} from './buffer-conversion.js';

import {
  quantizeForWebGPU,
  quantizeForLegalAI,
  type QuantizationMode,
  type LegalAIProfile,
  type WebGPUQuantizationOptions,
  type QuantizedData,
  quantizeWithStats,
  dequantize
} from './typed-array-quantization.js';

export interface WebGPUBufferUploadOptions {
  usage: GPUBufferUsageFlags;
  quantization?: QuantizationMode | LegalAIProfile;
  label?: string;
  mappedAtCreation?: boolean;
  alignment?: number;
  debugMode?: boolean;
}

export interface WebGPUBufferUploadResult {
  buffer: GPUBuffer;
  quantizedData: QuantizedData & { alignedByteLength: number };
  uploadStats: {
    originalSize: number;
    uploadedSize: number;
    compressionRatio: number;
    uploadTime: number;
    alignmentPadding: number;
  };
}

export interface WebGPUBufferDownloadResult {
  data: Float32Array;
  downloadStats: {
    downloadTime: number;
    dequantizationTime: number;
    totalSize: number;
  };
}

export class WebGPUBufferUploader {
  private device: GPUDevice;
  private uploadCache = new Map<string, WebGPUBufferUploadResult>();
  private cacheEnabled = true;
  
  constructor(device: GPUDevice, enableCache = true) {
    this.device = device;
    this.cacheEnabled = enableCache;
  }

  /**
   * Upload data to GPU with automatic quantization and alignment
   */
  async uploadBuffer(
    data: BufferLike | number[],
    options: WebGPUBufferUploadOptions
  ): Promise<WebGPUBufferUploadResult> {
    const startTime = performance.now();
    
    // Generate cache key if caching is enabled
    const cacheKey = this.cacheEnabled ? this.generateCacheKey(data, options) : null;
    if (cacheKey && this.uploadCache.has(cacheKey)) {
      const cached = this.uploadCache.get(cacheKey)!;
      if (options.debugMode) {
        console.log(`📋 WebGPU buffer cache hit: ${cacheKey}`);
      }
      return cached;
    }

    // Determine quantization mode
    const quantMode = this.resolveQuantizationMode(options.quantization);
    
    // Quantize data with WebGPU optimization
    let quantized: QuantizedData & { alignedByteLength: number };
    
    if (this.isLegalAIProfile(options.quantization)) {
      quantized = quantizeForLegalAI(data, options.quantization as LegalAIProfile);
    } else {
      quantized = quantizeForWebGPU(data, {
        mode: quantMode,
        alignment: options.alignment || 4,
        debugLabel: options.label
      });
    }

    // Create aligned buffer if needed
    const needsAlignment = quantized.alignedByteLength > quantized.byteLength;
    let uploadData: ArrayBuffer;
    
    if (needsAlignment) {
      const alignedBuffer = createAlignedBuffer(quantized.alignedByteLength);
      const sourceBuffer = this.getArrayBufferFromQuantizedData(quantized);
      copyBufferAligned(sourceBuffer, alignedBuffer, 0);
      uploadData = alignedBuffer;
    } else {
      uploadData = this.getArrayBufferFromQuantizedData(quantized);
    }

    // Create GPU buffer
    const buffer = this.device.createBuffer({
      size: quantized.alignedByteLength,
      usage: options.usage,
      label: options.label,
      mappedAtCreation: options.mappedAtCreation || false
    });

    // Upload data to GPU
    if (options.mappedAtCreation) {
      const mappedRange = buffer.getMappedRange();
      new Uint8Array(mappedRange).set(new Uint8Array(uploadData));
      buffer.unmap();
    } else {
      this.device.queue.writeBuffer(buffer, 0, uploadData);
    }

    const uploadTime = performance.now() - startTime;
    const originalSize = Array.isArray(data) 
      ? data.length * 4 
      : BufferTypeGuards.isBufferLike(data) 
        ? toArrayBuffer(data).byteLength 
        : data.length * 4;

    const result: WebGPUBufferUploadResult = {
      buffer,
      quantizedData: quantized,
      uploadStats: {
        originalSize,
        uploadedSize: quantized.alignedByteLength,
        compressionRatio: originalSize / quantized.byteLength,
        uploadTime,
        alignmentPadding: quantized.alignedByteLength - quantized.byteLength
      }
    };

    // Cache the result
    if (cacheKey) {
      this.uploadCache.set(cacheKey, result);
    }

    if (options.debugMode) {
      console.log(`🚀 WebGPU buffer uploaded:`, {
        label: options.label,
        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
        uploadedSize: `${(quantized.alignedByteLength / 1024).toFixed(2)} KB`,
        compressionRatio: `${result.uploadStats.compressionRatio.toFixed(2)}x`,
        uploadTime: `${uploadTime.toFixed(2)}ms`,
        quantization: options.quantization
      });
    }

    return result;
  }

  /**
   * Download and dequantize data from GPU buffer
   */
  async downloadBuffer(
    buffer: GPUBuffer,
    quantizedData: QuantizedData,
    debugMode = false
  ): Promise<WebGPUBufferDownloadResult> {
    const downloadStart = performance.now();

    // Create staging buffer for reading
    const stagingBuffer = this.device.createBuffer({
      size: quantizedData.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      label: 'webgpu-downloader-staging'
    });

    // Copy data from GPU buffer to staging buffer
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(
      buffer, 0,
      stagingBuffer, 0,
      quantizedData.byteLength
    );
    this.device.queue.submit([commandEncoder.finish()]);

    // Map and read the staging buffer
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const mappedRange = stagingBuffer.getMappedRange();
    
    // Use proper buffer handling utility
    const downloadedData = WebGPUBufferUtils.createFloat32ArrayFromMappedRange(mappedRange);
    stagingBuffer.unmap();
    
    const downloadTime = performance.now() - downloadStart;
    
    // Reconstruct the quantized data structure for dequantization
    const reconstructedQuantized: QuantizedData = {
      data: this.reconstructTypedArrayFromDownload(downloadedData, quantizedData.originalType),
      originalType: quantizedData.originalType,
      params: quantizedData.params,
      byteLength: quantizedData.byteLength,
      compressionRatio: quantizedData.compressionRatio
    };

    // Dequantize the data
    const dequantStart = performance.now();
    const dequantizedData = dequantize(reconstructedQuantized);
    const dequantizationTime = performance.now() - dequantStart;

    // Cleanup
    stagingBuffer.destroy();

    const result: WebGPUBufferDownloadResult = {
      data: dequantizedData,
      downloadStats: {
        downloadTime,
        dequantizationTime,
        totalSize: quantizedData.byteLength
      }
    };

    if (debugMode) {
      console.log(`📥 WebGPU buffer downloaded:`, {
        size: `${(quantizedData.byteLength / 1024).toFixed(2)} KB`,
        downloadTime: `${downloadTime.toFixed(2)}ms`,
        dequantizationTime: `${dequantizationTime.toFixed(2)}ms`,
        totalTime: `${(downloadTime + dequantizationTime).toFixed(2)}ms`
      });
    }

    return result;
  }

  /**
   * Create compute-optimized buffer for shader operations
   */
  async createComputeBuffer(
    data: BufferLike | number[],
    options: Omit<WebGPUBufferUploadOptions, 'usage'> = {}
  ): Promise<WebGPUBufferUploadResult> {
    return this.uploadBuffer(data, {
      ...options,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
  }

  /**
   * Create uniform buffer for shader constants
   */
  async createUniformBuffer(
    data: BufferLike | number[],
    options: Omit<WebGPUBufferUploadOptions, 'usage'> = {}
  ): Promise<WebGPUBufferUploadResult> {
    return this.uploadBuffer(data, {
      ...options,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      alignment: 16, // Uniform buffers require 16-byte alignment
      quantization: 'fp32' // Uniforms typically need full precision
    });
  }

  /**
   * Batch upload multiple buffers with the same settings
   */
  async uploadBatch(
    dataArray: (BufferLike | number[])[],
    options: WebGPUBufferUploadOptions
  ): Promise<WebGPUBufferUploadResult[]> {
    const results = await Promise.all(
      dataArray.map((data, index) => 
        this.uploadBuffer(data, {
          ...options,
          label: options.label ? `${options.label}_${index}` : `batch_${index}`
        })
      )
    );

    if (options.debugMode) {
      const totalOriginalSize = results.reduce((sum, r) => sum + r.uploadStats.originalSize, 0);
      const totalUploadedSize = results.reduce((sum, r) => sum + r.uploadStats.uploadedSize, 0);
      console.log(`📦 WebGPU batch upload complete:`, {
        bufferCount: results.length,
        totalOriginalSize: `${(totalOriginalSize / 1024).toFixed(2)} KB`,
        totalUploadedSize: `${(totalUploadedSize / 1024).toFixed(2)} KB`,
        averageCompressionRatio: `${(totalOriginalSize / totalUploadedSize).toFixed(2)}x`
      });
    }

    return results;
  }

  /**
   * Legal AI specific buffer creation methods
   */
  async createLegalAnalysisBuffer(
    data: BufferLike | number[],
    priority: 'critical' | 'standard' | 'compressed' | 'storage' = 'standard'
  ): Promise<WebGPUBufferUploadResult> {
    const profileMap = {
      critical: 'legal_critical' as LegalAIProfile,
      standard: 'legal_standard' as LegalAIProfile,
      compressed: 'legal_compressed' as LegalAIProfile,
      storage: 'legal_storage' as LegalAIProfile
    };

    return this.createComputeBuffer(data, {
      quantization: profileMap[priority],
      label: `legal-analysis-${priority}`,
      debugMode: true
    });
  }

  /**
   * Clear upload cache
   */
  clearCache(): void {
    // Destroy all cached buffers
    for (const result of this.uploadCache.values()) {
      if (!result.buffer.destroy) continue;
      try {
        result.buffer.destroy();
      } catch (e) {
        // Buffer may already be destroyed
      }
    }
    this.uploadCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const entries = Array.from(this.uploadCache.values());
    const totalCachedSize = entries.reduce((sum, entry) => sum + entry.uploadStats.uploadedSize, 0);
    
    return {
      entryCount: entries.length,
      totalSize: totalCachedSize,
      totalSizeKB: (totalCachedSize / 1024).toFixed(2),
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  // Private helper methods
  private generateCacheKey(data: BufferLike | number[], options: WebGPUBufferUploadOptions): string {
    const dataHash = this.hashData(data);
    const optionsHash = this.hashOptions(options);
    return `${dataHash}_${optionsHash}`;
  }

  private hashData(data: BufferLike | number[]): string {
    // Simple hash based on data length and first/last values
    if (Array.isArray(data)) {
      return `arr_${data.length}_${data[0]}_${data[data.length - 1]}`;
    }
    const buffer = toArrayBuffer(data);
    const view = new Uint8Array(buffer);
    return `buf_${buffer.byteLength}_${view[0]}_${view[view.length - 1]}`;
  }

  private hashOptions(options: WebGPUBufferUploadOptions): string {
    return `${options.usage}_${options.quantization}_${options.alignment || 4}`;
  }

  private resolveQuantizationMode(quantization?: QuantizationMode | LegalAIProfile): QuantizationMode {
    if (!quantization) return 'fp32';
    if (this.isLegalAIProfile(quantization)) {
      // Convert LegalAI profile to quantization mode
      const profileModes = {
        legal_critical: 'fp32',
        legal_standard: 'fp16',
        legal_compressed: 'int8_symmetric',
        legal_storage: 'int8_asymmetric'
      } as const;
      return profileModes[quantization as LegalAIProfile] as QuantizationMode;
    }
    return quantization as QuantizationMode;
  }

  private isLegalAIProfile(quantization?: string): boolean {
    return quantization?.startsWith('legal_') || false;
  }

  private getArrayBufferFromQuantizedData(quantized: QuantizedData): ArrayBuffer {
    if (quantized.data instanceof Float32Array) {
      return quantized.data.buffer.slice(
        quantized.data.byteOffset,
        quantized.data.byteOffset + quantized.data.byteLength
      );
    }
    if (quantized.data instanceof Uint16Array || quantized.data instanceof Int8Array) {
      return quantized.data.buffer.slice(
        quantized.data.byteOffset,
        quantized.data.byteOffset + quantized.data.byteLength
      );
    }
    throw new Error(`Unsupported quantized data type: ${quantized.data.constructor.name}`);
  }

  private reconstructTypedArrayFromDownload(
    downloadedData: Float32Array, 
    originalType: QuantizationMode
  ): Float32Array | Uint16Array | Int8Array {
    switch (originalType) {
      case 'fp32':
        return downloadedData;
      case 'fp16':
        return new Uint16Array(downloadedData.buffer, downloadedData.byteOffset, downloadedData.length);
      case 'int8_symmetric':
      case 'int8_asymmetric':
        return new Int8Array(downloadedData.buffer, downloadedData.byteOffset, downloadedData.length * 4);
      default:
        return downloadedData;
    }
  }
}

/**
 * Utility functions for quick buffer operations
 */
export namespace WebGPUBufferUtils_Extended {
  /**
   * Quick upload for compute shaders
   */
  export async function uploadForCompute(
    device: GPUDevice,
    data: BufferLike | number[],
    options: Partial<WebGPUBufferUploadOptions> = {}
  ): Promise<GPUBuffer> {
    const uploader = new WebGPUBufferUploader(device, false);
    const result = await uploader.createComputeBuffer(data, options);
    return result.buffer;
  }

  /**
   * Quick upload with legal AI optimization
   */
  export async function uploadForLegalAI(
    device: GPUDevice,
    data: BufferLike | number[],
    priority: 'critical' | 'standard' | 'compressed' | 'storage' = 'standard'
  ): Promise<GPUBuffer> {
    const uploader = new WebGPUBufferUploader(device, false);
    const result = await uploader.createLegalAnalysisBuffer(data, priority);
    return result.buffer;
  }

  /**
   * Create buffer with automatic quantization based on data size
   */
  export async function uploadWithAutoQuantization(
    device: GPUDevice,
    data: BufferLike | number[],
    sizeThresholds = { fp16: 1024 * 1024, int8: 10 * 1024 * 1024 } // 1MB, 10MB
  ): Promise<GPUBuffer> {
    const dataSize = Array.isArray(data) 
      ? data.length * 4 
      : toArrayBuffer(data).byteLength;
    
    let quantization: QuantizationMode = 'fp32';
    if (dataSize > sizeThresholds.int8) {
      quantization = 'int8_symmetric';
    } else if (dataSize > sizeThresholds.fp16) {
      quantization = 'fp16';
    }

    return uploadForCompute(device, data, { quantization });
  }
}

export default WebGPUBufferUploader;