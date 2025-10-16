// Multi-Modal Search API: Fuzzy + Vector + Redis Cache
// Combines Fuse.js, Qdrant vector search, Redis top-k, and XState orchestration

import * as FuseModule from 'fuse.js'; // Robust import for Fuse.js class
const Fuse = FuseModule.default || FuseModule; // Ensure Fuse is the class constructor
import { createActor, createMachine, fromPromise, assign, type ActorRefFrom } from 'xstate';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import type { RequestEvent } from '@sveltejs/kit';
import { enhancedVectorSearchService } from '$lib/server/vector/enhanced-vector-search-service';
import { redis as actualRedisClient } from '$lib/server/db/redis-client';
import { z } from 'zod'; // Import Zod

// Define a no-op Redis client interface for fallback
interface NoOpRedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<string | null>;
  zincrby(key: string, increment: number, member: string): Promise<string | null>;
  zrevrange(key: string, start: number, stop: number, withScores: 'WITHSCORES'): Promise<string[]>;
  llen(key: string): Promise<number>;
  lpush(key: string, ...values: string[]): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<'OK'>;
  // Add other methods if they are used elsewhere and need a no-op implementation
}

// 2. Define a no-op Redis client instance
const noOpRedisClient: NoOpRedisClient = {
  get: async () => null,
  setex: async () => null,
  zincrby: async () => null,
  zrevrange: async () => [],
  llen: async () => 0,
  lpush: async () => 0,
  ltrim: async () => 'OK',
};

// 3. Use the actual client if available, otherwise use the no-op client
const redis = actualRedisClient || noOpRedisClient;

// --- New: Define constants for Ollama model, cache TTL, and Redis keys ---
const EMBEDDING_MODEL = 'embeddinggemma:latest'; // As per copilot-instructions.md
const CACHE_TTL = 3600; // Cache results for 1 hour (in seconds)
const TOP_K_KEY = 'search:top-queries'; // Redis sorted set key for top queries
const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'; // Ollama base URL
// --- End new constants ---

// --- New: Zod Schema for POST request validation ---
const SearchRequestSchema = z
  .object({
    query: z.string().min(1, 'Query cannot be empty').optional(),
    options: z
      .object({
        limit: z.number().int().min(1).max(100).default(10).optional(),
        threshold: z.number().min(0).max(1).default(0.6).optional(),
        entityTypes: z.array(z.string()).default(['evidence']).optional(),
        hybridSearch: z.boolean().default(true).optional(),
        embedding: z.array(z.number()).min(1, 'Embedding array cannot be empty').optional(),
      })
      .optional(),
  })
  .refine(data => data.query || (data.options?.embedding && data.options.embedding.length > 0), {
    message: 'Either a query string or a valid embedding array in options is required.',
    path: ['query', 'options.embedding'],
  });

// Type definitions
type SearchError = {
  message: string;
  code: string;
  details?: string;
  timestamp?: string;
  stack?: string;
  stage?: string; // Added stage for better error tracking
};

type VectorResult = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

type FuzzySearchItem = {
  id: string;
  title: string;
  content: string;
  entityType: string;
};

// --- Fuse.js Derived Types ---
// Derive option and result types directly from Fuse class instead of relying on missing named exports
type FuseOptionsType<T> = ConstructorParameters<typeof Fuse<T>>[1];
type FuseResultType<T> = ReturnType<Fuse<T>['search']>[number];

// Fuse.js fuzzy search configuration
const fuseOptions: FuseOptionsType<FuzzySearchItem> = {
  keys: ['title', 'content'],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 2,
};

type SearchOptions = {
  limit?: number;
  threshold?: number;
  entityTypes?: string[];
  hybridSearch?: boolean;
  embedding?: number[]; // Allow pre-provided embedding
};

// --- XState Machine Type Definitions ---
interface SearchMachineContext {
  query: string;
  options: SearchOptions;
  embedding: number[];
  vectorResults: VectorResult[];
  finalResults: VectorResult[];
  error: SearchError | null;
  cachedAt: string | null;
}

