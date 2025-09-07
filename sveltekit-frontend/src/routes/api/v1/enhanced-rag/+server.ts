import type { RequestHandler } from './$types.js';

/*
 * Enhanced RAG API - Direct Integration with Go Microservices
 * Provides seamless integration with Enhanced RAG Go service (port 8094)
 */
import { json, error } from '@sveltejs/kit';

import { ensureError } from '$lib/utils/ensure-error';
import {
  testVectorOperations,
  hybridSearch,
  generateSampleEmbedding,
} from '$lib/server/db/vector-operations.js';
import { URL } from 'url';

const ENHANCED_RAG_CONFIG = {
  baseUrl: import.meta.env.ENHANCED_RAG_URL || 'http://localhost:8094',
  uploadServiceUrl: import.meta.env.UPLOAD_SERVICE_URL || 'http://localhost:8093',
  timeout: 30000,
  retries: 2,
  models: {
    primary: 'gemma3-legal',
    embedding: 'nomic-embed-text',
    fallback: 'llama2-legal',
  },
};

export interface EnhancedRAGRequest {
  query: string;
  context?: string[];
  documentIds?: string[];
  maxResults?: number;
  model?: string;
  temperature?: number;
  useVectorSearch?: boolean;
  includeMetadata?: boolean;
}

export interface EnhancedRAGResponse {
  answer: string;
  confidence: number;
  sources: Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
  model: string;
  executionTime: number;
  vectorResults?: any[];
}

