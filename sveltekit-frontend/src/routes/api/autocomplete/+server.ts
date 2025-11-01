/// <reference types="vite/client" />
import type { RequestHandler } from './$types';
import { json, error } from '@sveltekit/kit';
import { poolShim } from '$lib/server/db-shim';
/*
 * Auto-Complete API Endpoint
 * Provides real-time legal phrase suggestions using semantic search
 */
import { createRedisInstance } from '$lib/server/redis';
import { z } from 'zod';
// Configuration
const CONFIG = {
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  database: {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'prosecutor_db',
  },
  autocomplete: {
    maxSuggestions: 10,
    minQueryLength: 2,
    cacheTimeSeconds: 300,
  },
};
// Validation schemas
const AutocompleteRequestSchema = z.object({
  query: z.string().min(1).max(200),
  context: z.enum(['legal_phrase', 'case_law', 'statute', 'evidence']).optional(),
  jurisdiction: z.enum(['federal', 'state', 'local', 'international']).optional(),
  maxResults: z.number().min(1).max(20).optional(),
  includeScores: z.boolean().optional(),
});

// Define a type for suggestions to improve type safety
interface Suggestion {
  suggestion: string;
  score?: number;
  context_type: string;
  frequency?: number;
  prosecution_correlation?: number;
  source?: 'cache' | 'database' | 'semantic';
  boost?: number;
  finalScore?: number;
}

// Initialize connections
type RedisClient = Awaited<ReturnType<typeof createRedisInstance>>;
let redis: RedisClient | null = null;

async function getRedis(): Promise<RedisClient> {
  if (!redis) {
    // Normalize factory output to a Promise so both sync and async factories are supported
    // This removes the need for any @ts-expect-error directive.
    const instance = (await Promise.resolve(createRedisInstance())) as RedisClient;
    redis = instance;
  }
  return redis!;
}

// The db-shim's poolShim can be used directly, simplifying connection management.
const db = poolShim;

// Add a small helper to safely extract messages from unknown errors
function formatError(e: unknown): { message: string; details?: string } {
  // Prefer Error.message when available
  if (e instanceof Error) {
    return { message: e.message, details: e.stack };
  }
  // Strings or numbers
  if (typeof e === 'string' || typeof e === 'number' || typeof e === 'boolean') {
    return { message: String(e) };
  }
  // Fallback to JSON
  try {
    return { message: 'Unknown error', details: JSON.stringify(e) };
  } catch {
    return { message: 'Unknown non-serializable error' };
  }
}