type SearchMachineEvents =
  | { type: 'START_SEARCH' }
  | { type: 'done.invoke.checkingCache'; output: { results: VectorResult[]; cachedAt: string } | null }
  | { type: 'error.platform.checkingCache'; error: unknown }
  | { type: 'done.invoke.generatingEmbedding'; output: number[] }
  | { type: 'error.platform.generatingEmbedding'; error: unknown }
  | { type: 'done.invoke.searchingVectors'; output: { results: VectorResult[] } | VectorResult[] }
  | { type: 'error.platform.searchingVectors'; error: unknown }
  | { type: 'done.invoke.performingHybridSearch'; output: VectorResult[] }
  | { type: 'error.platform.performingHybridSearch'; error: unknown }
  | { type: 'done.invoke.cachingResults'; output?: void }
  | { type: 'error.platform.cachingResults'; error: unknown };

interface SearchMachineInput {
  query: string;
  options: SearchOptions;
}

// XState v5 Search Machine
const searchMachine = createMachine<SearchMachineContext, SearchMachineEvents, SearchMachineInput>({
  id: 'searchOrchestrator',
  initial: 'idle',
  context: ({ input }: { input: SearchMachineInput }) => ({
    // Initialize context from input
    query: input.query,
    options: input.options,
    embedding: [],
    vectorResults: [],
    finalResults: [],
    error: null,
    cachedAt: null,
  }),
  states: {
    idle: {
      on: { START_SEARCH: 'checkingCache' },
    },
    checkingCache: {
      invoke: {
        src: fromPromise(async ({ input }: { input: { query: string } }) => {
          const cached = await redis.get(`search:cache:${input.query}`);
          return cached ? JSON.parse(cached) : null;
        }),
        input: ({ context }: { context: SearchMachineContext }) => ({ query: context.query }),
        onDone: [
          {
            guard: ({ event }: { event: { output: { results: VectorResult[]; cachedAt: string } | null } }) =>
              event.output !== null,
            target: 'success',
            actions: assign({
              finalResults: ({ event }: { event: { output: { results: VectorResult[]; cachedAt: string } } }) =>
                (event.output as { results: VectorResult[]; cachedAt: string }).results,
              cachedAt: ({ event }: { event: { output: { results: VectorResult[]; cachedAt: string } } }) =>
                (event.output as { results: VectorResult[]; cachedAt: string }).cachedAt,
            }),
          },
          { target: 'determineEmbeddingSource' },
        ],
        onError: {
          target: 'determineEmbeddingSource',
          actions: assign({
            error: ({ event }: { event: { error: unknown } }) => ({
              message: `Cache check failed: ${event.error instanceof Error ? event.error.message : String(event.error)}`,
              code: 'CACHE_ERROR',
              stage: 'checkingCache',
              details: event.error instanceof Error ? event.error.stack : String(event.error),
            }),
          }),
        },
      },
    },
    determineEmbeddingSource: {
      always: [
        {
          guard: ({ context }: { context: SearchMachineContext }) => (context.options.embedding?.length ?? 0) > 0,
          target: 'searchingVectors',
          actions: assign({
            embedding: ({ context }: { context: SearchMachineContext }) => context.options.embedding!,
          }),
        },
        { target: 'generatingEmbedding' },
      ],
    },
    generatingEmbedding: {
      invoke: {
        src: fromPromise(async ({ input }: { input: { query: string } }) => {
          const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: input.query }),
          });
          const data = await response.json();
          return data.embedding || data.embeddings?.[0] || data.data?.[0]?.embedding;
        }),
        input: ({ context }: { context: SearchMachineContext }) => ({ query: context.query }),
        onDone: {
          target: 'searchingVectors',
          actions: assign({ embedding: ({ event }: { event: { output: number[] } }) => event.output as number[] }),
        },
        onError: {
          target: 'failure',
          actions: assign({
            error: ({ event }: { event: { error: unknown } }) => {
              const errorMessage = event.error instanceof Error ? event.error.message : String(event.error);
              return { message: errorMessage, code: 'EMBEDDING_FAILED', stage: 'generatingEmbedding' };
            },
          }),
        },
      },
    },
    searchingVectors: {
      invoke: {
        src: fromPromise(
          async ({ input }: { input: { query: string; embedding: number[]; options: SearchOptions } }) => {
            if (!input.embedding || input.embedding.length === 0) {
              throw new Error('Embedding is missing for vector search.');
            }
            return await enhancedVectorSearchService.unifiedVectorSearch(input.query, {
              embedding: input.embedding,
              limit: input.options.limit || 10,
              threshold: input.options.threshold ?? 0.6,
              entityTypes: input.options.entityTypes || ['evidence'],
              includeMetadata: true,
              ...input.options,
            });
          }
        ),
        input: ({ context }: { context: SearchMachineContext }) => ({
          query: context.query,
          embedding: context.embedding,
          options: context.options,
        }),
        onDone: {
          actions: assign({
            vectorResults: ({ event }: { event: { output: { results: VectorResult[] } | VectorResult[] } }) => {
              const output = event.output as { results: VectorResult[] } | VectorResult[];
              return 'results' in output && Array.isArray(output.results) ? output.results : (output as VectorResult[]);
            },
          }),
          target: 'performingHybridSearch',
        },
        onError: {
          target: 'failure',
          actions: assign({
            error: ({ event }: { event: { error: unknown } }) => {
              const errorMessage = event.error instanceof Error ? event.error.message : String(event.error);
              return { message: errorMessage, code: 'VECTOR_SEARCH_FAILED', stage: 'searchingVectors' };
            },
          }),
        },
      },
    },
    performingHybridSearch: {
      invoke: {
        src: fromPromise(
          async ({ input }: { input: { query: string; options: SearchOptions; vectorResults: VectorResult[] } }) => {
            let combinedResults = input.vectorResults;

            // Only perform fuzzy search if query exists and hybridSearch is not explicitly false
            if (input.query && input.options.hybridSearch !== false) {
              const fuseDataset = input.vectorResults.map((r: VectorResult) => ({
                id: r.id,
                title: String(r.metadata?.title || r.payload?.title || ''), // Explicitly cast to string
                content: String(r.metadata?.content || r.payload?.content || ''), // Explicitly cast to string
                entityType: String(r.metadata?.entityType || 'evidence'), // Explicitly cast to string
              }));

              const fuse = new Fuse(fuseDataset, fuseOptions);

              const fuzzyMatches: FuseResultType<FuzzySearchItem>[] = fuse.search(input.query);
              const fuzzyIds = new Set(fuzzyMatches.map(m => m.item.id));

              combinedResults = input.vectorResults
                .map((r: VectorResult) => ({
                  ...r,
                  score: fuzzyIds.has(r.id) ? r.score * 1.2 : r.score, // Boost score for fuzzy matches
                }))
                .sort((a: VectorResult, b: VectorResult) => b.score - a.score); // Sort by boosted score
            }
            return combinedResults;
          }
        ),
        input: ({ context }: { context: SearchMachineContext }) => ({
          query: context.query,
          options: context.options,
          vectorResults: context.vectorResults,
        }),
        onDone: {
          target: 'cachingResults',
          actions: assign({
            finalResults: ({ event }: { event: { output: VectorResult[] } }) => event.output as VectorResult[],
          }),
        },
        onError: {
          target: 'failure',
          actions: assign({
            error: ({ event }: { event: { error: unknown } }) => {
              const errorMessage = event.error instanceof Error ? event.error.message : String(event.error);
              return { message: errorMessage, code: 'HYBRID_SEARCH_FAILED', stage: 'performingHybridSearch' };
            },
          }),
        },
      },
    },
    cachingResults: {
      invoke: {
        src: fromPromise(async ({ input }: { input: { query: string; finalResults: VectorResult[] } }) => {
          if (input.query && input.finalResults.length > 0) {
            await redis.setex(
              `search:cache:${input.query}`,
              CACHE_TTL,
              JSON.stringify({ results: input.finalResults, cachedAt: new Date().toISOString() })
            );
            await redis.zincrby(TOP_K_KEY, 1, input.query);
          }
        }),
        input: ({ context }: { context: SearchMachineContext }) => ({
          query: context.query,
          finalResults: context.finalResults,
        }),
        onDone: 'success',
        onError: 'success',
      },
    },
    success: { type: 'final' },
    failure: { type: 'final' },
  },
});

