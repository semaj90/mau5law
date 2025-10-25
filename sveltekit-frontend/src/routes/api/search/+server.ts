import { json } from '@sveltejs/kit';
import type { RequestHandler, RequestEvent } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { sql } from 'drizzle-orm';
import { createMachine, createActor, fromPromise, assign, type ActorRefFrom } from 'xstate';

// --- Configuration ---
import { OLLAMA_BASE_URL, EMBEDDING_MODEL } from '$env/static/private';
import { redis } from '$lib/server/redis-client';
import { generateEmbedding, summarizeText } from '$lib/server/ollama-client';
import { extractKeywords } from '$lib/server/langextract/google-langextract';
import { qdrantClient } from '$lib/server/qdrant-client';
import { enhancedVectorSearchService } from '$lib/server/vector-search-service'; // Assuming this path

// --- Constants ---
const CACHE_TTL = 60 * 5; // 5 minutes
const TOP_K_KEY = 'search:top-queries';

// --- Types ---
type SearchResultItem = {
  id: string;
  title?: string | null;
  content?: string | null;
  similarity: number; // normalized to 0..1 after processing
  source?: 'pg' | 'qdrant';
};

type VectorResult = SearchResultItem & {
  metadata?: Record<string, unknown>; // Assuming additional metadata can be included
  tags?: string[];
  summarized?: string;
};

// Define a structured response type for POST, aligning with VectorSearchQueryResult
type SearchResponse = {
  success: boolean;
  timestamp: string;
  query?: string;
  results: SearchResultItem[];
  metadata: {
    count: number;
    processingTime: number;
    embeddingDimensions: number;
    threshold: number;
    searchTypes: string[];
    cached: boolean;
    tags?: string[];
    summarized?: string;
  };
  error?: string | object;
  code?: string;
  stage?: string;
  details?: unknown;
};

// Define a structured response type for GET, aligning with AdminStatusResponse
type SearchStatusResponse = {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: {
    ollama: {
      status: 'ready' | 'missing_model' | 'unavailable' | 'unknown';
      model: string;
      availableModels: string[];
    };
    vectorSearch: {
      status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
      details: unknown | null;
      stats: {
        totalDocuments: number;
        indexedDocuments: number;
        averageVectorDimensions: number;
      };
    };
    redis: {
      status: 'connected' | 'unavailable';
      topQueries: Array<{ query: string; count: number }>;
      recentErrors: number;
    };
  };
  capabilities: {
    textToVector: boolean;
    vectorSimilarity: boolean;
    fuzzySearch: boolean;
    hybridSearch: boolean;
    caching: boolean;
    errorLogging: boolean;
    maxEmbeddingDimensions: number;
    supportedEntityTypes: string[];
  };
  requestId: string;
  error?: string;
  code?: string;
  details?: unknown;
};

type SearchError = {
  message: string;
  code: string;
  timestamp: string;
  details?: unknown;
};

// --- Zod Schemas ---
const SearchRequestSchema = z.object({
  query: z.string().min(1).optional(),
  embedding: z.array(z.number()).optional(), // Allow direct embedding input
  options: z.object({
    limit: z.number().int().min(1).max(50).optional().default(10),
    threshold: z.number().min(0).max(1).optional().default(0.6),
    entityTypes: z.array(z.enum(['evidence', 'case'])).optional().default(['evidence']),
    hybridSearch: z.boolean().optional().default(true),
    weightPg: z.number().min(0).max(2).optional().default(1),
    weightQdrant: z.number().min(0).max(2).optional().default(1),
    includeMetadata: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional(), // Added for context in options
    summarized: z.string().optional(), // Added for context in options
  }).optional(),
}).refine(data => data.query || data.embedding, {
  message: "Either 'query' or 'embedding' must be provided",
  path: ['query', 'embedding'],
});

type SearchRequest = z.infer<typeof SearchRequestSchema>;

// --- XState Machine Definition ---
type SearchMachineContext = {
  query: string;
  embedding: number[];
  pgResults: SearchResultItem[];
  qResults: SearchResultItem[];
  finalResults: VectorResult[];
  options: z.infer<typeof SearchRequestSchema>['options'] & {
    tags?: string[];
    summarized?: string;
  };
  cachedAt: string | null;
  error: { message: string; code: string; stage: string; details?: unknown } | null;
};

