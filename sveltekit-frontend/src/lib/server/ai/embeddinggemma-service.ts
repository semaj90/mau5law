/**
 * EmbeddingGemma Service
 *
 * Provides:
 * - Text embedding generation using embeddinggemma:latest
 * - Batch embedding with caching
 * - Entity-specific embedding optimization
 * - Integration with PostgreSQL and Qdrant
 */

import { createHash } from 'crypto';
import { db } from '../db';
import { contextualEmbeddings } from '../db/schema-postgres';
import { eq, and } from 'drizzle-orm';
import { qdrantVectorStore } from './qdrant-vector-store';
import { cognitiveCache } from '../cache';
import type { LegalEntity } from '$lib/types/sharedTypes';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = 'embeddinggemma:latest';
const EMBEDDING_DIM = 768;

// Cache TTL for embeddings (7 days)
const CACHE_TTL = 7 * 24 * 60 * 60;

/**
 * Embedding request options
 */
interface EmbeddingOptions {
  model?: string;
  sessionId?: string;
  turnId?: string;
  embeddingType?: 'message' | 'entity' | 'summary';
  useCache?: boolean;
  storeInQdrant?: boolean;
}

/**
 * Embedding result
 */
interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  cached: boolean;
  processingTime: number;
}

/**
 * Batch embedding result
 */
interface BatchEmbeddingResult {
  embeddings: number[][];
  dimensions: number;
  model: string;
  cachedCount: number;
  totalProcessingTime: number;
}

/**
 * EmbeddingGemma Service Class
 */
