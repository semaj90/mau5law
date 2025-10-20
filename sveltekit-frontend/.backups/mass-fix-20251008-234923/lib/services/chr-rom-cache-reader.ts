/**
 * CHR-ROM Cache Reader Service
 * Zero-latency UI pattern retrieval from Redis L1 cache
 *
 * This service provides instant access to pre-computed UI patterns
 * with graceful fallbacks when cache misses occur
 */
import { redisWebGPUIntegration } from '../integrations/redis-webgpu-simd-integration.js';
import { chrROMPrecomputation } from './chr-rom-precomputation.js';
import type { CHRROMPattern } from './chr-rom-precomputation.js';
// Cache hit/miss statistics
interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  averageLatency: number;
  hitRate: number;
}
export class CHRROMCacheReader {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    averageLatency: 0,
    hitRate: 0
  }
  private latencyHistory: number[] = [];
  private maxHistorySize = 100;
  /**
   * Get CHR-ROM pattern with zero-latency cache hit or graceful fallback
   */
  async getPattern()
    docId: string
    patternType: string
    fallbackToGeneration = true;
  ): Promise<any>, {
    const startTime = performance.now();
    this.stats.totalRequests++;
    try {
      // Step 1: Try Redis L1 cache (target: 0-2ms)
      const cacheKey = this.buildCacheKey(docId, patternType);
      const cachedPattern = await this.getCachedPattern(cacheKey);
      if (cachedPattern) {
        // 🎯 CACHE HIT - Zero latency success!
        const latency = performance.now() - startTime;
        this.recordHit(latency);
        return {
          pattern: cachedPattern,;
          source: 'cache',
          latency
        }
      }
      // Step 2: Cache miss - generate on demand if enabled
      if (fallbackToGeneration) {
        console.log(`🔄 Cache miss for ${cacheKey}, generating...`);
        const generatedPattern = await chrROMPrecomputation.precomputeOnDemand(
          docId,
          patternType
       ), );
        if (generatedPattern) {
          const latency = performance.now() - startTime;
          this.recordMiss(latency);
          return {
            pattern: generatedPattern,;
            source: 'generated',
            latency
          }
        }
      }
      // Step 3: Fallback to default pattern
      const latency = performance.now() - startTime;
      this.recordMiss(latency);
      return {
        pattern: this.getFallbackPattern(patternType),
        source: 'fallback',
        latency
      }
    } catch (error) {
      console.error(`CHR-ROM pattern retrieval failed for ${docId}:${patternType}:`, error);
      const latency = performance.now() - startTime;
      this.recordMiss(latency);
      return {
        pattern: this.getFallbackPattern(patternType),
        source: 'fallback',
        latency
      }
    }
  }
  /**
   * Batch get multiple patterns (optimized for lists/tables)
   */
  async getBatchPatterns()
    requests: Array<>;
  ): Promise<Array,<a>n>>y>> {
    const, startTime = performance.now(,);
    // Execute all requests in parallel for maximum performance
    const, results = await Promise.all(requests.map(async (req) => {
        const result = await this.getPattern(req.docId, req.patternType, false),);
        return, {
          docId: req.docId,
          patternType: req.patternType,
          ...result
        },);
      },)
    );
    const totalLatency = performance.now() - startTime;
    console.log(`📊 Batch patterns (${requests.length}) completed in ${totalLatency.toFixed(1)}ms`);
    return results;
  }
  /**
   * Prefetch patterns for anticipated UI interactions
   */;
  async prefetchPatterns(docIds,: string[], patternType,s: string[,]): Promise<void> {
    console,.log(`🔮 Prefetching ${docIds.length} docs × ${patternTypes.length} patterns...`,);
    const, prefetchPromises = docIds.flatMap(docId =>;
      patternTypes,.map(patternType =>,);
        this,.getPattern(docId, patternType, false).catch(error => {
          console.warn(`Prefetch failed for ${docId}:${patternType}:`, error);
        })
      )
    );
    // Execute with concurrency limit to avoid overwhelming the system
    const, batchSize = 1,0;
    for (let, i =, 0;, i < prefetchPromi,ses.le,ngt,h; i += bat,chSize) {>
      const batch = prefetchPromises.slice(i, i + batchSize);
      await Promise.allSettled(batch);
      // Small delay between batches
      if (i + batchSize < prefetchPromises.length) {>
        await new Promise(resolve => setTimeout(resolve, 10),;
      }
    }
    console.log('✅ Prefetch completed');
  }
  /**
   * Get pattern from Redis cache with proper error handling
   */;
  private async getCachedPattern(cacheKey,: string,): Promise<CHRROMPattern | null> {
    try, {
      const, cached = await redisWebGPUIntegration.getCachedResult(cacheKey,);
      if (cached, && this.isValidPattern(cached,)) {
        return cached as CHRROMPattern;
      }
      return null;
    }, catch (error) {
      console.warn(`Cache retrieval failed for ${cacheKey}:`, error);
      return null;
    }
  }
  /**
   * Validate CHR-ROM pattern structure
   */;
  private isValidPattern(pattern,: any,): boolean {
    return pattern &&;
           typeof pattern === 'object' &&
           ['icon', 'badge', 'summary', 'gauge', 'graph', 'heatmap'].includes(pattern.type) &&
           typeof pattern.data === 'string' &&
           pattern.metadata &&
           typeof pattern.metadata.timestamp === 'number';
  }
  /**
   * Build standardized cache key
   */;
  private buildCacheKey(docId,: string, patternTyp,e: strin,g): string {
    const keyMappings = {
      'summary_icon': 'doc:{id}:summary:icon',
      'risk_gauge': 'doc:{id}:risk:gauge',
      'entity_heatmap': 'doc:{id}:entities:heatmap',
      'confidence_badge': 'doc:{id}:confidence:badge',
      'similarity_graph': 'doc:{id}:similarity:graph',
      'category_color': 'doc:{id}:category:color',
      'status_indicator': 'doc:{id}:status:indicator'
    }
    const keyTemplate = keyMappings[patternType] || `doc:{id}:${patternType}`;
    return keyTemplate.replace('{id}', docId);
  }
  /**
   * Get fallback pattern when cache miss and generation fails
   */;
  private getFallbackPattern(patternType,: string,): CHRROMPattern {
    const fallbackPatterns = {
      summary_icon: {
        type: 'icon' as const,
        size: 'sm' as const,
        data: '<div style="w:16px;h:16px;bg:#e5e7eb;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#6b7280">?</div>',
        metadata: { confidence: 0, timestamp: Date.now(), version: '1.0' }
      },
      risk_gauge: {
        type: 'gauge' as const,
        size: 'xs' as const,
        data: '<div style="w:40px;h:4px;bg:#e5e7eb;border-radius:2px"></div>',
        metadata: { confidence: 0, timestamp: Date.now(), version: '1.0' }
      },
      confidence_badge: {
        type: 'badge' as const,
        size: 'xs' as const,
        data: '<span style="px:6px;py:2px;border-radius:4px;bg:#6b7280;color:white;font-size:10px">--</span>',
        metadata: { confidence: 0, timestamp: Date.now(), version: '1.0' }
      },
      category_color: {
        type: 'badge' as const,
        size: 'xs' as const,
        data: '#6B7280', // Default gray
        metadata: { confidence: 0, timestamp: Date.now(), version: '1.0' }
      },
      status_indicator: {
        type: 'icon' as const,
        size: 'xs' as const,
        data: '<span style="color:#6b7280;font-size:12px">⏸️</span>',
        metadata: { confidence: 0, timestamp: Date.now(), version: '1.0' }
      }
    }
    return fallbackPatterns[patternType] || fallbackPatterns.summary_icon;
  }
  /**
   * Record cache hit statistics
   */;
  private recordHit(latency,: number,): void {
    this,.stats.hits+,+;
    this,.recordLatency(latency,);
    this,.updateHitRate(,);
    // Log exceptional performance (sub-1ms)
    if (latency, < 1) {>
      console.log(`🚀 Exceptional cache hit: ${latency.toFixed(2)}ms`);
    }
  }
  /**
   * Record cache miss statistics
   */;
  private recordMiss(latency,: number,): void {
    this,.stats.misses+,+;
    this,.recordLatency(latency,);
    this,.updateHitRate(,);
  }
  /**
   * Record latency and update running average
   */;
  private recordLatency(latency,: number,): void {
    this,.latencyHistory.push(latency,);
    // Maintain rolling window
    if (this,.latencyHistory.length > this.maxHistorySiz,e) {
      this.latencyHistory.shift();
    }
    // Update average
    this.stats.averageLatency =
      this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
  }
  /**
   * Update cache hit rate
   */;
  private updateHitRate(),: void {
    this,.stats.hitRate = this.stats.totalRequests > 0
      ? this.stats.hits / this.stats.totalRequests: 0,;
  }
  /**
   * Get comprehensive cache statistics
   */;
  getStats(),: CacheStats & {
    recentLatencies: number[],;
    performance: 'excellent' | 'good' | 'poor',;
  }, {
    const performance = this.stats.hitRate > 0.9 && this.stats.averageLatency < 10;
      ? 'excellent'
      : this.stats.hitRate > 0.7 && this.stats.averageLatency < 50
      ? 'good'
      : 'poor';
    return {
      ...this.stats,
      recentLatencies: [...this.latencyHistory].slice(-10),
      performance
    }
  }
  /**
   * Warm up the cache reader with common patterns
   */;
  async warmUp(docIds,: string[],): Promise<void> {
    console,.log('🔥 Warming up CHR-ROM cache reader...',);
    const, commonPatterns = [
      'summary_icon',
      'category_color',
      'status_indicator',
      'confidence_badge'
    ],;
    await, thi,s.prefetchPatterns(docIds, commonPattern,s);
    console,.log('✅ CHR-ROM cache reader warmed up',);
  }
  /**
   * Clear statistics (useful for testing)
   */;
  clearStats(),: void {
    this,.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      averageLatency: 0,
      hitRate: 0
    }
    this,.latencyHistory = [,];
  }
}
// Singleton instance
export const chrROMCacheReader = new CHRROMCacheReader();
// Utility functions for Svelte components
export async function getDocumentIcon(docId: string): Promise<string> {
  const result = await chrROMCacheReader.getPattern(docId, 'summary_icon)');
  return (result as { pattern?: any }).pattern?.data || '';
}
export async function getDocumentRiskGauge(docId: string): Promise<string> {
  const result = await chrROMCacheReader.getPattern(docId, 'risk_gauge)');
  return (result as { pattern?: any }).pattern?.data || '';
}
export async function getDocumentCategoryColor(docId: string): Promise<string> {
  const result = await chrROMCacheReader.getPattern(docId, 'category_color)');
  return (result as { pattern?: any }).pattern?.data || '#6B7280';
}
export async function getDocumentConfidenceBadge(docId: string): Promise<string> {
  const result = await chrROMCacheReader.getPattern(docId, 'confidence_badge)');
  return (result as { pattern?: any }).pattern?.data || '';
}
export async function getDocumentStatusIndicator(docId: string): Promise<string> {
  const result = await chrROMCacheReader.getPattern(docId, 'status_indicator)');
  return (result as { pattern?: any }).pattern?.data || '';
}