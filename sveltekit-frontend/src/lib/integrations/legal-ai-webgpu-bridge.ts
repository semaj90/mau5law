/**
 * Legal AI WebGPU Integration Bridge
 * 
 * Connects existing legal AI components with the new WebGPU buffer quantization system.
 * Provides seamless integration for legal document processing workflows.
 */

import { WebGPUBufferUploader, WebGPUBufferUtils_Extended } from '$lib/utils/webgpu-buffer-uploader.js';
import { quantizeForLegalAI, type LegalAIProfile } from '$lib/utils/typed-array-quantization.js';
import { toFloat32Array, BufferDebugUtils } from '$lib/utils/buffer-conversion.js';

export interface LegalDocumentProcessingOptions {
  profile?: LegalAIProfile;
  documentType?: 'contract' | 'brief' | 'evidence' | 'case-law' | 'citation';
  priority?: 'high' | 'medium' | 'low';
  enableCaching?: boolean;
  debugMode?: boolean;
}

export interface LegalAIProcessingResult {
  buffer: GPUBuffer;
  compressionStats: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    spaceSavings: string;
  };
  processingTime: number;
  profile: LegalAIProfile;
  cacheHit: boolean;
}

/**
 * Legal AI WebGPU Bridge for seamless integration
 */
export class LegalAIWebGPUBridge {
  private uploader: WebGPUBufferUploader | null = null;
  private device: GPUDevice | null = null;
  private isInitialized = false;