// Type helper for XState snapshot
type SearchSnapshot = ReturnType<ActorRefFrom<typeof searchMachine>['getSnapshot']>;

// POST endpoint for advanced search
export const POST: RequestHandler = async ({ request }: RequestEvent) => {
  const startTime = Date.now();
  const requestId = `search-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    const body = await request.json();

    // Type Safety: Use Zod for robust input validation here.
    let parsedBody;
    try {
      parsedBody = SearchRequestSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error(`❌ [${requestId}] Input validation failed:`, validationError.errors);
        return json(
          {
            error: 'Invalid request payload',
            code: 'VALIDATION_ERROR',
            details: validationError.errors,
          },
          { status: 400 }
        );
      }
      throw validationError; // Re-throw if it's not a ZodError
    }

    console.log(`🔍 [${requestId}] Search: "${parsedBody.query?.substring(0, 100) || '[embedding]'}"`);

    const actor: ActorRefFrom<typeof searchMachine> = createActor(searchMachine, {
      input: {
        query: parsedBody.query || '',
        options: {
          limit: parsedBody.options?.limit || 10,
          threshold: parsedBody.options?.threshold ?? 0.6,
          entityTypes: parsedBody.options?.entityTypes || ['evidence'],
          hybridSearch: parsedBody.options?.hybridSearch ?? true,
          embedding: parsedBody.options?.embedding,
          ...parsedBody.options, // Spread to include any other options passed
        },
      },
    });
    actor.start(); // This method now exists on ActorRefFrom<typeof searchMachine>

    actor.send({ type: 'START_SEARCH' });

    // Add a timeout to the XState subscription to prevent hanging requests
    const timeoutPromise = new Promise<void>(
      (_, reject) => setTimeout(() => reject(new Error('Search operation timed out')), 30000) // 30 seconds timeout
    );

    await Promise.race([
      new Promise<void>(resolve => {
        actor.subscribe((snapshot: SearchSnapshot) => {
          if (snapshot.value === 'success' || snapshot.value === 'failure') {
            resolve();
          }
        });
      }),
      timeoutPromise,
    ]);

    const snapshot = actor.getSnapshot() as SearchSnapshot;

    if (snapshot.value === 'failure') {
      const error = snapshot.context.error;
      console.error(`❌ [${requestId}] XState search failure in stage ${error?.stage || 'unknown'}:`, error);
      return json(
        {
          error: error?.message || 'Search failed',
          code: error?.code || 'XSTATE_FAILURE',
          stage: error?.stage,
          details: error?.details,
        },
        { status: 502 }
      );
    }

    const processingTime = Date.now() - startTime;
    const isCached = !!snapshot.context.cachedAt; // Check if cachedAt was set by the machine

    console.log(
      `✅ Search: ${snapshot.context.finalResults.length} results in ${processingTime}ms (cached: ${isCached})`
    );

    return json({
      success: true,
      query: snapshot.context.query || '[embedding search]',
      results: snapshot.context.finalResults,
      metadata: {
        count: snapshot.context.finalResults.length,
        processingTime,
        embeddingDimensions: snapshot.context.embedding.length,
        threshold: snapshot.context.options.threshold ?? 0.6,
        searchTypes: snapshot.context.options.entityTypes || ['evidence'],
        cached: isCached,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Search error:`, error);

    // Structured error response
    const errorResponse: SearchError = {
      message: error instanceof Error ? error.message : 'Internal server error during search',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.stack : String(error),
    };

    // Log to Redis for centralized error tracking
    try {
      await redis.lpush(
        // Removed '?'
        'errors:search:log',
        JSON.stringify({
          ...errorResponse,
          requestId,
          processingTime: Date.now() - startTime,
        })
      );
      await redis.ltrim('errors:search:log', 0, 999); // Removed '?'
    } catch (logError) {
      console.error('Failed to log error to Redis:', logError);
    }

    return json(
      {
        error: errorResponse.message,
        code: errorResponse.code,
        requestId,
        timestamp: errorResponse.timestamp,
        details: errorResponse.details,
      },
      { status: 500 }
    );
  }
};

