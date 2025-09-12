/**
 * Parallel Cache Orchestrator
 * Unifies all cache layers for maximum parallel performance
 * Optimizes resource allocation across GPU, CPU, and memory tiers
 */

import { shaderCacheManager } from '$lib/webgpu/shader-cache-manager.js';
import { cacheActor, getCacheStats } from './xstate-cache-integration.js';
import MultiTierCache from '$lib/ai/cache/multiTierCache.js';
import { getCache, setCache } from '$lib/server/utils/server-cache.js';
import { browser } from '$app/environment';

export interface CacheResourceAllocation {
  cpuThreads: number;
  memoryMB: number;
  gpuUtilization: number; // 0-1
  cacheSlots: {
    l1Memory: number;
    l2Redis: number;  
    l3Storage: number;
    gpuTexture: number;
  };
  circuitBreakers: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTime: number;
  };
}

export interface ParallelCacheRequest {
  id: string;
  type: 'embedding' | 'shader' | 'context' | 'rag' | 'quantized' | 'hybrid';
  priority: 'low' | 'normal' | 'high' | 'critical';
  keys: string[];
  data?: any[];
  ttl?: number;
  resourceLimits?: Partial<CacheResourceAllocation>;
  concurrencyGroup?: number; // 0 = immediate, 1 = after group 0
}

export interface CacheExecutionMetrics {
  totalLatency: number;
  cacheHitRate: number;
  resourceUtilization: {
    cpuThreads: number;
    memoryUsedMB: number;
    gpuUtilizationPercent: number;
  };
  layerPerformance: {
    l1MemoryHits: number;
    l2RedisHits: number;
    l3StorageHits: number;
    gpuTextureHits: number;
    misses: number;
  };
  circuitBreakerStatus: Record<string, boolean>;
}

class ParallelCacheOrchestrator {
  private l1Memory = new MultiTierCache({ memoryLimit: 1000, storagePrefix: 'l1:' });
  private l2Memory = new MultiTierCache({ memoryLimit: 5000, storagePrefix: 'l2:' });
  private l3Storage = new MultiTierCache({ memoryLimit: 10000, storagePrefix: 'l3:' });
  
  private resourceAllocation: CacheResourceAllocation = {
    cpuThreads: 8,
    memoryMB: 100,
    gpuUtilization: 0.3,
    cacheSlots: {
      l1Memory: 1000,
      l2Redis: 5000,
      l3Storage: 50000,
      gpuTexture: 200
    },
    circuitBreakers: {
      enabled: true,
      failureThreshold: 5,
      recoveryTime: 30000
    }
  };

  private circuitBreakerState = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();
  private activeRequests = new Map<string, Promise<any>>();
  private executionMetrics: CacheExecutionMetrics = this.initializeMetrics();

  constructor() {
    this.initializeResourceMonitoring();
  }

  /**
   * Execute parallel cache operations across all services
   * Group 0: Memory/GPU operations (fast) - target 300ms
   * Group 1: Network/disk operations (slower) - target 200ms additional
   */
  async executeParallel(request: ParallelCacheRequest): Promise<{
    success: boolean;
    data?: any[];
    metrics: CacheExecutionMetrics;
    cacheResults: Array<{ key: string; hit: boolean; source: string; data?: any }>;
  }> {
    const startTime = performance.now();
    this.resetMetrics();

    try {
      // Allocate resources based on request priority and type
      const resources = this.allocateResources(request);
      
      // Group 0: Parallel memory + GPU operations (simultaneous)
      const group0Promise = this.executeGroup0Operations(request, resources);
      
      // Group 1: Redis + RAG operations (uses cached embeddings from Group 0)
      const group0Results = await group0Promise;
      const group1Promise = this.executeGroup1Operations(request, resources, group0Results);
      
      const group1Results = await group1Promise;
      
      // Combine results
      const allResults = [...group0Results, ...group1Results];
      const totalLatency = performance.now() - startTime;
      
      this.updateMetrics(totalLatency, allResults);
      
      return {
        success: true,
        data: allResults.map(r => r.data).filter(Boolean),
        metrics: { ...this.executionMetrics, totalLatency },
        cacheResults: allResults
      };

    } catch (error) {
      console.error('Parallel cache execution failed:', error);
      this.recordCircuitBreakerFailure(request.type);
      
      return {
        success: false,
        metrics: { ...this.executionMetrics, totalLatency: performance.now() - startTime },
        cacheResults: []
      };
    }
  }

