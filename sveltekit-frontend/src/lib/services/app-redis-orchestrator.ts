/**
 * App-Wide Redis Orchestrator Integration
 * Extends the Redis Legal Orchestrator for complete platform integration
 * Implements Nintendo-inspired memory optimization across all legal AI components
 */
import { RedisLegalOrchestrator, RedisLLMCache, RedisTaskQueue } from '$lib/services/redis-orchestrator';
import { componentTextureRegistry } from '$lib/registry/texture-component-registry';
import { chrROMCacheReader } from '$lib/services/chr-rom-cache-reader';

type OrchestratorContext = {
  endpoint: string;
  caseId?: string;
  userId?: string;
  legalCategory?: string;
  practiceArea?: string;
  priority?: number;
  useRAG?: boolean;
  requiresFresh?: boolean;
  // Allow additional fields without strict typing
  [key: string]: unknown;
};

export class AppRedisOrchestrator {
  // Use a safe time provider that works in Node and browsers
  private static now(): number {
    try {
      const p = (globalThis as any)?.performance;
      if (p && typeof p.now === 'function') return p.now();
    } catch {
      // ignore
    }
    return Date.now();
  }

  static async processAIQuery(
    query: string,
    sessionId: string,
    context: OrchestratorContext
  ): Promise<{
    response?: unknown;
    source?: 'cache' | 'fresh' | 'queued' | string;
    processing_time?: number;
    cached?: boolean;
    redis_stats?: unknown;
    nes_memory_usage?: unknown;
    task_id?: string;
    confidence?: number;
    sources?: Array<Record<string, unknown>>;
  }> {
    const startTime = this.now();
    try {
      if (!context.requiresFresh) {
        const cacheKey = `ai_query:${context.endpoint}:${(RedisLLMCache as any).generateCacheKey(query, context)}`;
        const chrRomPattern = await (chrROMCacheReader as any).getPattern(cacheKey, 'ui_response');
        if (chrRomPattern?.data) {
          return {
            response: JSON.parse(chrRomPattern.data).response,
            source: 'cache',
            processing_time: this.now() - startTime,
            cached: true,
            redis_stats: await (async () => {
              try {
                return await (RedisLegalOrchestrator as any).getRedisStats();
              } catch {
                return null;
              }
            })(),
            nes_memory_usage: (componentTextureRegistry as any).getMemoryUsage(),
          };
        }
      }
    } catch {
      // Ignore CHR-ROM cache errors and continue
    }

    try {
      if (!context.requiresFresh) {
        const { endpoint: _endpoint, ...rest } = context;
        const result = await (RedisLegalOrchestrator as any).processLegalQuery(query, sessionId, {
          ...rest,
        });
        if (result?.cached) {
          await this.cacheChrRomUIPatterns(query, result, context);
          return {
            ...result,
            redis_stats: await (async () => {
              try {
                return await (RedisLegalOrchestrator as any).getRedisStats();
              } catch {
                return null;
              }
            })(),
            nes_memory_usage: (componentTextureRegistry as any).getMemoryUsage(),
          };
        }
      }
    } catch {
      // Ignore Redis cache errors and continue to complex processing
    }

    return await this.processComplexAIQuery(query, sessionId, context, startTime);
  }

  private static async processComplexAIQuery(
    query: string,
    sessionId: string,
    context: OrchestratorContext,
    startTime: number
  ): Promise<{
    response?: unknown;
    source?: 'cache' | 'fresh' | 'queued' | string;
    processing_time?: number;
    cached?: boolean;
    redis_stats?: unknown;
    nes_memory_usage?: unknown;
    task_id?: string;
  }> {
    const endpointStr = String(context.endpoint ?? '');
    const isHighComplexity =
      query.length > 300 || !!context.useRAG || (context.priority ?? 0) > 180 || endpointStr.includes('analysis');

    if (isHighComplexity) {
      try {
        const taskType = this.determineTaskType(context.endpoint);
        const taskId = await (RedisTaskQueue as any).queueComplexTask(
          taskType,
          query,
          { ...context, sessionId },
          context.priority || 150
        );
        return {
          response: `Complex ${context.endpoint} analysis queued. Task ID: ${taskId}. Estimated completion: ${this.estimateCompletionTime(
            taskType
          )}`,
          source: 'queued',
          processing_time: this.now() - startTime,
          task_id: taskId,
          cached: false,
          redis_stats: await (async () => {
            try {
              return await (RedisLegalOrchestrator as any).getRedisStats();
            } catch {
              return null;
            }
          })(),
          nes_memory_usage: (componentTextureRegistry as any).getMemoryUsage(),
        };
      } catch {
        // Fall through to direct processing
      }
    }

    return {
      response: `Processing ${context.endpoint} query with Redis optimization...`,
      source: 'fresh',
      processing_time: this.now() - startTime,
      cached: false,
      redis_stats: await (async () => {
        try {
          return await (RedisLegalOrchestrator as any).getRedisStats();
        } catch {
          return null;
        }
      })(),
      nes_memory_usage: (componentTextureRegistry as any).getMemoryUsage(),
    };
  }