type SearchMachineEvents =
  | { type: 'START_SEARCH' }
  | { type: 'EMBEDDING_GENERATED'; embedding: number[] }
  | { type: 'SEARCH_RESULTS'; pg: SearchResultItem[]; q: SearchResultItem[] }
  | { type: 'MERGED_RESULTS'; results: VectorResult[] }
  | { type: 'SUMMARIZED_AND_TAGGED'; summarized: string; tags: string[] }
  | { type: 'CACHED' }
  | { type: 'ERROR'; error: { message: string; code: string; stage: string; details?: unknown } };

const searchMachine = createMachine({
  id: 'search',
  context: ({ input }: { input: { query: string; options: SearchMachineContext['options']; embedding?: number[] } }) => ({
    query: input.query,
    embedding: input.embedding || [],
    pgResults: [],
    qResults: [],
    finalResults: [],
    options: input.options,
    cachedAt: null,
    error: null,
  }),
  initial: 'checkingCache',
  states: {
    checkingCache: {
      invoke: {
        src: fromPromise(async ({ context }) => {
          if (context.query) {
            const cached = await redis.get(`search:cache:${context.query}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              return {
                results: parsed.results as VectorResult[],
                cachedAt: parsed.cachedAt as string,
                tags: parsed.tags as string[],
                summarized: parsed.summarized as string,
              };
            }
          }
          return null;
        }),
        onDone: [
          {
            guard: ({ event }) => !!event.output,
            actions: assign({
              finalResults: ({ event }) => event.output.results,
              cachedAt: ({ event }) => event.output.cachedAt,
              options: ({ context, event }) => ({
                ...context.options,
                tags: event.output.tags,
                summarized: event.output.summarized,
              }),
            }),
            target: 'success',
          },
          { target: 'generatingEmbedding' },
        ],
        onError: {
          target: 'generatingEmbedding', // Proceed if cache check fails
          actions: assign({
            error: ({ event }) => ({
              message: event.error instanceof Error ? event.error.message : String(event.error),
              code: 'CACHE_ERROR',
              stage: 'checkingCache',
            }),
          }),
        },
      },
    },
    generatingEmbedding: {
      invoke: {
        src: fromPromise(async ({ context }) => {
          if (context.embedding && context.embedding.length > 0) {
            return context.embedding; // Use provided embedding
          }
          if (!context.query) {
            throw new Error('Query is required to generate embedding.');
          }
          return await generateEmbedding(context.query);
        }),
        onDone: {
          actions: assign({
            embedding: ({ event }) => event.output,
          }),
          target: 'performingVectorSearch',
        },
        onError: {
          target: 'failure',
          actions: assign({
            error: ({ event }) => ({
              message: event.error instanceof Error ? event.error.message : String(event.error),
              code: 'EMBEDDING_FAILED',
              stage: 'generatingEmbedding',
            }),
          }),
        },
      },
    },
    performingVectorSearch: {
      invoke: {
        src: fromPromise(async ({ context }) => {
          const { embedding, options } = context;
          const { limit, threshold, hybridSearch, weightPg, weightQdrant } = options;

          const pgResults: SearchResultItem[] = [];
          try {
            const res = await db.execute(sql`
              SELECT id::text, title, content, 1 - (embedding <=> ${embedding}) AS similarity
              FROM documents
              WHERE embedding IS NOT NULL
              ORDER BY embedding <=> ${embedding}
              LIMIT ${limit}
            `);
            const rows = (res.rows ?? []) as Array<Record<string, unknown>>;
            for (const r of rows) {
              pgResults.push({
                id: String(r.id),
                title: (r.title ?? null) as string | null,
                content: (r.content ?? null) as string | null,
                similarity: Number(r.similarity ?? 0),
                source: 'pg',
              });
            }
          } catch (err) {
            console.warn('⚠️ PG search failed:', (err as Error).message);
          }

          let qResults: SearchResultItem[] = [];
          if (hybridSearch) {
            try {
              const qres = await qdrantClient.search('documents', { vector: embedding, limit: limit, with_payload: true });
              type QHit = { id: string | number; score?: number; payload?: Record<string, unknown> };
              for (const h of (qres.result ?? []) as QHit[]) {
                qResults.push({
                  id: String(h.id),
                  title: (h.payload?.title as string) ?? null,
                  content: (h.payload?.content as string) ?? (h.payload?.summary as string) ?? null,
                  similarity: Number(h.score ?? 0),
                  source: 'qdrant',
                });
              }
            } catch (err) {
              console.warn('⚠️ Qdrant search failed:', (err as Error).message);
            }
          }
          return { pgResults, qResults, weightPg, weightQdrant, threshold };
        }),
        onDone: {
          actions: assign({
            pgResults: ({ event }) => event.output.pgResults,
            qResults: ({ event }) => event.output.qResults,
          }),
          target: 'normalizingAndMerging',
        },
        onError: {
          target: 'failure',
          actions: assign({
            error: ({ event }) => ({
              message: event.error instanceof Error ? event.error.message : String(event.error),
              code: 'VECTOR_SEARCH_FAILED',
              stage: 'performingVectorSearch',
            }),
          }),
        },
      },
    },
    normalizingAndMerging: {
      entry: assign(({ context }) => {
        const { pgResults, qResults, options } = context;
        const { limit, weightPg, weightQdrant, threshold } = options;

        const normalize = (items: SearchResultItem[]) => {
          if (!items.length) return items;
          const vals = items.map((i) => i.similarity);
          const min = Math.min(...vals);
          const max = Math.max(...vals);
          const range = max - min || 1;
          return items.map((i) => ({ ...i, similarity: (i.similarity - min) / range }));
        };

        const pgN = normalize(pgResults).map((i) => ({ ...i, similarity: i.similarity * (weightPg ?? 1) }));
        const qN = normalize(qResults).map((i) => ({ ...i, similarity: i.similarity * (weightQdrant ?? 1) }));

        const mergedMap = new Map<string, VectorResult>();
        for (const it of [...pgN, ...qN]) {
          const ex = mergedMap.get(it.id);
          if (!ex) mergedMap.set(it.id, { ...it });
          else ex.similarity = Math.max(ex.similarity, it.similarity);
        }

        const merged = Array.from(mergedMap.values())
          .filter(item => item.similarity >= (threshold ?? 0)) // Apply threshold after merging
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit ?? 10);

        return { finalResults: merged };
      }),
      target: 'summarizingAndTagging',
    },
    summarizingAndTagging: {
      invoke: {
        src: fromPromise(async ({ context }) => {
          const combinedText = context.finalResults
            .map(r => r.content ?? r.title ?? '')
            .filter(Boolean)
            .join('\n\n');

          const summarized = combinedText ? await summarizeText(combinedText) : '';

          let tags: string[] = [];
          try {
            if (summarized) tags = await extractKeywords(summarized);
          } catch (err) {
            console.warn('⚠️ Keyword extraction failed:', (err as Error).message);
          }
          return { summarized, tags };
        }),
        onDone: {
          actions: assign({
            options: ({ context, event }) => ({
              ...context.options,
              tags: event.output.tags,
              summarized: event.output.summarized,
            }),
          }),
          target: 'cachingResults',
        },
        onError: {
          target: 'cachingResults', // Proceed to caching even if summarization/tagging fails
          actions: assign({
            error: ({ event }) => {
              const errorMessage = event.error instanceof Error ? event.error.message : String(event.error);
              return { message: errorMessage, code: 'SUMMARIZATION_FAILED', stage: 'summarizingAndTagging' };
            },
          }),
        },
      },
    },
    cachingResults: {
      invoke: {
        src: fromPromise(async ({ context }) => {
          if (context.query && context.finalResults.length > 0) {
            await redis.setex(
              `search:cache:${context.query}`,
              CACHE_TTL,
              JSON.stringify({
                results: context.finalResults,
                cachedAt: new Date().toISOString(),
                tags: context.options.tags,
                summarized: context.options.summarized,
              })
            );
            await redis.zincrby(TOP_K_KEY, 1, context.query);
          }
        }),
        onDone: 'success',
        onError: 'success', // Caching failure should not fail the whole search
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

    let parsedBody;
    try {
      parsedBody = SearchRequestSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error(`❌ [${requestId}] Input validation failed:`, validationError.errors);
        return json(
          {
            success: false,
            timestamp: new Date().toISOString(),
            error: 'Invalid request payload',
            code: 'VALIDATION_ERROR',
            details: validationError.errors,
            results: [],
            metadata: {
              count: 0,
              processingTime: Date.now() - startTime,
              embeddingDimensions: 0,
              threshold: 0,
              searchTypes: [],
              cached: false,
            },
          } as SearchResponse,
          { status: 400 }
        );
      }
      throw validationError;
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
          weightPg: parsedBody.options?.weightPg,
          weightQdrant: parsedBody.options?.weightQdrant,
          includeMetadata: parsedBody.options?.includeMetadata,
        },
        embedding: parsedBody.embedding, // Pass top-level embedding to context
      },
    });
    actor.start();

    actor.send({ type: 'START_SEARCH' });

    const timeoutPromise = new Promise<void>(
      (_, reject) => setTimeout(() => reject(new Error('Search operation timed out')), 30000)
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
          success: false,
          timestamp: new Date().toISOString(),
          error: error?.message || 'Search failed',
          code: error?.code || 'XSTATE_FAILURE',
          stage: error?.stage,
          details: error?.details,
          results: [],
          metadata: {
            count: 0,
            processingTime: Date.now() - startTime,
            embeddingDimensions: snapshot.context.embedding.length,
            threshold: snapshot.context.options.threshold ?? 0.6,
            searchTypes: snapshot.context.options.entityTypes || ['evidence'],
            cached: false,
          },
        } as SearchResponse,
        { status: 502 }
      );
    }

    const processingTime = Date.now() - startTime;
    const isCached = !!snapshot.context.cachedAt;

    console.log(
      `✅ Search: ${snapshot.context.finalResults.length} results in ${processingTime}ms (cached: ${isCached})`
    );

    return json({
      success: true,
      timestamp: new Date().toISOString(),
      query: snapshot.context.query || '[embedding search]',
      results: snapshot.context.finalResults,
      metadata: {
        count: snapshot.context.finalResults.length,
        processingTime,
        embeddingDimensions: snapshot.context.embedding.length,
        threshold: snapshot.context.options.threshold ?? 0.6,
        searchTypes: snapshot.context.options.entityTypes || ['evidence'],
        cached: isCached,
        tags: snapshot.context.options.tags,
        summarized: snapshot.context.options.summarized,
      },
    } as SearchResponse);
  } catch (error) {
    console.error(`❌ [${requestId}] Search error:`, error);

    const errorResponse: SearchError = {
      message: error instanceof Error ? error.message : 'Internal server error during search',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.stack : String(error),
    };

    try {
      await redis.lpush(
        'errors:search:log',
        JSON.stringify({
          ...errorResponse,
          requestId,
          processingTime: Date.now() - startTime,
        })
      );
      await redis.ltrim('errors:search:log', 0, 999);
    } catch (logError) {
      console.error('Failed to log error to Redis:', logError);
    }

    return json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: errorResponse.message,
        code: errorResponse.code,
        details: errorResponse.details,
        results: [],
        metadata: {
          count: 0,
          processingTime: Date.now() - startTime,
          embeddingDimensions: 0,
          threshold: 0,
          searchTypes: [],
          cached: false,
        },
      } as SearchResponse,
      { status: 500 }
    );
  }
};

// GET endpoint for search system status + top-k queries
export const GET: RequestHandler = async ({ request, url }: RequestEvent) => {
  const requestId = `status-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    console.log(`📊 [${requestId}] Search system status check`);

    let ollamaStatus: SearchStatusResponse['services']['ollama']['status'] = 'unknown';
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

    const topQueries = await redis.zrevrange(TOP_K_KEY, 0, 9, 'WITHSCORES');
    const topQueriesFormatted: Array<{ query: string; count: number }> = [];
    if
