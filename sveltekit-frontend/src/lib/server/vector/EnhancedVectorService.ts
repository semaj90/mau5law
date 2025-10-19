// Enhanced Vector Service - Auto-generated from 11 files
// Generated: 2025-07-25T03:29:35.246Z
// Features detected: hasOllama, hasQdrant, hasRedis, hasPgVector, hasEmbeddings
import { createQdrantWrapper, QdrantApiWrapper } from './qdrant-api-wrapper.js';
import type { Redis } from 'ioredis';
import { createRedisInstance } from '$lib/server/redis';
import { cases, evidence, criminals, embeddingCache, vectorMetadata } from '../db/schema-postgres-enhanced.js';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db.js';

interface DocumentMetadata {
  // Allow arbitrary properties for metadata but avoid `any`
  [key: string]: unknown;
}

// New interfaces for better type safety
interface HybridSearchOptions {
  limit?: number;
  threshold?: number;
}

type CaseSelect = typeof cases.$inferSelect;

interface KeywordSearchResult {
  id: string;
  score: number;
  metadata: { type: string; title: string };
  content: string;
}

interface QdrantPayload {
  content: string;
  // Allow arbitrary metadata properties but avoid `any`
  [key: string]: unknown;
}

interface QdrantVectorSearchResult {
  id: string;
  score: number;
  payload: QdrantPayload;
  vector?: number[]; // Qdrant may return the vector if requested
  version?: number; // Qdrant may include a version field
  // Use unknown instead of any for score explanation
  scoreExplanation?: unknown;
} // Corrected closing brace for QdrantVectorSearchResult

// Represents a unified result from both vector and keyword search, including document metadata and content.
interface CombinedSearchResult {
  id: string;
  score: number;
  metadata: { type: string; title: string };
  content: string;
}
export class EnhancedVectorService {
  private qdrant: QdrantApiWrapper;
  // Use explicit Redis type for clarity and easier mocking in tests
  private redis: Redis;
  private collectionName = 'legal_documents';
  constructor() {
    // Removed duplicate constructor
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
        // await this.qdrant.createPayloadIndex(this.collectionName, "type")
        console.log('Payload index creation skipped - method not available in current client');
      } catch (error: unknown) {
        // Changed 'any' to 'unknown'
        console.log('Index creation skipped due to API compatibility');
      }
    }
  }
  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = `embed:${Buffer.from(text).toString('base64').slice(0, 32)}`;
    // Check Redis cache
    const cached: string | null = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as number[]; // Added type assertion

    let embedding: number[] | undefined;
    const ollamaUrl = 'http://localhost:11434/api/embeddings'; // Ollama host URL

    // Try with embeddinggemma:latest first
    try {
      const response: Response = await fetch(ollamaUrl, {
        // Added type for response
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'embeddinggemma:latest',
          prompt: text,
        }),
      });

      if (!response.ok) {
        // If gemma fails, throw to trigger fallback
        throw new Error(`Ollama API error with embeddinggemma:latest: ${response.statusText}`);
      }
      const result = await response.json();
      embedding = result.embedding;
    } catch (error: unknown) {
      // Added type for error
      console.warn(
        `Failed to generate embedding with embeddinggemma:latest, falling back to nomic-embed-text. Error: ${error}`
      );
      // Fallback to nomic-embed-text
      const fallbackResponse: Response = await fetch(ollamaUrl, {
        // Added type for fallbackResponse
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text,
        }),
      });

      if (!fallbackResponse.ok) {
        throw new Error(`Ollama API error with nomic-embed-text fallback: ${fallbackResponse.statusText}`);
      }
      const fallbackResult = await fallbackResponse.json();
      embedding = fallbackResult.embedding;
    }

    if (!embedding) {
      throw new Error('Failed to generate embedding with both primary and fallback models.');
    }

    // Cache for 24 hours - using modern Redis syntax
    if (typeof this.redis.setex === 'function') {
      await this.redis.setex(cacheKey, 86400, JSON.stringify(embedding));
    } else {
      // Fallback to SET with EX option if setex not available in types
      await this.redis.set(cacheKey, JSON.stringify(embedding), 'EX', 86400);
    }
    return embedding;
  }
  async storeDocument(id: string, content: string, metadata: DocumentMetadata) {
    const embedding = await this.generateEmbedding(content);
    await this.qdrant.upsert(this.collectionName, {
      wait: true, // Changed semicolon to comma
      points: [
        // Removed ')'
        {
          id,
          vector: embedding, // Corrected syntax
          payload: { content, ...metadata }, // Added comma for consistency
        },
      ],
    });
  }
  async hybridSearch(query: string, options: HybridSearchOptions = {}): Promise<CombinedSearchResult[]> {
    // Corrected parameter syntax
    const { limit = 10, threshold = 0.7 } = options;
    // Vector search
    const queryEmbedding = await this.generateEmbedding(query);
    const vectorResults: QdrantVectorSearchResult[] = await this.qdrant.search(this.collectionName, {
      vector: queryEmbedding,
      limit,
      score_threshold: threshold,
      with_payload: true,
    });
    // Keyword search in PostgreSQL
    const keywordResults: KeywordSearchResult[] = await this.keywordSearch(query, limit);
    // Combine results
    return this.combineResults(vectorResults, keywordResults);
  }
  private async keywordSearch(query: string, limit: number): Promise<KeywordSearchResult[]> {
    const caseResults = await db
      .select()
      .from(cases)
      .where(sql`${cases.title} ILIKE ${'%' + query + '%'} OR ${cases.description} ILIKE ${'%' + query + '%'}`)
      .limit(limit);

    return caseResults.map((c: CaseSelect) => ({
      id: c.id,
      score: 0.8, // Placeholder score, could be improved with text similarity
      metadata: { type: 'case', title: c.title },
      content: `${c.title} ${c.description}`,
    }));
  }
  private combineResults(
    vectorResults: QdrantVectorSearchResult[],
    keywordResults: KeywordSearchResult[]
  ): CombinedSearchResult[] {
    // Corrected parameter syntax
    const combined = new Map<string, CombinedSearchResult>();
    vectorResults.forEach(r =>
      combined.set(r.id, {
        id: r.id,
        score: r.score * 0.7,
        metadata: { type: r.payload.type || 'document', title: r.payload.title || 'Untitled Document' }, // Assuming payload has type and title
        content: r.payload.content,
      })
    ); // Added closing parenthesis
    keywordResults.forEach(r => {
      const existing = combined.get(r.id);
      if (existing) existing.score += r.score * 0.3;
      else combined.set(r.id, { ...r, score: r.score * 0.3 });
    });
    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }
  async healthCheck() {
    try {
      await this.qdrant.getCollections();
      await this.redis.ping();
      return { qdrant: true, redis: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { qdrant: false, redis: false, error: errorMessage };
    }
  }
}
export const vectorService = new EnhancedVectorService();
