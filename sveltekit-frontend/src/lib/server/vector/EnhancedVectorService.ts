
// Enhanced Vector Service - Auto-generated from 11 files
// Generated: 2025-07-25T03:29:35.246Z
// Features detected: hasOllama, hasQdrant, hasRedis, hasPgVector, hasEmbeddings

import { createQdrantWrapper, QdrantApiWrapper } from './qdrant-api-wrapper.js';
import type { Redis } from 'ioredis';
import { createRedisInstance } from '$lib/server/redis';
import {
  cases,
  evidence,
  criminals,
  embeddingCache,
  vectorMetadata,
} from '../db/schema-postgres-enhanced.js';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db.js';

export class EnhancedVectorService {
  private qdrant: QdrantApiWrapper;
  // Accept broader Redis-like interface to reduce tight coupling in tests
  private redis: ReturnType<typeof createRedisInstance>;
  private collectionName = 'legal_documents';

  constructor() {
    this.qdrant = createQdrantWrapper({
      url: import.meta.env.QDRANT_URL || 'http://localhost:6333',
    });

    // Centralized Redis instance (injects password & consistent options). Fallback not needed here.
    this.redis = createRedisInstance();
  }

  async initializeCollection() {
    const collections = await this.qdrant.getCollections();
    const exists = collections.collections.some((c: any) => c.name === this.collectionName);

    if (!exists) {
      await this.qdrant.createCollection(this.collectionName, {
        vectors: { size: 768, distance: 'Cosine' },
        optimizers_config: { default_segment_number: 2 },
      });

      try {
        // Note: createPayloadIndex method doesn't exist in current Qdrant client
        // Using createFieldIndex instead or commenting out until verified
        // await this.qdrant.createPayloadIndex(this.collectionName, "type");
        console.log('Payload index creation skipped - method not available in current client');
      } catch (error: any) {
        console.log('Index creation skipped due to API compatibility');
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = `embed:${Buffer.from(text).toString('base64').slice(0, 32)}`;

    // Check Redis cache
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Generate with Ollama nomic-embed
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text,
      }),
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);

    const result = await response.json();
    const embedding = result.embedding;

    // Cache for 24 hours - using modern Redis syntax
    if (typeof (this.redis as any).setex === 'function') {
      await (this.redis as any).setex(cacheKey, 86400, JSON.stringify(embedding));
    } else {
      // Fallback to SET with EX option if setex not available in types
      await (this.redis as any).set(cacheKey, JSON.stringify(embedding), 'EX', 86400);
    }

    return embedding;
  }

  async storeDocument(id: string, content: string, metadata: any) {
    const embedding = await this.generateEmbedding(content);

    await this.qdrant.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id,
          vector: embedding,
          payload: { content, ...metadata },
        },
      ],
    });
  }

  async hybridSearch(query: string, options: any = {}) {
    const { limit = 10, threshold = 0.7 } = options;

    // Vector search
    const queryEmbedding = await this.generateEmbedding(query);
    const vectorResults = await this.qdrant.search(this.collectionName, {
      vector: queryEmbedding,
      limit,
      score_threshold: threshold,
      with_payload: true,
    });

    // Keyword search in PostgreSQL
    const keywordResults = await this.keywordSearch(query, limit);

    // Combine results
    return this.combineResults(vectorResults, keywordResults);
  }

  private async keywordSearch(query: string, limit: number) {
    const caseResults = await db
      .select()
      .from(cases)
      .where(sql`title ILIKE ${'%' + query + '%'} OR description ILIKE ${'%' + query + '%'}`)
      .limit(limit);

    return caseResults.map((c: any) => ({
    id: c.id,
    score: 0.8,
    metadata: { type: 'case', title: c.title },
    content: `${c.title} ${c.description}`,
  }));
  }

  private combineResults(vectorResults: any[], keywordResults: any[]) {
    const combined = new Map();

    vectorResults.forEach((r) => combined.set(r.id, { ...r, score: r.score * 0.7 }));
    keywordResults.forEach((r) => {
      const existing = combined.get(r.id);
      if (existing) existing.score += r.score * 0.3;
      else combined.set(r.id, { ...r, score: r.score * 0.3 });
    });

    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }

  async healthCheck() {
    try {
      await this.qdrant.getCollections();
      await (this.redis as any).ping();
      return { qdrant: true, redis: true };
    } catch (error: any) {
      return { qdrant: false, redis: false, error: error.message };
    }
  }
}

export const vectorService = new EnhancedVectorService();
;