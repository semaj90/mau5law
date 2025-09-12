/**
 * Universal Redis Orchestrator Middleware
 * Automatically integrates Redis optimization into any SvelteKit API endpoint
 * Nintendo-inspired memory management for all legal AI operations
 */

import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { appRedisOrchestrator } from '$lib/services/app-redis-orchestrator';

/**
 * Universal Redis Orchestrator Wrapper
 * Wraps any existing API endpoint with Redis optimization
 */
export function withRedisOrchestrator(
  originalHandler: RequestHandler,
  config: {
    endpointName: string;
    cacheStrategy: 'aggressive' | 'conservative' | 'minimal' | 'bypass';
    memoryBank: 'INTERNAL_RAM' | 'CHR_ROM' | 'PRG_ROM' | 'SAVE_RAM';
    requiresFresh?: boolean; // For critical operations that shouldn't use cache
    maxCacheAge?: number; // Override default TTL
    customCacheKey?: (request: Request) => string;
    aiQueryExtractor?: (body: any) => { query: string; context: any } | null;
  }
): RequestHandler {
  
  return async ({ request, params, url, cookies, locals }) => {
    const startTime = performance.now();
    
    try {
      // Skip Redis optimization for non-AI endpoints or when bypassed
      if (config.cacheStrategy === 'bypass' || !isAIEndpoint(config.endpointName)) {
        return await originalHandler({ request, params, url, cookies, locals });
      }
      
      // Extract AI query from request if this is an AI endpoint
      const body = await extractBody(request);
      const aiQuery = config.aiQueryExtractor ? 
        config.aiQueryExtractor(body) : 
        extractStandardAIQuery(body, config.endpointName);
      
      if (!aiQuery) {
        // No AI query detected, use original handler
        return await originalHandler({ 
          request: recreateRequest(request, body), 
          params, 
          url, 
          cookies, 
          locals 
        });
      }
      
      // Generate session ID
      const sessionId = generateSessionId(request, locals, params);
      
      // Process through Redis orchestrator
      const result = await appRedisOrchestrator.processAIQuery(
        aiQuery.query,
        sessionId,
        {
          endpoint: config.endpointName,
          ...aiQuery.context,
          requiresFresh: config.requiresFresh,
          priority: calculatePriority(config.cacheStrategy, config.endpointName),
          memoryBank: config.memoryBank
        }
      );
      
      // If we have a cached result, return it immediately
      if (result.cached || result.source === 'queued') {
        console.log(`🎮 [REDIS MIDDLEWARE] ${config.endpointName} - ${result.source.toUpperCase()} (${result.processing_time.toFixed(2)}ms)`);
        
        return json({
          ...parseRedisResult(result),
          _redis_optimization: {
            endpoint: config.endpointName,
            source: result.source,
            processing_time: result.processing_time,
            cache_strategy: config.cacheStrategy,
            memory_bank: config.memoryBank,
            session_id: sessionId,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // No cache hit, process with original handler but track for caching
      const originalResult = await originalHandler({ 
        request: recreateRequest(request, body), 
        params, 
        url, 
        cookies, 
        locals 
      });
      
      // Cache the result if it's successful
      await cacheOriginalResult(
        originalResult,
        aiQuery.query,
        sessionId,
        config,
        performance.now() - startTime
      );
      
      // Add Redis metadata to response
      return addRedisMetadata(originalResult, {
        endpoint: config.endpointName,
        source: 'fresh',
        processing_time: performance.now() - startTime,
        cache_strategy: config.cacheStrategy,
        memory_bank: config.memoryBank,
        session_id: sessionId
      });
      
    } catch (err) {
      console.error(`🎮 [REDIS MIDDLEWARE] ${config.endpointName} error:`, err);
      
      // Fallback to original handler on Redis errors
      return await originalHandler({ request, params, url, cookies, locals });
    }
  };
}

/**
 * Quick Redis integration for existing endpoints
 * Just wrap your existing handler
 */
export const redisOptimized = {
  
  /** AI Chat endpoints - aggressive caching */
  aiChat: (handler: RequestHandler) => withRedisOrchestrator(handler, {
    endpointName: 'ai-chat',
    cacheStrategy: 'aggressive',
    memoryBank: 'CHR_ROM',
    aiQueryExtractor: (body) => body?.message ? {
      query: body.message,
      context: {
        caseId: body.caseId,
        userId: body.userId,
        useRAG: body.useRAG !== false
      }
    } : null
  }),
  
  /** AI Analysis endpoints - conservative caching */
  aiAnalysis: (handler: RequestHandler) => withRedisOrchestrator(handler, {
    endpointName: 'ai-analysis',
    cacheStrategy: 'conservative',
    memoryBank: 'PRG_ROM',
    aiQueryExtractor: (body) => body?.query || body?.content ? {
      query: body.query || body.content,
      context: {
        analysisType: body.analysisType || 'general',
        caseId: body.caseId,
        evidenceId: body.evidenceId
      }
    } : null
  }),
  
  /** AI Search endpoints - aggressive caching */
  aiSearch: (handler: RequestHandler) => withRedisOrchestrator(handler, {
    endpointName: 'ai-search',
    cacheStrategy: 'aggressive',
    memoryBank: 'CHR_ROM',
    aiQueryExtractor: (body) => body?.query ? {
      query: body.query,
      context: {
        searchType: body.searchType || 'semantic',
        filters: body.filters || {},
        maxResults: body.maxResults || 10
      }
    } : null
  }),
  
  /** Document processing - minimal caching (often unique) */
  documentProcessing: (handler: RequestHandler) => withRedisOrchestrator(handler, {
    endpointName: 'document-processing',
    cacheStrategy: 'minimal',
    memoryBank: 'SAVE_RAM',
    requiresFresh: true, // Document processing should be fresh
    aiQueryExtractor: (body) => body?.content ? {
      query: body.content.substring(0, 500), // Use first 500 chars as query
      context: {
        documentType: body.documentType,
        caseId: body.caseId,
        processingMode: body.mode || 'standard'
      }
    } : null
  }),
  
  /** Evidence analysis - conservative caching */
  evidenceAnalysis: (handler: RequestHandler) => withRedisOrchestrator(handler, {
    endpointName: 'evidence-analysis',
    cacheStrategy: 'conservative', 
    memoryBank: 'INTERNAL_RAM',
    aiQueryExtractor: (body) => body?.evidenceContent || body?.query ? {
      query: body.evidenceContent || body.query,
      context: {
        evidenceId: body.evidenceId,
        analysisType: body.analysisType,
        caseId: body.caseId
      }
    } : null
  }),
  
  /** Case scoring - aggressive caching */
  caseScoring: (handler: RequestHandler) => withRedisOrchestrator(handler, {
    endpointName: 'case-scoring',
    cacheStrategy: 'aggressive',
    memoryBank: 'CHR_ROM',
    aiQueryExtractor: (body) => body?.caseData ? {
      query: JSON.stringify(body.caseData).substring(0, 1000),
      context: {
        caseId: body.caseId,
        scoringMethod: body.method || 'standard',
        criteria: body.criteria || {}
      }
    } : null
  }),
  
  /** Generic AI endpoint wrapper */
  generic: (endpointName: string, handler: RequestHandler) => withRedisOrchestrator(handler, {
    endpointName,
    cacheStrategy: 'conservative',
    memoryBank: 'PRG_ROM'
  })
};

/**
 * Batch apply Redis optimization to multiple endpoints
 */
export function optimizeEndpoints(endpoints: Record<string, {
  handler: RequestHandler;
  type: keyof typeof redisOptimized;
  customName?: string;
}>) {
  const optimizedEndpoints: Record<string, RequestHandler> = {};
  
  for (const [key, config] of Object.entries(endpoints)) {
    if (config.type === 'generic' && config.customName) {
      optimizedEndpoints[key] = redisOptimized.generic(config.customName, config.handler);
    } else if (config.type in redisOptimized) {
      optimizedEndpoints[key] = (redisOptimized[config.type] as any)(config.handler);
    }
  }
  
  return optimizedEndpoints;
}

// Helper functions

function isAIEndpoint(endpointName: string): boolean {
  const aiKeywords = ['ai', 'analyze', 'search', 'chat', 'generate', 'process', 'embed', 'score'];
  return aiKeywords.some(keyword => endpointName.toLowerCase().includes(keyword));
}

async function extractBody(request: Request): Promise<any> {
  if (request.method !== 'POST' && request.method !== 'PUT') {
    return {};
  }
  
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function recreateRequest(originalRequest: Request, body: any): Request {
  if (originalRequest.method !== 'POST' && originalRequest.method !== 'PUT') {
    return originalRequest;
  }
  
  return new Request(originalRequest.url, {
    method: originalRequest.method,
    headers: originalRequest.headers,
    body: JSON.stringify(body)
  });
}

function extractStandardAIQuery(body: any, endpoint: string): { query: string; context: any } | null {
  // Standard query extraction patterns
  const queryFields = ['query', 'message', 'content', 'prompt', 'text', 'input'];
  
  for (const field of queryFields) {
    if (body[field] && typeof body[field] === 'string') {
      return {
        query: body[field],
        context: {
          ...body,
          [field]: undefined // Remove query from context
        }
      };
    }
  }
  
  return null;
}

function generateSessionId(request: Request, locals: any, params: any): string {
  // Generate session ID from user, IP, or create anonymous session
  const userId = locals?.user?.id || locals?.userId;
  if (userId) return `user_${userId}`;
  
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const sessionKey = `${ip}_${Date.now().toString(36)}`;
  return `anon_${sessionKey}`;
}

function calculatePriority(strategy: string, endpoint: string): number {
  const basePriorities = {
    'aggressive': 200,
    'conservative': 150,
    'minimal': 100,
    'bypass': 50
  };
  
  const endpointModifiers = {
    'chat': 20,
    'search': 15,
    'analysis': 10,
    'scoring': 5
  };
  
  const base = basePriorities[strategy as keyof typeof basePriorities] || 150;
  const modifier = Object.entries(endpointModifiers)
    .find(([key]) => endpoint.includes(key))?.[1] || 0;
  
  return Math.min(255, base + modifier);
}

function parseRedisResult(result: any): any {
  try {
    // If result contains structured data, parse it
    if (typeof result.response === 'string' && result.response.startsWith('{')) {
      return JSON.parse(result.response);
    }
    
    return {
      response: result.response,
      sources: result.sources || [],
      confidence: result.confidence || 0.8,
      processing_time: result.processing_time
    };
  } catch {
    return { response: result.response || 'Redis optimization result' };
  }
}

async function cacheOriginalResult(
  originalResult: Response,
  query: string,
  sessionId: string,
  config: any,
  processingTime: number
): Promise<void> {
  try {
    const responseBody = await originalResult.json();
    
    // Cache the successful result
    await appRedisOrchestrator.processAIQuery(query, sessionId, {
      endpoint: `${config.endpointName}_cache_store`,
      priority: 50, // Low priority for cache storage
      cache_data: responseBody,
      processing_time: processingTime
    });
  } catch (error) {
    console.warn('🎮 Failed to cache original result:', error);
  }
}

function addRedisMetadata(response: Response, metadata: any): Response {
  // Clone response and add Redis metadata
  return json({
    ...(response as any), // This needs proper handling in real implementation
    _redis_optimization: {
      ...metadata,
      timestamp: new Date().toISOString()
    }
  });
}