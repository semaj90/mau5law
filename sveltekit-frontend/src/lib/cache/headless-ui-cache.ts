/**
 * Headless UI Caching System
 * Client-side caching layer that bridges server-side Redis tensor cache
 * with XState Neural Sprite frontend for maximum performance
 */

import { vectorWasm } from '../wasm/vector-wasm-wrapper.js';
import { browser } from '$app/environment';

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  embedding?: Float32Array;
  metadata?: {
    size: number;
    hits: number;
    lastAccess: number;
    source: 'server' | 'client' | 'hybrid';
    computeCost: number; // Relative cost to regenerate
  };
}

export interface CacheStrategy {
  // Memory tiers (fastest to slowest)
  memory: boolean; // In-memory Map cache
  indexeddb: boolean; // Browser IndexedDB
  localStorage: boolean; // Browser localStorage (limited size)

  // Intelligent eviction
  lru: boolean; // Least Recently Used
  semantic: boolean; // Semantic similarity-based eviction
  cost: boolean; // Evict by regeneration cost

  // Sync with server
  syncWithRedis: boolean; // Sync with server-side Redis
  conflictResolution: 'client' | 'server' | 'merge';
}

export interface CacheConfig {
  maxMemorySize: number; // Max memory cache size (bytes)
  maxIndexedDBSize: number; // Max IndexedDB size (bytes)
  maxLocalStorageSize: number; // Max localStorage size (bytes)
  defaultTTL: number; // Default TTL in milliseconds
  embeddingDimensions: number; // For semantic caching
  syncInterval: number; // Sync with server interval (ms)
  strategy: CacheStrategy;
}

