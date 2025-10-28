/**
 * Enhanced Caching Optimizer - Legal AI Performance Suite
 *
 * NOTE: Implementation below is a cleaned, minimal and type-safe refactor of the original file.
 * Replace the placeholder/simulated implementations (e.g., executeQueryForCache, getRecentDocumentsByType)
 * with real integration logic as needed.
 */
import { EventEmitter } from 'events';
import { createClient, type RedisClientType } from 'redis';

export interface CacheWarmerConfig {
  warmupSchedule: {
    commonQueries: string[];
    documentTypes: string[];
    userPatterns: string[];
  };
  priorities: {
    legal: number;
    evidence: number;
    reports: number;
    searches: number;
    [k: string]: number;
  };
  performance: {
    batchSize: number;
    maxConcurrency: number;
    gpuUtilizationTarget: number; // 0.0 to 1.0
  };
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  averageLatency: number;
  gpuUtilization: number;
  memoryPressure: number;
  topQueries: Array<any>;
  lastOptimized: Date;
  // internal counters for stable rate calculation
  totalRequests: number;
  hits: number;
  misses: number;
}

export interface TTLStrategy {
  documentType: string;
  accessFrequency: number;
  lastAccessed: Date;
  computedTTL: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export class EnhancedCachingOptimizer extends EventEmitter {
  private redis!: RedisClientType;
  private metrics: CacheMetrics;
  private ttlStrategies: Map<string, TTLStrategy>;
  private requestBatcher: RequestBatcher;
  private warmupTimer: NodeJS.Timer | null;
  private config: CacheWarmerConfig;

  constructor(config: Partial<CacheWarmerConfig> = {}) {
    super();
    this.config = {
      warmupSchedule: {
        commonQueries: [
          'legal precedent search',
          'evidence correlation',
          'case timeline analysis',
          'document similarity',
          'legal citation lookup'
        ],
        documentTypes: ['evidence', 'legal_brief', 'case_file', 'report', 'citation'],
        userPatterns: ['recent_documents', 'frequent_searches', 'active_cases'],
        ...(config.warmupSchedule || {})
      },
      priorities: {
        legal: 0.9,
        evidence: 0.8,
        reports: 0.6,
        searches: 0.7,
        ...(config.priorities || {})
      },
      performance: {
        batchSize: 50,
        maxConcurrency: 10,
        gpuUtilizationTarget: 0.85,
        ...(config.performance || {})
      }
    };

    this.metrics = this.initializeMetrics();
    this.ttlStrategies = new Map();
    this.requestBatcher = new RequestBatcher(this.config.performance);
    this.warmupTimer = null;

    // initialize async pieces (no await in constructor)
    this.initializeRedis().catch((err) => {
      console.error('Failed to init redis in ctor:', err);
    });
    this.startCacheOptimization();
  }

  private initializeMetrics(): CacheMetrics {
    return {
      hitRate: 0,
      missRate: 0,
      evictionRate: 0,
      averageLatency: 0,
      gpuUtilization: 0,
      memoryPressure: 0,
      topQueries: [],
      lastOptimized: new Date(),
      totalRequests: 0,
      hits: 0,
      misses: 0
    };
  }

  private async initializeRedis() {
    try {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = createClient({ url });
      this.redis.on('error', (err) => {
        console.error('❌ Redis Cache Optimizer Error:', err);
        this.emit('redis_error', err);
      });
      this.redis.on('connect', () => {
        console.log('✅ Cache Optimizer connected to Redis');
        this.emit('redis_connected');
      });
      await this.redis.connect();
      await this.setupCacheEventListeners();
    } catch (error) {
      console.error('❌ Failed to initialize Redis for cache optimization:', error);
      this.emit('initialization_error', error);
    }
  }

  private async setupCacheEventListeners() {
    const subscriber = this.redis.duplicate();
    await subscriber.connect();

    // subscribe to simple channels; handlers parse JSON safely
    await subscriber.subscribe('cache:hit', (message) => {
      try {
        const payload = JSON.parse(message);
        this.handleCacheHit(payload);
      } catch (e) {
        console.warn('Invalid cache:hit message', e);
      }
    });

    await subscriber.subscribe('cache:miss', (message) => {
      try {
        const payload = JSON.parse(message);
        this.handleCacheMiss(payload);
      } catch (e) {
        console.warn('Invalid cache:miss message', e);
      }
    });

    await subscriber.subscribe('gpu:utilization', (message) => {
      try {
        const payload = JSON.parse(message);
        this.handleGPUUtilization(payload);
      } catch (e) {
        console.warn('Invalid gpu:utilization message', e);
      }
    });
  }

  /**
   * 1. WARM CACHE WITH COMMON QUERIES
   */
  async warmCache(): Promise<void> {
    console.log('🔥 Starting intelligent cache warming...');
    const warmupTasks: Array<() => Promise<void>> = [];

    // Warm common queries
    for (const query of this.config.warmupSchedule.commonQueries) {
      warmupTasks.push(() => this.preloadQuery(query));
    }

    // Warm document types by priority
    for (const docType of this.config.warmupSchedule.documentTypes) {
      const priority = this.config.priorities[docType] ?? 0.5;
      warmupTasks.push(() => this.preloadDocumentType(docType, priority));
    }

    // Warm user patterns
    for (const pattern of this.config.warmupSchedule.userPatterns) {
      warmupTasks.push(() => this.preloadUserPattern(pattern));
    }

    const results = await this.requestBatcher.executeBatch(warmupTasks);
    console.log(`✅ Cache warming completed: ${results.successful}/${results.total} tasks successful`);
    this.emit('cache_warmed', results);
  }

  private async preloadQuery(query: string): Promise<void> {
    const cacheKey = `query:${this.hashQuery(query)}`;
    const exists = await this.redis.exists(cacheKey);
    if (!exists) {
      const result = await this.executeQueryForCache(query);
      const ttl = this.calculateOptimalTTL('search', query);
      await this.redis.setEx(cacheKey, ttl, JSON.stringify(result));
      console.log(`🔍 Pre-cached query: ${query} (TTL: ${ttl}s)`);
    }
  }

  private async preloadDocumentType(docType: string, priority: number): Promise<void> {
    const recentDocs = await this.getRecentDocumentsByType(docType, Math.ceil(50 * priority));
    for (const doc of recentDocs) {
      const cacheKey = `doc:${doc.id}`;
      const exists = await this.redis.exists(cacheKey);
      if (!exists) {
        const ttl = this.calculateOptimalTTL(docType, doc.id);
        await this.redis.setEx(cacheKey, ttl, JSON.stringify(doc));
      }
    }
    console.log(`📄 Pre-cached ${recentDocs.length} documents of type: ${docType}`);
  }

  /**
   * 2. DYNAMIC TTL TUNING BASED ON ACCESS PATTERNS
   */
  calculateOptimalTTL(type: string, key: string): number {
    const strategy = this.ttlStrategies.get(key);
    const baseTTL = this.getBaseTTL(type);
    if (!strategy) {
      this.ttlStrategies.set(key, {
        documentType: type,
        accessFrequency: 1,
        lastAccessed: new Date(),
        computedTTL: baseTTL,
        priority: this.inferPriority(type)
      });
      return baseTTL;
    }

    const hoursSinceLastAccess = (Date.now() - strategy.lastAccessed.getTime()) / (1000 * 60 * 60);
    const frequencyMultiplier = Math.min(strategy.accessFrequency / 10, 3);
    const recencyMultiplier = Math.max(1 - hoursSinceLastAccess / 24, 0.1);
    let computedTTL = baseTTL * Math.max(frequencyMultiplier, 1) * recencyMultiplier;
    const priorityMultiplier = this.getPriorityMultiplier(strategy.priority);
    computedTTL *= priorityMultiplier;
    computedTTL = Math.max(300, Math.min(computedTTL, 86400)); // 5 minutes to 24 hours
    strategy.computedTTL = computedTTL;
    strategy.lastAccessed = new Date();
    return Math.floor(computedTTL);
  }

  private getBaseTTL(type: string): number {
    const baseTTLs: Record<string, number> = {
      legal: 7200,
      evidence: 3600,
      search: 1800,
      report: 7200,
      embedding: 86400,
      default: 3600
    };
    return baseTTLs[type] ?? baseTTLs.default;
  }

  private inferPriority(type: string): 'critical' | 'high' | 'medium' | 'low' {
    const priorityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      legal: 'critical',
      evidence: 'high',
      search: 'medium',
      report: 'medium',
      embedding: 'high'
    };
    return priorityMap[type] ?? 'medium';
  }

