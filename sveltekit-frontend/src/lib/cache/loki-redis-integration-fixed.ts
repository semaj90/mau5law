/**
 * Fixed Loki.js + Redis High-Performance Caching - Phase 14
 *
 * Hybrid caching architecture combining:
 * - Loki.js: Fast in-memory document database with MongoDB-like queries
 * - Redis: Distributed cache with pub/sub for real-time synchronization
 * - Legal AI context awareness with document type optimization
 * - NES memory architecture integration for overflow management
 * - Improved error handling and type safety
 */

import Loki from 'lokijs';
import { EventEmitter } from 'events';
import crypto from 'crypto';

// Conditional imports to avoid circular dependencies
const redisServicePromise = import('$lib/server/redis-service.js').then(m => m.redisService).catch(() => null);

// Define LegalDocument interface locally to avoid import issues
export interface LegalDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  size: number;
  priority: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidenceLevel?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Cache configuration optimized for legal AI workloads
const CACHE_CONFIG = {
  // Loki.js settings
  loki: {
    autosave: true,
    autosaveInterval: 5000, // 5 seconds
    autoload: true,
    throttledSaves: true,
    serializationMethod: 'pretty' as const,
  },

  // Redis settings
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
    keyPrefix: 'legal_ai:',
    ttl: {
      documents: 3600, // 1 hour for documents
      searches: 1800, // 30 minutes for search results
      analyses: 7200, // 2 hours for AI analyses
      embeddings: 86400, // 24 hours for vector embeddings
    },
  },

  // Memory management
  memory: {
    maxLokiSize: 50 * 1024 * 1024, // 50MB in-memory limit
    evictionThreshold: 0.85, // Evict when 85% full
    compressionThreshold: 1024, // Compress documents > 1KB
    nesIntegration: true, // Use NES memory for overflow
  },
} as const;

export interface CachedDocument extends LegalDocument {
  cacheTimestamp: number;
  accessCount: number;
  cacheLocation: 'loki' | 'redis' | 'nes';
  compressed: boolean;
  syncStatus: 'synced' | 'dirty' | 'pending';
}

export interface SearchResult {
  id: string;
  document: LegalDocument;
  score: number;
  matchType: 'exact' | 'fuzzy' | 'semantic';
  highlight?: string[];
}

export interface CacheStats {
  loki: {
    collections: number;
    documents: number;
    memoryUsage: number;
    queries: number;
    hits: number;
    misses: number;
  };
  redis: {
    connected: boolean;
    keys: number;
    memoryUsage: number;
    operations: number;
    hits: number;
    misses: number;
  };
  nes: {
    documentsStored: number;
    memoryUsage: number;
    bankSwitches: number;
  };
  overall: {
    hitRatio: number;
    avgResponseTime: number;
    totalDocuments: number;
    syncConflicts: number;
  };
}

export class LokiRedisCache extends EventEmitter {
  private loki: Loki | null = null;
  private redis: any = null;
  private subscriber: any = null;
  private nesMemory: any = null;

  // Loki collections by document type
  private collections: Map<string, Collection<CachedDocument>> = new Map();

  // Performance tracking
  private stats = {
    loki: { collections: 0, documents: 0, memoryUsage: 0, queries: 0, hits: 0, misses: 0 },
    redis: { connected: false, keys: 0, memoryUsage: 0, operations: 0, hits: 0, misses: 0 },
    nes: { documentsStored: 0, memoryUsage: 0, bankSwitches: 0 },
    overall: { hitRatio: 0, avgResponseTime: 0, totalDocuments: 0, syncConflicts: 0 },
  };

  private responseTimeTracker: number[] = [];
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      await this.loadServices();
      await Promise.all([this.initializeLoki(), this.initializeRedis()]);
      await this.setupSynchronization();
      this.startPerformanceMonitoring();

      this.isInitialized = true;
      this.emit('initialized');

