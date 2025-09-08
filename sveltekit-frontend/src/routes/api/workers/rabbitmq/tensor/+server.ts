/**
 * RabbitMQ-Tensor Integration API Endpoint
 * Provides HTTP interface for WASM-accelerated tensor processing via RabbitMQ
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  rabbitMQTensorIntegration, 
  initializeIntegration, 
  submitDirectTensorJob, 
  getIntegrationStatus,
  WASM_SERVICE_PORTS,
  WASM_QUEUE_ROUTING
} from '$lib/integrations/rabbitmq-tensor-integration.js';
import { 
  readBodyFastWithMetrics, 
  getSIMDStatus, 
  benchmarkJSONParsing,
  simdMetrics 
} from '$lib/simd/simd-json-integration.js';

// GET: Get integration status and health
export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');
    
    switch (action) {
      case 'status':
        const status = getIntegrationStatus();
        return json({
          success: true,
          data: status,
          timestamp: new Date().toISOString()
        });
        
      case 'health':
        const healthStatus = getIntegrationStatus();
        const isHealthy = healthStatus.integrated && healthStatus.bridge.wasmReady;
        
        return json({
          success: true,
          healthy: isHealthy,
          status: isHealthy ? 'healthy' : 'unhealthy',
          details: {
            bridge: healthStatus.bridge,
            tensorWorker: healthStatus.tensorWorker,
            activeJobs: healthStatus.activeJobs
          }
        }, {
          headers: {
            'X-Integration-Health': isHealthy ? 'healthy' : 'unhealthy',
            'Cache-Control': 'no-cache'
          }
        });
        
      case 'ports':
        return json({
          success: true,
          data: {
            services: WASM_SERVICE_PORTS,
            description: 'Port configuration for WebAssembly services'
          }
        });
        
      case 'queues':
        return json({
          success: true,
          data: {
            routing: WASM_QUEUE_ROUTING,
            description: 'Queue routing for WASM-accelerated jobs'
          }
        });

      case 'simd':
        const simdStatus = getSIMDStatus();
        return json({
          success: true,
          data: {
            simd: simdStatus,
            description: 'SIMD JSON parsing status and performance metrics'
          }
        });

      case 'benchmark':
        const benchmark = await benchmarkJSONParsing(1000);
        return json({
          success: true,
          data: {
            benchmark,
            description: 'JSON parsing performance comparison (SIMD vs standard)'
          }
        });
        
      default:
        // Default: Return comprehensive status
        const fullStatus = getIntegrationStatus();
        return json({
          success: true,
          data: {
            integration: fullStatus,
            endpoints: {
              status: '/api/workers/rabbitmq/tensor?action=status',
              health: '/api/workers/rabbitmq/tensor?action=health',
              ports: '/api/workers/rabbitmq/tensor?action=ports',
              queues: '/api/workers/rabbitmq/tensor?action=queues'
            },
            operations: {
              initialize: 'POST /api/workers/rabbitmq/tensor (action: initialize)',
              submit_job: 'POST /api/workers/rabbitmq/tensor (action: submit_job)',
              similarity: 'POST /api/workers/rabbitmq/tensor (action: similarity)',
              normalize: 'POST /api/workers/rabbitmq/tensor (action: normalize)'
            }
          }
        });
    }
    
  } catch (error: any) {
    console.error('❌ RabbitMQ-Tensor API Error:', error);
    
    return json({
      success: false,
      error: {
        message: error.message || 'RabbitMQ-Tensor API error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
};

// POST: Control integration operations and submit tensor jobs  
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Use SIMD-accelerated JSON parsing for hot endpoint
    const body = await readBodyFastWithMetrics(request);
    const { action, ...payload } = body;
    
    switch (action) {
      case 'initialize':
        console.log('🔗 Initializing RabbitMQ-Tensor Integration...');
        
        const initialized = await initializeIntegration();
        
        return json({
          success: initialized,
          message: initialized 
            ? '✅ RabbitMQ-Tensor Integration initialized successfully' 
            : '❌ Integration initialization failed',
          data: {
            initialized,
            status: getIntegrationStatus()
          }
        });
        
      case 'submit_job':
        const { jobType, data, priority = 2 } = payload;
        
        if (!jobType || !data) {
          return json({
            success: false,
            error: { message: 'jobType and data are required' }
          }, { status: 400 });
        }
        
        const jobId = await submitDirectTensorJob(jobType, data, priority);
        
        return json({
          success: true,
          message: 'Tensor job submitted successfully',
          data: {
            jobId,
            jobType,
            priority,
            submitted_at: new Date().toISOString()
          }
        });
        
      case 'similarity':
        const { queryVector, candidateVectors, algorithm = 'cosine' } = payload;
        
        if (!queryVector || !candidateVectors) {
          return json({
            success: false,
            error: { message: 'queryVector and candidateVectors are required' }
          }, { status: 400 });
        }
        
        const similarityJobId = await submitDirectTensorJob('wasm_similarity_compute', {
          query: queryVector,
          vectors: candidateVectors,
          operation: 'similarity',
          algorithm
        }, 1); // High priority
        
        return json({
          success: true,
          message: 'Vector similarity computation submitted',
          data: {
            jobId: similarityJobId,
            algorithm,
            vectorCount: candidateVectors.length,
            queryDimensions: queryVector.length
          }
        });
        
      case 'normalize':
        const { vectors, batchProcess = false } = payload;
        
        if (!vectors || !Array.isArray(vectors)) {
          return json({
            success: false,
            error: { message: 'vectors array is required' }
          }, { status: 400 });
        }
        
        const jobType = batchProcess ? 'wasm_batch_normalize' : 'wasm_vector_operations';
        const normalizeJobId = await submitDirectTensorJob(jobType, {
          vectors,
          operation: batchProcess ? 'batch_process' : 'normalize'
        }, 2);
        
        return json({
          success: true,
          message: `Vector ${batchProcess ? 'batch ' : ''}normalization submitted`,
          data: {
            jobId: normalizeJobId,
            vectorCount: vectors.length,
            batchProcess
          }
        });
        
      case 'compress':
        const { embeddings, compressionRatio = 0.5 } = payload;
        
        if (!embeddings) {
          return json({
            success: false,
            error: { message: 'embeddings are required' }
          }, { status: 400 });
        }
        
        const compressJobId = await submitDirectTensorJob('wasm_embedding_compress', {
          vectors: [embeddings],
          operation: 'compress',
          compressionRatio
        }, 1);
        
        return json({
          success: true,
          message: 'Embedding compression submitted',
          data: {
            jobId: compressJobId,
            originalSize: embeddings.length,
            compressionRatio
          }
        });
        
      case 'benchmark':
        // Run performance benchmark comparing WASM vs JS
        const benchmarkVectors = Array.from({ length: 100 }, () => 
          Array.from({ length: 768 }, () => Math.random())
        );
        
        const benchmarkQuery = Array.from({ length: 768 }, () => Math.random());
        
        const benchmarkJobId = await submitDirectTensorJob('wasm_similarity_compute', {
          query: benchmarkQuery,
          vectors: benchmarkVectors,
          operation: 'similarity',
          algorithm: 'cosine'
        }, 1);
        
        return json({
          success: true,
          message: 'Performance benchmark submitted',
          data: {
            jobId: benchmarkJobId,
            vectorCount: benchmarkVectors.length,
            dimensions: benchmarkQuery.length,
            benchmarkType: 'similarity_performance'
          }
        });
        
      default:
        return json({
          success: false,
          error: { message: `Unknown action: ${action}` }
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('❌ RabbitMQ-Tensor POST Error:', error);
    
    return json({
      success: false,
      error: {
        message: error.message || 'Tensor operation failed',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
};

// PUT: Update integration configuration
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { config } = body;
    
    // For future implementation: Update integration configuration
    return json({
      success: true,
      message: 'Integration configuration update received',
      data: {
        appliedConfig: config,
        note: 'Configuration updates will be implemented in future version',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ RabbitMQ-Tensor PUT Error:', error);
    
    return json({
      success: false,
      error: {
        message: error.message || 'Configuration update failed',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
};

// DELETE: Shutdown integration or clear jobs
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');
    
    switch (action) {
      case 'shutdown':
        await rabbitMQTensorIntegration.shutdown();
        
        return json({
          success: true,
          message: 'RabbitMQ-Tensor Integration shutdown initiated',
          data: {
            shutdown_at: new Date().toISOString()
          }
        });
        
      case 'clear_cache':
        // Future implementation: Clear WASM result cache
        return json({
          success: true,
          message: 'Tensor cache clearing initiated (simulation)',
          data: {
            cleared_at: new Date().toISOString()
          }
        });
        
      default:
        return json({
          success: false,
          error: { message: 'Action required for DELETE operation' }
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('❌ RabbitMQ-Tensor DELETE Error:', error);
    
    return json({
      success: false,
      error: {
        message: error.message || 'Delete operation failed',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
};