// GET endpoint for search system status + top-k queries
export const GET: RequestHandler = async ({ request, url }: RequestEvent) => {
  // Added ': RequestEvent'
  const requestId = `status-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    console.log(`📊 [${requestId}] Search system status check`);

    let ollamaStatus = 'unknown';
    let ollamaModels: string[] = [];

    try {
      const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        ollamaModels = Array.isArray(data.models)
          ? (data.models
              .map((m: { name?: string } | string) => (typeof m === 'string' ? m : m?.name))
              .filter(Boolean) as string[])
          : [];
        ollamaStatus = ollamaModels.includes(EMBEDDING_MODEL) ? 'ready' : 'missing_model';
      } else {
        ollamaStatus = 'unavailable';
      }
    } catch {
      ollamaStatus = 'unavailable';
    }

    const vectorHealth = await enhancedVectorSearchService.healthCheck();
    const vectorStats = await enhancedVectorSearchService.getSearchStats();

    // Get top-k most searched queries from Redis
    const topQueries = await redis.zrevrange(TOP_K_KEY, 0, 9, 'WITHSCORES'); // Removed '?'
    const topQueriesFormatted: Array<{ query: string; count: number }> = [];
    if (topQueries && topQueries.length > 0) {
      for (let i = 0; i < topQueries.length; i += 2) {
        topQueriesFormatted.push({
          query: topQueries[i],
          count: parseInt(topQueries[i + 1], 10),
        });
      }
    }

    // Get recent error count from Redis
    const recentErrorCount = (await redis.llen('errors:search:log')) || 0; // Removed '?'

    return json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        ollama: {
          status: ollamaStatus,
          model: EMBEDDING_MODEL,
          availableModels: ollamaModels,
        },
        vectorSearch: {
          status: vectorHealth.status,
          details: vectorHealth.details ?? null,
          stats: vectorStats,
        },
        redis: {
          status: actualRedisClient ? 'connected' : 'unavailable', // 5. Adjust status check to use actualRedisClient
          topQueries: topQueriesFormatted,
          recentErrors: recentErrorCount,
        },
      },
      capabilities: {
        textToVector: ollamaStatus === 'ready',
        vectorSimilarity: vectorHealth.status !== 'unhealthy',
        fuzzySearch: true,
        hybridSearch: true,
        caching: !!actualRedisClient, // Changed to actualRedisClient
        errorLogging: !!actualRedisClient, // Changed to actualRedisClient
        maxEmbeddingDimensions: 768,
        supportedEntityTypes: ['evidence', 'case'],
      },
      requestId,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Status check error:`, error);

    const errorResponse: SearchError = {
      message: 'Failed to get search system status',
      code: 'STATUS_ERROR',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error',
    };

    // Log status check errors to Redis
    try {
      await redis.lpush(
        'errors:search:log',
        JSON.stringify({
          ...errorResponse,
          requestId,
          endpoint: 'GET /api/search',
        })
      );
      await redis.ltrim('errors:search:log', 0, 999);
    } catch {
      // Silently fail
    }

    return json(
      {
        error: errorResponse.message,
        code: errorResponse.code,
        requestId,
        timestamp: errorResponse.timestamp,
        details: errorResponse.details,
      },
      { status: 500 }
    );
  }
};