  /**
   * Group 0: Memory + GPU operations (300ms target)
   */
  private async executeGroup0Operations(
    request: ParallelCacheRequest,
    resources: CacheResourceAllocation
  ): Promise<Array<{ key: string; hit: boolean; source: string; data?: any }>> {
    const operations = [
      // L1 Memory cache lookups (immediate)
      this.batchMemoryLookup(request.keys, 'l1'),
      
      // GPU shader cache + texture operations (if shader request)
      request.type === 'shader' || request.type === 'quantized' || request.type === 'hybrid'
        ? this.executeGPUCacheOperations(request)
        : Promise.resolve([]),
      
      // XState semantic cache (contextual)
      request.type === 'context' || request.type === 'hybrid'
        ? this.executeXStateCacheOperations(request)
        : Promise.resolve([]),
        
      // L2 Memory cache lookups (fast)
      this.batchMemoryLookup(request.keys, 'l2')
    ];

    // Execute all Group 0 operations in parallel
    const results = await Promise.allSettled(operations);
    
    // Flatten successful results
    return results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .flatMap(result => Array.isArray(result.value) ? result.value : [result.value])
      .filter(Boolean);
  }

  /**
   * Group 1: Network + Storage operations (200ms target)
   */
  private async executeGroup1Operations(
    request: ParallelCacheRequest,
    resources: CacheResourceAllocation,
    group0Results: any[]
  ): Promise<Array<{ key: string; hit: boolean; source: string; data?: any }>> {
    // Only execute if we didn't get enough hits from Group 0
    const missingKeys = request.keys.filter(key => 
      !group0Results.some(result => result.key === key && result.hit)
    );

    if (missingKeys.length === 0) {
      return []; // All cache hits from Group 0!
    }

    const operations = [
      // L3 Storage lookups
      this.batchStorageLookup(missingKeys),
      
      // Server cache lookups
      browser ? Promise.resolve([]) : this.batchServerCacheLookup(missingKeys),
      
      // RAG embedding lookups (if RAG request and we have cached embeddings)
      request.type === 'rag' || request.type === 'embedding' || request.type === 'hybrid'
        ? this.executeRAGCacheOperations(request, group0Results)
        : Promise.resolve([])
    ];

    // Execute all Group 1 operations in parallel
    const results = await Promise.allSettled(operations);
    
    return results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .flatMap(result => Array.isArray(result.value) ? result.value : [result.value])
      .filter(Boolean);
  }

  /**
   * Smart resource allocation based on task count and system capacity
   */
  private allocateResources(request: ParallelCacheRequest): CacheResourceAllocation {
    const baseAllocation = { ...this.resourceAllocation };
    const taskCount = request.keys.length;
    const priorityMultiplier = { low: 0.5, normal: 1.0, high: 1.5, critical: 2.0 }[request.priority];

    // Allocate CPU threads based on task count (max 8)
    baseAllocation.cpuThreads = Math.min(8, Math.ceil(taskCount * priorityMultiplier * 0.5));
    
    // Allocate memory per task with overflow protection
    baseAllocation.memoryMB = Math.min(800, taskCount * 100);
    
    // Allocate GPU utilization based on operation type
    if (request.type === 'shader' || request.type === 'quantized') {
      baseAllocation.gpuUtilization = Math.min(0.6, 0.3 + (taskCount * 0.05));
    }

    return baseAllocation;
  }

  /**
   * Batch memory lookups across L1/L2 tiers
   */
  private async batchMemoryLookup(
    keys: string[],
    tier: 'l1' | 'l2'
  ): Promise<Array<{ key: string; hit: boolean; source: string; data?: any }>> {
    const cache = tier === 'l1' ? this.l1Memory : this.l2Memory;
    const source = tier === 'l1' ? 'l1_memory' : 'l2_memory';
    
    const results = await Promise.all(
      keys.map(async (key) => {
        const data = await cache.get(key);
        return {
          key,
          hit: data !== undefined,
          source,
          data
        };
      })
    );

    // Update metrics
    const hits = results.filter(r => r.hit).length;
    if (tier === 'l1') {
      this.executionMetrics.layerPerformance.l1MemoryHits += hits;
    } else {
      this.executionMetrics.layerPerformance.l2RedisHits += hits;
    }

    return results.filter(r => r.hit);
  }