/*
 * GET /api/v1/enhanced-rag - Enhanced RAG service health and capabilities
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const includeModels = url.searchParams.get('models') === 'true';
    const checkVector = url.searchParams.get('vector') === 'true';

    let ragHealth = null;
    let uploadHealth = null;
    let vectorHealth = null;

    // Check Enhanced RAG service
    try {
      const ragResponse = await fetch(`${ENHANCED_RAG_CONFIG.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (ragResponse.ok) {
        ragHealth = await ragResponse.json();
      }
    } catch (ragError) {
      console.warn('Enhanced RAG health check failed:', ragError);
    }

    // Check Upload service
    try {
      const uploadResponse = await fetch(`${ENHANCED_RAG_CONFIG.uploadServiceUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (uploadResponse.ok) {
        uploadHealth = await uploadResponse.json();
      }
    } catch (uploadError) {
      console.warn('Upload service health check failed:', uploadError);
    }

    // Check vector operations if requested
    if (checkVector) {
      try {
        const tv = await testVectorOperations();
        vectorHealth = {
          pgvectorAvailable: tv.pgvectorAvailable,
          similaritySearchWorking: tv.similaritySearchWorking,
          embeddingCacheWorking: tv.embeddingCacheWorking,
        };
      } catch (vectorError) {
        vectorHealth = {
          error: vectorError instanceof Error ? vectorError.message : 'Vector ops failed',
        };
      }
    }

    // Get available models if requested
    let availableModels = null;
    if (includeModels && ragHealth) {
      try {
        const modelsResponse = await fetch(`${ENHANCED_RAG_CONFIG.baseUrl}/models`, {
          signal: AbortSignal.timeout(5000),
        });

        if (modelsResponse.ok) {
          availableModels = await modelsResponse.json();
        }
      } catch (modelsError) {
        console.warn('Models endpoint failed:', modelsError);
        availableModels = {
          configured: Object.values(ENHANCED_RAG_CONFIG.models),
          note: 'Dynamic model discovery failed, showing configured models',
        };
      }
    }

    return json({
      service: 'enhanced-rag-integration',
      status: ragHealth ? 'healthy' : 'degraded',
      services: {
        enhancedRAG: {
          url: ENHANCED_RAG_CONFIG.baseUrl,
          status: ragHealth ? 'healthy' : 'unhealthy',
          health: ragHealth,
        },
        uploadService: {
          url: ENHANCED_RAG_CONFIG.uploadServiceUrl,
          status: uploadHealth ? 'healthy' : 'unhealthy',
          health: uploadHealth,
        },
        vectorOperations: {
          status: vectorHealth ? 'healthy' : 'not-checked',
          health: vectorHealth,
        },
      },
      capabilities: [
        'Document Question Answering',
        'Vector Similarity Search',
        'Multi-Model Support',
        'Context-Aware Responses',
        'Legal Document Analysis',
        'Semantic Search',
        'Document Upload & Processing',
      ],
      models: availableModels || ENHANCED_RAG_CONFIG.models,
      configuration: {
        timeout: ENHANCED_RAG_CONFIG.timeout,
        retries: ENHANCED_RAG_CONFIG.retries,
        maxResults: 10,
        defaultModel: ENHANCED_RAG_CONFIG.models.primary,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Enhanced RAG integration health check failed:', err);

    return json({
      service: 'enhanced-rag-integration',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
};

/*
 * POST /api/v1/enhanced-rag - Enhanced RAG query with vector integration
 */
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const ragRequest: EnhancedRAGRequest = await request.json();
    const useVectorFallback = url.searchParams.get('vector-fallback') === 'true';

    // Validate request
    if (!ragRequest.query || ragRequest.query.trim().length === 0) {
      throw error(400, 'Query is required and cannot be empty');
    }

    // Prepare Enhanced RAG request
    const enhancedRequest = {
      query: ragRequest.query,
      context: ragRequest.context || [],
      document_ids: ragRequest.documentIds || [],
      max_results: ragRequest.maxResults || 10,
      model: ragRequest.model || ENHANCED_RAG_CONFIG.models.primary,
      temperature: ragRequest.temperature || 0.7,
      include_metadata: ragRequest.includeMetadata !== false,
      use_vector_search: ragRequest.useVectorSearch !== false,
    };

    let ragResponse: Response;
    let responseData: any;
    let vectorResults: any[] | null = null;

    try {
      // Try Enhanced RAG service first
      ragResponse = await fetch(`${ENHANCED_RAG_CONFIG.baseUrl}/api/rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Source': 'sveltekit-frontend',
        },
        body: JSON.stringify(enhancedRequest),
        signal: AbortSignal.timeout(ENHANCED_RAG_CONFIG.timeout),
      });

      if (!ragResponse.ok) {
        throw new Error(
          `Enhanced RAG service responded with ${ragResponse.status}: ${ragResponse.statusText}`
        );
      }

      responseData = await ragResponse.json();
    } catch (ragError) {
      console.warn('Enhanced RAG service failed:', ragError);

      // Fallback to vector operations if enabled
      if (useVectorFallback) {
        console.log('Using vector operations fallback...');

        try {
          const embedding = generateSampleEmbedding();
          const results = await hybridSearch(
            ragRequest.query,
            embedding,
            ragRequest.maxResults || 10
          );
          vectorResults = results.map((r) => ({
            id: r.id,
            content: r.content,
            score: r.similarity,
            metadata: r.metadata,
          }));

          responseData = {
            answer: `Based on vector similarity search, found ${vectorResults.length} relevant documents. (Fallback used while Enhanced RAG unavailable)`,
            confidence: 0.6,
            sources: vectorResults.map((result) => ({
              id: result.id,
              content: result.content,
              score: result.score,
              metadata: result.metadata,
            })),
            fallback: true,
            executionTime: 0,
          };
        } catch (vectorError) {
          console.error('Vector operations fallback also failed:', vectorError);
          throw error(503, 'Enhanced RAG service and vector fallback both unavailable');
        }
      } else {
        throw error(503, 'Enhanced RAG service unavailable');
      }
    }

    const enhancedResponse: EnhancedRAGResponse = {
      answer: responseData.answer || responseData.response,
      confidence: responseData.confidence || 0.8,
      sources: responseData.sources || [],
      model: responseData.model || enhancedRequest.model,
      executionTime: responseData.execution_time || responseData.executionTime || 0,
      vectorResults: vectorResults || undefined,
    };

    return json({
      success: true,
      data: enhancedResponse,
      source: responseData.fallback ? 'vector-fallback' : 'enhanced-rag',
      timestamp: new Date().toISOString(),
      metrics: {
        queryLength: ragRequest.query.length,
        sourcesFound: enhancedResponse.sources.length,
        executionTimeMs: enhancedResponse.executionTime,
        confidence: enhancedResponse.confidence,
        model: enhancedResponse.model,
        fallback: !!responseData.fallback,
      },
    });
  } catch (err: any) {
    console.error('Enhanced RAG operation failed:', err);
    throw error(500, 'Enhanced RAG operation failed');
  }
};

/*
 * PUT /api/v1/enhanced-rag - Upload document for RAG processing
 */
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {};

    if (!file) {
      throw error(400, 'File is required');
    }

    // Upload to upload service
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append(
      'metadata',
      JSON.stringify({
        ...metadata,
        processForRAG: true,
        source: 'sveltekit-frontend',
      })
    );

    const uploadResponse = await fetch(`${ENHANCED_RAG_CONFIG.uploadServiceUrl}/upload`, {
      method: 'POST',
      body: uploadFormData,
      signal: AbortSignal.timeout(60000), // Longer timeout for file uploads
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Upload service responded with ${uploadResponse.status}: ${uploadResponse.statusText}`
      );
    }

    const uploadResult = await uploadResponse.json();

    return json({
      success: true,
      message: 'Document uploaded and queued for RAG processing',
      data: uploadResult,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Document upload for RAG failed:', err);
    throw error(500, 'Document upload failed');
  }
};

/*
 * DELETE /api/v1/enhanced-rag - Remove document from RAG index
 */
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const documentId = url.searchParams.get('documentId');

    if (!documentId) {
      throw error(400, 'Document ID is required');
    }

    const deleteResponse = await fetch(
      `${ENHANCED_RAG_CONFIG.baseUrl}/api/rag/documents/${documentId}`,
      {
        method: 'DELETE',
        headers: {
          'X-Request-Source': 'sveltekit-frontend',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!deleteResponse.ok) {
      throw new Error(`Document deletion failed: ${deleteResponse.statusText}`);
    }

    const result = await deleteResponse.json();

    return json({
      success: true,
      message: `Document '${documentId}' removed from RAG index`,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Document deletion from RAG failed:', err);
    throw error(500, 'Document deletion failed');
  }
};