export class HeadlessUICache {
  private memoryCache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private db: IDBDatabase | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private hitRatio = 0;
  private totalRequests = 0;
  private cacheHits = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxMemorySize: 50 * 1024 * 1024, // 50MB
      maxIndexedDBSize: 500 * 1024 * 1024, // 500MB
      maxLocalStorageSize: 5 * 1024 * 1024, // 5MB
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      embeddingDimensions: 256,
      syncInterval: 5 * 60 * 1000, // 5 minutes
      strategy: {
        memory: true,
        indexeddb: true,
        localStorage: false, // Disabled by default due to size limits
        lru: true,
        semantic: true,
        cost: true,
        syncWithRedis: true,
        conflictResolution: 'server',
      },
      ...config,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!browser) return;

    try {
      // Initialize WebAssembly for semantic operations
      if (this.config.strategy.semantic) {
        await vectorWasm.initialize();
      }

      // Initialize IndexedDB
      if (this.config.strategy.indexeddb) {
        await this.initializeIndexedDB();
      }

      // Start sync timer
      if (this.config.strategy.syncWithRedis) {
        this.startSyncTimer();
      }

      console.log('[HeadlessCache] Initialized successfully');
    } catch (error) {
      console.error('[HeadlessCache] Initialization failed:', error);
    }
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HeadlessUICache', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('version', 'version');
          store.createIndex('lastAccess', 'metadata.lastAccess');
        }
      };
    });
  }

  /**
   * Get cached data with semantic similarity fallback
   */
  async get<T>(key: string, semanticQuery?: string): Promise<T | null> {
    this.totalRequests++;

    // 1. Check memory cache first (fastest)
    if (this.config.strategy.memory) {
      const memResult = this.memoryCache.get(key);
      if (memResult && this.isValidEntry(memResult)) {
        this.updateMetadata(memResult);
        this.cacheHits++;
        this.updateHitRatio();
        return memResult.data as T;
      }
    }

    // 2. Check IndexedDB (medium speed)
    if (this.config.strategy.indexeddb && this.db) {
      const idbResult = await this.getFromIndexedDB<T>(key);
      if (idbResult) {
        // Promote to memory cache
        if (this.config.strategy.memory) {
          this.memoryCache.set(key, idbResult);
        }
        this.cacheHits++;
        this.updateHitRatio();
        return idbResult.data;
      }
    }

    // 3. Semantic similarity search (if query provided)
    if (semanticQuery && this.config.strategy.semantic) {
      const semanticResult = await this.findSemanticallysimilar<T>(semanticQuery, 0.8);
      if (semanticResult) {
        this.cacheHits++;
        this.updateHitRatio();
        return semanticResult.data;
      }
    }

    // 4. Try server sync if enabled
    if (this.config.strategy.syncWithRedis) {
      const serverResult = await this.fetchFromServer<T>(key);
      if (serverResult) {
        await this.set(key, serverResult, undefined, 'server');
        this.cacheHits++;
        this.updateHitRatio();
        return serverResult;
      }
    }

    this.updateHitRatio();
    return null;
  }

  /**
   * Set cached data with optional semantic embedding
   */
  async set<T>(
    key: string,
    data: T,
    ttl?: number,
    source: 'client' | 'server' | 'hybrid' = 'client',
    semanticText?: string
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      version: this.generateVersion(),
      metadata: {
        size: this.estimateSize(data),
        hits: 0,
        lastAccess: Date.now(),
        source,
        computeCost: this.estimateComputeCost(data),
      },
    };

    // Generate semantic embedding if text provided
    if (semanticText && this.config.strategy.semantic) {
      try {
        entry.embedding = await vectorWasm.generateHashEmbedding(
          semanticText,
          this.config.embeddingDimensions
        );
      } catch (error) {
        console.warn('[HeadlessCache] Failed to generate embedding:', error);
      }
    }

    // Store in memory cache
    if (this.config.strategy.memory) {
      await this.enforceMemoryLimit();
      this.memoryCache.set(key, entry);
    }

    // Store in IndexedDB
    if (this.config.strategy.indexeddb && this.db) {
      await this.setInIndexedDB(entry);
    }

    // Sync to server if enabled
    if (this.config.strategy.syncWithRedis && source === 'client') {
      this.queueServerSync(key, entry);
    }
  }

  /**
   * Find semantically similar cached entries using WASM vector operations
   */
  private async findSemanticallysimilar<T>(
    query: string,
    threshold: number = 0.7
  ): Promise<CacheEntry<T> | null> {
    if (!vectorWasm.isInitialized()) return null;

    try {
      // Generate query embedding
      const queryEmbedding = await vectorWasm.generateHashEmbedding(
        query,
        this.config.embeddingDimensions
      );

      let bestMatch: CacheEntry<T> | null = null;
      let bestSimilarity = 0;

      // Search memory cache
      for (const entry of this.memoryCache.values()) {
        if (entry.embedding && this.isValidEntry(entry)) {
          const similarity = await vectorWasm.computeCosineSimilarity(
            queryEmbedding,
            entry.embedding
          );

          if (similarity > threshold && similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = entry as CacheEntry<T>;
          }
        }
      }

      // Search IndexedDB if no good match in memory
      if (!bestMatch && this.db) {
        bestMatch = await this.searchIndexedDBBySimilarity<T>(queryEmbedding, threshold);
      }

      return bestMatch;
    } catch (error) {
      console.error('[HeadlessCache] Semantic search failed:', error);
      return null;
    }
  }

  /**
   * Smart eviction using multiple strategies
   */
  private async enforceMemoryLimit(): Promise<void> {
    const currentSize = this.calculateMemorySize();
    if (currentSize <= this.config.maxMemorySize) return;

    const entries = Array.from(this.memoryCache.entries());

    // Sort by eviction priority (lower score = higher priority to evict)
    entries.sort(([, a], [, b]) => {
      let scoreA = this.calculateEvictionScore(a);
      let scoreB = this.calculateEvictionScore(b);
      return scoreA - scoreB;
    });

    // Evict entries until under limit
    while (this.calculateMemorySize() > this.config.maxMemorySize && entries.length > 0) {
      const [key] = entries.shift()!;
      this.memoryCache.delete(key);
    }
  }

  /**
   * Calculate eviction score (lower = more likely to evict)
   */
  private calculateEvictionScore(entry: CacheEntry): number {
    let score = 0;

    // Factor in recency (LRU)
    if (this.config.strategy.lru) {
      const ageMs = Date.now() - entry.metadata!.lastAccess;
      score += ageMs / (1000 * 60 * 60); // Hours since last access
    }

    // Factor in hit frequency
    score -= entry.metadata!.hits * 10;

    // Factor in compute cost (expensive to regenerate = higher score)
    if (this.config.strategy.cost) {
      score += entry.metadata!.computeCost * 5;
    }

    // Factor in size (larger = more likely to evict)
    score += entry.metadata!.size / 1024; // KB

    return score;
  }

  /**
   * Sync with server-side Redis tensor cache
   */
  private async syncWithServer(): Promise<void> {
    if (!this.config.strategy.syncWithRedis) return;

    try {
      // Get server cache manifest
      const response = await fetch('/api/cache/manifest', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) return;

      const serverManifest = await response.json();

      // Compare versions and sync differences
      for (const serverEntry of serverManifest.entries) {
        const localEntry = this.memoryCache.get(serverEntry.key);

        if (!localEntry || localEntry.version !== serverEntry.version) {
          // Server has newer version, fetch it
          const serverData = await this.fetchFromServer(serverEntry.key);
          if (serverData) {
            await this.set(serverEntry.key, serverData, undefined, 'server');
          }
        }
      }
    } catch (error) {
      console.error('[HeadlessCache] Server sync failed:', error);
    }
  }

  private async fetchFromServer<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`/api/cache/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.value as T;
    } catch (error) {
      console.error('[HeadlessCache] Server fetch failed:', error);
      return null;
    }
  }

  private queueServerSync(key: string, entry: CacheEntry): void {
    // Queue for async server sync (implement with a proper queue)
    setTimeout(() => this.syncEntryToServer(key, entry), 100);
  }

  private async syncEntryToServer(key: string, entry: CacheEntry): Promise<void> {
    try {
      await fetch('/api/cache', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          data: entry.data,
          ttl: entry.ttl,
          version: entry.version,
          source: 'client',
        }),
      });
    } catch (error) {
      console.error('[HeadlessCache] Server sync failed:', error);
    }
  }

  private startSyncTimer(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);

    this.syncTimer = setInterval(() => {
      this.syncWithServer();
    }, this.config.syncInterval);
  }

  // Helper methods
  private isValidEntry(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private updateMetadata(entry: CacheEntry): void {
    if (entry.metadata) {
      entry.metadata.hits++;
      entry.metadata.lastAccess = Date.now();
    }
  }

  private generateVersion(): string {
    return `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough UTF-16 estimate
  }

  private estimateComputeCost(data: any): number {
    // Estimate computational cost based on data complexity
    const str = JSON.stringify(data);
    if (str.includes('embedding') || str.includes('vector')) return 10;
    if (str.includes('analysis') || str.includes('summary')) return 8;
    if (str.length > 10000) return 6;
    return 1;
  }

  private calculateMemorySize(): number {
    let total = 0;
    for (const entry of this.memoryCache.values()) {
      total += entry.metadata?.size || 0;
    }
    return total;
  }

  private updateHitRatio(): void {
    this.hitRatio = this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0;
  }

  // IndexedDB helpers
  private async getFromIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T>;
        if (entry && this.isValidEntry(entry)) {
          this.updateMetadata(entry);
          resolve(entry);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  private async setInIndexedDB<T>(entry: CacheEntry<T>): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async searchIndexedDBBySimilarity<T>(
    queryEmbedding: Float32Array,
    threshold: number
  ): Promise<CacheEntry<T> | null> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.openCursor();

      let bestMatch: CacheEntry<T> | null = null;
      let bestSimilarity = 0;

      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry: CacheEntry<T> = cursor.value;

          if (entry.embedding && this.isValidEntry(entry)) {
            try {
              const similarity = await vectorWasm.computeCosineSimilarity(
                queryEmbedding,
                entry.embedding
              );

              if (similarity > threshold && similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = entry;
              }
            } catch (error) {
              // Skip this entry
            }
          }

          cursor.continue();
        } else {
          resolve(bestMatch);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      hitRatio: this.hitRatio,
      totalRequests: this.totalRequests,
      cacheHits: this.cacheHits,
      memoryEntries: this.memoryCache.size,
      memorySize: this.calculateMemorySize(),
      maxMemorySize: this.config.maxMemorySize,
      lastSync: this.syncTimer ? 'active' : 'inactive',
    };
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      await store.clear();
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.memoryCache.clear();
  }
}

// Export singleton instance
export const headlessUICache = new HeadlessUICache();

// Export cache decorator for easy integration
export function cached(ttl?: number, semanticKey?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

      // Try cache first
      const cached = await headlessUICache.get(cacheKey, semanticKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      await headlessUICache.set(cacheKey, result, ttl, 'client', semanticKey);

      return result;
    };

    return descriptor;
  };
}