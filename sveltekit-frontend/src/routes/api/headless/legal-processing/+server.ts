/**
 * 🎯 Headless Legal Processing API
 * 
 * Server-side API endpoint for headless WebGPU legal document processing
 * Integrates YoRHa Mipmap Shaders + LOD Cache + Ollama AI analysis
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { headlessLegalProcessorFactory, DEFAULT_HEADLESS_CONFIG } from '$lib/components/three/yorha-ui/webgpu/HeadlessLegalProcessorFactory.js';
import type { HeadlessProcessingConfig } from '$lib/components/three/yorha-ui/webgpu/HeadlessLegalProcessorFactory.js';

interface ProcessingRequest {
  text: string;
  documentId?: string;
  documentType?: 'contract' | 'evidence' | 'brief' | 'citation' | 'general';
  config?: Partial<HeadlessProcessingConfig>;
  metadata?: {
    caseId?: string;
    userId?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
  };
}

interface BatchProcessingRequest {
  documents: Array<{
    text: string;
    id?: string;
    type?: 'contract' | 'evidence' | 'brief' | 'citation' | 'general';
  }>;
  config?: Partial<HeadlessProcessingConfig>;
  metadata?: {
    batchId?: string;
    userId?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * POST /api/headless/legal-processing
 * Process a single legal document through the headless pipeline
 */
export const POST: RequestHandler = async ({ request, url }) => {
  const startTime = Date.now();
  
  try {
    const body = await request.json() as ProcessingRequest;
    
    if (!body.text || body.text.trim().length === 0) {
      return json({
        success: false,
        error: 'Document text is required',
        processingTime: Date.now() - startTime
      }, { status: 400 });
    }

    console.log(`📄 Processing legal document: ${body.text.length} chars, type: ${body.documentType || 'general'}`);

    // Initialize headless processor if needed
    if (!headlessLegalProcessorFactory.getStats().isInitialized) {
      console.log('🎯 Initializing headless legal processor...');
      const initialized = await headlessLegalProcessorFactory.initializeHeadless();
      
      if (!initialized) {
        return json({
          success: false,
          error: 'Failed to initialize headless WebGPU processor',
          processingTime: Date.now() - startTime,
          fallback: 'CPU processing available'
        }, { status: 500 });
      }
    }

    // Configure processing based on document type
    const processingConfig = buildProcessingConfig(body.documentType, body.config);
    
    // Add processing context
    const context = {
      documentId: body.documentId,
      documentType: body.documentType,
      requestId: generateRequestId(),
      timestamp: Date.now(),
      metadata: body.metadata
    };

    console.log(`⚡ Starting headless processing with config: ${JSON.stringify(processingConfig)}`);

    // Process through headless pipeline
    const result = await headlessLegalProcessorFactory.processLegalDocument(
      body.text,
      processingConfig
    );

    // Build API response
    const response = {
      success: result.success,
      processingTime: Date.now() - startTime,
      requestId: context.requestId,
      
      // Processing results
      document: {
        id: body.documentId,
        type: body.documentType,
        length: body.text.length,
        processingMode: 'headless-webgpu'
      },

      // WebGPU results
      webgpu: {
        mipmapGenerated: !!result.mipmapChain,
        mipmapLevels: result.mipmapChain?.levels || 0,
        memoryUsed: result.mipmapChain?.totalMemoryUsed || 0,
        rtxOptimized: result.mipmapChain?.rtxOptimized || false
      },

      // LOD cache results
      lod: {
        compressionRatio: result.lodEntry?.cache_metadata.compression_stats.compression_ratio,
        svgSummariesGenerated: !!result.svgVisualizations,
        lodLevels: result.svgVisualizations ? Object.keys(result.svgVisualizations) : [],
        cacheEntryId: result.lodEntry?.id
      },

      // Legal analysis results
      legal: result.legalAnalysis,

      // SVG visualizations (if requested)
      visualizations: processingConfig.generateSVGSummaries ? result.svgVisualizations : undefined,

      // Performance metrics
      performance: {
        totalTime: result.processingTime,
        webgpuInitTime: result.metrics.webgpuInitTime,
        memoryUsage: result.metrics.memoryUsage,
        cacheHitRate: result.metrics.cacheHitRate
      },

      // File outputs (if saved)
      outputFiles: result.outputFiles || [],

      // System info
      system: {
        webgpuAvailable: true,
        headlessMode: true,
        processingCapabilities: {
          mipmap: processingConfig.enableMipmapGeneration,
          lod: processingConfig.enableLODCaching,
          offscreen: processingConfig.enableOffscreenRendering,
          streaming: processingConfig.enableStreamingOptimization
        }
      }
    };

    console.log(`✅ Headless processing completed: ${response.processingTime}ms`);
    return json(response);

  } catch (error: any) {
    console.error('Headless processing error:', error);
    
    return json({
      success: false,
      error: error.message || 'Internal processing error',
      processingTime: Date.now() - startTime,
      system: {
        webgpuAvailable: false,
        fallbackMode: 'cpu',
        error: error.name
      }
    }, { status: 500 });
  }
};

