/**
 * Optimized Qdrant Service with Low Memory Usage and Cache-Like Logging System
 * Enhanced for Windows native deployment with memory-efficient vector operations
 * Integrated with NES-style cache orchestrator and production logging
 */
import { QdrantClient } from "@qdrant/js-client-rest";
import { generateEmbedding } from '../ai/embeddings-simple.js';
import logger from '../production-logger.js';
import type { LogContext } from '../production-logger.js';

// Simple caching fallback if service not available
const cachingService = {
  get: async (_key: string): Promise<any> => null,
  set: (_key: string, _value: any, _ttl?: number): void => {},
  delete: (_key: string): void => {},
  clear: (): void => {},
};

// Environment detection
const isDev = typeof process !== 'undefined' && import.meta.env?.NODE_ENV === 'development';

// Memory-optimized interfaces
export interface OptimizedQdrantConfig {
  memoryLimits: {
    vectorCacheSize: number; // KB
    searchResultCache: number; // KB
    embeddingCache: number; // KB
    queryHistoryCache: number; // KB
    totalMemoryBudget: number; // KB
  };
  performance: {
    batchSize: number;
    maxConcurrentQueries: number;
    searchTimeout: number;
    cacheHitRatio: number;
    compressionEnabled: boolean;
  };
  logging: {
    cacheOperations: boolean;
    performanceMetrics: boolean;
    memoryUsage: boolean;
    searchAnalytics: boolean;
    errorTracking: boolean;
  };
}

// Cache-like logging entry for vector operations
export interface VectorCacheLogEntry {
  timestamp: string;
  operation: 'search' | 'upsert' | 'delete' | 'batch_upsert';
  collection: string;
  vectorId?: string;
  queryVector?: number[];
  resultCount?: number;
  processingTime: number;
  memoryUsed: number;
  cacheHit: boolean;
  similarity?: number;
  metadata?: { [key: string]: any };
}

// Memory-efficient vector cache entry
export interface VectorCacheEntry {
  id: string;
  vector: Float32Array;
  payload: any;
  timestamp: number;
  accessCount: number;
  collection: string;
  memoryFootprint: number;
}

// Search result cache with LRU eviction
export interface SearchCache {
  queryHash: string;
  results: any[];
  timestamp: number;
  accessCount: number;
  memorySize: number;
  ttl: number;
}

class OptimizedQdrantService {
  private client: QdrantClient | null = null;
  private config: OptimizedQdrantConfig;
  private vectorCache = new Map<string, VectorCacheEntry>();
  private searchCache = new Map<string, SearchCache>();
  private queryHistory: VectorCacheLogEntry[] = [];
  private memoryUsage = {
    vectorCache: 0,
    searchCache: 0,
    queryHistory: 0,
    total: 0,
  };
  private operationQueue: Map<string, Promise<any>> = new Map();
  private concurrentQueries = 0;
  private performanceMetrics = {
    totalQueries: 0,
    cacheHits: 0,
    averageLatency: 0,
    memoryEfficiency: 0,
    errorRate: 0,
  };

  constructor() {
    this.config = this.getOptimizedConfig();
    this.initializeClient();
    this.setupMemoryManagement();
    this.setupLogging();
  }

  private getOptimizedConfig(): OptimizedQdrantConfig {
    const isWindows = typeof process !== 'undefined' && process.platform === 'win32';
    return {
      memoryLimits: {
        vectorCacheSize: isWindows ? 2048 : 1024,
        searchResultCache: isWindows ? 1024 : 512,
        embeddingCache: 512,
        queryHistoryCache: 256,
        totalMemoryBudget: isWindows ? 4096 : 2048,
      },
      performance: {
        batchSize: isWindows ? 50 : 25,
        maxConcurrentQueries: isWindows ? 10 : 5,
        searchTimeout: 5000,
        cacheHitRatio: 0.85,
        compressionEnabled: true,
      },
      logging: {
        cacheOperations: true,
        performanceMetrics: true,
        memoryUsage: true,
        searchAnalytics: true,
        errorTracking: true,
      },
    };
  }

