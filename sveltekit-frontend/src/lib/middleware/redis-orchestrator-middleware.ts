/**
 * Universal Redis Orchestrator Middleware
 * Automatically integrates Redis optimization into any SvelteKit API endpoint
 * Nintendo-inspired memory management for all legal AI operations
 */

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { appRedisOrchestrator } from '$lib/services/app-redis-orchestrator';

type CacheStrategy = 'aggressive' | 'conservative' | 'minimal' | 'bypass';
type MemoryBank = 'INTERNAL_RAM' | 'CHR_ROM' | 'PRG_ROM' | 'SAVE_RAM';
type AIQuery = { query: string; context: Record<string, unknown> };
type RedisResult = {
  cached?: boolean;
  source?: string;
  processing_time?: number;
  response?: unknown;
  sources?: unknown[];
  confidence?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Universal Redis Orchestrator Wrapper
 * Wraps any existing API endpoint with Redis optimization
 */
export function withRedisOrchestrator(
  originalHandler: RequestHandler,
  config: {
    endpointName: string;
    cacheStrategy: CacheStrategy;
    memoryBank: MemoryBank;
    requiresFresh?: boolean; // For critical operations that shouldn't use cache
    maxCacheAge?: number; // Override default TTL
    customCacheKey?: (request: Request) => string;
    aiQueryExtractor?: (body: unknown) => AIQuery | null;
  }
): RequestHandler {
  return async event => {
    const { request, locals } = event;
    const startTime = performance.now();

    try {
      // Skip Redis optimization for non-AI endpoints or when bypassed;
      if (config.cacheStrategy === 'bypass' || !isAIEndpoint(config.endpointName)) {
        return await originalHandler(event);
      }

      // Extract AI query from request if this is an AI endpoint
      const body = await extractBody(request);
      const aiQuery: AIQuery | null = config.aiQueryExtractor
        ? config.aiQueryExtractor(body)
        : extractStandardAIQuery(body, config.endpointName);

      if (!aiQuery) {
        // No AI query detected, use original handler;
        return await originalHandler({
          ...event,
          request: recreateRequest(request, body),
        });
      }

      // Generate session ID
      const sessionId = generateSessionId(request, locals);

      // Process through Redis orchestrator
      const result = await appRedisOrchestrator.processAIQuery(aiQuery.query, sessionId, {
        endpoint: config.endpointName,
        ...aiQuery.context,
        requiresFresh: config.requiresFresh,
        priority: calculatePriority(config.cacheStrategy, config.endpointName),
        memoryBank: config.memoryBank,
      });

      // If we have a cached result, return it immediately;
      const r = result as RedisResult;
      if (r.cached || r.source === 'queued') {
        const source = (r.source || 'unknown').toUpperCase();
        const ms = typeof r.processing_time === 'number' ? r.processing_time.toFixed(2) : 'N/A';
        console.log(`🎮 [REDIS MIDDLEWARE] ${config.endpointName} - ${source} (${ms}ms)`);

        return json({
          ...parseRedisResult(result),
          _redis_optimization: {
            endpoint: config.endpointName,
            source: r.source,
            processing_time: r.processing_time,
            cache_strategy: config.cacheStrategy,
            memory_bank: config.memoryBank,
            session_id: sessionId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // No cache hit, process with original handler but track for caching;
      const originalResult = await originalHandler({
        ...event,
        request: recreateRequest(request, body),
      });

      // Cache the result if it's successful
      await cacheOriginalResult(originalResult, aiQuery.query, sessionId, config, performance.now() - startTime);

      // Add Redis metadata to response;
      return addRedisMetadata(originalResult, {
        endpoint: config.endpointName,
        source: 'fresh',
        processing_time: performance.now() - startTime,
        cache_strategy: config.cacheStrategy,
        memory_bank: config.memoryBank,
        session_id: sessionId,
      });
    } catch (err) {
      console.error(`🎮 [REDIS MIDDLEWARE] ${config.endpointName} error:`, err);

      // Fallback to original handler on Redis errors
      return await originalHandler(event);
    }
  };
}

/**
 * Quick Redis integration for existing endpoints
 * Just wrap your existing handler
 */
export const redisOptimized = {
  /** AI Chat endpoints - aggressive caching */
  aiChat: (handler: RequestHandler) =>
    withRedisOrchestrator(handler, {
      endpointName: 'ai-chat',
      cacheStrategy: 'aggressive',
      memoryBank: 'CHR_ROM',
      aiQueryExtractor: (body: unknown) => {
        if (!isRecord(body)) return null;
        const msg = body['message'];
        if (typeof msg !== 'string') return null;
        const caseId = typeof body['caseId'] === 'string' ? (body['caseId'] as string) : undefined;
        const userId = typeof body['userId'] === 'string' ? (body['userId'] as string) : undefined;
        const useRAG = typeof body['useRAG'] === 'boolean' ? (body['useRAG'] as boolean) : true;
        return {
          query: msg,
          context: { caseId, userId, useRAG },
        };
      },
    }),

  /** AI Analysis endpoints - conservative caching */
  aiAnalysis: (handler: RequestHandler) =>
    withRedisOrchestrator(handler, {
      endpointName: 'ai-analysis',
      cacheStrategy: 'conservative',
      memoryBank: 'PRG_ROM',
      aiQueryExtractor: (body: unknown) => {
        if (!isRecord(body)) return null;
        const q = body['query'];
        const c = body['content'];
        const query = typeof q === 'string' ? q : typeof c === 'string' ? c : undefined;
        if (!query) return null;
        const analysisType = typeof body['analysisType'] === 'string' ? (body['analysisType'] as string) : 'general';
        const caseId = typeof body['caseId'] === 'string' ? (body['caseId'] as string) : undefined;
        const evidenceId = typeof body['evidenceId'] === 'string' ? (body['evidenceId'] as string) : undefined;
        return { query, context: { analysisType, caseId, evidenceId } };
      },
    }),

  /** AI Search endpoints - aggressive caching */
  aiSearch: (handler: RequestHandler) =>
    withRedisOrchestrator(handler, {
      endpointName: 'ai-search',
      cacheStrategy: 'aggressive',
      memoryBank: 'CHR_ROM',
      aiQueryExtractor: (body: unknown) => {
        if (!isRecord(body)) return null;
        const q = body['query'];
        if (typeof q !== 'string') return null;
        const searchType = typeof body['searchType'] === 'string' ? (body['searchType'] as string) : 'semantic';
        const filters = isRecord(body['filters']) ? (body['filters'] as Record<string, unknown>) : {};
        const maxResults = typeof body['maxResults'] === 'number' ? (body['maxResults'] as number) : 10;
        return { query: q, context: { searchType, filters, maxResults } };
      },
    }),

  /** Document processing - minimal caching (often unique) */
  documentProcessing: (handler: RequestHandler) =>
    withRedisOrchestrator(handler, {
      endpointName: 'document-processing',
      cacheStrategy: 'minimal',
      memoryBank: 'SAVE_RAM',
      requiresFresh: true, // Document processing should be fresh;
      aiQueryExtractor: (body: unknown) => {
        if (!isRecord(body)) return null;
        const content = body['content'];
        if (typeof content !== 'string') return null;
        const documentType = typeof body['documentType'] === 'string' ? (body['documentType'] as string) : undefined;
        const caseId = typeof body['caseId'] === 'string' ? (body['caseId'] as string) : undefined;
        const mode = typeof body['mode'] === 'string' ? (body['mode'] as string) : 'standard';
        return { query: content.substring(0, 500), context: { documentType, caseId, processingMode: mode } };
      },
    }),

  /** Evidence analysis - conservative caching */
  evidenceAnalysis: (handler: RequestHandler) =>
    withRedisOrchestrator(handler, {
      endpointName: 'evidence-analysis',
      cacheStrategy: 'conservative',
      memoryBank: 'INTERNAL_RAM',
      aiQueryExtractor: (body: unknown) => {
        if (!isRecord(body)) return null;
        const ec = body['evidenceContent'];
        const q = body['query'];
        const query = typeof ec === 'string' ? ec : typeof q === 'string' ? q : undefined;
        if (!query) return null;
        const evidenceId = typeof body['evidenceId'] === 'string' ? (body['evidenceId'] as string) : undefined;
        const analysisType = typeof body['analysisType'] === 'string' ? (body['analysisType'] as string) : undefined;
        const caseId = typeof body['caseId'] === 'string' ? (body['caseId'] as string) : undefined;
        return { query, context: { evidenceId, analysisType, caseId } };
      },
    }),

  /** Case scoring - aggressive caching */
  caseScoring: (handler: RequestHandler) =>
    withRedisOrchestrator(handler, {
      endpointName: 'case-scoring',
      cacheStrategy: 'aggressive',
      memoryBank: 'CHR_ROM',
      aiQueryExtractor: (body: unknown) => {
        if (!isRecord(body)) return null;
        const caseData = body['caseData'];
        if (typeof caseData !== 'object' || caseData === null) return null;
        const caseId = typeof body['caseId'] === 'string' ? (body['caseId'] as string) : undefined;
        const method = typeof body['method'] === 'string' ? (body['method'] as string) : 'standard';
        const criteria = isRecord(body['criteria']) ? (body['criteria'] as Record<string, unknown>) : {};
        return {
          query: JSON.stringify(caseData).substring(0, 1000),
          context: { caseId, scoringMethod: method, criteria },
        };
      },
    }),

  /** Generic AI endpoint wrapper */
  generic: (endpointName: string, handler: RequestHandler) =>
    withRedisOrchestrator(handler, {
      endpointName,
      cacheStrategy: 'conservative',
      memoryBank: 'PRG_ROM',
    }),
};

/**
 * Batch apply Redis optimization to multiple endpoints
 */
export function optimizeEndpoints(
  endpoints: Record<
    string,
    {
      handler: RequestHandler;
      type: keyof typeof redisOptimized;
      customName?: string;
    }
  >
) {
  const optimizedEndpoints: Record<string, RequestHandler> = {};

  for (const [key, config] of Object.entries(endpoints)) {
    if (config.type === 'generic' && config.customName) {
      optimizedEndpoints[key] = redisOptimized.generic(config.customName, config.handler);
    } else if (config.type in redisOptimized) {
      optimizedEndpoints[key] = (redisOptimized[config.type] as unknown as (h: RequestHandler) => RequestHandler)(
        config.handler
      );
    }
  }

  return optimizedEndpoints;
}

// Helper functions

function isAIEndpoint(endpointName: string): boolean {
  const aiKeywords = ['ai', 'analyze', 'search', 'chat', 'generate', 'process', 'embed', 'score'];
  return aiKeywords.some(keyword => endpointName.toLowerCase().includes(keyword));
}

async function extractBody(request: Request): Promise<unknown> {
  if (request.method !== 'POST' && request.method !== 'PUT') {
    return {};
  }

  try {
    return await request.json();
  } catch {
    return {};
  }
}

function recreateRequest(originalRequest: Request, body: unknown): Request {
  if (originalRequest.method !== 'POST' && originalRequest.method !== 'PUT') {
    return originalRequest;
  }

  return new Request(originalRequest.url, {
    method: originalRequest.method,
    headers: originalRequest.headers,
    body: JSON.stringify(body),
  });
}

function extractStandardAIQuery(body: unknown, _endpoint: string): AIQuery | null {
  // Standard query extraction patterns
  const queryFields = ['query', 'message', 'content', 'prompt', 'text', 'input'];

  const obj = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : undefined;
  if (!obj) return null;

  for (const field of queryFields) {
    const value = obj[field];
    if (typeof value === 'string') {
      return {
        query: value,
        context: {
          ...obj,
          [field]: undefined,
        },
      };
    }
  }

  return null;
}

function generateSessionId(request: Request, locals: unknown): string {
  // Generate session ID from user, IP, or create anonymous session
  const l = isRecord(locals) ? (locals as Record<string, unknown>) : {};
  const user = isRecord(l.user) ? (l.user as Record<string, unknown>) : undefined;
  const userId =
    (typeof user?.id === 'string' ? (user.id as string) : undefined) ||
    (typeof l.userId === 'string' ? (l.userId as string) : undefined);
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
    'bypass': 50,
  };

  const endpointModifiers = {
    'chat': 20,
    'search': 15,
    'analysis': 10,
    'scoring': 5,
  };

  const base = basePriorities[strategy as keyof typeof basePriorities] || 150;
  const modifier = Object.entries(endpointModifiers).find(([key]) => endpoint.includes(key))?.[1] || 0;

  return Math.min(255, base + modifier);
}

function parseRedisResult(result: unknown): Record<string, unknown> {
  try {
    // If result contains structured data, parse it;
    const rr = result as RedisResult & { response?: string };
    if (typeof rr.response === 'string' && rr.response.startsWith('{')) {
      return JSON.parse(rr.response);
    }

    return {
      response: (rr as RedisResult).response,
      sources: (rr as RedisResult).sources || [],
      confidence: (rr as RedisResult).confidence ?? 0.8,
      processing_time: (rr as RedisResult).processing_time,
    };
  } catch {
    return {
      response: (result as Record<string, unknown>)?.['response'] ?? 'Redis optimization result',
    };
  }
}

async function cacheOriginalResult(
  originalResult: Response,
  query: string,
  sessionId: string,
  config: { endpointName: string },
  _processingTime: number
): Promise<void> {
  try {
    // Avoid consuming the original response body here (may be streaming)
    // Trigger a low-priority background cache/store side-effect instead
    await appRedisOrchestrator.processAIQuery(query, sessionId, {
      endpoint: `${config.endpointName}_cache_store`,
      priority: 50, // Low priority for cache storage
      useRAG: false,
      requiresFresh: false,
    });
  } catch (error) {
    console.warn('🎮 Failed to cache original result:', error);
  }
}

function addRedisMetadata(response: Response, metadata: Record<string, unknown>): Response {
  // Preserve original body; attach metadata in a response header
  const headers = new Headers(response.headers);
  try {
    headers.set('x-redis-optimization', JSON.stringify({ ...metadata, timestamp: new Date().toISOString() }));
  } catch {
    // If header exceeds limits or JSON fails, set a minimal marker
    headers.set('x-redis-optimization', '1');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}