  constructor() {
    // Auto-initialize if WebGPU is available
    if (typeof window !== 'undefined' && 'gpu' in navigator) {
      this.initialize();
    }
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized && this.device && this.uploader) {
      return true;
    }

    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported - Legal AI bridge will use CPU fallback');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn('WebGPU adapter not available - Legal AI bridge will use CPU fallback');
        return false;
      }

      this.device = await adapter.requestDevice();
      this.uploader = new WebGPUBufferUploader(this.device, true); // Enable caching
      this.isInitialized = true;

      console.log('✅ Legal AI WebGPU Bridge initialized');
      return true;
    } catch (error) {
      console.error('❌ Legal AI WebGPU Bridge initialization failed:', error);
      return false;
    }
  }

  /**
   * Process legal document embeddings with optimized quantization
   */
  async processLegalDocumentEmbeddings(
    embeddings: Float32Array | number[] | ArrayBuffer,
    options: LegalDocumentProcessingOptions = {}
  ): Promise<LegalAIProcessingResult> {
    if (!this.isInitialized || !this.uploader) {
      throw new Error('Legal AI WebGPU Bridge not initialized');
    }

    const startTime = performance.now();
    
    // Determine optimal profile based on document type
    const profile = this.selectOptimalProfile(options);
    
    // Process with WebGPU quantization
    const uploadResult = await this.uploader.createLegalAnalysisBuffer(
      embeddings,
      profile.replace('legal_', '') as any
    );

    const processingTime = performance.now() - startTime;

    if (options.debugMode) {
      console.log(`🏛️ Legal AI processing complete:`, {
        documentType: options.documentType,
        profile,
        compressionRatio: `${uploadResult.uploadStats.compressionRatio.toFixed(2)}x`,
        processingTime: `${processingTime.toFixed(2)}ms`
      });
    }

    return {
      buffer: uploadResult.buffer,
      compressionStats: {
        originalSize: uploadResult.uploadStats.originalSize,
        compressedSize: uploadResult.uploadStats.uploadedSize,
        compressionRatio: uploadResult.uploadStats.compressionRatio,
        spaceSavings: `${(((uploadResult.uploadStats.originalSize - uploadResult.uploadStats.uploadedSize) / uploadResult.uploadStats.originalSize) * 100).toFixed(1)}%`
      },
      processingTime,
      profile,
      cacheHit: false // TODO: Implement cache hit detection
    };
  }

  /**
   * Batch process multiple legal documents with optimal resource management
   */
  async batchProcessLegalDocuments(
    documents: Array<{
      embeddings: Float32Array | number[] | ArrayBuffer;
      type?: LegalDocumentProcessingOptions['documentType'];
      priority?: LegalDocumentProcessingOptions['priority'];
    }>,
    globalOptions: LegalDocumentProcessingOptions = {}
  ): Promise<LegalAIProcessingResult[]> {
    if (!this.isInitialized || !this.uploader) {
      throw new Error('Legal AI WebGPU Bridge not initialized');
    }

    const results: LegalAIProcessingResult[] = [];
    const startTime = performance.now();

    // Sort documents by priority for optimal processing order
    const sortedDocuments = [...documents].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      return aPriority - bPriority;
    });

    for (const doc of sortedDocuments) {
      const result = await this.processLegalDocumentEmbeddings(doc.embeddings, {
        ...globalOptions,
        documentType: doc.type,
        priority: doc.priority
      });
      results.push(result);
    }

    const totalTime = performance.now() - startTime;

    if (globalOptions.debugMode) {
      console.log(`📦 Batch processing complete:`, {
        documentCount: documents.length,
        totalTime: `${totalTime.toFixed(2)}ms`,
        averageTime: `${(totalTime / documents.length).toFixed(2)}ms/doc`,
        totalCompressionRatio: `${(results.reduce((sum, r) => sum + r.compressionStats.compressionRatio, 0) / results.length).toFixed(2)}x`
      });
    }

    return results;
  }

  /**
   * Legal AI similarity search with WebGPU optimization
   */
  async performLegalSimilaritySearch(
    queryEmbedding: Float32Array | number[] | ArrayBuffer,
    documentCorpus: Array<Float32Array | number[] | ArrayBuffer>,
    options: LegalDocumentProcessingOptions & {
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<{
    queryBuffer: GPUBuffer;
    corpusBuffers: GPUBuffer[];
    similarities?: Float32Array;
    processingStats: any;
  }> {
    if (!this.isInitialized || !this.uploader) {
      throw new Error('Legal AI WebGPU Bridge not initialized');
    }

    const startTime = performance.now();

    // Process query with high precision
    const queryResult = await this.processLegalDocumentEmbeddings(queryEmbedding, {
      ...options,
      profile: 'legal_critical', // High precision for queries
      documentType: 'brief'
    });

    // Process corpus with compression for efficiency
    const corpusResults = await this.batchProcessLegalDocuments(
      documentCorpus.map(embedding => ({
        embeddings: embedding,
        type: 'case-law' as const,
        priority: 'medium' as const
      })),
      {
        ...options,
        profile: 'legal_compressed' // Compressed for bulk processing
      }
    );

    const processingTime = performance.now() - startTime;

    const processingStats = {
      queryProcessingTime: queryResult.processingTime,
      corpusProcessingTime: processingTime - queryResult.processingTime,
      totalProcessingTime: processingTime,
      queryCompressionRatio: queryResult.compressionStats.compressionRatio,
      averageCorpusCompressionRatio: corpusResults.reduce((sum, r) => sum + r.compressionStats.compressionRatio, 0) / corpusResults.length,
      memoryUsage: {
        query: queryResult.compressionStats.compressedSize,
        corpus: corpusResults.reduce((sum, r) => sum + r.compressionStats.compressedSize, 0),
        total: queryResult.compressionStats.compressedSize + corpusResults.reduce((sum, r) => sum + r.compressionStats.compressedSize, 0)
      }
    };

    if (options.debugMode) {
      console.log(`🔍 Legal similarity search setup complete:`, processingStats);
    }

    return {
      queryBuffer: queryResult.buffer,
      corpusBuffers: corpusResults.map(r => r.buffer),
      processingStats
    };
  }

  /**
   * Get performance and cache statistics
   */
  getPerformanceStats() {
    if (!this.uploader) {
      return null;
    }

    return {
      cacheStats: this.uploader.getCacheStats(),
      isWebGPUAvailable: this.isInitialized,
      bridgeStatus: this.isInitialized ? 'ready' : 'offline'
    };
  }

  /**
   * Clear all cached buffers and reset performance counters
   */
  clearCache(): void {
    if (this.uploader) {
      this.uploader.clearCache();
    }
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    if (this.uploader) {
      this.uploader.clearCache();
    }
    if (this.device) {
      this.device.destroy();
    }
    this.isInitialized = false;
    this.device = null;
    this.uploader = null;
  }

  // Private helper methods
  private selectOptimalProfile(options: LegalDocumentProcessingOptions): LegalAIProfile {
    // If profile explicitly specified, use it
    if (options.profile) {
      return options.profile;
    }

    // Select based on document type
    switch (options.documentType) {
      case 'contract':
        return 'legal_critical'; // High-stakes contracts need maximum precision
      case 'brief':
        return 'legal_standard'; // Legal briefs need good balance
      case 'evidence':
        return 'legal_standard'; // Evidence requires good precision
      case 'case-law':
        return 'legal_compressed'; // Case law can use compression for bulk processing
      case 'citation':
        return 'legal_storage'; // Citations can use maximum compression
      default:
        // Select based on priority if document type not specified
        switch (options.priority) {
          case 'high':
            return 'legal_critical';
          case 'medium':
            return 'legal_standard';
          case 'low':
            return 'legal_compressed';
          default:
            return 'legal_standard';
        }
    }
  }
}

/**
 * Singleton instance for easy global access
 */
export const legalAIBridge = new LegalAIWebGPUBridge();

/**
 * Utility functions for quick integration with existing legal AI components
 */
export namespace LegalAIIntegration {
  /**
   * Quick helper for existing legal AI components to process embeddings
   */
  export async function processEmbeddingsForLegalAI(
    embeddings: Float32Array | number[] | ArrayBuffer,
    documentType: LegalDocumentProcessingOptions['documentType'] = 'brief'
  ): Promise<GPUBuffer | Float32Array> {
    try {
      if (!legalAIBridge.isInitialized) {
        // Fallback to CPU processing if WebGPU not available
        console.warn('WebGPU not available, using CPU fallback');
        return toFloat32Array(embeddings);
      }

      const result = await legalAIBridge.processLegalDocumentEmbeddings(embeddings, {
        documentType,
        enableCaching: true
      });

      return result.buffer;
    } catch (error) {
      console.error('Legal AI processing failed, falling back to CPU:', error);
      return toFloat32Array(embeddings);
    }
  }

  /**
   * Helper for legal document similarity search
   */
  export async function setupLegalSimilaritySearch(
    queryDocument: Float32Array,
    documentDatabase: Float32Array[]
  ) {
    try {
      await legalAIBridge.initialize();
      return await legalAIBridge.performLegalSimilaritySearch(
        queryDocument,
        documentDatabase,
        {
          documentType: 'brief',
          enableCaching: true,
          debugMode: true
        }
      );
    } catch (error) {
      console.error('Legal similarity search setup failed:', error);
      // Fallback to CPU-based processing would go here
      throw error;
    }
  }

  /**
   * Helper to get compression statistics for legal AI performance monitoring
   */
  export function getLegalAIPerformanceMetrics() {
    return legalAIBridge.getPerformanceStats();
  }
}

export default LegalAIWebGPUBridge;