  private initializeClient(): void {
    const qdrantUrl =
      typeof process !== 'undefined' ? import.meta.env?.QDRANT_URL || import.meta.env?.VITE_QDRANT_URL : undefined;

    if (!qdrantUrl) {
      logger.warn('Qdrant not configured - vector operations will be disabled', {
        component: 'QdrantOptimized',
      });
      return;
    }

    try {
      const qdrantApiKey =
        typeof process !== 'undefined'
          ? import.meta.env?.QDRANT_API_KEY || import.meta.env?.VITE_QDRANT_API_KEY
          : undefined;

      this.client = new QdrantClient({
        url: qdrantUrl,
        apiKey: qdrantApiKey || undefined,
      });

      logger.info('Optimized Qdrant client initialized', {
        component: 'QdrantOptimized',
        service: 'qdrant',
        memoryBudget: this.config.memoryLimits.totalMemoryBudget,
        windowsOptimized: typeof process !== 'undefined' && process.platform === 'win32',
        dev: isDev,
      });
    } catch (error: any) {
      logger.error('Failed to initialize Qdrant client', {
        component: 'QdrantOptimized',
        service: 'qdrant',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private setupMemoryManagement(): void {
    setInterval(() => {
      this.cleanupMemory();
    }, 30000);

    setInterval(() => {
      this.collectMetrics();
    }, 60000);
  }

  private setupLogging(): void {
    if (this.config.logging.cacheOperations) {
      logger.info('Vector cache-like logging system initialized', {
        component: 'QdrantOptimized',
        service: 'qdrant',
        cacheTypes: ['vector', 'search', 'query_history'],
        memoryBudget: this.config.memoryLimits.totalMemoryBudget,
      });
    }
  }

  // Memory-optimized search with caching
  public async search(
    collection: string,
    query: string | number[],
    options: {
      limit?: number;
      offset?: number;
      filter?: any;
      threshold?: number;
      useCache?: boolean;
    } = {}
  ): Promise<any[]> {
    const startTime = Date.now();
    const context: LogContext = {
      component: 'QdrantOptimized',
      service: 'qdrant',
    };

    try {
      if (this.concurrentQueries >= this.config.performance.maxConcurrentQueries) {
        throw new Error('Too many concurrent queries - rate limited');
      }
      this.concurrentQueries++;

      let queryVector: number[];
      if (typeof query === 'string') {
        const cached = await this.getCachedEmbedding(query);
        queryVector = cached || (await generateEmbedding(query)) || [];
        if (!cached && queryVector && queryVector.length > 0) {
          this.cacheEmbedding(query, queryVector);
        }
      } else {
        queryVector = query;
      }

      if (!queryVector || queryVector.length === 0) {
        throw new Error('Invalid query vector');
      }

      const queryHash = this.generateQueryHash(collection, queryVector, options);

      if (options.useCache !== false) {
        const cached = this.getSearchCache(queryHash);
        if (cached) {
          this.logVectorOperation({
            timestamp: new Date().toISOString(),
            operation: 'search',
            collection,
            queryVector: queryVector.slice(0, 3),
            resultCount: cached.results.length,
            processingTime: Date.now() - startTime,
            memoryUsed: cached.memorySize,
            cacheHit: true,
          });
          this.performanceMetrics.cacheHits++;
          this.performanceMetrics.totalQueries++;
          return cached.results;
        }
      }

      if (!this.client) {
        throw new Error('Qdrant client not initialized');
      }

      const searchParams = {
        vector: queryVector,
        limit: Math.min(options.limit || 20, 100),
        offset: options.offset || 0,
        filter: options.filter,
        with_payload: true,
        with_vector: false,
        score_threshold: options.threshold ?? 0.7,
      };

      // Qdrant client's search API can differ by version; this is a typical call shape
      const results = await this.client.search(collection, searchParams as any);

      const formattedResults = (results || []).map((hit: any) => ({
        id: hit.id,
        score: hit.score,
        payload: hit.payload,
      }));

      if (options.useCache !== false) {
        this.setSearchCache(queryHash, formattedResults);
      }

      const processingTime = Date.now() - startTime;

      this.logVectorOperation({
        timestamp: new Date().toISOString(),
        operation: 'search',
        collection,
        queryVector: queryVector.slice(0, 3),
        resultCount: formattedResults.length,
        processingTime,
        memoryUsed: this.estimateResultMemory(formattedResults),
        cacheHit: false,
        similarity: formattedResults[0]?.score,
      });

      this.performanceMetrics.totalQueries++;
      this.updateAverageLatency(processingTime);
      logger.info('Qdrant search completed', { ...context, processingTime });

      return formattedResults;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Qdrant search failed', {
        ...context,
        collection,
        queryType: typeof query,
        options,
        processingTime,
        error: error instanceof Error ? error.message : String(error),
      });
      this.performanceMetrics.errorRate =
        (this.performanceMetrics.errorRate * this.performanceMetrics.totalQueries + 1) /
        (this.performanceMetrics.totalQueries + 1);
      throw error;
    } finally {
      this.concurrentQueries = Math.max(0, this.concurrentQueries - 1);
    }
  }

  // Memory-optimized batch upsert
  public async upsertBatch(
    collection: string,
    points: Array<{ id: string; vector: number[]; payload?: any }>
  ): Promise<void> {
    const startTime = Date.now();
    const context: LogContext = {
      component: 'QdrantOptimized',
      service: 'qdrant',
    };

    try {
      if (!this.client) {
        throw new Error('Qdrant client not initialized');
      }

      const batchSize = this.config.performance.batchSize;
      const batches: Array<Array<{ id: string; vector: number[]; payload?: any }>> = [];
      for (let i = 0; i < points.length; i += batchSize) {
        batches.push(points.slice(i, i + batchSize));
      }

      let totalUpserted = 0;
      for (const batch of batches) {
        const optimizedBatch = batch.map(point => ({
          id: point.id,
          vector: new Float32Array(point.vector),
          payload: point.payload,
        }));

        await this.client.upsert(collection, {
          wait: true,
          points: optimizedBatch as any,
        });

        optimizedBatch.forEach(point => {
          this.updateVectorCache(point.id, point.vector, point.payload, collection);
        });

        totalUpserted += optimizedBatch.length;
      }

      const processingTime = Date.now() - startTime;
      this.logVectorOperation({
        timestamp: new Date().toISOString(),
        operation: 'batch_upsert',
        collection,
        resultCount: totalUpserted,
        processingTime,
        memoryUsed: this.estimateVectorMemory(points),
        cacheHit: false,
      });

      logger.info('Batch upsert completed', {
        ...context,
        collection,
        pointsUpserted: totalUpserted,
        batches: batches.length,
      });
    } catch (error: any) {
      logger.error('Batch upsert failed', {
        ...context,
        collection,
        pointCount: points.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Cache-like logging for vector operations
  private logVectorOperation(entry: VectorCacheLogEntry): void {
    if (!this.config.logging.cacheOperations) return;

    this.queryHistory.push(entry);
    this.memoryUsage.queryHistory += JSON.stringify(entry).length;

    const maxEntries = Math.floor((this.config.memoryLimits.queryHistoryCache * 1024) / 200);
    while (this.queryHistory.length > maxEntries) {
      const removed = this.queryHistory.shift();
      if (removed) {
        this.memoryUsage.queryHistory -= JSON.stringify(removed).length;
      }
    }

    logger.info(`Vector ${entry.operation} operation`, {
      component: 'QdrantOptimized',
      service: 'qdrant',
      vectorOperation: true,
      cacheHit: entry.cacheHit,
      collection: entry.collection,
      processingTime: entry.processingTime,
      memoryUsed: entry.memoryUsed,
      resultCount: entry.resultCount,
      similarity: entry.similarity,
    });
  }

  // Memory-efficient embedding cache
  private async getCachedEmbedding(text: string): Promise<number[] | null> {
    const key = `emb_${this.generateHash(text)}`;
    return cachingService.get(key);
  }
  private cacheEmbedding(text: string, embedding: number[]): void {
    const key = `emb_${this.generateHash(text)}`;
    const ttl = 300000;
    cachingService.set(key, embedding, ttl);
  }

  // Search result caching with LRU eviction
  private getSearchCache(queryHash: string): SearchCache | null {
    const cached = this.searchCache.get(queryHash);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.searchCache.delete(queryHash);
      this.memoryUsage.searchCache -= cached.memorySize;
      return null;
    }
    cached.accessCount++;
    cached.timestamp = Date.now();
    return cached;
  }

  private setSearchCache(queryHash: string, results: any[]): void {
    const memorySize = this.estimateResultMemory(results);
    const entry: SearchCache = {
      queryHash,
      results,
      timestamp: Date.now(),
      accessCount: 1,
      memorySize,
      ttl: 300000,
    };

    const targetMemory = this.config.memoryLimits.searchResultCache * 1024;
    while (this.memoryUsage.searchCache + memorySize > targetMemory) {
      this.evictLeastUsedSearch();
      // If nothing evicted, break to avoid infinite loop
      if (this.searchCache.size === 0) break;
    }

    this.searchCache.set(queryHash, entry);
    this.memoryUsage.searchCache += memorySize;
  }

  // Vector cache management
  private updateVectorCache(id: string, vector: Float32Array, payload: any, collection: string): void {
    const memoryFootprint = vector.byteLength + JSON.stringify(payload || {}).length;
    const entry: VectorCacheEntry = {
      id,
      vector,
      payload,
      timestamp: Date.now(),
      accessCount: 1,
      collection,
      memoryFootprint,
    };

    const targetMemory = this.config.memoryLimits.vectorCacheSize * 1024;
    while (this.memoryUsage.vectorCache + memoryFootprint > targetMemory) {
      this.evictLeastUsedVector();
      if (this.vectorCache.size === 0) break;
    }

    this.vectorCache.set(id, entry);
    this.memoryUsage.vectorCache += memoryFootprint;
  }

  // Memory cleanup and optimization
  private cleanupMemory(): void {
    const startTime = Date.now();
    let cleaned = 0;
    const now = Date.now();

    const searchEntries = Array.from(this.searchCache.entries());
    for (const [key, entry] of searchEntries) {
      if (now - entry.timestamp > entry.ttl) {
        this.searchCache.delete(key);
        this.memoryUsage.searchCache -= entry.memorySize;
        cleaned++;
      }
    }

    const vectorEntries = Array.from(this.vectorCache.entries());
    for (const [key, entry] of vectorEntries) {
      if (now - entry.timestamp > 600000) {
        this.vectorCache.delete(key);
        this.memoryUsage.vectorCache -= entry.memoryFootprint;
        cleaned++;
      }
    }

    this.memoryUsage.total =
      this.memoryUsage.vectorCache + this.memoryUsage.searchCache + this.memoryUsage.queryHistory;

    const cleanupTime = Date.now() - startTime;
    if (this.config.logging.memoryUsage) {
      logger.info('Memory cleanup completed', {
        component: 'QdrantOptimized',
        service: 'qdrant',
        entriesCleaned: cleaned,
        cleanupTime,
        memoryUsage: this.memoryUsage,
        cacheEfficiency: this.calculateCacheEfficiency(),
      });
    }
  }

  // Performance metrics collection
  private collectMetrics(): void {
    const metrics = {
      performance: this.performanceMetrics,
      memory: this.memoryUsage,
      cacheStats: {
        vectorCache: this.vectorCache.size,
        searchCache: this.searchCache.size,
        queryHistory: this.queryHistory.length,
      },
      efficiency: this.calculateCacheEfficiency(),
    };
    if (this.config.logging.performanceMetrics) {
      logger.info('Qdrant performance metrics', {
        component: 'QdrantOptimized',
        service: 'qdrant',
        metrics,
      });
    }
  }

  // Helper methods
  private generateQueryHash(collection: string, vector: number[], options: any): string {
    const hashInput = JSON.stringify({ collection, vector: vector.slice(0, 5), options });
    return this.generateHash(hashInput);
  }

  private generateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private estimateResultMemory(results: any[]): number {
    try {
      const json = JSON.stringify(results);
      if (typeof Buffer !== 'undefined' && typeof (Buffer as any).byteLength === 'function') {
        return (Buffer as any).byteLength(json, 'utf8');
      }
      if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(json).length;
      }
      return json.length;
    } catch {
      return 0;
    }
  }

  private estimateVectorMemory(points: Array<{ id: string; vector: number[]; payload?: any }>): number {
    return points.reduce((acc, point) => {
      const vec = (point as any).vector;
      const vecLen = Array.isArray(vec) ? vec.length : vec && typeof vec.length === 'number' ? vec.length : 0;
      const payloadSize = (() => {
        try {
          return JSON.stringify(point.payload || {}).length;
        } catch {
          return 0;
        }
      })();
      return acc + vecLen * 4 + payloadSize;
    }, 0);
  }

  private evictLeastUsedSearch(): void {
    let leastUsed: string | null = null;
    let minAccess = Infinity;
    let oldestTime = Date.now();

    const entries = Array.from(this.searchCache.entries());
    for (const [key, entry] of entries) {
      if (entry.accessCount < minAccess || (entry.accessCount === minAccess && entry.timestamp < oldestTime)) {
        leastUsed = key;
        minAccess = entry.accessCount;
        oldestTime = entry.timestamp;
      }
    }

    if (leastUsed) {
      const entry = this.searchCache.get(leastUsed)!;
      this.searchCache.delete(leastUsed);
      this.memoryUsage.searchCache -= entry.memorySize;
    }
  }

  private evictLeastUsedVector(): void {
    let leastUsed: string | null = null;
    let minAccess = Infinity;
    let oldestTime = Date.now();

    const entries = Array.from(this.vectorCache.entries());
    for (const [key, entry] of entries) {
      if (entry.accessCount < minAccess || (entry.accessCount === minAccess && entry.timestamp < oldestTime)) {
        leastUsed = key;
        minAccess = entry.accessCount;
        oldestTime = entry.timestamp;
      }
    }

    if (leastUsed) {
      const entry = this.vectorCache.get(leastUsed)!;
      this.vectorCache.delete(leastUsed);
      this.memoryUsage.vectorCache -= entry.memoryFootprint;
    }
  }

  private updateAverageLatency(latency: number): void {
    const totalQueries = this.performanceMetrics.totalQueries || 1;
    const currentAvg = this.performanceMetrics.averageLatency || 0;
    this.performanceMetrics.averageLatency = (currentAvg * Math.max(0, totalQueries - 1) + latency) / totalQueries;
  }

  private calculateCacheEfficiency(): number {
    const totalQueries = this.performanceMetrics.totalQueries;
    const cacheHits = this.performanceMetrics.cacheHits;
    return totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;
  }

  // Public API methods
  public async isHealthy(): Promise<boolean> {
    try {
      if (!this.client) return false;
      // Use a safe call for collections (API may differ by Qdrant client version)
      // @ts-ignore - allow variations in client versions
      if (typeof (this.client as any).getCollections === 'function') {
        // @ts-ignore
        await (this.client as any).getCollections();
      } else {
        // perform a lightweight operation if getCollections is unavailable
        // @ts-ignore
        await (this.client as any).health?.();
      }
      return true;
    } catch {
      return false;
    }
  }

  public getMemoryUsage() {
    return { ...this.memoryUsage };
  }

  public getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  public getQueryHistory(): VectorCacheLogEntry[] {
    return [...this.queryHistory];
  }

  public clearCaches(): void {
    this.vectorCache.clear();
    this.searchCache.clear();
    this.queryHistory.length = 0;
    this.memoryUsage = {
      vectorCache: 0,
      searchCache: 0,
      queryHistory: 0,
      total: 0,
    };
    logger.info('All caches cleared', {
      component: 'QdrantOptimized',
      service: 'qdrant',
    });
  }
}

// Singleton instance
export const optimizedQdrant = new OptimizedQdrantService();

// Backward compatibility exports
export const qdrantOptimized = {
  search: (collection: string, query: string | number[], options = {}) =>
    optimizedQdrant.search(collection, query, options),
  upsertBatch: (collection: string, points: Array<{ id: string; vector: number[]; payload?: any }>) =>
    optimizedQdrant.upsertBatch(collection, points),
  isHealthy: () => optimizedQdrant.isHealthy(),
  getMemoryUsage: () => optimizedQdrant.getMemoryUsage(),
  getPerformanceMetrics: () => optimizedQdrant.getPerformanceMetrics(),
  getQueryHistory: () => optimizedQdrant.getQueryHistory(),
  clearCaches: () => optimizedQdrant.clearCaches(),
};

export default optimizedQdrant;