  /**
   * GPU shader + texture cache operations
   */
  private async executeGPUCacheOperations(
    request: ParallelCacheRequest
  ): Promise<Array<{ key: string; hit: boolean; source: string; data?: any }>> {
    if (!browser || typeof window === 'undefined') {
      return [];
    }

    try {
      const results: Array<{ key: string; hit: boolean; source: string; data?: any }> = [];
      
      // Search for cached shaders
      for (const key of request.keys) {
        const searchResults = await shaderCacheManager.searchShaders({
          text: key,
          operation: request.type,
          shaderType: 'webgpu',
          limit: 1
        });

        if (searchResults.length > 0) {
          results.push({
            key,
            hit: true,
            source: 'gpu_texture',
            data: searchResults[0]
          });
          this.executionMetrics.layerPerformance.gpuTextureHits++;
        }
      }

      return results;
    } catch (error) {
      console.warn('GPU cache operations failed:', error);
      return [];
    }
  }

  /**
   * XState semantic cache operations
   */
  private async executeXStateCacheOperations(
    request: ParallelCacheRequest
  ): Promise<Array<{ key: string; hit: boolean; source: string; data?: any }>> {
    try {
      const results: Array<{ key: string; hit: boolean; source: string; data?: any }> = [];
      
      for (const key of request.keys) {
        const cacheResult = await (cacheActor as any).send({ 
          type: 'get', 
          input: { operation: 'get', key, semanticQuery: key } 
        });

        if (cacheResult.success && cacheResult.hit) {
          results.push({
            key,
            hit: true,
            source: 'xstate_semantic',
            data: cacheResult.data
          });
        }
      }

      return results;
    } catch (error) {
      console.warn('XState cache operations failed:', error);
      return [];
    }
  }

  /**
   * RAG embedding cache operations
   */
  private async executeRAGCacheOperations(
    request: ParallelCacheRequest,
    group0Results: any[]
  ): Promise<Array<{ key: string; hit: boolean; source: string; data?: any }>> {
    try {
      // Use cached embeddings from Group 0 to accelerate RAG lookup
      const cachedEmbeddings = group0Results
        .filter(result => result.source.includes('embedding'))
        .map(result => result.data);

      if (cachedEmbeddings.length === 0) {
        return [];
      }

      // Execute RAG queries using cached embeddings
      const results: Array<{ key: string; hit: boolean; source: string; data?: any }> = [];
      
      for (const key of request.keys) {
        // Simulate RAG lookup using cached embeddings
        // In real implementation, this would query pgvector with the cached embeddings
        results.push({
          key,
          hit: true,
          source: 'rag_cached_embedding',
          data: { ragResults: `RAG results for ${key} using cached embeddings` }
        });
      }

      return results;
    } catch (error) {
      console.warn('RAG cache operations failed:', error);
      return [];
    }
  }

  /**
   * Batch storage lookups (L3)
   */
  private async batchStorageLookup(
    keys: string[]
  ): Promise<Array<{ key: string; hit: boolean; source: string; data?: any }>> {
    const results = await Promise.all(
      keys.map(async (key) => {
        const data = await this.l3Storage.get(key);
        return {
          key,
          hit: data !== undefined,
          source: 'l3_storage',
          data
        };
      })
    );

    const hits = results.filter(r => r.hit).length;
    this.executionMetrics.layerPerformance.l3StorageHits += hits;
    
    return results.filter(r => r.hit);
  }

  /**
   * Server cache lookups
   */
  private async batchServerCacheLookup(
    keys: string[]
  ): Promise<Array<{ key: string; hit: boolean; source: string; data?: any }>> {
    const results = await Promise.all(
      keys.map(async (key) => {
        try {
          const data = await getCache(key);
          return {
            key,
            hit: data !== null,
            source: 'server_cache',
            data
          };
        } catch (error) {
          return { key, hit: false, source: 'server_cache' };
        }
      })
    );

    return results.filter(r => r.hit);
  }

  /**
   * Store data across cache tiers intelligently
   */
  async storeParallel(
    key: string,
    data: any,
    options: {
      tier?: 'l1' | 'l2' | 'l3' | 'all';
      ttl?: number;
      priority?: 'low' | 'normal' | 'high';
      type?: string;
    } = {}
  ): Promise<void> {
    const { tier = 'all', ttl = 30 * 60 * 1000, priority = 'normal' } = options;

    const storeOperations: Promise<void>[] = [];

    // Store in appropriate tiers based on priority and data size
    const dataSize = JSON.stringify(data).length;
    
    if (tier === 'all' || tier === 'l1') {
      if (dataSize < 10000 || priority === 'high') { // < 10KB or high priority
        storeOperations.push(this.l1Memory.set(key, data, ttl));
      }
    }

    if (tier === 'all' || tier === 'l2') {
      if (dataSize < 100000 || priority !== 'low') { // < 100KB or not low priority
        storeOperations.push(this.l2Memory.set(key, data, ttl));
      }
    }

    if (tier === 'all' || tier === 'l3') {
      storeOperations.push(this.l3Storage.set(key, data, ttl));
    }

    // Store on server if not in browser
    if (!browser && (tier === 'all' || !tier)) {
      storeOperations.push(setCache(key, data));
    }

    // Execute all storage operations in parallel
    await Promise.allSettled(storeOperations);
  }