  private static async cacheChrRomUIPatterns(
    query: string,
    result: { confidence?: number; sources?: Array<Record<string, unknown>>; source?: string },
    context: OrchestratorContext
  ): Promise<void> {
    try {
      const componentId = `${context.endpoint}_ui_${Date.now()}`;
      (componentTextureRegistry as any).register(componentId, {
        componentName: `${context.endpoint}_response`,
        textureSlots: ['ui_response', 'metadata', 'stats'],
        memoryBank: 'CHR_ROM',
        sharingPolicy: 'shared',
        updateFrequency: 'static',
        priority: 180,
        estimatedUsage: JSON.stringify(result).length,
      });

      const uiOptimizedResult = {
        ...result,
        ui_patterns: {
          response_type: context.endpoint,
          confidence_bar: this.generateConfidenceBar(result?.confidence ?? 0.8),
          source_indicators: this.generateSourceIndicators(result?.sources ?? []),
          processing_badge: this.generateProcessingBadge(result?.source ?? 'fresh'),
        },
      };

      const cacheKey = `ai_query:${context.endpoint}:${(RedisLLMCache as any).generateCacheKey(query, context)}`;
      await (chrROMCacheReader as any).cachePattern(cacheKey, 'ui_response', JSON.stringify(uiOptimizedResult), {
        ttl: 3600,
      });

      (componentTextureRegistry as any).unregister(componentId);
    } catch {
      // Non-critical; ignore errors
    }
  }

  private static generateConfidenceBar(confidence: number): string {
    const width = Math.floor(Math.max(0, Math.min(1, confidence)) * 48);
    const color = confidence > 0.9 ? '#00d800' : confidence > 0.7 ? '#fc9838' : '#f83800';
    return `<div style="width: 48px; height: 4px; background: #333; border: 1px solid #000;"><div style="width: ${width}px; height: 100%; background: ${color}"></div></div>`;
  }

  private static generateSourceIndicators(sources: Array<Record<string, unknown>>): string {
    return (sources || [])
      .slice(0, 3)
      .map(
        source =>
          `<span style="background: #3cbcfc; color: white; padding: 1px 4px; font-size: 8px; margin: 1px;">${
            typeof (source as any)?.type === 'string' ? (source as any).type : 'DOC'
          }</span>`
      )
      .join('');
  }

  private static generateProcessingBadge(source: string): string {
    const colors: Record<string, string> = { cache: '#00d800', fresh: '#fc9838', queued: '#7c7c7c' };
    const color = colors[source] || '#000';
    return `<span style="background: ${color}; color: white; padding: 1px 3px; font-size: 7px; font-family: monospace; text-transform: uppercase;">${source}</span>`;
  }

  private static determineTaskType(
    endpoint: string
  ): 'complex_legal' | 'document_analysis' | 'case_synthesis' | 'risk_assessment' {
    if (endpoint.includes('document') || endpoint.includes('evidence')) return 'document_analysis';
    if (endpoint.includes('case') || endpoint.includes('synthesis')) return 'case_synthesis';
    if (endpoint.includes('risk') || endpoint.includes('score')) return 'risk_assessment';
    return 'complex_legal';
  }

  private static estimateCompletionTime(taskType: string): string {
    const estimates: Record<string, string> = {
      complex_legal: '30-45 seconds',
      document_analysis: '15-30 seconds',
      case_synthesis: '45-60 seconds',
      risk_assessment: '20-30 seconds',
    };
    return estimates[taskType] || '30-45 seconds';
  }

