import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { 
  webgpuLangChainBridge, 
  processLegalDocumentWithWebGPU, 
  processBatchDocumentsWithWebGPU,
  getLangChainWebGPUStats,
  type LangChainWebGPUConfig 
} from '$lib/server/webgpu-langchain-bridge.js';

/**
 * WebGPU-Enhanced LangExtract API
 * High-performance legal document processing with GPU-accelerated caching
 * Integrates LangChain extraction with WebGPU optimization
 */

interface WebGPULangExtractRequest {
  text?: string;
  documents?: Array<{ text: string; metadata?: any }>;
  action: 'process' | 'batch' | 'benchmark' | 'stats' | 'config';
  config?: Partial<LangChainWebGPUConfig>;
  benchmark?: {
    iterations?: number;
    compareStandard?: boolean;
  };
}

// GET - System status and capabilities
export const GET: RequestHandler = async () => {
  try {
    const stats = await getLangChainWebGPUStats();
    
    return json({
      success: true,
      service: 'webgpu-langextract',
      capabilities: {
        webgpuOptimization: stats.webgpuOptimizer.gpuMetrics.availableComputeUnits > 0,
        embeddingCache: stats.embeddingCache.redisConnected,
        langchainService: stats.langchainService.available,
        availableModels: stats.langchainService.models || []
      },
      systemStats: stats,
      endpoints: {
        process: 'POST with action: "process" - Single document processing',
        batch: 'POST with action: "batch" - Batch document processing', 
        benchmark: 'POST with action: "benchmark" - Performance testing',
        config: 'POST with action: "config" - Update configuration'
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    return json({
      success: false,
      error: 'Failed to get WebGPU LangExtract status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};

// POST - WebGPU-enhanced legal document processing
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    const requestData: WebGPULangExtractRequest = await request.json();
    const { action, config = {} } = requestData;
    
    console.log(`🚀 WebGPU LangExtract: ${action} - Client: ${getClientAddress()}`);
    
    let result: any;
    const startTime = Date.now();
    
    switch (action) {
      case 'process':
        result = await handleSingleDocumentProcessing(requestData);
        break;
        
      case 'batch':
        result = await handleBatchDocumentProcessing(requestData);
        break;
        
      case 'benchmark':
        result = await handleBenchmarkTesting(requestData);
        break;
        
      case 'stats':
        result = await getLangChainWebGPUStats();
        break;
        
      case 'config':
        result = await handleConfigurationUpdate(requestData);
        break;
        
      default:
        return json({
          success: false,
          error: 'Invalid action',
          validActions: ['process', 'batch', 'benchmark', 'stats', 'config']
        }, { status: 400 });
    }
    
    const processingTime = Date.now() - startTime;
    
    return json({
      success: true,
      action,
      result,
      metadata: {
        processingTime,
        timestamp: Date.now(),
        clientAddress: getClientAddress(),
        webgpuEnabled: config.useWebGPUCache !== false
      }
    });
    
  } catch (error) {
    console.error('WebGPU LangExtract error:', error);
    return json({
      success: false,
      error: 'WebGPU LangExtract processing failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};

/**
 * Handle single document processing with WebGPU optimization
 */
async function handleSingleDocumentProcessing(request: WebGPULangExtractRequest) {
  if (!request.text) {
    throw new Error('Text is required for single document processing');
  }
  
  const config = {
    useWebGPUCache: true,
    cacheEmbeddings: true,
    compressVectors: true,
    practiceArea: 'legal-ai',
    documentType: 'general' as const,
    ...request.config
  };
  
  console.log(`📄 Processing single document: ${request.text.length} chars`);
  
  const result = await processLegalDocumentWithWebGPU(request.text, config);
  
  return {
    processing: result,
    optimizations: {
      webgpuUtilized: result.performance.webgpuUtilized,
      cacheHit: result.embeddings.cacheHit,
      compressionRatio: result.embeddings.compressionRatio,
      throughput: result.performance.throughput
    },
    extracted: {
      summary: result.extraction.summary,
      keyTerms: result.extraction.keyTerms,
      entities: result.extraction.entities,
      risks: result.extraction.risks
    }
  };
}

/**
 * Handle batch document processing with parallel optimization
 */
async function handleBatchDocumentProcessing(request: WebGPULangExtractRequest) {
  if (!request.documents || request.documents.length === 0) {
    throw new Error('Documents array is required for batch processing');
  }
  
  const config = {
    useWebGPUCache: true,
    batchSize: 64, // Optimized for WebGPU
    cacheEmbeddings: true,
    compressVectors: true,
    practiceArea: 'legal-ai',
    documentType: 'general' as const,
    ...request.config
  };
  
  console.log(`📦 Processing batch: ${request.documents.length} documents`);
  
  const results = await processBatchDocumentsWithWebGPU(request.documents, config);
  
  // Calculate aggregate statistics
  const totalTime = results.reduce((sum, r) => sum + r.performance.totalTime, 0);
  const avgThroughput = results.reduce((sum, r) => sum + r.performance.throughput, 0) / results.length;
  const cacheHitRatio = results.filter(r => r.embeddings.cacheHit).length / results.length;
  const webgpuUtilization = results.filter(r => r.performance.webgpuUtilized).length / results.length;
  
  return {
    batchResults: results.map(r => ({
      summary: r.extraction.summary,
      keyTerms: r.extraction.keyTerms,
      entities: r.extraction.entities,
      risks: r.extraction.risks,
      performance: {
        processingTime: r.performance.totalTime,
        webgpuUtilized: r.performance.webgpuUtilized,
        cacheHit: r.embeddings.cacheHit
      }
    })),
    aggregateStats: {
      totalDocuments: results.length,
      totalProcessingTime: totalTime,
      avgThroughput,
      cacheHitRatio,
      webgpuUtilization,
      avgCompressionRatio: results.reduce((sum, r) => sum + r.embeddings.compressionRatio, 0) / results.length
    }
  };
}

/**
 * Handle performance benchmark testing
 */
async function handleBenchmarkTesting(request: WebGPULangExtractRequest) {
  const iterations = request.benchmark?.iterations || 10;
  const compareStandard = request.benchmark?.compareStandard || false;
  
  // Sample legal documents for benchmarking
  const sampleDocuments = [
    "This Employment Agreement is entered into between Company X and Employee Y. The employee agrees to perform duties as Software Engineer with annual compensation of $120,000. This agreement includes confidentiality clauses and non-compete restrictions.",
    "Software License Agreement grants licensee non-exclusive rights to use proprietary software. The license fee is $50,000 annually with maintenance support included. Reverse engineering and redistribution are prohibited without written consent.",
    "Real Estate Purchase Agreement for property located at 123 Main Street. Purchase price is $500,000 with 20% down payment required. Closing date is scheduled for March 15, 2024 with standard title insurance requirements.",
  ];
  
  console.log(`🧪 Running WebGPU benchmark: ${iterations} iterations`);
  
  // WebGPU optimized processing
  const webgpuStartTime = Date.now();
  const webgpuResults = [];
  
  for (let i = 0; i < iterations; i++) {
    const doc = sampleDocuments[i % sampleDocuments.length];
    const result = await processLegalDocumentWithWebGPU(doc, {
      useWebGPUCache: true,
      compressVectors: true
    });
    webgpuResults.push(result);
  }
  
  const webgpuTime = Date.now() - webgpuStartTime;
  
  let standardResults = [];
  let standardTime = 0;
  
  if (compareStandard) {
    // Standard processing comparison
    const standardStartTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const doc = sampleDocuments[i % sampleDocuments.length];
      const result = await processLegalDocumentWithWebGPU(doc, {
        useWebGPUCache: false,
        compressVectors: false
      });
      standardResults.push(result);
    }
    
    standardTime = Date.now() - standardStartTime;
  }
  
  return {
    benchmark: {
      iterations,
      sampleDocumentLength: sampleDocuments[0].length
    },
    webgpuResults: {
      totalTime: webgpuTime,
      avgTimePerDoc: webgpuTime / iterations,
      throughput: (iterations / webgpuTime) * 1000,
      avgCacheHitRatio: webgpuResults.filter(r => r.embeddings.cacheHit).length / iterations,
      avgCompressionRatio: webgpuResults.reduce((sum, r) => sum + r.embeddings.compressionRatio, 0) / iterations
    },
    standardResults: compareStandard ? {
      totalTime: standardTime,
      avgTimePerDoc: standardTime / iterations,
      throughput: (iterations / standardTime) * 1000,
      speedupRatio: standardTime / webgpuTime
    } : null,
    recommendations: {
      useWebGPU: webgpuTime < standardTime,
      optimalBatchSize: Math.min(128, Math.max(32, Math.floor(iterations / 4))),
      compressionBenefit: webgpuResults[0]?.embeddings.compressionRatio > 2
    }
  };
}

/**
 * Handle configuration updates
 */
async function handleConfigurationUpdate(request: WebGPULangExtractRequest) {
  if (!request.config) {
    throw new Error('Configuration object is required');
  }
  
  webgpuLangChainBridge.updateConfig(request.config);
  
  return {
    message: 'Configuration updated successfully',
    newConfig: request.config,
    timestamp: Date.now()
  };
}

// PUT - Update system configuration
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const config = await request.json();
    
    webgpuLangChainBridge.updateConfig(config);
    
    return json({
      success: true,
      message: 'WebGPU LangExtract configuration updated',
      config,
      timestamp: Date.now()
    });
    
  } catch (error) {
    return json({
      success: false,
      error: 'Failed to update configuration',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};

// DELETE - Clear caches and reset system
export const DELETE: RequestHandler = async () => {
  try {
    // Clear WebGPU optimizer caches
    console.log('🗑️ Clearing WebGPU LangExtract caches');
    
    // Reset to default configuration
    webgpuLangChainBridge.updateConfig({
      useWebGPUCache: true,
      batchSize: 128,
      cacheEmbeddings: true,
      compressVectors: true,
      practiceArea: 'legal-ai',
      documentType: 'general'
    });
    
    return json({
      success: true,
      message: 'WebGPU LangExtract system reset successfully',
      timestamp: Date.now()
    });
    
  } catch (error) {
    return json({
      success: false,
      error: 'Failed to reset system',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};