export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();
  try {
    const requestData = await request.json();
    // Validate request
    const validatedRequest = AutocompleteRequestSchema.parse(requestData);
    const {
      query,
      context = 'legal_phrase',
      jurisdiction,
      maxResults = CONFIG.autocomplete.maxSuggestions,
      includeScores = false,
    } = validatedRequest;
    // Check minimum query length
    if (query.length < CONFIG.autocomplete.minQueryLength) {
      return json({
        suggestions: [],
        meta: {
          query,
          total: 0,
          processingTime: Date.now() - startTime,
        },
      });
    }
    console.log(`🔍 Autocomplete query: "${query}" (context: ${context})`);
    // Get suggestions from multiple sources
    const [cacheSuggestions, dbSuggestions, semanticSuggestions] = await Promise.allSettled([
      getCachedSuggestions(query),
      getDatabaseSuggestions(query, context, jurisdiction, maxResults),
      getSemanticSuggestions(query, maxResults),
    ]);
    // Combine and rank suggestions
    const allSuggestions: Suggestion[] = [];
    // Add cached suggestions (highest priority)
    if (cacheSuggestions.status === 'fulfilled' && cacheSuggestions.value) {
      allSuggestions.push(
        ...cacheSuggestions.value.map(
          (s: Suggestion) =>
            ({
              ...s,
              source: 'cache' as const,
              boost: 1.2,
            }) as Suggestion
        )
      );
    }
    // Add database suggestions
    if (dbSuggestions.status === 'fulfilled' && dbSuggestions.value) {
      allSuggestions.push(
        ...dbSuggestions.value.map(
          (s: Suggestion) =>
            ({
              ...s,
              source: 'database' as const,
              boost: 1.0,
            }) as Suggestion
        )
      );
    }
    // Add semantic suggestions
    if (semanticSuggestions.status === 'fulfilled' && semanticSuggestions.value) {
      allSuggestions.push(
        ...semanticSuggestions.value.map(
          (s: Suggestion) =>
            ({
              ...s,
              source: 'semantic' as const,
              boost: 0.8,
            }) as Suggestion
        )
      );
    }
    // Remove duplicates and rank
    const uniqueSuggestions = removeDuplicates(allSuggestions);
    const rankedSuggestions = rankSuggestions(uniqueSuggestions, query);
    const topSuggestions = rankedSuggestions.slice(0, maxResults);
    // Update usage statistics
    updateUsageStats(query, topSuggestions);
    const response = {
      suggestions: topSuggestions.map((s: Suggestion) =>
        includeScores
          ? s
          : {
              suggestion: s.suggestion,
              context_type: s.context_type,
            }
      ),
      meta: {
        query,
        total: topSuggestions.length,
        sources: [...new Set(allSuggestions.map((s: Suggestion) => s.source))],
        processingTime: Date.now() - startTime,
      },
    };
    return json(response);
  } catch (err: unknown) {
    const f = formatError(err);
    console.error('❌ Autocomplete error:', f.message, f.details ?? '');
    if (err instanceof z.ZodError) {
      return json(
        {
          message: 'Invalid request format',
          errors: (err as z.ZodError).errors,
        },
        { status: 400 }
      );
    }
    return json(
      {
        message: 'Autocomplete service temporarily unavailable',
        details: f.message,
      },
      { status: 500 }
    );
  }
};
async function getCachedSuggestions(query: string): Promise<Suggestion[]> {
  const redis = await getRedis();
  const prefixes = generatePrefixes(query);
  const suggestions: Suggestion[] = [];
  for (const prefix of prefixes) {
    try {
      const cached = await redis.get(`autocomplete:${prefix.toLowerCase()}`);
      if (cached) {
        const parsedSuggestions = JSON.parse(cached) as Suggestion[];
        suggestions.push(...parsedSuggestions);
      }
    } catch (error: unknown) {
      const f = formatError(error);
      console.warn(`Cache lookup failed for prefix: "${prefix}":`, f.message, f.details ?? '');
    }
  }
  return suggestions;
}
async function getDatabaseSuggestions(
  query: string,
  context: string,
  jurisdiction: string | undefined,
  maxResults: number
): Promise<Suggestion[]> {
  let sql = `
        SELECT
            spr.phrase as suggestion,
            spr.avg_prosecution_score / 100.0 as score,
            $2 as context_type,
            spr.frequency,
            spr.correlation_strength as prosecution_correlation
        FROM semantic_phrases_ranking spr
        WHERE spr.phrase ILIKE $1
        ORDER BY
            spr.avg_prosecution_score DESC,
            spr.frequency DESC,
            spr.correlation_strength DESC
        LIMIT $3
    `;
  const params = [`%${query}%`, context, maxResults];
  // Add jurisdiction filter if specified
  if (jurisdiction) {
    sql = `
            SELECT DISTINCT
                spr.phrase as suggestion,
                spr.avg_prosecution_score / 100.0 as score,
                $2 as context_type,
                spr.frequency,
                spr.correlation_strength as prosecution_correlation
            FROM semantic_phrases_ranking spr
            JOIN legal_documents_processed ldp ON ldp.semantic_phrases::text LIKE: '%' || spr.phrase || '%'
            WHERE spr.phrase ILIKE $1 AND ldp.jurisdiction = $4
            ORDER BY
                spr.avg_prosecution_score DESC,
                spr.frequency DESC,
                spr.correlation_strength DESC
            LIMIT $3
        `;
    params.push(jurisdiction);
  }
  const result = await db.query(sql, params);
  return (result.rows as Suggestion[]) ?? [];
}
async function getSemanticSuggestions(query: string, maxResults: number): Promise<Suggestion[]> {
  // Use vector similarity search (requires embedding generation)
  try {
    // For now, use text similarity as fallback
    const result = await db.query(
      `
            SELECT DISTINCT
                semantic_phrases->>0 as suggestion,
                prosecution_strength_score / 100.0 as score,
                'semantic' as context_type,
                1 as frequency,
                confidence_score as prosecution_correlation
            FROM legal_documents_processed
            WHERE text_chunk ILIKE $1
            ORDER BY prosecution_strength_score DESC, confidence_score DESC
            LIMIT $2
        `,
      [`%${query}%`, maxResults]
    );
    return (result.rows as Suggestion[]) ?? [];
  } catch (error: unknown) {
    const f = formatError(error);
    console.warn('Semantic search failed:', f.message, f.details ?? '');
    return [];
  }
}
function generatePrefixes(query: string): string[] {
  const words = query.toLowerCase().trim().split(/\s+/);
  const prefixes = [];
  // Generate cumulative prefixes
  for (let i = 1; i <= words.length; i++) {
    prefixes.push(words.slice(0, i).join(' '));
  }
  // Add partial word prefixes for the last word
  const lastWord = words[words.length - 1];
  if (lastWord && lastWord.length > 2) {
    for (let i = 2; i < lastWord.length; i++) {
      const partialWord = lastWord.substring(0, i);
      const partialPrefix = [...words.slice(0, -1), partialWord].join(' ');
      prefixes.push(partialPrefix);
    }
  }
  return prefixes;
}
function removeDuplicates(suggestions: Suggestion[]): Suggestion[] {
  const seen = new Set();
  return suggestions.filter((s: Suggestion) => {
    const key = s.suggestion.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
function rankSuggestions(suggestions: Suggestion[], query: string): Suggestion[] {
  const queryLower = query.toLowerCase();
  return suggestions
    .map((s: Suggestion) => {
      let finalScore = (s.score || 0) * (s.boost || 1);
      // Boost exact prefix matches
      if (s.suggestion.toLowerCase().startsWith(queryLower)) {
        finalScore *= 1.5;
      }
      // Boost by frequency if available
      if (s.frequency) {
        finalScore *= Math.min(1 + s.frequency / 100, 2);
      }
      // Boost by prosecution correlation
      if (s.prosecution_correlation) {
        finalScore *= 1 + s.prosecution_correlation * 0.5;
      }
      return {
        ...s,
        finalScore,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}
function updateUsageStats(query: string, suggestions: Suggestion[]) {
  // Async update without blocking response
  setTimeout(async () => {
    try {
      const redis = await getRedis();
      // Track query frequency
      await redis.zincrby('query_frequency', 1, query);
      // Track suggestion selections
      for (const suggestion of suggestions.slice(0, 3)) {
        await redis.zincrby('suggestion_popularity', 1, suggestion.suggestion);
      }
    } catch (error: unknown) {
      const f = formatError(error);
      console.warn('Failed to update usage stats:', f.message, f.details ?? '');
    }
  }, 0);
}
// Health check endpoint
export const GET: RequestHandler = async () => {
  try {
    const redis = await getRedis();
    // Test connections
    await redis.ping();
    await db.query('SELECT 1');
    // Get service stats
    const phraseCount = await db.query('SELECT COUNT(*) FROM semantic_phrases_ranking');
    const documentCount = await db.query('SELECT COUNT(*) FROM legal_documents_processed');
    return json({
      status: 'healthy',
      services: {
        redis: 'connected',
        database: 'connected',
      },
      stats: {
        semantic_phrases: parseInt(phraseCount.rows[0].count),
        legal_documents: parseInt(documentCount.rows[0].count),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const f = formatError(err);
    console.error('Autocomplete health check failed:', f.message, f.details ?? '');
    throw error(503, 'Autocomplete service unhealthy');
  }
};
