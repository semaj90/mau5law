/**
 * Protobuf-style type definitions for QLoRA binary transport
 * These types ensure type safety for binary serialization/deserialization
 */

export interface QLoRAProtobufTopologyRequest {
  query: string;
  context?: string;
  topologyType: 'legal' | 'general' | 'technical';
  accuracyTarget: number;
  useCache: boolean;
  trainingMode: boolean;
  binaryResponse: boolean;
  timestamp: number;
}

export interface QLoRAProtobufMetrics {
  hmmPredictionScore: number;
  somClusterAccuracy: number;
  webgpuOptimizationGain: number;
  cacheEfficiency: number;
  tensorOperations?: number;
  memoryUsage?: number;
  gpuUtilization?: number;
}

export interface QLoRAProtobufLearningData {
  dataFlywheelSamples: number;
  modelUpdateApplied: boolean;
  accuracyImprovement: number;
  trainingIterations?: number;
  lossReduction?: number;
  convergenceScore?: number;
}

export interface QLoRAProtobufTopologyResponse {
  prediction: {
    type: string;
    confidence: number;
    vectors: Float32Array; // 1536-dimension vectors
    clusters: number[];
    topology: {
      nodes: number;
      edges: number;
      connectivity: number;
    };
  };
  accuracy: number;
  topology: {
    structure: string;
    complexity: number;
    patternMatch: number;
  };
  cacheHit: boolean;
  processingTime: number;
  metrics: QLoRAProtobufMetrics;
  learningData?: QLoRAProtobufLearningData;
  binaryMetadata: {
    compressionRatio: number;
    originalSize: number;
    compressedSize: number;
    encoding: 'gzip' | 'brotli' | 'lz4';
  };
}

/**
 * Binary serialization utilities for protobuf-like encoding
 */
export class QLoRABinaryCodec {
  
  /**
   * Encode QLoRA response to binary format with compression
   */
  static encode(response: QLoRAProtobufTopologyResponse): Buffer {
    // Convert to binary representation
    const jsonString = JSON.stringify(response, (key, value) => {
      // Handle Float32Array serialization
      if (value instanceof Float32Array) {
        return {
          __type: 'Float32Array',
          data: Array.from(value)
        };
      }
      return value;
    });

    // Use gzip compression for optimal size/speed balance
    const pako = require('pako');
    return Buffer.from(pako.gzip(jsonString));
  }

  /**
   * Decode binary data back to QLoRA response
   */
  static decode(buffer: Buffer): QLoRAProtobufTopologyResponse {
    const pako = require('pako');
    const decompressed = pako.ungzip(buffer, { to: 'string' });
    
    return JSON.parse(decompressed, (key, value) => {
      // Restore Float32Array
      if (value && value.__type === 'Float32Array') {
        return new Float32Array(value.data);
      }
      return value;
    });
  }

  /**
   * Calculate compression statistics
   */
  static getCompressionStats(original: any, compressed: Buffer): {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  } {
    const originalSize = JSON.stringify(original).length;
    const compressedSize = compressed.length;
    
    return {
      originalSize,
      compressedSize,
      compressionRatio: Math.round((originalSize / compressedSize) * 100) / 100
    };
  }
}

/**
 * Cache key generation for neural asset caching
 */
export class QLoRANetworkCacheKey {
  
  /**
   * Generate deterministic cache key from request parameters
   */
  static generate(request: QLoRAProtobufTopologyRequest): string {
    const crypto = require('crypto');
    
    // Create deterministic hash of core parameters
    const cacheableParams = {
      query: request.query,
      context: request.context || '',
      topologyType: request.topologyType,
      accuracyTarget: request.accuracyTarget,
      trainingMode: request.trainingMode
    };
    
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(cacheableParams));
    return `qlora:neural:${hash.digest('hex').substring(0, 16)}`;
  }

  /**
   * Generate asset-specific cache key for binary assets
   */
  static generateAssetKey(assetType: string, parameters: Record<string, any>): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(`${assetType}:${JSON.stringify(parameters)}`);
    return `asset:${assetType}:${hash.digest('hex').substring(0, 12)}`;
  }
}

/**
 * Performance monitoring for binary transport
 */
export interface QLoRABinaryPerformanceMetrics {
  requestSize: number;
  responseSize: number;
  compressionRatio: number;
  processingTime: number;
  cacheHit: boolean;
  networkLatency?: number;
  gpuTime?: number;
  serializationTime?: number;
  deserializationTime?: number;
}

export class QLoRAPerformanceMonitor {
  private static metrics: QLoRABinaryPerformanceMetrics[] = [];
  
  static recordMetrics(metrics: QLoRABinaryPerformanceMetrics): void {
    this.metrics.push({
      ...metrics,
      timestamp: Date.now()
    } as any);
    
    // Keep only last 100 entries for memory efficiency
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }
  
  static getAverageMetrics(): Partial<QLoRABinaryPerformanceMetrics> {
    if (this.metrics.length === 0) return {};
    
    const totals = this.metrics.reduce((acc, m) => ({
      requestSize: acc.requestSize + m.requestSize,
      responseSize: acc.responseSize + m.responseSize,
      compressionRatio: acc.compressionRatio + m.compressionRatio,
      processingTime: acc.processingTime + m.processingTime,
      cacheHitRate: acc.cacheHitRate + (m.cacheHit ? 1 : 0)
    } as any), {
      requestSize: 0,
      responseSize: 0,
      compressionRatio: 0,
      processingTime: 0,
      cacheHitRate: 0
    });
    
    const count = this.metrics.length;
    return {
      requestSize: Math.round(totals.requestSize / count),
      responseSize: Math.round(totals.responseSize / count),
      compressionRatio: Math.round((totals.compressionRatio / count) * 100) / 100,
      processingTime: Math.round(totals.processingTime / count),
      cacheHit: totals.cacheHitRate / count > 0.5
    };
  }
}