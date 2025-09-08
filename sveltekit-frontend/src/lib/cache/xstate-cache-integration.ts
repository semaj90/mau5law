/**
 * XState Neural Sprite Integration with Headless UI Cache
 * Bridges XState machine state management with intelligent caching
 */

import { assign, fromPromise } from 'xstate';
import { headlessUICache } from './headless-ui-cache.js';
import type { CacheEntry } from './headless-ui-cache.js';

export interface CacheContext {
  cacheKey: string | null;
  cachedData: any;
  cacheHit: boolean;
  cacheMetadata: {
    timestamp: number;
    source: 'memory' | 'indexeddb' | 'server' | 'semantic';
    hitRatio: number;
    responseTime: number;
  } | null;
  semanticQuery?: string;
  computationCost: number;
}

export type CacheEvent = 
  | { type: 'CACHE_LOOKUP'; key: string; semanticQuery?: string }
  | { type: 'CACHE_HIT'; data: any; metadata: CacheContext['cacheMetadata'] }
  | { type: 'CACHE_MISS' }
  | { type: 'CACHE_STORE'; key: string; data: any; semanticText?: string }
  | { type: 'CACHE_INVALIDATE'; key?: string; pattern?: string }
  | { type: 'CACHE_SYNC' }
  | { type: 'COMPUTE_REQUIRED'; cost: number };

/**
 * XState Cache Actor - manages caching operations
 */
export const cacheActor = fromPromise(async ({ 
  input 
}: { 
  input: { 
    operation: 'get' | 'set' | 'invalidate' | 'sync';
    key?: string;
    data?: any;
    semanticQuery?: string;
    semanticText?: string;
    pattern?: string;
  } 
}) => {
  const startTime = performance.now();
  
  try {
    switch (input.operation) {
      case 'get': {
        if (!input.key) throw new Error('Key required for get operation');
        
        const cachedData = await headlessUICache.get(input.key, input.semanticQuery);
        const responseTime = performance.now() - startTime;
        
        if (cachedData) {
          return {
            success: true,
            hit: true,
            data: cachedData,
            metadata: {
              timestamp: Date.now(),
              source: 'cache' as const,
              hitRatio: headlessUICache.getStats().hitRatio,
              responseTime
            }
          };
        } else {
          return {
            success: false,
            hit: false,
            data: null,
            metadata: {
              timestamp: Date.now(),
              source: 'none' as const,
              hitRatio: headlessUICache.getStats().hitRatio,
              responseTime
            }
          };
        }
      }
      
      case 'set': {
        if (!input.key || input.data === undefined) {
          throw new Error('Key and data required for set operation');
        }
        
        await headlessUICache.set(
          input.key, 
          input.data, 
          undefined, // Use default TTL
          'client',
          input.semanticText
        );
        
        return {
          success: true,
          stored: true,
          key: input.key,
          responseTime: performance.now() - startTime
        };
      }
      
      case 'invalidate': {
        if (input.key) {
          // Invalidate specific key - would need to implement in cache
          console.log(`[Cache] Invalidating key: ${input.key}`);
        } else if (input.pattern) {
          // Invalidate by pattern - would need to implement in cache
          console.log(`[Cache] Invalidating pattern: ${input.pattern}`);
        } else {
          // Clear all cache
          await headlessUICache.clear();
        }
        
        return {
          success: true,
          invalidated: true,
          responseTime: performance.now() - startTime
        };
      }
      
      case 'sync': {
        // Trigger cache sync with server
        console.log('[Cache] Syncing with server...');
        return {
          success: true,
          synced: true,
          responseTime: performance.now() - startTime
        };
      }
      
      default:
        throw new Error(`Unknown cache operation: ${input.operation}`);
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      responseTime: performance.now() - startTime
    };
  }
});

/**
 * Cache-aware XState machine mixin
 * Adds caching capabilities to any XState machine
 */
export function withCache<TContext extends Record<string, any>>(
  baseContext: TContext,
  cacheKeyGenerator?: (context: TContext) => string
) {
  return {
    ...baseContext,
    cache: {
      cacheKey: null,
      cachedData: null,
      cacheHit: false,
      cacheMetadata: null,
      computationCost: 0
    } as CacheContext
  };
}

/**
 * Cache actions for XState machines
 */
export const cacheActions = {
  /**
   * Assign cache lookup result to context
   */
  assignCacheResult: assign<any, any>(({ context, event }) => {
    if (event.type === 'CACHE_HIT') {
      return {
        ...context,
        cache: {
          ...context.cache,
          cachedData: event.data,
          cacheHit: true,
          cacheMetadata: event.metadata
        }
      };
    } else if (event.type === 'CACHE_MISS') {
      return {
        ...context,
        cache: {
          ...context.cache,
          cachedData: null,
          cacheHit: false,
          cacheMetadata: null
        }
      };
    }
    return context;
  }),

  /**
   * Set cache key for current operation
   */
  setCacheKey: assign<any, any>(({ context, event }) => {
    if (event.type === 'CACHE_LOOKUP') {
      return {
        ...context,
        cache: {
          ...context.cache,
          cacheKey: event.key,
          semanticQuery: event.semanticQuery
        }
      };
    }
    return context;
  }),

  /**
   * Track computation cost for caching priority
   */
  trackComputationCost: assign<any, any>(({ context, event }) => {
    if (event.type === 'COMPUTE_REQUIRED') {
      return {
        ...context,
        cache: {
          ...context.cache,
          computationCost: event.cost
        }
      };
    }
    return context;
  }),

  /**
   * Clear cache state
   */
  clearCacheState: assign<any, any>(({ context }) => ({
    ...context,
    cache: {
      cacheKey: null,
      cachedData: null,
      cacheHit: false,
      cacheMetadata: null,
      computationCost: 0
    }
  }))
};