  private getPriorityMultiplier(priority: 'critical' | 'high' | 'medium' | 'low'): number {
    const multipliers: Record<string, number> = {
      critical: 2.0,
      high: 1.5,
      medium: 1.0,
      low: 0.7
    };
    return multipliers[priority];
  }

  /**
   * 3. CACHE HIT RATE MONITORING
   */
  private handleCacheHit(data: { key?: string; query?: string; latency?: number; timestamp?: number }) {
    this.updateMetrics('hit', data);
    const identifier = data.key ?? data.query;
    if (!identifier) return;
    const strategy = this.ttlStrategies.get(identifier);
    if (strategy) {
      strategy.accessFrequency += 1;
      strategy.lastAccessed = new Date();
    }
  }

  private handleCacheMiss(data: { key?: string; query?: string; latency?: number; timestamp?: number }) {
    this.updateMetrics('miss', data);
    const identifier = data.key ?? data.query;
    if (!identifier) return;
    // schedule proactive load of the query string (if available)
    if (data.query) {
      void this.scheduleProactiveLoad(data.query);
    }
  }

  private updateMetrics(type: 'hit' | 'miss', data: { latency?: number } = {}) {
    this.metrics.totalRequests += 1;
    if (type === 'hit') {
      this.metrics.hits += 1;
    } else {
      this.metrics.misses += 1;
    }
    this.metrics.hitRate = this.metrics.hits / Math.max(1, this.metrics.totalRequests);
    this.metrics.missRate = this.metrics.misses / Math.max(1, this.metrics.totalRequests);

    if (typeof data.latency === 'number') {
      // exponential smoothing for average latency
      this.metrics.averageLatency = this.metrics.averageLatency * 0.9 + data.latency * 0.1;
    }
    this.emit('metrics_updated', { ...this.metrics });
  }