/**
 * PUT /api/headless/legal-processing (Batch processing)
 */
export const PUT: RequestHandler = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    const body = await request.json() as BatchProcessingRequest;
    
    if (!body.documents || body.documents.length === 0) {
      return json({
        success: false,
        error: 'Documents array is required for batch processing',
        processingTime: Date.now() - startTime
      }, { status: 400 });
    }

    console.log(`📦 Batch processing ${body.documents.length} legal documents`);

    // Initialize if needed
    if (!headlessLegalProcessorFactory.getStats().isInitialized) {
      await headlessLegalProcessorFactory.initializeHeadless();
    }

    const processingConfig = {
      ...DEFAULT_HEADLESS_CONFIG,
      ...body.config,
      concurrentProcessingLimit: Math.min(body.config?.concurrentProcessingLimit || 4, 8)
    };

    // Process batch
    const results = await headlessLegalProcessorFactory.processBatch(
      body.documents,
      processingConfig
    );

    // Calculate batch statistics
    const batchStats = {
      totalDocuments: body.documents.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
      averageProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
      totalMemoryUsed: results.reduce((sum, r) => sum + (r.mipmapChain?.totalMemoryUsed || 0), 0),
      compressionRatios: results.map(r => r.lodEntry?.cache_metadata.compression_stats.compression_ratio).filter(Boolean)
    };

    const response = {
      success: batchStats.failed === 0,
      batchId: body.metadata?.batchId || generateRequestId(),
      processingTime: Date.now() - startTime,
      
      // Batch results
      batch: batchStats,
      
      // Individual results
      results: results.map((result, index) => ({
        documentIndex: index,
        documentId: body.documents[index].id,
        success: result.success,
        processingTime: result.processingTime,
        legalAnalysis: result.legalAnalysis,
        compressionRatio: result.lodEntry?.cache_metadata.compression_stats.compression_ratio,
        mipmapLevels: result.mipmapChain?.levels,
        error: result.success ? undefined : 'Processing failed'
      })),

      // Performance summary
      performance: {
        documentsPerSecond: body.documents.length / ((Date.now() - startTime) / 1000),
        parallelizationEfficiency: batchStats.totalProcessingTime / (Date.now() - startTime),
        memoryEfficiency: batchStats.totalMemoryUsed / (1024 * 1024) // MB
      },

      system: headlessLegalProcessorFactory.getStats()
    };

    console.log(`✅ Batch processing completed: ${body.documents.length} documents in ${response.processingTime}ms`);
    return json(response);

  } catch (error: any) {
    console.error('Batch processing error:', error);
    
    return json({
      success: false,
      error: error.message || 'Batch processing failed',
      processingTime: Date.now() - startTime
    }, { status: 500 });
  }
};

/**
 * GET /api/headless/legal-processing (Status and capabilities)
 */
export const GET: RequestHandler = async () => {
  const stats = headlessLegalProcessorFactory.getStats();
  
  return json({
    status: 'operational',
    capabilities: {
      headlessWebGPU: stats.hasDevice,
      mipmapGeneration: true,
      lodCaching: true,
      offscreenRendering: true,
      streamingOptimization: true,
      batchProcessing: true,
      svgGeneration: true,
      legalAIAnalysis: true
    },
    performance: {
      isInitialized: stats.isInitialized,
      queueLength: stats.queueLength,
      cacheStats: stats.lodCacheStats
    },
    configuration: DEFAULT_HEADLESS_CONFIG
  });
};

/**
 * DELETE /api/headless/legal-processing (Cleanup)
 */
export const DELETE: RequestHandler = async () => {
  try {
    headlessLegalProcessorFactory.dispose();
    
    return json({
      success: true,
      message: 'Headless processor resources cleaned up',
      timestamp: Date.now()
    });
  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    }, { status: 500 });
  }
};

// Helper functions

function buildProcessingConfig(
  documentType?: string, 
  customConfig?: Partial<HeadlessProcessingConfig>
): HeadlessProcessingConfig {
  const baseConfig = { ...DEFAULT_HEADLESS_CONFIG };

  // Adjust config based on document type
  switch (documentType) {
    case 'contract':
      return {
        ...baseConfig,
        documentAnalysisLevel: 'comprehensive',
        generateSVGSummaries: true,
        maxTextureSize: 4096,
        outputFormats: ['svg', 'json', 'lod', 'vector'],
        ...customConfig
      };
      
    case 'evidence':
      return {
        ...baseConfig,
        documentAnalysisLevel: 'advanced',
        enablePredictiveAnalytics: true,
        maxTextureSize: 2048,
        outputFormats: ['svg', 'json', 'lod'],
        ...customConfig
      };
      
    case 'brief':
      return {
        ...baseConfig,
        documentAnalysisLevel: 'comprehensive',
        generateSVGSummaries: true,
        enableStreamingOptimization: true,
        maxTextureSize: 4096,
        ...customConfig
      };
      
    default:
      return {
        ...baseConfig,
        ...customConfig
      };
  }
}

function generateRequestId(): string {
  return `headless-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}