/**
 * Gemma Embeddings API Endpoint
 * Handles single and batch embedding generation requests
 */

import { json } from '@sveltejs/kit';
import { gemmaEmbedding } from '$lib/services/gemma-embedding.js';
import { pgVectorService } from '$lib/server/db/pgvector-service.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request, url }) => {
  const action = url.searchParams.get('action') || 'generate';
  const startTime = Date.now();

  try {
    const body = await request.json();

    switch (action) {
      case 'generate':
        // Generate single embedding
        const { text, metadata } = body;

        if (!text || typeof text !== 'string') {
          return json({
            error: 'Text is required and must be a string',
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }

        const result = await gemmaEmbeddingService.generateEmbedding(text, metadata);

        return json({
          action: 'gemma_generate_embedding',
          success: result.success,
          embedding: result.embedding,
          metadata: result.metadata,
          error: result.error,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'batch':
        // Generate batch embeddings
        const { documents, options = {} } = body;

        if (!documents || !Array.isArray(documents)) {
          return json({
            error: 'Documents array is required',
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }

        const batchResult = await gemmaEmbeddingService.generateBatchEmbeddings(
          documents,
          options
        );

        return json({
          action: 'gemma_batch_embeddings',
          success: batchResult.success,
          results: batchResult.results,
          summary: batchResult.summary,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'store':
        // Generate embedding and store in pgvector
        const { documentId, content, docMetadata } = body;

        if (!documentId || !content) {
          return json({
            error: 'documentId and content are required',
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }

        // Generate embedding
        const embeddingResult = await gemmaEmbeddingService.generateEmbedding(content, {
          documentId,
          ...docMetadata
        });

        if (!embeddingResult.success) {
          return json({
            error: `Embedding generation failed: ${embeddingResult.error}`,
            timestamp: new Date().toISOString()
          }, { status: 500 });
        }

        // Store in pgvector (need to handle dimension mismatch)
        let finalEmbedding = embeddingResult.embedding;

        // Pad or truncate to 1536 dimensions for pgvector compatibility
        if (finalEmbedding && finalEmbedding.length !== 1536) {
          if (finalEmbedding.length < 1536) {
            // Pad with zeros
            finalEmbedding = [...finalEmbedding, ...Array(1536 - finalEmbedding.length).fill(0)];
          } else {
            // Truncate
            finalEmbedding = finalEmbedding.slice(0, 1536);
          }
        }

        const storeResult = await pgVectorService.insertDocumentWithEmbedding(
          documentId,
          content,
          finalEmbedding!,
          {
            ...docMetadata,
            embeddingMetadata: embeddingResult.metadata
          }
        );

        return json({
          action: 'gemma_generate_and_store',
          success: storeResult.success,
          id: storeResult.id,
          embeddingMetadata: embeddingResult.metadata,
          storageError: storeResult.error,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'health':
        // Health check for Gemma embedding service
        const healthResult = await gemmaEmbeddingService.healthCheck();

        return json({
          action: 'gemma_health_check',
          success: healthResult.success,
          model: healthResult.model,
          available: healthResult.available,
          version: healthResult.version,
          error: healthResult.error,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      case 'model-info':
        // Get detailed model information
        const infoResult = await gemmaEmbeddingService.getModelInfo();

        return json({
          action: 'gemma_model_info',
          success: infoResult.success,
          modelInfo: infoResult.modelInfo,
          error: infoResult.error,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });

      default:
        return json({
          error: `Unknown action: ${action}`,
          availableActions: ['generate', 'batch', 'store', 'health', 'model-info'],
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }

  } catch (error) {
    return json({
      error: `Request processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      action,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export const GET: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get('action') || 'health';

  try {
    switch (action) {
      case 'health':
        const healthResult = await gemmaEmbeddingService.healthCheck();
        return json({
          action: 'gemma_health_check',
          ...healthResult,
          timestamp: new Date().toISOString()
        });

      case 'model-info':
        const infoResult = await gemmaEmbeddingService.getModelInfo();
        return json({
          action: 'gemma_model_info',
          ...infoResult,
          timestamp: new Date().toISOString()
        });

      default:
        return json({
          error: `Unknown GET action: ${action}`,
          availableActions: ['health', 'model-info'],
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }

  } catch (error) {
    return json({
      error: `GET request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