  /**
   * 4. REQUEST BATCHING WITH GPU OPTIMIZATION
   */
  private handleGPUUtilization(data: { utilization: number; temperature?: number; timestamp?: number }) {
    if (typeof data.utilization === 'number') {
      this.metrics.gpuUtilization = data.utilization;
      const target = this.config.performance.gpuUtilizationTarget;
      if (data.utilization < target - 0.1) {
        this.requestBatcher.increaseBatchSize();
      } else if (data.utilization > target + 0.1) {
        this.requestBatcher.decreaseBatchSize();
      }
      this.emit('gpu_utilization_updated', data);
    }
  }

  /**
   * Start continuous cache optimization
   */
  private startCacheOptimization() {
    // Initial warmup after short delay
    setTimeout(() => void this.warmCache(), 1000);

    // Schedule regular optimization cycles
    this.warmupTimer = setInterval(async () => {
      await this.optimizationCycle();
    }, 300_000); // Every 5 minutes

    console.log('🔄 Started continuous cache optimization');
  }

  private async optimizationCycle() {
    console.log('🔧 Running cache optimization cycle...');
    try {
      await this.analyzePerformance();
      await this.optimizeTTLStrategies();
      await this.predictivePreload();
      await this.cleanupStaleEntries();
      this.metrics.lastOptimized = new Date();
      console.log('✅ Cache optimization cycle completed');
    } catch (error: any) {
      console.error('❌ Cache optimization cycle failed:', error);
      this.emit('optimization_error', error);
    }
  }

  /**
   * Get current cache performance metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get TTL strategies for debugging
   */
  getTTLStrategies(): Map<string, TTLStrategy> {
    return new Map(this.ttlStrategies);
  }

