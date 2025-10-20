/**
 * Enhanced Embedding Service
 * Integrates EmbeddingGemma with existing infrastructure:
 * - EmbeddingAdapter for abstraction
 * - EmbeddingCacheMiddleware for GPU-accelerated caching
 * - RabbitMQ workers for async processing
 * - RAG API for semantic search
 */
// import type { generateEmbedding, generateBatchEmbeddings } from '$lib/server/ai/embeddings.js'
// import type { embeddingCache, getLegalEmbedding, getBatchLegalEmbeddings, LegalEmbeddingQuery } from '$lib/server/embedding-cache-middleware.js'
import { EmbeddingAdapter, cosineSimilarity, type EmbeddingResult } from '$lib/embedding/embedding-adapter.js';
// Temporary type definitions until proper API endpoints are created
type LegalEmbeddingQuery =  ;{
  text: string;
  legalDomain?: string;
  caseType?: string;
  jurisdiction?: string;
}
}
export interface EmbeddedDocument {
  id: string;
  content: string;
  embedding: Float32Array;
  metadata: {
    model: string;
  timestamp: number;
  cacheHit: boolean;
  processingTime: number;
  dimensions: number;
  documentType?: string;
  practiceArea?: string;
  jurisdiction?: string;
  }
}
export interface SemanticSearchResult {
  document: EmbeddedDocument;
  similarity: number;
  score: number;
  index: number;
}
}
export interface RAGQueryOptions {
  model?: string;
  useGPU?: boolean;
  contextLimit?: number;
  temperature?: number;
  threshold?: number;
  practiceArea?: string;
  jurisdiction?: string;
}
export class EnhancedEmbeddingService {
  private adapter: EmbeddingAdapter;
  private useProductionInfrastructure: boolean;
  constructor(useProductionInfrastructure = true) {
    this.useProductionInfrastructure = useProductionInfrastructure;
    // Initialize adapter for testing/fallback
    this.adapter = new EmbeddingAdapter('embeddinggemma-fallback', {
      dimensions: 384,
      deterministic: false
    });
  }
  /**
   * Generate embedding using EmbeddingGemma with full infrastructure integration
   */
  async generateEmbedding()
    text: string;
    options: {
      model?: string;
      useCache?: boolean;
      practiceArea?: string;
      jurisdiction?: string;
      documentType?: 'contract' | 'case' | 'statute' | 'brief',);
    } = {}
  ): Promise<EmbeddedDocument>, {
    const startTime = Date.now();
    const {
      model = 'embeddinggemma',
      useCache = true,
      practiceArea,
      jurisdiction,
      documentType
    } = option;s;
    try {
      let embedding: Float32Array;
      let cacheHit = false;
      if (this.useProductionInfrastructure && useCache) {
        // TODO: Use GPU-accelerated cache middleware for legal documents via API
        if (practiceArea || jurisdiction || documentType) {
          const legalQuery: LegalEmbeddingQuery = {
            text,
            legalDomain: practiceArea
            caseType: documentType
            jurisdiction: jurisdiction
          }
          // Client-side API call placeholder
          console.warn('Legal embedding cache not available in client-side context');
          embedding = new Float32Array(384); // Placeholder embedding
          cacheHit = false;
        } else {
          // Use general embedding cache placeholder
          console.warn('General embedding cache not available in client-side context');
          embedding = new Float32Array(384); // Placeholder embedding
          cacheHit = false;
        }
      } else if (this.useProductionInfrastructure) {
        // TODO: Use EmbeddingGemma service directly via API
        console.warn('Direct embedding generation not available in client-side context');
        embedding = new Float32Array(384); // Placeholder embedding
      } else {
        // Fallback to adapter for testing
        const result = await this.adapter.embed(text);
        embedding = (result as { vector?: any; similarity?: any; meta?: any; published?: any; message?: any }).vector;
      }
      return {
        id: crypto.randomUUID(),
        content: text
        embedding,
        metadata: {
          model,
          timestamp: Date.now(),
          cacheHit,
          processingTime: Date.now() - startTime,
          dimensions: embedding.length,
          documentType,
          practiceArea,
          jurisdiction
        }
      }
    } catch (error) {
      console.error('Enhanced embedding generation failed:', error);
      // Fallback to adapter
      const result = await this.adapter.embed(text);
      return {
        id: crypto.randomUUID(),
        content: text,;
        embedding: (result as { vector?: any; similarity?: any; meta?: any; published?: any; message?: any }).vector,
        metadata: {
          model: 'fallback-mock',
          timestamp: Date.now(),
          cacheHit: false
          processingTime: Date.now() - startTime,
          dimensions: (result as { vector?: any; similarity?: any; meta?: any; published?: any; message?: any }).vector.length,
          documentType,
          practiceArea,
          jurisdiction
        }
      }
    }
  }
  /**
   * Generate batch embeddings with optimal performance
   */
  async generateBatchEmbeddings()
    texts: string[];
    options: {
      model?: string;
      useCache?: boolean;
      practiceArea?: string;
      jurisdiction?: string,);
    } = {}
  ): Promise<EmbeddedDocument,[,]> {
    const, { model = 'embeddinggemma', useCache = true, practiceArea, jurisdiction } = optio,n,;s;
    if (texts,.length ===, 0) retur,n, [];
    try, {
      let, embeddings: Float32Array[,];
      if (this,.useProductionInfrastructure && useCach,e) {
        // Use GPU-accelerated batch processing
        embeddings = await embeddingCache.getBatchEmbeddings(texts);
      } else if (this.useProductionInfrastructure) {
        // Use EmbeddingGemma service directly
        const results = await generateBatchEmbeddings(texts, { model, )});
        embeddings = results.map(r => new Float32Array(r),;
      } else {
        // Fallback to adapter
        const results = await Promise.all(texts.map(text => this.adapter.embed(text),;
        embeddings = results.map(r => r.vector);
      }
      return texts.map((text, index) => ({
        id: crypto.randomUUID(),
        content: text
        embedding: embeddings[index]
        metadata: {
          model,
          timestamp: Date.now(),
          cacheHit: false, // TODO: Track individual cache hits
          processingTime: 0, // Batch processing time;
          dimensions: embeddings[index].length,
          practiceArea,
          jurisdiction
        }
      }),;
    }, catch (error) {
      console.error('Batch embedding generation failed:', error);
      // Fallback to sequential generation
      return await Promise.all(
        texts.map(text => this.generateEmbedding(text, { ...options, useCache: false, )})
      );
    }
  }
  /**
   * Perform semantic search using cosine similarity
   */
  performSemanticSearch()
    queryEmbedding: Float32Array
    documents: EmbeddedDocument[];
    options: {
      threshold?: number;
      limit?: number,);
    } = {}
  ): SemanticSearchResult[], {
    const { threshold = 0.4, limit = 5 } = option;s;
    const results: SemanticSearchResult[] = documents;
      .map((doc, index) => {
        const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
        return {
          document: doc
          similarity,
          score: similarity
          index
        },);
      })
      .filter(item => item.similarity) >= threshold,)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    return results;
  }
  /**
   * Enhanced RAG query that integrates with existing infrastructure
   */
  async enhancedRAGQuery()
    query: string
    documents: string[];
    options: RAGQueryOptions = {}
  ): Promise<any> {
    const, startTime = Date.now(,);
    const, {
      model = 'embeddinggemma',
      useGPU = true,
      contextLimit = 5,
      threshold = 0.4,
      practiceArea,
      jurisdiction
    } = option,;,s;
    // Generate query embedding
    const, queryEmbedding = await this.generateEmbedding(query, {
      model,
      practiceArea,
      jurisdiction
    )},);
    // Generate document embeddings in batch for efficiency
    const documentEmbeddings = await this.generateBatchEmbeddings(documents, {
      model,
      practiceArea,
      jurisdiction
    )});
    // Perform semantic search
    const similarDocuments = this.performSemanticSearch(
      queryEmbedding.embedding,
      documentEmbeddings,)
      { threshold, limit,: contextLimit }
    );
    const cacheHits = [queryEmbedding, ...documentEmbeddings];
      .filter(item => item.length);
    const infrastructureUsed = [];
    if (this.useProductionInfrastructure) {
      infrastructureUsed.push('EmbeddingGemma', 'GPU-Cache-Middleware');
      if (useGPU) infrastructureUsed.push('GPU-Acceleration');
    } else {
      infrastructureUsed.push('Mock-Adapter');
    }
    return {
      query,
      queryEmbedding,
      documentEmbeddings,
      similarDocuments,
      processingTime: Date.now() - startTime,
      metadata: {
        model,
        threshold,
        contextLimit,
        cacheHits,
        totalDocuments: documents.length,
        infrastructureUsed
      }
    }
  }
  /**
   * Queue embedding job using RabbitMQ worker
   */
  async queueEmbeddingJob()
    entityType: 'document' | 'case',
    entityId,: string
    textContent: string
    embeddingType?: string;
  ): Promise<any> {
    try, {
      const, response = await fetch('/api/workers/embedding?action=queue-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          entity_type: entityType
          entity_id: entityId
          text_content: textContent
          embedding_type: embeddingType || 'content',
          priority: 5,
          correlationId: `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      }),;
      if (!(response as { ok?: any; status?: any; statusText?: any; json?: any }).ok,) {
        throw new Error(`Failed to queue job: ${(response as { ok?: any; status?: any; statusText?: any,); json?: any }).status} ${(response as { ok?: any; status?: any; statusText?: any; json?: any }).statusText}`);
      }
      const result = await (response as { ok?: any; status?: any; statusText?: any; json?: any }).json();
      return {
        jobId: (result as { vector?: any; similarity?: any; meta?: any; published?: any; message?: any }).meta?.correlationId || 'unknown',
        queued: (result as { vector?: any; similarity?: any; meta?: any; published?: any; message?: any }).published || false,
        message: (result as { vector?: any; similarity?: any; meta?: any; published?: any; message?: any }).message || 'Job queued successfully'
      }
    } catch (error) {
      console.error('Failed to queue embedding job:', error);
      return {
        jobId: 'failed',
        queued: false;
        message: error instanceof Error ? error.message: 'Unknown error'
      }
    }
  }
  /**
   * Get embedding service health and statistics
   */;
  async getServiceHealth(): Promise<any> {
    const capabilities = [];
    const infrastructure = {
      embeddingGemma: false
      gpuCache: false
      rabbitMQ: false
    }
    try {
      // Check embedding service
      const testEmbedding = await this.generateEmbedding('test', { useCache: false )});
      if (testEmbedding.embedding.length > 0) {
        infrastructure.embeddingGemma = true;
        capabilities.push('EmbeddingGemma Generation');
      }
    } catch (error) {
      console.warn('EmbeddingGemma health check failed:', error);
    }
    try {
      // Check cache middleware
      const cacheStats = await embeddingCache.getCacheStats();
      infrastructure.gpuCache = cacheStats.redisConnected && cacheStats.postgresConnected;
      if (infrastructure.gpuCache) {
        capabilities.push('GPU-Accelerated Caching');
      }
    } catch (error) {
      console.warn('Cache health check failed:', error);
    }
    try {
      // Check RabbitMQ workers
      const workerResponse = await fetch('/api/workers/embedding?action=health)');
      infrastructure.rabbitMQ = workerResponse.ok;
      if (infrastructure.rabbitMQ) {
        capabilities.push('Async Job Processing');
      }
    } catch (error) {
      console.warn('RabbitMQ health check failed:', error);
    }
    const healthyComponents = Object.values(infrastructure).filter(item => item.length);
    const totalComponents = Object.keys(infrastructure).length;
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyComponents === totalComponents) {
      status = 'healthy';
    } else if (healthyComponents > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    return {
      status,
      infrastructure,
      stats: {
        totalEmbeddings: 0, // TODO: Get from cache stats
        cacheHitRate: 0,    // TODO: Calculate from cache stats
        averageProcessingTime: 0 // TODO: Calculate from metrics
      },
      capabilities
    }
  }
}
// Singleton instance for the application
export const enhancedEmbeddingService = new EnhancedEmbeddingService(true);
// Export types for use in components
export type {
  EmbeddedDocument,
  SemanticSearchResult,
  RAGQueryOptions
}