/**
 * Cache guards for XState machines
 */
export const cacheGuards = {
  /**
   * Check if cache hit occurred
   */
  hasCacheHit: ({ context }: { context: any }) => {
    return context.cache?.cacheHit === true;
  },

  /**
   * Check if computation cost is high enough to warrant caching
   */
  shouldCache: ({ context }: { context: any }) => {
    return context.cache?.computationCost > 5; // Threshold for caching
  },

  /**
   * Check if cached data is recent enough
   */
  isCacheRecent: ({ context }: { context: any }) => {
    if (!context.cache?.cacheMetadata?.timestamp) return false;
    const ageMs = Date.now() - context.cache.cacheMetadata.timestamp;
    return ageMs < 5 * 60 * 1000; // 5 minutes
  }
};

/**
 * Example cached machine state definition
 */
export const createCachedMachineStates = () => ({
  initial: 'idle',
  states: {
    idle: {
      on: {
        FETCH_DATA: 'checkingCache'
      }
    },
    
    checkingCache: {
      entry: ['setCacheKey'],
      invoke: {
        src: cacheActor,
        input: ({ context, event }: { context: any; event: any }) => ({
          operation: 'get' as const,
          key: context.cache.cacheKey,
          semanticQuery: context.cache.semanticQuery
        }),
        onDone: [
          {
            target: 'dataReady',
            guard: ({ event }: { event: any }) => event.output.hit,
            actions: assign(({ context, event }) => ({
              ...context,
              cache: {
                ...context.cache,
                cachedData: event.output.data,
                cacheHit: true,
                cacheMetadata: event.output.metadata
              }
            }))
          },
          {
            target: 'computing',
            actions: assign(({ context }) => ({
              ...context,
              cache: {
                ...context.cache,
                cacheHit: false
              }
            }))
          }
        ],
        onError: 'computing'
      }
    },
    
    computing: {
      entry: ['trackComputationCost'],
      invoke: {
        // Your actual computation logic here
        src: fromPromise(async ({ input }) => {
          // Simulate computation
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { result: 'computed data' };
        }),
        onDone: {
          target: 'cachingResult',
          actions: assign(({ context, event }) => ({
            ...context,
            computedData: event.output.result
          }))
        },
        onError: 'error'
      }
    },
    
    cachingResult: {
      invoke: {
        src: cacheActor,
        input: ({ context }: { context: any }) => ({
          operation: 'set' as const,
          key: context.cache.cacheKey,
          data: context.computedData,
          semanticText: context.cache.semanticQuery
        }),
        onDone: 'dataReady',
        onError: 'dataReady' // Still succeed even if caching fails
      }
    },
    
    dataReady: {
      type: 'final',
      entry: () => console.log('Data ready (cached or computed)')
    },
    
    error: {
      type: 'final',
      entry: () => console.log('Error occurred')
    }
  }
});

/**
 * Neural Sprite specific cache decorator
 * Enhances Neural Sprite components with intelligent caching
 */
export function withNeuralSpriteCache(spriteConfig: any) {
  return {
    ...spriteConfig,
    cache: {
      enabled: true,
      strategy: 'semantic',
      ttl: 30 * 60 * 1000, // 30 minutes
      priority: 'high'
    },
    
    // Add cache-aware lifecycle methods
    beforeCompute: async function(context: any) {
      const cacheKey = `neural-sprite:${context.spriteId}:${JSON.stringify(context.inputs)}`;
      const cached = await headlessUICache.get(cacheKey);
      
      if (cached) {
        console.log(`[NeuralSprite] Cache hit for sprite ${context.spriteId}`);
        return { cached: true, result: cached };
      }
      
      return { cached: false };
    },
    
    afterCompute: async function(context: any, result: any) {
      const cacheKey = `neural-sprite:${context.spriteId}:${JSON.stringify(context.inputs)}`;
      await headlessUICache.set(
        cacheKey, 
        result, 
        30 * 60 * 1000, // 30 minutes
        'client',
        `sprite computation ${context.spriteId}`
      );
      
      console.log(`[NeuralSprite] Cached result for sprite ${context.spriteId}`);
    }
  };
}

// Export cache statistics for monitoring
export function getCacheStats() {
  return headlessUICache.getStats();
}

// Export cache control functions
export const cacheControl = {
  clear: () => headlessUICache.clear(),
  getStats: () => headlessUICache.getStats(),
  dispose: () => headlessUICache.dispose()
};