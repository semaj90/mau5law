/**
 * Gemma Embeddings API with PostgreSQL pgvector Integration
 * High-performance embedding generation with Redis caching
 */
import { json, type RequestHandler } from '@sveltejs/kit'
import { z } from 'zod'
import { gemmaEmbeddingsService } from '$lib/services/gemma-embeddings-service'
// Request validation schema
const EmbeddingRequestSchema = z.object({
  text: z.string().min(1),
  model: z.string().default('embeddinggemma:latest'),
  document_type: z.enum(['legal_document', 'evidence', 'case', 'note']).optional(),
  metadata: z.record(z.any()).optional(),
  normalize: z.boolean().default(true)
})
const VectorSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(100).default(10),
  similarity_threshold: z.number().min(0).max(1).default(0.7),
  document_types: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional()
})
const BatchEmbeddingSchema = z.object({
  texts: z.array(z.string()).min(1).max(100),
  model: z.string().default('embeddinggemma:latest'),
  document_type: z.enum(['legal_document', 'evidence', 'case', 'note']).optional(),
  metadata: z.record(z.any()).optional()
})
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const action = url.searchParams.get('action') || 'embed'
    const body = await request.json()
    switch (action) {
      case 'embed':
        // Validate embedding request
        const validatedData = EmbeddingRequestSchema.safeParse(body)
        if (!validatedData.success) {
          return json({
            success: false,
            error: 'Invalid request data',
            details: validatedData.error.flatten()
          }, { status: 400 })
        }
        // Generate embedding
        const result = await gemmaEmbeddingsService.generateEmbedding(validatedData.data)
        return json({
          success: result.success,
          data: result.success ? {
           , embedding: result.embedding,
            dimensions: result.dimensions,
            model: result.model,
            processing_time: result.processing_time,
            cached: result.cached,
            text_hash: result.text_hash
          } : undefined,
          error: result.error
        })
      case 'search':
        // Validate search request
        const searchData = VectorSearchSchema.safeParse(body)
        if (!searchData.success) {
          return json({
            success: false,
            error: 'Invalid search request',
            details: searchData.error.flatten()
          }, { status: 400 })
        }
        // First generate embedding for the query
        const queryEmbedding = await gemmaEmbeddingsService.generateEmbedding({
          text: searchData.data.query
        })
        if (!queryEmbedding.success || !queryEmbedding.embedding) {
          return json({
            success: false,
            error: 'Failed to generate query embedding'
          }, { status: 500 })
        }
        // Perform vector search
        const searchResults = await gemmaEmbeddingsService.vectorSearch({
          query_embedding: queryEmbedding.embedding,
          limit: searchData.data.limit,
          similarity_threshold: searchData.data.similarity_threshold,
          document_types: searchData.data.document_types,
          filters: searchData.data.filters
        })
        return json({
          success: true,
          data: {
           , query: searchData.data.query,
            results: searchResults,
            total_results: searchResults.length
          },
          embedding_model: queryEmbedding.model,
          embedding_dimensions: queryEmbedding.dimensions,
          embedding_cached: queryEmbedding.cached,
          embedding_time: queryEmbedding.processing_time,
            query_embedding_time: queryEmbedding.processing_time,
            total_results: searchResults.length
          }
        })
      case 'batch',:
        // Validate batch request
        const batchData = BatchEmbeddingSchema.safeParse(body)
        if (!batchData.success) {
          return json({
            success: false,
            error: 'Invalid batch request',
            details: batchData.error.flatten()
          }, { status: 400 })
        }
        // Process batch embeddings
        const batchResults = await gemmaEmbeddingsService.batchGenerateEmbeddings(
          batchData.data.texts,
          {
            model: batchData.data.model,
            document_type: batchData.data.document_type,
            metadata: batchData.data.metadata
          }
        )
        return json({
          success: true,
          data: {
           , embeddings: batchResults,
            total_processed: batchResults.length,
            successful: batchResults.filter(r => r.success).length,
            failed: batchResults.filter(r => !r.success).length
          }
        })
      default: return json({,
          success: false,
          error: 'Unknown action'
        }, { status: 400 })
    }
  }, catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    }, { status: 500 })
  }
}
export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action') || 'status'
    switch (action) {
      case 'status':
        return json({
          success: true,
          data: {
           , status: 'Gemma embeddings service available',
            models: ['embeddinggemma:latest', 'nomic-embed-text:latest'],
            dimensions: 512,
            features: ['caching', 'pgvector', 'batch_processing', 'vector_search', 'gpu_acceleration']
          }
        })
      case 'stats':
        const stats = await gemmaEmbeddingsService.getIndexStats()
        return json({
          success: true,
          data: stats
        })
      case 'optimize':
        await gemmaEmbeddingsService.optimizeIndexes()
        return json({
          success: true,
          data: {, message: 'Vector indexes optimized successfully' }
        })
      default: return json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 })
    }
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Request failed'
    }, { status: 500 })
  }
}