export class EmbeddingGemmaService {
  private model: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model;
  }

  /**
   * Generate embedding for single text
   */
  async embed(text: string, options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const model = options.model || this.model;
    const useCache = options.useCache !== false; // Default true

    // Generate text hash for caching
    const textHash = this.generateTextHash(text, model);

    // Check cache first
    if (useCache) {
      const cached = await this.getCachedEmbedding(textHash, model);
      if (cached) {
        return {
          embedding: cached,
          dimensions: cached.length,
          model,
          cached: true,
          processingTime: Date.now() - startTime,
        };
      }
    }

    // Generate embedding via Ollama
    const embedding = await this.generateEmbedding(text, model);

    // Store in cache
    if (useCache) {
      await this.cacheEmbedding(
        textHash,
        text,
        embedding,
        model,
        options.sessionId,
        options.turnId,
        options.embeddingType
      );
    }

    // Store in Qdrant if requested
    if (options.storeInQdrant && options.sessionId) {
      await this.storeInQdrant(text, embedding, options.sessionId, options.turnId, options.embeddingType);
    }

    return {
      embedding,
      dimensions: embedding.length,
      model,
      cached: false,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async embedBatch(texts: string[], options: EmbeddingOptions = {}): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();
    const model = options.model || this.model;
    const useCache = options.useCache !== false;

    const embeddings: number[][] = [];
    let cachedCount = 0;

    // Process each text
    for (const text of texts) {
      const result = await this.embed(text, {
        ...options,
        model,
        useCache,
      });

      embeddings.push(result.embedding);
      if (result.cached) cachedCount++;
    }

    return {
      embeddings,
      dimensions: embeddings[0]?.length || EMBEDDING_DIM,
      model,
      cachedCount,
      totalProcessingTime: Date.now() - startTime,
    };
  }

  /**
   * Generate entity-optimized embedding
   *
   * Adds entity type context for better semantic representation
   */
  async embedEntity(entityValue: string, entityType: string, options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
    // Add entity type as context for better semantic representation
    const contextualText = `[${entityType.toUpperCase()}] ${entityValue}`;

    return this.embed(contextualText, {
      ...options,
      embeddingType: 'entity',
    });
  }

  /**
   * Generate conversation summary embedding
   */
  async embedSummary(
    summary: string,
    metadata: {
      sessionId: string;
      turnCount: number;
      currentState: number;
    },
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    return this.embed(summary, {
      ...options,
      sessionId: metadata.sessionId,
      embeddingType: 'summary',
      storeInQdrant: true,
    });
  }

  /**
   * Calculate similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Find most similar texts from a list
   */
  async findMostSimilar(
    queryText: string,
    candidateTexts: string[],
    topK: number = 5
  ): Promise<Array<{ text: string; score: number; index: number }>> {
    // Generate embeddings
    const queryResult = await this.embed(queryText);
    const candidateResults = await this.embedBatch(candidateTexts);

    // Calculate similarities
    const similarities = candidateResults.embeddings.map((embedding, index) => ({
      text: candidateTexts[index],
      score: this.cosineSimilarity(queryResult.embedding, embedding),
      index,
    }));

    // Sort by score and return top K
    return similarities.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Generate embedding via Ollama API
   */
  private async generateEmbedding(text: string, model: string): Promise<number[]> {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid embedding response from Ollama');
      }

      return data.embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Get cached embedding from PostgreSQL
   */
  private async getCachedEmbedding(textHash: string, model: string): Promise<number[] | null> {
    try {
      // Try Redis cache first
      const redisKey = `embedding:${textHash}:${model}`;
      const cached = await cognitiveCache.getJsonbDocument<number[]>(redisKey);

      if (cached) {
        return cached;
      }

      // Try PostgreSQL
      const rows = await db
        .select()
        .from(contextualEmbeddings)
        .where(and(eq(contextualEmbeddings.textHash, textHash), eq(contextualEmbeddings.model, model)))
        .limit(1);

      if (rows.length > 0) {
        const embedding = JSON.parse(rows[0].embedding);

        // Store in Redis for faster access next time
        await cognitiveCache.storeJsonbDocument(redisKey, embedding, CACHE_TTL);

        return embedding;
      }

      return null;
    } catch (error) {
      console.error('Error reading cached embedding:', error);
      return null;
    }
  }

  /**
   * Cache embedding in PostgreSQL and Redis
   */
  private async cacheEmbedding(
    textHash: string,
    text: string,
    embedding: number[],
    model: string,
    sessionId?: string,
    turnId?: string,
    embeddingType?: string
  ): Promise<void> {
    try {
      // Store in PostgreSQL
      await db
        .insert(contextualEmbeddings)
        .values({
          sessionId: sessionId || null,
          turnId: turnId || null,
          embeddingType: embeddingType || 'message',
          text: text.substring(0, 5000), // Limit text storage
          textHash,
          model,
          embedding: JSON.stringify(embedding),
          dimensions: embedding.length,
          metadata: {},
        })
        .onConflictDoNothing();

      // Store in Redis
      const redisKey = `embedding:${textHash}:${model}`;
      await cognitiveCache.storeJsonbDocument(redisKey, embedding, CACHE_TTL);
    } catch (error) {
      console.error('Error caching embedding:', error);
      // Don't throw - caching failure shouldn't break the flow
    }
  }

  /**
   * Store embedding in Qdrant
   */
  private async storeInQdrant(
    text: string,
    embedding: number[],
    sessionId: string,
    turnId?: string,
    embeddingType?: string
  ): Promise<void> {
    try {
      if (embeddingType === 'entity') {
        // Extract entity info from text
        const match = text.match(/\[([^\]]+)\]\s*(.+)/);
        if (match) {
          const [, entityType, entityValue] = match;
          await qdrantVectorStore.storeEntity(
            sessionId,
            {
              type: entityType.toLowerCase() as LegalEntity['type'],
              value: entityValue,
              confidence: 1.0,
              span: {
                start: 0,
                end: entityValue.length,
              },
            },
            embedding
          );
        }
      } else if (embeddingType === 'summary') {
        await qdrantVectorStore.storeSummary(sessionId, text, embedding, {
          turnCount: 0,
          currentState: 0,
          confidence: 1.0,
        });
      } else if (turnId) {
        // Conversation turn - would need more metadata
        // This is a placeholder - full implementation would fetch turn data
        await qdrantVectorStore.storeConversationTurn(sessionId, 0, text, '', embedding, {
          intent: 'general_query',
          hmmState: 0,
          confidence: 1.0,
          entities: [],
        });
      }
    } catch (error) {
      console.error('Error storing in Qdrant:', error);
      // Don't throw - Qdrant storage failure shouldn't break the flow
    }
  }

  /**
   * Generate text hash for caching
   */
  private generateTextHash(text: string, model: string): string {
    return createHash('sha256').update(`${model}:${text}`).digest('hex');
  }

  /**
   * Get embedding statistics
   */
  async getStatistics(): Promise<{
    totalEmbeddings: number;
    byModel: Record<string, number>;
    byType: Record<string, number>;
  }> {
    try {
      const allEmbeddings = await db.select().from(contextualEmbeddings);

      const byModel: Record<string, number> = {};
      const byType: Record<string, number> = {};

      for (const embedding of allEmbeddings) {
        // Count by model
        byModel[embedding.model] = (byModel[embedding.model] || 0) + 1;

        // Count by type
        byType[embedding.embeddingType] = (byType[embedding.embeddingType] || 0) + 1;
      }

      return {
        totalEmbeddings: allEmbeddings.length,
        byModel,
        byType,
      };
    } catch (error) {
      console.error('Error getting embedding statistics:', error);
      return {
        totalEmbeddings: 0,
        byModel: {},
        byType: {},
      };
    }
  }
}

// Export singleton instance
export const embeddingGemma = new EmbeddingGemmaService();