  /**
   * Manual cache warming trigger
   */
  async triggerWarmup(): Promise<void> {
    await this.warmCache();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.warmupTimer) {
      clearInterval(this.warmupTimer);
      this.warmupTimer = null;
    }
    if (this.redis) {
      await this.redis.quit();
    }
    console.log('🧹 Cache optimizer cleaned up');
  }

  // Helper methods (implementation details)
  private hashQuery(query: string): string {
    // simple deterministic 32-bit hash -> hex
    let h = 2166136261 >>> 0;
    for (let i = 0; i < query.length; i++) {
      h ^= query.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return (h >>> 0).toString(16);
  }

	// replace simulated query executor with API call
	private async executeQueryForCache(query: string): Promise<any> {
		try {
			const res = await fetch('/api/search/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query })
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(`Search API error: ${text}`);
			}
			return await res.json();
		} catch (err) {
			console.warn('Query execution failed, returning fallback result', err);
			// graceful fallback for resilience
			return {
				query,
				results: [],
				timestamp: Date.now(),
				fromCache: false
			};
		}
	}

	// call backend endpoint that returns recent documents by type
	private async getRecentDocumentsByType(docType: string, limit: number): Promise<any[]> {
		const effectiveLimit = Math.max(0, Math.min(limit, 50));
		try {
			const qs = new URLSearchParams({ type: docType, limit: String(effectiveLimit) });
			const res = await fetch(`/api/documents/recent?${qs.toString()}`, {
				method: 'GET',
				headers: { 'Accept': 'application/json' }
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(`Documents API error: ${text}`);
			}
			const payload = await res.json();
			// Expect payload.items or payload.data (backend may vary) — handle both
			return payload?.items ?? payload?.data ?? Array.isArray(payload) ? payload : [];
		} catch (err) {
			console.warn('Failed to fetch recent documents, falling back to simulated list', err);
			// keep a minimal fallback so callers still work
			return Array.from({ length: Math.min(effectiveLimit, 10) }, (_, i) => ({
				id: `${docType}_${i}`,
				type: docType,
				content: `Sample ${docType} content ${i}`
			}));
		}
	}

	// call backend to warm user-patterns (server will do DB work)
	private async preloadUserPattern(pattern: string): Promise<void> {
		try {
			await fetch('/api/cache/preload/user-pattern', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pattern })
			});
			console.log(`👤 Requested preload for user pattern: ${pattern}`);
		} catch (err) {
			console.warn('Failed to request user-pattern preload', err);
		}
	}

	// ask server to schedule proactive load for a query (server should validate/rate-limit)
	private async scheduleProactiveLoad(query: string): Promise<void> {
		try {
			await fetch('/api/cache/proactive-load', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query })
			});
			console.log(`🔍 Proactive load requested for: ${query}`);
		} catch (err) {
			console.warn('Failed to schedule proactive load', err);
		}
	}
}

/**
 * Request Batcher for GPU Optimization
 */
class RequestBatcher {
	private batchSize: number;
	private maxConcurrency: number;
	private processing = false;

	constructor(config: { batchSize: number; maxConcurrency: number }) {
		this.batchSize = config.batchSize;
		this.maxConcurrency = config.maxConcurrency;
	}

	// concurrency-limited executor: workers pick next task until none left
	private async runWithConcurrency(tasks: Array<() => Promise<any>>): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: any; reason?: any }>> {
		const results: Array<any> = new Array(tasks.length);
		let idx = 0;
		const workers = Math.max(1, Math.min(this.maxConcurrency, tasks.length));

		const worker = async () => {
			while (true) {
				const i = idx++;
				if (i >= tasks.length) break;
				try {
					const value = await tasks[i]();
					results[i] = { status: 'fulfilled', value };
				} catch (reason) {
					results[i] = { status: 'rejected', reason };
				}
			}
		};

		await Promise.all(Array.from({ length: workers }, () => worker()));
		return results;
	}

	async executeBatch(tasks: Array<() => Promise<any>>): Promise<{ successful: number; total: number; errors: any[] }> {
		if (this.processing) {
			// avoid concurrent runs; caller can retry later
			throw new Error('RequestBatcher is already processing a batch');
		}
		this.processing = true;

		const results = {
			successful: 0,
			total: tasks.length,
			errors: [] as any[]
		};

		try {
			// process tasks in chunks of batchSize, each chunk respects maxConcurrency
			for (let i = 0; i < tasks.length; i += this.batchSize) {
				const chunk = tasks.slice(i, i + this.batchSize);
				const settled = await this.runWithConcurrency(chunk);
				for (const r of settled) {
					if (r.status === 'fulfilled') results.successful += 1;
					else results.errors.push(r.reason ?? r);
				}
			}
		} finally {
			this.processing = false;
		}
		return results;
	}

	increaseBatchSize(): void {
		this.batchSize = Math.min(Math.floor(this.batchSize * 1.2), 100);
		console.log(`📈 Increased batch size to ${this.batchSize}`);
	}

	decreaseBatchSize(): void {
		this.batchSize = Math.max(Math.floor(this.batchSize * 0.8), 10);
		console.log(`📉 Decreased batch size to ${this.batchSize}`);
	}
}