  /**
   * Circuit breaker management
   */
  private recordCircuitBreakerFailure(operation: string): void {
    const state = this.circuitBreakerState.get(operation) || { 
      failures: 0, 
      lastFailure: 0, 
      isOpen: false 
    };

    state.failures++;
    state.lastFailure = Date.now();
    
    if (state.failures >= this.resourceAllocation.circuitBreakers.failureThreshold) {
      state.isOpen = true;
      console.warn(`🚨 Circuit breaker OPEN for ${operation} - ${state.failures} failures`);
    }

    this.circuitBreakerState.set(operation, state);
    this.executionMetrics.circuitBreakerStatus[operation] = state.isOpen;
  }

  private isCircuitBreakerOpen(operation: string): boolean {
    const state = this.circuitBreakerState.get(operation);
    if (!state || !state.isOpen) return false;

    // Check if recovery time has passed
    const timeSinceLastFailure = Date.now() - state.lastFailure;
    if (timeSinceLastFailure > this.resourceAllocation.circuitBreakers.recoveryTime) {
      state.isOpen = false;
      state.failures = 0;
      this.circuitBreakerState.set(operation, state);
      console.log(`✅ Circuit breaker CLOSED for ${operation} - recovered`);
      return false;
    }

    return true;
  }

  /**
   * Performance metrics tracking
   */
  private initializeMetrics(): CacheExecutionMetrics {
    return {
      totalLatency: 0,
      cacheHitRate: 0,
      resourceUtilization: {
        cpuThreads: 0,
        memoryUsedMB: 0,
        gpuUtilizationPercent: 0
      },
      layerPerformance: {
        l1MemoryHits: 0,
        l2RedisHits: 0,
        l3StorageHits: 0,
        gpuTextureHits: 0,
        misses: 0
      },
      circuitBreakerStatus: {}
    };
  }

  private resetMetrics(): void {
    this.executionMetrics = this.initializeMetrics();
  }

  private updateMetrics(totalLatency: number, results: any[]): void {
    const totalResults = results.length;
    const hits = results.filter(r => r.hit).length;
    
    this.executionMetrics.totalLatency = totalLatency;
    this.executionMetrics.cacheHitRate = totalResults > 0 ? hits / totalResults : 0;
    this.executionMetrics.layerPerformance.misses = totalResults - hits;
  }

  private initializeResourceMonitoring(): void {
    // Monitor memory usage every 30 seconds
    if (browser) {
      setInterval(() => {
        if (performance.memory) {
          this.executionMetrics.resourceUtilization.memoryUsedMB = 
            performance.memory?.usedJSHeapSize ? performance.memory.usedJSHeapSize / (1024 * 1024) : 0;
        }
      }, 30000);
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(): Promise<{
    currentMetrics: CacheExecutionMetrics;
    cacheStats: {
      l1Size: number;
      l2Size: number;
      l3Size: number;
      xstateStats: any;
      shaderStats: any;
    };
    systemResources: CacheResourceAllocation;
  }> {
    return {
      currentMetrics: this.executionMetrics,
      cacheStats: {
        l1Size: await this.getCacheSize(this.l1Memory),
        l2Size: await this.getCacheSize(this.l2Memory), 
        l3Size: await this.getCacheSize(this.l3Storage),
        xstateStats: getCacheStats(),
        shaderStats: await shaderCacheManager.getShaderStats()
      },
      systemResources: this.resourceAllocation
    };
  }

  private async getCacheSize(cache: MultiTierCache): Promise<number> {
    // Estimate cache size - would need to track this properly
    return 0;
  }

  /**
   * Clear all cache tiers
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.l1Memory.clear(),
      this.l2Memory.clear(), 
      this.l3Storage.clear()
    ]);
    
    this.resetMetrics();
    this.circuitBreakerState.clear();
  }
}

// Export singleton instance
export const parallelCacheOrchestrator = new ParallelCacheOrchestrator();
export default parallelCacheOrchestrator;