  static async initializeForComponent(
    componentName: string,
    config: {
      enableCaching: boolean;
      enableAgentMemory: boolean;
      enableTaskQueue: boolean;
      cacheStrategy: 'aggressive' | 'conservative' | 'minimal';
      memoryBank: 'INTERNAL_RAM' | 'CHR_ROM' | 'PRG_ROM' | 'SAVE_RAM';
    }
  ): Promise<{
    processQuery: (
      query: string,
      context: Record<string, unknown>
    ) => Promise<{
      response?: unknown;
      source?: 'cache' | 'fresh' | 'queued' | string;
      processing_time?: number;
      cached?: boolean;
      redis_stats?: unknown;
      nes_memory_usage?: unknown;
      task_id?: string;
    }>;
    getStats: () => Promise<Record<string, unknown>>;
    clearCache: () => Promise<void>;
  }> {
    (componentTextureRegistry as any).register(`${componentName}_redis`, {
      componentName,
      textureSlots: ['cache', 'memory', 'queue'],
      memoryBank: config.memoryBank,
      sharingPolicy: 'exclusive',
      updateFrequency: 'dynamic',
      priority: 160,
      estimatedUsage: 1024 * 1024,
    });

    return {
      processQuery: async (query: string, context: Record<string, unknown>) =>
        this.processAIQuery(query, `${componentName}_session`, {
          ...context,
          endpoint: componentName,
          priority: config.cacheStrategy === 'aggressive' ? 200 : config.cacheStrategy === 'conservative' ? 120 : 80,
        } as OrchestratorContext),
      getStats: async () => ({
        component: componentName,
        redis: await (async () => {
          try {
            return await (RedisLegalOrchestrator as any).getRedisStats();
          } catch {
            return null;
          }
        })(),
        nes_memory: (componentTextureRegistry as any).getMemoryUsage(),
        config,
      }),
      clearCache: async () => {
        try {
          if (typeof (RedisLegalOrchestrator as any).invalidateCacheForComponent === 'function') {
            await (RedisLegalOrchestrator as any).invalidateCacheForComponent(componentName);
            return;
          }
          if (typeof (RedisLegalOrchestrator as any).clearComponentCache === 'function') {
            await (RedisLegalOrchestrator as any).clearComponentCache(componentName);
            return;
          }
          // Best-effort fallback: attempt to remove keys by pattern (if supported)
          if (typeof (RedisLegalOrchestrator as any).removeKeysByPattern === 'function') {
            await (RedisLegalOrchestrator as any).removeKeysByPattern(`ai_query:${componentName}:*`);
          }
        } catch {
          // ignore cache-clear failures (non-critical)
        }
      },
    };
  }

  static async getSystemHealth(): Promise<Record<string, unknown>> {
    const redisStats = await (async () => {
      try {
        return await (RedisLegalOrchestrator as any).getRedisStats();
      } catch {
        return null;
      }
    })();
    const memoryStats = (componentTextureRegistry as any).getMemoryUsage() || { banks: {} };

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    try {
      const llmCacheHit = (redisStats as any)?.llm_cache?.hit_rate_estimate;
      if (typeof llmCacheHit === 'number' && llmCacheHit < 60) {
        status = 'degraded';
        recommendations.push('LLM cache hit rate is low - consider cache warming');
      }
      const queued = (redisStats as any)?.task_queue?.queued_tasks;
      if (typeof queued === 'number' && queued > 100) {
        status = 'critical';
        recommendations.push('Task queue is overloaded - scale workers immediately');
      }
    } catch {
      // ignore stats parsing issues
    }

    try {
      const banks = (memoryStats as any).banks || {};
      // If banks expose capacity+used compute per-bank ratio, otherwise attempt a coarse heuristic
      for (const [name, bank] of Object.entries(banks)) {
        const used = (bank as any)?.used;
        const capacity = (bank as any)?.capacity;
        if (typeof used === 'number' && typeof capacity === 'number' && capacity > 0) {
          const ratio = used / capacity;
          if (ratio > 0.9) {
            status = 'critical';
            recommendations.push(
              `NES memory bank "${name}" at ${(ratio * 100).toFixed(1)}% capacity - implement eviction`
            );
          } else if (ratio > 0.75 && status !== 'critical') {
            status = 'degraded';
            recommendations.push(
              `NES memory bank "${name}" at ${(ratio * 100).toFixed(1)}% capacity - consider eviction`
            );
          }
        }
      }
    } catch {
      // ignore memory parsing issues
    }

    if (status === 'healthy') {
      recommendations.push('All systems optimal - Redis + NES architecture performing well');
    }

    return {
      status,
      redis_orchestrator: redisStats,
      nes_memory_architecture: memoryStats,
      recommendations,
    };
  }
}

export const appRedisOrchestrator = AppRedisOrchestrator;
