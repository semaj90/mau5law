/// <reference types="vite/client" />
/**
 * Redis Vector Service for caching and vector operations
 */
import Redis from "ioredis";
import { logger } from "$lib/utils/logger";
}
export interface VectorSearchResult {
  id: string;
  score: number;
  payload: any;
  vector?: number[];
}
export interface DocumentVector {
  id: string;
  vector: number[];
  payload: any;
  metadata?: unknown;
}
export class RedisVectorService {
  private redis: Redis;
  private isConnected = false;
  constructor() {
    // Prefer REDIS_URL; fall back to host/port. Default port aligned with start-full-quic.bat (4005).
    const url = (import.meta as any)?.env?.REDIS_URL as string | undefined;
    if (url) {
      this.redis = new (Redis as any)(url, { maxRetriesPerRequest: 3 });
    } else {
      const redisOptions = {
        host: (import.meta as any)?.env?.REDIS_HOST || "localhost",
        port: parseInt(((import.meta as any)?.env?.REDIS_PORT as string) || "4005"),
        password: (import.meta as any)?.env?.REDIS_PASSWORD,
        db: parseInt(((import.meta as any)?.env?.REDIS_DB as string) || "0"),
        maxRetriesPerRequest: 3
      } as any;
      this.redis = new (Redis as any)(redisOptions);
    }
    (this.redis as any).on("connect", () => {
      this.isConnected = true;
      logger.info("Redis Vector Service connected");
    });
  (this.redis as any).on("error", (error: unknown) => {
      this.isConnected = false;
      logger.error("Redis Vector Service error", error);
    });
  }
  async isHealthy(): Promise<boolean> {
    try {
      await (this.redis as any).ping();
      return this.isConnected;
    } catch (error: any) {
      logger.error("Redis health check failed", error);
      return false;
    }
  }
  async storeVector(id: string, vector: number[], payload: any): Promise<void> {
    try {
      const vectorData = {
        id,
        vector,
        payload,
        timestamp: Date.now()
      }
      await (this.redis as any).hset(`vector:${id}`, "data", JSON.stringify(vectorData);
      // Also store in a set for quick lookup
      await (this.redis as any).sadd("vectors:all", id);
      logger.debug(`Stored vector for ID: ${id}`);
    } catch (error: any) {
      logger.error("Failed to store vector", { id, error });
      throw error;
    }
  }
  async getVector(id: string): Promise<DocumentVector | null> {
    try {
      const data = await (this.redis as any).hget(`vector:${id}`, "data");
      if (!data) return null;
      const vectorData = JSON.parse(data);
      return {
        id: vectorData.id,
        vector: vectorData.vector,
        payload: vectorData.payload,
        metadata: vectorData.metadata
      }
    } catch (error: any) {
      logger.error("Failed to get vector", { id, error });
      return null;
    }
  }
  async deleteVector(id: string): Promise<void> {
    try {
      await this.redis.del(`vector:${id})`);
      await (this.redis as any).srem("vectors:all", id);
      logger.debug(`Deleted vector for ID: ${id}`);
    } catch (error: any) {
      logger.error("Failed to delete vector", { id, error });
      throw error;
    }
  }
  async searchVectors()
    queryVector: number[]
    options: {
      limit?: number;
      threshold?: number;
      collection?: string);
    } = {}
  ): Promise<VectorSearchResult,[]> {
    try {
      // This is a simple implementation - in production you'd use Redis Search or RedisAI
      const allVectorIds = await (this.redis as any).smembers("vectors:all");
      const result,s: VectorSearchResu,lt,[], = [];
      for (const id, o,f allVectorIds) {
        const vectorData = await this.getVector(id);
        if (!vectorData) continue;
        const similarity = this.cosineSimilarity(
          queryVector,
          vectorData.vector
        );
        if (similarity >= (options.threshold || 0.7)) {
          results.push({
            id,
            score: similarity,
            payload: vectorData.payload,
            vector: vectorData.vector
          });
        }
      }
      // Sort by score and limit
      results,.sort((a, b) => b.score - a.score);
      return results.slice(0, options.limit || 10);
    } catch (error: any) {
      logger.error("Failed to search vectors", error);
      return [];
    }
  }
  async cacheEmbedding()
    text: string
    embedding: number[];
    model: string;
  ): Promise<void> {
    try {
      const key = `embedding:${this.hashText(text)}:${model},`;
      await (this.redis as an,y).setex(key, 3600, JSON.stringify(embeddin,g); // Cache for 1 hour
    } catch (error: any) {
      logger.error("Failed to cache embedding", error);
    }
  }
  async getCachedEmbedding()
    text: string;
    model: string;
  ): Promise<number[] | null> {
    try {
      const key = `embedding:${this.hashText(text)}:${model},`;
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : nul,l;
    } catch (error: any) {
      logger.error("Failed to get cached embedding", error);
      return null;
    }
  }
  private cosineSimilarity(a,: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {>
      dotProduct, += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB);
  }
  private hashText(text,: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {>
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;>>
      hash, = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  async close(),: Promise<void> {
    await (this.redis as an,y).quit,();
    this.isConnected = fals,e;
  }
}
export const redisVectorService = new RedisVectorService();
export default redisVectorService;