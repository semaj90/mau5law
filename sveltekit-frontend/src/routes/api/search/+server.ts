// Multi-Modal Search API: Fuzzy + Vector + Redis Cache
// Combines Fuse.js, Qdrant vector search, Redis top-k, and XState orchestration

import Fuse, { type IFuseOptions, type FuseResult } from 'fuse.js'; // Keep Fuse as default import
import { createActor, createMachine, fromPromise, assign, type ActorRefFrom } from 'xstate';
import { json, type RequestHandler } from '@sveltejs/kit';
import { enhancedVectorSearchService } from '$lib/server/vector/enhanced-vector-search-service';
import { redis } from '$lib/server/db/redis-client';

// Define IFuseOptions and FuseResult types using typeof Fuse
type FuseOptionsType<T> = IFuseOptions<T>;
type FuseResultType<T> = FuseResult<T>;

// --- New: Define constants for Ollama model, cache TTL, and Redis keys ---
const EMBEDDING_MODEL = 'embeddinggemma:latest'; // As per copilot-instructions.md
const CACHE_TTL = 3600; // Cache results for 1 hour (in seconds)
const TOP_K_KEY = 'search:top-queries'; // Redis sorted set key for top queries
const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'; // Ollama base URL
// --- End new constants ---

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

type SearchOptions = {
  limit?: number;
  threshold?: number;
  entityTypes?: string[];
  hybridSearch?: boolean;
  embedding?: number[]; // Allow pre-provided embedding
};

// XState v5 Search Machine
const searchMachine = createMachine({
  id: 'searchOrchestrator',
  initial: 'idle',
  context: {
    query: '',
    options: {} as SearchOptions,
    embedding: [] as number[],
    vectorResults: [] as VectorResult[], // Store raw vector results
    finalResults: [] as VectorResult[], // Store combined/hybrid results
    error: null as SearchError | null,
    cachedAt: null as string | null, // New: to track if results came from cache
  },
  states: {
    idle: {
      on: { START_SEARCH: 'checkingCache' },
    },
    checkingCache: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          // Changed 'context' to 'input'
          const cached = await redis?.get(`search:cache:${input.query}`);
          return cached ? JSON.parse(cached) : null;
        }),
        input: ({ context }) => ({ query: context.query }), // Pass context.query as input
        onDone: [
          {
            guard: ({ event }) => event.output !== null,
            target: 'success',
            actions: assign({
              finalResults: ({ event }) => event.output.results,
              cachedAt: ({ event }) => event.output.cachedAt, // Assign cachedAt from stored object
            }),
          },
          { target: 'determineEmbeddingSource' },
        ],
        onError: {
          target: 'determineEmbeddingSource',
          actions: assign({
            error: ({ event }) => ({
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
          guard: ({ context }) => (context.options.embedding?.length ?? 0) > 0, // Refined guard for boolean return
          target: 'searchingVectors',
          actions: assign({ embedding: ({ context }) => context.options.embedding! }),
        },
        { target: 'generatingEmbedding' },
      ],
    },
    generatingEmbedding: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          // Changed 'context' to 'input'
          const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: input.query }), // Changed 'context.query' to 'input.query'
          });
          const data = await response.json();
          return data.embedding || data.embeddings?.[0] || data.data?.[0]?.embedding;
        }),
        input: ({ context }) => ({ query: context.query }), // Pass context.query as input
        onDone: {
          target: 'searchingVectors',
          actions: assign({ embedding: ({ event }) => event.output }),
        },
        onError: {
          target: 'failure',
          actions: assign({
            error: ({ event }) => {
              const errorMessage = event.error instanceof Error ? event.error.message : String(event.error);
              return { message: errorMessage, code: 'EMBEDDING_FAILED', stage: 'generatingEmbedding' };
            },
          }),
        },
      },
    },
    searchingVectors: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          // Changed 'context' to 'input'
          if (!input.embedding || input.embedding.length === 0) {
            throw new Error('Embedding is missing for vector search.');
          }
          return await enhancedVectorSearchService.unifiedVectorSearch(input.query, {
            // Changed 'context.query' to 'input.query'
            embedding: input.embedding, // Changed 'context.embedding' to 'input.embedding'
            limit: input.options.limit || 10, // Changed 'context.options' to 'input.options'
            threshold: input.options.threshold ?? 0.6,
            entityTypes: input.options.entityTypes || ['evidence'],
            includeMetadata: true,
            ...input.options, // Pass through other options from input
          });
        }),
        input: ({ context }) => ({
          // Pass relevant context as input
          query: context.query,
          embedding: context.embedding,
          options: context.options,
        }),
        onDone: {
          actions: assign({
            vectorResults: ({ event }) => (Array.isArray(event.output?.results) ? event.output.results : event.output),
          }),
          target: 'performingHybridSearch', // Always go to hybrid search, it can be skipped internally
        },
        onError: {
          target: 'failure',
          actions: assign({
            error: ({ event }) => {
              const errorMessage = event.error instanceof Error ? event.error.message : String(event.error);
              return { message: errorMessage, code: 'VECTOR_SEARCH_FAILED', stage: 'searchingVectors' };
            },
          }),
        },
      },
    },
    performingHybridSearch: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          // Changed 'context' to 'input'
          let combinedResults = input.vectorResults; // Changed 'context.vectorResults' to 'input.vectorResults'

          // Only perform fuzzy search if query exists and hybridSearch is not explicitly false
          if (input.query && input.options.hybridSearch !== false) {
            // Changed 'context.query' and 'context.options' to 'input.query' and 'input.options'
            // Performance consideration: For very large vectorResults, consider limiting the subset
            // passed to Fuse.js (e.g., context.vectorResults.slice(0, 500)) to manage memory and CPU.
            const fuseDataset = input.vectorResults.map((r: VectorResult) => ({
              // Changed 'context.vectorResults' to 'input.vectorResults'
              id: r.id,
              title: r.metadata?.title || r.payload?.title || '',
              content: r.metadata?.content || r.payload?.content || '',
              entityType: r.metadata?.entityType || 'evidence',
            }));

            const fuse = new Fuse(fuseDataset, fuseOptions);

            const fuzzyMatches: FuseResultType<FuzzySearchItem>[] = fuse.search(input.query); // Changed 'context.query' to 'input.query'
            const fuzzyIds = new Set(fuzzyMatches.map((m: FuseResultType<FuzzySearchItem>) => m.item.id));

            // Boost vector results that also match fuzzy search
            // Consider normalizing scores before multiplying if scales differ significantly.
            // For now, a direct boost based on presence is applied.
            combinedResults = input.vectorResults // Changed 'context.vectorResults' to 'input.vectorResults'
              .map((r: VectorResult) => ({
                ...r,
                score: fuzzyIds.has(r.id) ? r.score * 1.2 : r.score,
              }))
              .sort((a: VectorResult, b: VectorResult) => b.score - a.score);
          }
          return combinedResults;
        }),
        input: ({ context }) => ({
          // Pass relevant context as input
          query: context.query,
          options: context.options,
          vectorResults: context.vectorResults,
        }),
        onDone: {
          target: 'cachingResults',
          actions: assign({ finalResults: ({ event }) => event.output }),
        },
        onError: {
          target: 'failure',
          actions: assign({
            error: ({ event }) => {
              const errorMessage = event.error instanceof Error ? event.error.message : String(event.error);
              return { message: errorMessage, code: 'HYBRID_SEARCH_FAILED', stage: 'performingHybridSearch' };
            },
          }),
        },
      },
    },
    cachingResults: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          // Changed 'context' to 'input'
          if (input.query && input.finalResults.length > 0) {
            // Changed 'context.query' and 'context.finalResults' to 'input.query' and 'input.finalResults'
            await redis?.setex(
              `search:cache:${input.query}`, // Changed 'context.query' to 'input.query'
              CACHE_TTL,
              JSON.stringify({ results: input.finalResults, cachedAt: new Date().toISOString() }) // Changed 'context.finalResults' to 'input.finalResults'
            );
            await redis?.zincrby(TOP_K_KEY, 1, input.query); // Changed 'context.query' to 'input.query'
          }
        }),
        input: ({ context }) => ({
          // Pass relevant context as input
          query: context.query,
          finalResults: context.finalResults,
        }),
        onDone: 'success',
        onError: 'success', // Continue even if caching fails
      },
    },
    success: { type: 'final' },
    failure: { type: 'final' },
  },
});

