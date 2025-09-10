import { QdrantClient } from '@qdrant/js-client-rest';
import type { PointStruct, SearchRequest } from '@qdrant/js-client-rest';
import { analytics } from '../database/connection';

// Enhanced Qdrant integration for legal AI platform
export class QdrantManager {
  private client: QdrantClient;
  private readonly collections = {
    documents: 'legal_documents',
    cases: 'legal_cases', 
    evidence: 'evidence_items',
    chat_history: 'chat_messages',
    embeddings_cache: 'embedding_cache'
  };

  constructor(url = 'http://localhost:6333') {
    this.client = new QdrantClient({ url });
  }

  // Initialize all collections with proper vector configurations
  async initializeCollections() {
    const collectionConfigs = [
      {
        name: this.collections.documents,
        vectors: {
          content: { size: 1536, distance: 'Cosine' }, // OpenAI embeddings
          summary: { size: 768, distance: 'Cosine' }   // Sentence transformers
        }
      },
      {
        name: this.collections.cases,
        vectors: {
          description: { size: 1536, distance: 'Cosine' }
        }
      },
      {
        name: this.collections.evidence,
        vectors: {
          content: { size: 1536, distance: 'Cosine' }
        }
      },
      {
        name: this.collections.chat_history,
        vectors: {
          message: { size: 768, distance: 'Cosine' }
        }
      },
      {
        name: this.collections.embeddings_cache,
        vectors: {
          embedding: { size: 1536, distance: 'Cosine' }
        }
      }
    ];

    for (const config of collectionConfigs) {
      try {
        await this.client.createCollection(config.name, config);
        console.log(`✅ Qdrant collection created: ${config.name}`);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          console.error(`❌ Failed to create collection ${config.name}:`, error);
        }
      }
    }
  }

  // Hybrid semantic search combining PostgreSQL metadata + Qdrant vectors
  async hybridSearch(params: {
    query: string;
    queryEmbedding: number[];
    collection: keyof typeof this.collections;
    filters?: any;
    limit?: number;
    scoreThreshold?: number;
  }) {
    const startTime = Date.now();
    
    try {
      const searchRequest: SearchRequest = {
        vector: {
          name: 'content',
          vector: params.queryEmbedding
        },
        limit: params.limit || 10,
        score_threshold: params.scoreThreshold || 0.7,
        with_payload: true,
        with_vector: false
      };

      // Add metadata filters if provided
      if (params.filters) {
        searchRequest.filter = this.buildQdrantFilter(params.filters);
      }

      const collectionName = this.collections[params.collection];
      const results = await this.client.search(collectionName, searchRequest);
      
      const responseTime = Date.now() - startTime;
      
      // Track analytics
      await analytics.trackEvent('qdrant_search', {
        collection: params.collection,
        query_length: params.query.length,
        results_count: results.length,
        filters_applied: !!params.filters
      }, {
        responseTimeMs: responseTime
      });

      return {
        results: results.map(result => ({
          id: result.id,
          score: result.score,
          payload: result.payload
        })),
        metadata: {
          query: params.query,
          collection: params.collection,
          response_time_ms: responseTime,
          total_results: results.length
        }
      };

    } catch (error: any) {
      console.error('Qdrant hybrid search error:', error);
      throw new Error(`Qdrant search failed: ${error.message}`);
    }
  }

  // Contextual chat history search for memory simulation
  async searchChatContext(params: {
    userEmbedding: number[];
    userId: string;
    sessionId?: string;
    limit?: number;
  }) {
    const filters: any = {
      must: [
        { key: 'user_id', match: { value: params.userId } }
      ]
    };

    if (params.sessionId) {
      filters.must.push({
        key: 'session_id', 
        match: { value: params.sessionId }
      });
    }

    const searchRequest: SearchRequest = {
      vector: {
        name: 'message',
        vector: params.userEmbedding
      },
      limit: params.limit || 5,
      score_threshold: 0.6,
      filter: filters,
      with_payload: true
    };

    const results = await this.client.search(
      this.collections.chat_history, 
      searchRequest
    );

    return results.map(r => ({
      content: r.payload?.content,
      role: r.payload?.role,
      score: r.score,
      timestamp: r.payload?.created_at
    }));
  }

  // Batch upsert for efficient data synchronization
  async batchUpsert(params: {
    collection: keyof typeof this.collections;
    points: PointStruct[];
    batchSize?: number;
  }) {
    const batchSize = params.batchSize || 100;
    const collectionName = this.collections[params.collection];
    const batches = this.chunkArray(params.points, batchSize);
    
    let totalUpserted = 0;
    
    for (const batch of batches) {
      try {
        await this.client.upsert(collectionName, {
          wait: false,
          points: batch
        });
        totalUpserted += batch.length;
        
        console.log(`📝 Upserted ${batch.length} points to ${collectionName}`);
      } catch (error: any) {
        console.error(`❌ Batch upsert failed for ${collectionName}:`, error);
      }
    }

    return { upserted: totalUpserted };
  }

  // Document embedding storage with metadata
  async storeDocument(document: {
    id: string;
    title: string;
    content: string;
    contentEmbedding: number[];
    summaryEmbedding?: number[];
    metadata: any;
  }) {
    const point: PointStruct = {
      id: document.id,
      vector: {
        content: document.contentEmbedding,
        ...(document.summaryEmbedding && { summary: document.summaryEmbedding })
      },
      payload: {
        title: document.title,
        content_preview: document.content.substring(0, 500),
        document_type: document.metadata.document_type,
        case_id: document.metadata.case_id,
        created_at: new Date().toISOString(),
        ...document.metadata
      }
    };

    await this.client.upsert(this.collections.documents, {
      wait: true,
      points: [point]
    });
  }

  // Evidence relationship analysis using vector similarity
  async findRelatedEvidence(evidenceId: string, embedding: number[], limit = 5) {
    const searchRequest: SearchRequest = {
      vector: {
        name: 'content',
        vector: embedding
      },
      limit: limit + 1, // +1 to exclude self
      score_threshold: 0.75,
      filter: {
        must_not: [
          { key: 'evidence_id', match: { value: evidenceId } }
        ]
      },
      with_payload: true
    };

    const results = await this.client.search(
      this.collections.evidence,
      searchRequest
    );

    return results
      .filter(r => r.id !== evidenceId)
      .slice(0, limit)
      .map(r => ({
        evidence_id: r.id,
        similarity_score: r.score,
        relationship_strength: this.calculateRelationshipStrength(r.score),
        evidence_data: r.payload
      }));
  }

  // Vector similarity caching for performance
  async cacheEmbedding(key: string, embedding: number[], metadata: any) {
    const point: PointStruct = {
      id: key,
      vector: {
        embedding: embedding
      },
      payload: {
        cache_key: key,
        cached_at: Date.now(),
        expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        ...metadata
      }
    };

    await this.client.upsert(this.collections.embeddings_cache, {
      wait: false,
      points: [point]
    });
  }

  async getCachedEmbedding(key: string) {
    try {
      const results = await this.client.search(this.collections.embeddings_cache, {
        vector: {
          name: 'embedding',
          vector: new Array(1536).fill(0) // Dummy vector for exact match
        },
        limit: 1,
        filter: {
          must: [
            { key: 'cache_key', match: { value: key } },
            { key: 'expires_at', range: { gt: Date.now() } }
          ]
        }
      });

      return results.length > 0 ? results[0] : null;
    } catch {
      return null;
    }
  }

  // Collection management
  async getCollectionInfo(collection: keyof typeof this.collections) {
    try {
      const collectionName = this.collections[collection];
      const info = await this.client.getCollection(collectionName);
      
      return {
        name: collectionName,
        vectors_count: info.vectors_count || 0,
        segments_count: info.segments_count || 0,
        status: info.status,
        optimizer_status: info.optimizer_status
      };
    } catch (error: any) {
      console.error(`Failed to get collection info for ${collection}:`, error);
      return null;
    }
  }

  async healthCheck() {
    try {
      // Simple health check by getting collections
      const collections = await this.client.getCollections();
      
      return {
        status: 'healthy',
        collections: collections.collections.map(c => ({
          name: c.name,
          vectors: c.vectors_count || 0
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Helper methods
  private buildQdrantFilter(filters: any) {
    const conditions = [];
    
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        conditions.push({
          key,
          match: { any: value }
        });
      } else {
        conditions.push({
          key,
          match: { value }
        });
      }
    }

    return { must: conditions };
  }

  private calculateRelationshipStrength(score: number): 'weak' | 'moderate' | 'strong' | 'very_strong' {
    if (score >= 0.9) return 'very_strong';
    if (score >= 0.8) return 'strong';
    if (score >= 0.7) return 'moderate';
    return 'weak';
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Singleton instance
export const qdrant = new QdrantManager();

// Initialize collections on module load
qdrant.initializeCollections().catch(console.error);