      console.log('✅ Loki.js + Redis cache initialized successfully');
    } catch (error: any) {
      console.error('❌ Cache initialization failed:', error.message);
      throw error;
    }
  }

  private async loadServices(): Promise<void> {
    try {
      console.log('📦 Loading cache services...');
      
      const redisService = await redisServicePromise;
      if (redisService) {
        this.redis = redisService;
        console.log('✅ Redis service loaded');
      }

      // NES Memory integration disabled to avoid circular dependencies
      console.log('⚠️ NES Memory integration disabled');
      this.nesMemory = null;

      console.log('✅ Cache services loaded');
    } catch (error: any) {
      console.warn('⚠️ Some cache services failed to load:', error.message);
      // Continue without failing services
    }
  }

  private async initializeLoki(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loki = new Loki('legal_ai_cache.db', {
        ...CACHE_CONFIG.loki,
        autoloadCallback: (err) => {
          if (err) {
            reject(new Error(`Loki initialization failed: ${err.message || err}`));
            return;
          }

          try {
            // Initialize collections for different document types
            const documentTypes = ['contract', 'evidence', 'brief', 'citation', 'precedent'];

            for (const type of documentTypes) {
              const collectionName = `documents_${type}`;
              let collection = this.loki!.getCollection<CachedDocument>(collectionName);

              if (!collection) {
                collection = this.loki!.addCollection<CachedDocument>(collectionName, {
                  indices: ['id', 'cacheTimestamp', 'type', 'priority', 'riskLevel'],
                  unique: ['id'],
                });
              }

              this.collections.set(type, collection as any);
            }

            // Search results collection
            const searchCollection =
              this.loki!.getCollection('search_results') ||
              this.loki!.addCollection('search_results', {
                indices: ['query', 'timestamp'],
              });

            this.collections.set('searches', searchCollection as any);
            this.stats.loki.collections = this.collections.size;

            console.log(`✅ Loki initialized with ${this.collections.size} collections`);
            resolve();
          } catch (error: any) {
            reject(new Error(`Loki collection setup failed: ${error.message}`));
          }
        },
      });
    });
  }

  private async initializeRedis(): Promise<void> {
    try {
      if (!this.redis) {
        console.warn('⚠️ Redis service not available, running in memory-only mode');
        this.stats.redis.connected = false;
        return;
      }

      // Initialize Redis if it has an initialize method
      if (typeof this.redis.initialize === 'function') {
        await this.redis.initialize();
      }

      // Get client and subscriber
      if (typeof this.redis.getClient === 'function') {
        this.redis = this.redis.getClient();
      }

      if (typeof this.redis.getSubscriber === 'function') {
        this.subscriber = this.redis.getSubscriber();
      } else {
        this.subscriber = this.redis; // Use same client for pub/sub
      }

      this.stats.redis.connected = true;
      console.log('✅ Redis clients connected');
    } catch (error: any) {
      console.error('❌ Redis connection failed:', error.message);
      // Fall back to memory-only mode
      this.redis = null;
      this.subscriber = null;
      this.stats.redis.connected = false;
      console.log('📝 Running in memory-only cache mode');
    }
  }

  private async setupSynchronization(): Promise<void> {
    if (!this.subscriber) return;

    try {
      // Subscribe to document updates
      if (typeof this.subscriber.psubscribe === 'function') {
        await this.subscriber.psubscribe('legal_ai:document:*');
        
        if (typeof this.subscriber.on === 'function') {
          this.subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
            this.handleRedisMessage(message, channel).catch(error => {
              console.error('Redis message handler error:', error.message);
            });
          });
        }
      }

      // Subscribe to search invalidation
      if (typeof this.subscriber.subscribe === 'function') {
        await this.subscriber.subscribe('legal_ai:search:invalidate');
        
        if (typeof this.subscriber.on === 'function') {
          this.subscriber.on('message', (channel: string, message: string) => {
            if (channel === 'legal_ai:search:invalidate') {
              this.invalidateSearchCache(JSON.parse(message)).catch(error => {
                console.error('Search invalidation error:', error.message);
              });
            }
          });
        }
      }

      console.log('✅ Redis synchronization configured');
    } catch (error: any) {
      console.error('❌ Failed to setup Redis synchronization:', error.message);
    }
  }

  private async handleRedisMessage(message: string, channel: string): Promise<void> {
    try {
      const data: any = JSON.parse(message);
      if (!data || !data.operation || !data.documentId) return;

      const { documentId, operation, document } = data;

      // Update local Loki cache based on Redis changes
      switch (operation) {
        case 'update':
          if (document) {
            this.updateLocalDocument(documentId, document);
          }
          break;
        case 'delete':
          this.removeLocalDocument(documentId);
          break;
        case 'create':
          if (document) {
            this.addLocalDocument(document);
          }
          break;
        default:
          console.warn(`Unknown sync operation: ${operation}`);
          break;
      }

      this.emit('documentSynced', { documentId, operation });
    } catch (error: any) {
      console.error('❌ Failed to handle Redis message:', error.message);
      this.stats.overall.syncConflicts++;
    }
  }

  async storeDocument(document: LegalDocument, data?: ArrayBuffer): Promise<void> {
    const startTime = Date.now();

    try {
      const cachedDoc: CachedDocument = {
        ...document,
        cacheTimestamp: Date.now(),
        accessCount: 1,
        cacheLocation: 'loki',
        compressed: false,
        syncStatus: 'synced',
      };

      // Store in Loki.js first (fastest access)
      await this.storeLokiDocument(cachedDoc);

      // Store in Redis for distribution
      await this.storeRedisDocument(cachedDoc, data);

      // If memory pressure or suitable for NES, store there
      if (this.shouldUseNESMemory(cachedDoc)) {
        await this.storeNESDocument(cachedDoc, data);
      }

      this.updateStats('store', Date.now() - startTime);
      this.emit('documentStored', { documentId: document.id });
    } catch (error: any) {
      console.error(`❌ Failed to store document ${document.id}:`, error.message);
      throw error;
    }
  }

  private async storeLokiDocument(document: CachedDocument): Promise<void> {
    const collection = this.collections.get(document.type);
    if (!collection) {
      throw new Error(`No collection found for document type: ${document.type}`);
    }

    // Check memory pressure
    if (
      this.stats.loki.memoryUsage >
      CACHE_CONFIG.memory.maxLokiSize * CACHE_CONFIG.memory.evictionThreshold
    ) {
      await this.evictLokiDocuments();
    }

    // Remove existing document if it exists
    const existing = collection.findOne({ id: document.id });
    if (existing) {
      collection.remove(existing);
      this.stats.loki.documents--;
    }

    collection.insert(document);
    this.stats.loki.documents++;
  }

  private async storeRedisDocument(document: CachedDocument, data?: ArrayBuffer): Promise<void> {
    if (!this.redis) return;

    try {
      const key = `${CACHE_CONFIG.redis.keyPrefix}doc:${document.id}`;
      const value = JSON.stringify({
        document,
        data: data ? Array.from(new Uint8Array(data)) : null,
      });

      if (typeof this.redis.setex === 'function') {
        await this.redis.setex(key, CACHE_CONFIG.redis.ttl.documents, value);
      } else if (typeof this.redis.set === 'function') {
        await this.redis.set(key, value);
        if (typeof this.redis.expire === 'function') {
          await this.redis.expire(key, CACHE_CONFIG.redis.ttl.documents);
        }
      }

      this.stats.redis.operations++;

      // Publish update notification
      if (typeof this.redis.publish === 'function') {
        await this.redis.publish(
          `legal_ai:document:${document.type}`,
          JSON.stringify({ documentId: document.id, operation: 'create', document })
        );
      }
    } catch (error: any) {
      console.error(`❌ Redis storage failed for ${document.id}:`, error.message);
    }
  }

  private shouldUseNESMemory(document: CachedDocument): boolean {
    if (!CACHE_CONFIG.memory.nesIntegration || !this.nesMemory) return false;

    // Use NES memory for large, low-priority, or old documents
    return (
      document.size > 10240 || // > 10KB
      document.priority < 100 || // Low priority
      document.riskLevel === 'low' || // Low risk
      Date.now() - document.cacheTimestamp > 300000 // Older than 5 minutes
    );
  }

  private async storeNESDocument(document: CachedDocument, data?: ArrayBuffer): Promise<void> {
    if (!data || !this.nesMemory) return;

    try {
      if (typeof this.nesMemory.allocateDocument === 'function') {
        const success = await this.nesMemory.allocateDocument(document, data, {
          compress: document.size > CACHE_CONFIG.memory.compressionThreshold,
          preferredBank: this.selectNESBank(document),
        });

        if (success) {
          document.cacheLocation = 'nes';
          this.stats.nes.documentsStored++;
        }
      }
    } catch (error: any) {
      console.error(`❌ NES storage failed for ${document.id}:`, error.message);
    }
  }

  private selectNESBank(document: CachedDocument): string {
    // Select NES bank based on document characteristics
    if (document.riskLevel === 'critical' || document.priority > 200) {
      return 'INTERNAL_RAM'; // Fastest access
    }

    if (document.type === 'contract' || document.type === 'evidence') {
      return 'CHR_ROM'; // Pattern storage
    }

    if (document.type === 'brief' || document.type === 'precedent') {
      return 'PRG_ROM'; // Logic storage
    }

    return 'SAVE_RAM'; // Persistent storage
  }

  async getDocument(documentId: string): Promise<CachedDocument | null> {
    const startTime = Date.now();

    try {
      // Try Loki.js first (fastest)
      let document = await this.getLokiDocument(documentId);
      if (document) {
        document.accessCount++;
        document.cacheTimestamp = Date.now();
        this.stats.loki.hits++;
        this.updateStats('get', Date.now() - startTime);
        return document;
      }

      // Try Redis second
      document = await this.getRedisDocument(documentId);
      if (document) {
        // Promote to Loki for faster future access
        await this.storeLokiDocument(document);
        this.stats.redis.hits++;
        this.updateStats('get', Date.now() - startTime);
        return document;
      }

      // Try NES memory last
      document = await this.getNESDocument(documentId);
      if (document) {
        // Promote to higher cache levels if frequently accessed
        if (document.accessCount > 5) {
          await this.storeLokiDocument(document);
        }
        this.updateStats('get', Date.now() - startTime);
        return document;
      }

      // Cache miss
      this.stats.loki.misses++;
      this.stats.redis.misses++;
      return null;
    } catch (error: any) {
      console.error(`❌ Failed to get document ${documentId}:`, error.message);
      return null;
    }
  }

  private async getLokiDocument(documentId: string): Promise<CachedDocument | null> {
    for (const collection of this.collections.values()) {
      const document = collection.findOne({ id: documentId });
      if (document) {
        this.stats.loki.queries++;
        return document;
      }
    }
    return null;
  }

  private async getRedisDocument(documentId: string): Promise<CachedDocument | null> {
    if (!this.redis) return null;

    try {
      const key = `${CACHE_CONFIG.redis.keyPrefix}doc:${documentId}`;
      
      let value: string | null = null;
      if (typeof this.redis.get === 'function') {
        value = await this.redis.get(key);
      }

      if (value && typeof value === 'string') {
        const parsed = JSON.parse(value) as any;
        this.stats.redis.operations++;
        return parsed.document as CachedDocument;
      }
    } catch (error: any) {
      console.error(`❌ Redis get error for ${documentId}:`, error.message);
    }

    return null;
  }

  private async getNESDocument(documentId: string): Promise<CachedDocument | null> {
    if (!this.nesMemory) return null;

    try {
      if (typeof this.nesMemory.getDocument === 'function') {
        const nesDoc = this.nesMemory.getDocument(documentId);
        if (nesDoc) {
          return {
            ...nesDoc,
            cacheTimestamp: Date.now(),
            accessCount: (nesDoc as any).accessCount || 1,
            cacheLocation: 'nes',
            compressed: nesDoc.compressed || false,
            syncStatus: 'synced',
          };
        }
      }
    } catch (error: any) {
      console.error(`❌ NES get error for ${documentId}:`, error.message);
    }

    return null;
  }

  async searchDocuments(
    query: string,
    filters: {
      type?: string[];
      riskLevel?: string[];
      confidenceMin?: number;
      priorityMin?: number;
    } = {},
    options: {
      limit?: number;
      useSemanticSearch?: boolean;
      cacheResults?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    const { limit = 50, useSemanticSearch = false, cacheResults = true } = options;

    try {
      // Check search cache first
      const cacheKey = this.generateSearchCacheKey(query, filters, options);
      let results = await this.getCachedSearchResults(cacheKey);

      if (results) {
        this.updateStats('search', Date.now() - startTime);
        return results;
      }

      // Perform search across all collections
      results = [];

      for (const [type, collection] of this.collections.entries()) {
        if (type === 'searches') continue;

        if (filters.type && !filters.type.includes(type)) continue;

        // Build Loki.js query
        let lokiQuery: any = {};

        if (filters.riskLevel) {
          lokiQuery.riskLevel = { $in: filters.riskLevel };
        }

        if (filters.confidenceMin) {
          lokiQuery.confidenceLevel = { $gte: filters.confidenceMin };
        }

        if (filters.priorityMin) {
          lokiQuery.priority = { $gte: filters.priorityMin };
        }

        // Text search (simple contains for now, could be enhanced with full-text search)
        if (query) {
          lokiQuery.$or = [
            { id: { $contains: query } },
            { 'metadata.title': { $contains: query } },
            { 'metadata.description': { $contains: query } },
            { 'metadata.jurisdiction': { $contains: query } },
          ];
        }

        const documents = collection.find(lokiQuery);

        for (const doc of documents) {
          results.push({
            id: doc.id,
            document: doc as LegalDocument,
            score: this.calculateRelevanceScore(doc, query),
            matchType: 'fuzzy' as const,
          });
        }
      }

      // Sort by relevance and limit
      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, limit);

      // Cache results if enabled
      if (cacheResults) {
        await this.cacheSearchResults(cacheKey, results);
      }

      this.updateStats('search', Date.now() - startTime);
      return results;
    } catch (error: any) {
      console.error('❌ Search failed:', error.message);
      return [];
    }
  }

  private calculateRelevanceScore(document: CachedDocument, query: string): number {
    let score = 0;

    // Base score from document priority and confidence
    score += document.priority * 0.01;
    score += (document.confidenceLevel || 0) * 100;

    // Risk level scoring
    switch (document.riskLevel) {
      case 'critical':
        score += 50;
        break;
      case 'high':
        score += 30;
        break;
      case 'medium':
        score += 15;
        break;
      case 'low':
        score += 5;
        break;
    }

    // Access frequency boost
    score += Math.min(document.accessCount * 2, 20);

    // Recency boost (newer documents get higher scores)
    const age = Date.now() - document.cacheTimestamp;
    const daysSinceCache = age / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - daysSinceCache);

    return score;
  }

  private generateSearchCacheKey(query: string, filters: any, options: any): string {
    const hashInput = JSON.stringify({ query, filters, options });
    return `search:${crypto.createHash('md5').update(hashInput).digest('hex')}`;
  }

  private async getCachedSearchResults(cacheKey: string): Promise<SearchResult[] | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(`${CACHE_CONFIG.redis.keyPrefix}${cacheKey}`);
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached) as SearchResult[];
      }
    } catch (error: any) {
      console.error('❌ Search cache retrieval failed:', error.message);
    }

    return null;
  }

  private async cacheSearchResults(cacheKey: string, results: SearchResult[]): Promise<void> {
    if (!this.redis) return;

    try {
      const key = `${CACHE_CONFIG.redis.keyPrefix}${cacheKey}`;
      
      if (typeof this.redis.setex === 'function') {
        await this.redis.setex(key, CACHE_CONFIG.redis.ttl.searches, JSON.stringify(results));
      } else if (typeof this.redis.set === 'function') {
        await this.redis.set(key, JSON.stringify(results));
        if (typeof this.redis.expire === 'function') {
          await this.redis.expire(key, CACHE_CONFIG.redis.ttl.searches);
        }
      }
    } catch (error: any) {
      console.error('❌ Search cache storage failed:', error.message);
    }
  }

  private async evictLokiDocuments(): Promise<void> {
    // Find least recently used documents across all collections
    const candidates: Array<{ collection: Collection<CachedDocument>; document: CachedDocument }> =
      [];

    for (const collection of this.collections.values()) {
      if (!collection) continue;
      
      try {
        const documents = collection.find();
        for (const doc of documents) {
          if (doc.riskLevel !== 'critical' && doc.priority < 200) {
            candidates.push({ collection, document: doc });
          }
        }
      } catch (error: any) {
        console.error('Error reading collection for eviction:', error.message);
      }
    }

    // Sort by access patterns (LRU + priority)
    candidates.sort((a, b) => {
      const scoreA = a.document.accessCount + (a.document.priority / 255) * 10;
      const scoreB = b.document.accessCount + (b.document.priority / 255) * 10;
      return scoreA - scoreB;
    });

    // Evict 25% of candidates
    const evictCount = Math.ceil(candidates.length * 0.25);
    let evicted = 0;
    
    for (let i = 0; i < evictCount && i < candidates.length; i++) {
      const { collection, document } = candidates[i];
      try {
        collection.remove(document);
        this.stats.loki.documents--;
        evicted++;
      } catch (error: any) {
        console.error(`Failed to evict document ${document.id}:`, error.message);
      }
    }

    console.log(`🗑️ Evicted ${evicted} documents from Loki cache`);
  }

  private async invalidateSearchCache(criteria: any): Promise<void> {
    if (!this.redis) return;

    try {
      if (typeof this.redis.keys === 'function' && typeof this.redis.del === 'function') {
        const pattern = `${CACHE_CONFIG.redis.keyPrefix}search:*`;
        const keys = await this.redis.keys(pattern);

        if (keys.length > 0) {
          await this.redis.del(...keys);
          console.log(`🗑️ Invalidated ${keys.length} search cache entries`);
        }
      }
    } catch (error: any) {
      console.error('❌ Search cache invalidation failed:', error.message);
    }
  }

  private updateLocalDocument(documentId: string, document: CachedDocument): void {
    const collection = this.collections.get(document.type);
    if (collection) {
      const existing = collection.findOne({ id: documentId });
      if (existing) {
        // Update existing document
        Object.assign(existing, document, {
          syncStatus: 'synced' as const,
          cacheTimestamp: Date.now(),
        });
        collection.update(existing);
      } else {
        // Insert new document
        collection.insert({
          ...document,
          syncStatus: 'synced' as const,
          cacheTimestamp: Date.now(),
        });
        this.stats.loki.documents++;
      }
    }
  }

  private removeLocalDocument(documentId: string): void {
    for (const collection of this.collections.values()) {
      const document = collection.findOne({ id: documentId });
      if (document) {
        collection.remove(document);
        this.stats.loki.documents--;
        break;
      }
    }
  }

  private addLocalDocument(document: CachedDocument): void {
    const collection = this.collections.get(document.type);
    if (collection) {
      collection.insert({
        ...document,
        syncStatus: 'synced' as const,
        cacheTimestamp: Date.now(),
      });
      this.stats.loki.documents++;
    }
  }

  private updateStats(operation: string, responseTime: number): void {
    this.responseTimeTracker.push(responseTime);
    if (this.responseTimeTracker.length > 1000) {
      this.responseTimeTracker = this.responseTimeTracker.slice(-1000);
    }

    const total =
      this.stats.loki.hits +
      this.stats.loki.misses +
      this.stats.redis.hits +
      this.stats.redis.misses;
    const hits = this.stats.loki.hits + this.stats.redis.hits;

    this.stats.overall.hitRatio = total > 0 ? hits / total : 0;
    this.stats.overall.avgResponseTime =
      this.responseTimeTracker.reduce((a, b) => a + b, 0) / this.responseTimeTracker.length;
    this.stats.overall.totalDocuments = this.stats.loki.documents + this.stats.nes.documentsStored;
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateMemoryStats();
      this.emit('stats', this.getStats());
    }, 10000); // Every 10 seconds
  }

  private updateMemoryStats(): void {
    // Estimate Loki memory usage
    this.stats.loki.memoryUsage = this.stats.loki.documents * 2048; // Rough estimate

    // Get NES memory stats if available
    if (this.nesMemory && typeof this.nesMemory.getMemoryStats === 'function') {
      try {
        const nesStats = this.nesMemory.getMemoryStats();
        this.stats.nes = {
          documentsStored: nesStats.documentCount || 0,
          memoryUsage: (nesStats.usedRAM || 0) + (nesStats.usedCHR || 0) + (nesStats.usedPRG || 0),
          bankSwitches: nesStats.bankSwitches || 0,
        };
      } catch (error: any) {
        console.error('Error getting NES stats:', error.message);
      }
    }
  }

  getStats(): CacheStats {
    return JSON.parse(JSON.stringify(this.stats));
  }

  // Public methods for accessing cached data
  async get(key: string): Promise<string | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(`${CACHE_CONFIG.redis.keyPrefix}${key}`);
      if (value) {
        this.stats.redis.hits++;
        this.stats.redis.operations++;
      } else {
        this.stats.redis.misses++;
      }
      return value;
    } catch (error: any) {
      console.error(`❌ Redis get error for ${key}:`, error.message);
      this.stats.redis.misses++;
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.redis) return;

    try {
      const fullKey = `${CACHE_CONFIG.redis.keyPrefix}${key}`;
      
      if (ttl && typeof this.redis.setex === 'function') {
        await this.redis.setex(fullKey, ttl, value);
      } else if (typeof this.redis.set === 'function') {
        await this.redis.set(fullKey, value);
        if (ttl && typeof this.redis.expire === 'function') {
          await this.redis.expire(fullKey, ttl);
        }
      }
      
      this.stats.redis.operations++;
    } catch (error: any) {
      console.error(`❌ Redis set error for ${key}:`, error.message);
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear Loki collections
      for (const collection of this.collections.values()) {
        if (collection && typeof collection.clear === 'function') {
          collection.clear();
        }
      }

      // Clear Redis cache
      if (this.redis && typeof this.redis.keys === 'function' && typeof this.redis.del === 'function') {
        const pattern = `${CACHE_CONFIG.redis.keyPrefix}*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      // Reset stats
      this.stats = {
        loki: {
          collections: this.collections.size,
          documents: 0,
          memoryUsage: 0,
          queries: 0,
          hits: 0,
          misses: 0,
        },
        redis: {
          connected: this.stats.redis.connected,
          keys: 0,
          memoryUsage: 0,
          operations: 0,
          hits: 0,
          misses: 0,
        },
        nes: { documentsStored: 0, memoryUsage: 0, bankSwitches: 0 },
        overall: { hitRatio: 0, avgResponseTime: 0, totalDocuments: 0, syncConflicts: 0 },
      };

      console.log('✅ Cache cleared successfully');
    } catch (error: any) {
      console.error('❌ Failed to clear cache:', error.message);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      // Save Loki database
      if (this.loki) {
        await new Promise<void>((resolve, reject) => {
          this.loki!.saveDatabase((err) => {
            if (err) reject(new Error(`Loki save failed: ${err.message || err}`));
            else resolve();
          });
        });
      }

      // Close Redis connections
      if (this.redis && typeof this.redis.quit === 'function') {
        await this.redis.quit();
      }
      if (this.subscriber && typeof this.subscriber.quit === 'function') {
        await this.subscriber.quit();
      }

      this.loki = null;
      this.redis = null;
      this.subscriber = null;
      this.nesMemory = null;
      this.collections.clear();
      this.isInitialized = false;

      console.log('✅ Loki.js + Redis cache destroyed');
    } catch (error: any) {
      console.error('❌ Cache destruction failed:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const lokiRedisCache = new LokiRedisCache();

// Initialize on module load in server environment
if (typeof window === 'undefined') {
  lokiRedisCache.initialize().catch((error) => {
    console.error('❌ Loki-Redis cache auto-initialization failed:', error.message);
  });
}