// Fuse.js fuzzy search configuration
const fuseOptions: FuseOptionsType<FuzzySearchItem> = {
  keys: ['title', 'content'],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 2,
};

// Type helper for XState snapshot
type SearchSnapshot = ReturnType<ActorRefFrom<typeof searchMachine>['getSnapshot']>;

// POST endpoint for advanced search
export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();
  const requestId = `search-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    const body = await request.json();

    // Type Safety: Consider using Zod for robust input validation here.
    // Example: const parsedBody = SearchRequestSchema.parse(body);
    if (!body.query && (!body.options?.embedding || !Array.isArray(body.options.embedding))) {
      return json({ error: 'Query or valid embedding required', code: 'MISSING_INPUT' }, { status: 400 });
    }

    console.log(`🔍 [${requestId}] Search: "${body.query?.substring(0, 100) || '[embedding]'}"`);

    const actor = createActor(searchMachine, {
      input: {
        query: body.query || '',
        options: {
          limit: body.options?.limit || 10,
          threshold: body.options?.threshold ?? 0.6,
          entityTypes: body.options?.entityTypes || ['evidence'],
          hybridSearch: body.options?.hybridSearch ?? true, // Default to true
          embedding: body.options?.embedding, // Pass pre-provided embedding if any
          ...body.options, // Ensure all options are passed
        },
      },
    });

    actor.start();
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
      await redis?.lpush(
        'errors:search:log',
        JSON.stringify({
          ...errorResponse,
          requestId,
          processingTime: Date.now() - startTime,
        })
      );
      await redis?.ltrim('errors:search:log', 0, 999); // Keep last 1000 errors
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
export const GET: RequestHandler = async () => {
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
    const topQueries = await redis?.zrevrange(TOP_K_KEY, 0, 9, 'WITHSCORES');
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
    const recentErrorCount = (await redis?.llen('errors:search:log')) || 0;

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
          status: redis ? 'connected' : 'unavailable',
          topQueries: topQueriesFormatted,
          recentErrors: recentErrorCount,
        },
      },
      capabilities: {
        textToVector: ollamaStatus === 'ready',
        vectorSimilarity: vectorHealth.status !== 'unhealthy',
        fuzzySearch: true,
        hybridSearch: true,
        caching: !!redis,
        errorLogging: !!redis,
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
      await redis?.lpush(
        'errors:search:log',
        JSON.stringify({
          ...errorResponse,
          requestId,
          endpoint: 'GET /api/search',
        })
      );
      await redis?.ltrim('errors:search:log', 0, 999);
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
