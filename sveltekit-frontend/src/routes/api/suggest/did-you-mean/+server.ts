// Hybrid "Did You Mean" suggestion endpoint with AI intent prediction
// Returns lexical (pg_trgm), semantic (pgvector), and AI-enhanced suggestions merged & ranked.
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/database'; // drizzle instance
import { getRedisService } from '$lib/server/redis/redis-service';
import postgres from 'postgres';
import { getEmbedding } from '$lib/server/services/embedding-service';
import { UserIntentPredictionSystem } from '$lib/ai/user-intent-prediction-system';

// NOTE: We fall back to a direct postgres-js client for raw SQL needed for pg_trgm & vector ops
const sql = (db as any).session?.client as ReturnType<typeof postgres> | undefined;

const REDIS_TTL_SECONDS = 600;
const intentPredictionSystem = new UserIntentPredictionSystem();

async function semanticCandidates(query: string, limit: number) {
  if (!sql) return [];
  try {
    // 1. Fetch or derive query embedding (Ollama by default)
    let queryEmbedding = await getEmbedding(query, 'ollama');
    // 2. Dimension adaptation: ensure it matches stored passage embedding dim (assume 768).
    const sampleDimRow = await sql`SELECT vector_dims(embedding) as dim FROM passages WHERE embedding IS NOT NULL LIMIT 1`;
    const targetDim = (sampleDimRow as any[])[0]?.dim ?? queryEmbedding.length;
    if (queryEmbedding.length !== targetDim) {
      if (queryEmbedding.length > targetDim) {
        queryEmbedding = queryEmbedding.slice(0, targetDim);
      } else if (queryEmbedding.length < targetDim) {
        // pad with zeros (neutral for cosine / L2 distance influence minimal for trailing zeros)
        queryEmbedding = queryEmbedding.concat(new Array(targetDim - queryEmbedding.length).fill(0));
      }
    }
    const embLiteral = `[${queryEmbedding.join(',')}]`;
    // 3. Retrieve top similar passages ordered by distance
    const rows = await sql`
      SELECT id, text, 1 - (embedding <=> ${embLiteral}::vector) AS similarity
      FROM passages
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embLiteral}::vector
      LIMIT ${limit * 4}
    `;
    // 4. Token frequency weighted by similarity (simple TF * maxSim heuristic)
    const freq: Record<string, number> = {};
    for (const r of rows as any[]) {
      const weight = Number(r.similarity) || 0;
      for (const w of (r.text as string).split(/[^A-Za-z]+/)) {
        const t = w.toLowerCase();
        if (t.length < 5 || t.length > 40) continue;
        freq[t] = (freq[t] || 0) + weight;
      }
    }
    return Object.entries(freq)
      .sort((a,b)=> b[1]-a[1])
      .slice(0, limit)
      .map(([term, score])=> ({ term, score, source:'semantic' as const }));
  } catch (e) {
    console.error('semanticCandidates error', e);
    return [];
  }
}
async function lexicalCandidates(query: string, limit: number) {
  if (!sql) return [];
  const rows = await sql`
    SELECT term, similarity(term, ${query}) AS score
    FROM search_terms
    WHERE term % ${query}
    ORDER BY score DESC
    LIMIT ${limit}
  `;
  return (rows as any[]).map(r=> ({ term: r.term as string, score: Number(r.score), source:'lexical' as const }));
}

function rankMerge(lex: any[], sem: any[], k: number) {
  const map = new Map<string, { term: string; lexical?: number; semantic?: number }>();
  for (const c of lex) {
    map.set(c.term, { term: c.term, lexical: c.score });
  }
  for (const c of sem) {
    const existing = map.get(c.term);
    if (existing) existing.semantic = c.score; else map.set(c.term, { term: c.term, semantic: c.score });
  }
  const merged = Array.from(map.values()).map(r => {
    const lexical = r.lexical ?? 0;
    const semantic = r.semantic ?? 0;
    // Weighted hybrid score (tuneable): favor lexical for typos when lexical present
    const score = lexical > 0 ? 0.6 * lexical + 0.4 * semantic : 0.8 * semantic;
    return { term: r.term, lexical, semantic, score };
  });
  merged.sort((a,b)=> b.score - a.score);
  return merged.slice(0, k);
}

export const POST: RequestHandler = async ({ request }) => {
  const started = performance.now();
  const { query, limit = 8, userId, context, includeTaskSuggestions = true, includeAI = true } = await request.json();
  if (!query || typeof query !== 'string') {
    return new Response(JSON.stringify({ error: 'query required' }), { status: 400 });
  }
  
  const redis = getRedisService();
  const key = `dym:v2:${query.toLowerCase()}:${limit}:${userId || 'anon'}:${includeAI}`;
  const cached = await redis.getCache(key);
  if (cached) {
    return new Response(JSON.stringify({ 
      query, 
      suggestions: cached.suggestions, 
      aiSuggestions: cached.aiSuggestions,
      taskSuggestions: cached.taskSuggestions,
      userProfile: cached.userProfile,
      cached: true, 
      took_ms: Math.round(performance.now()-started) 
    }), { headers: { 'Content-Type':'application/json' } });
  }

  // Track term usage (fire and forget)
  try {
    if (sql) {
      await sql`SELECT increment_search_term(${query}, ${query})`;
    }
  } catch (e) {
    console.warn('increment_search_term failed', e);
  }

  // Run traditional lexical/semantic suggestions in parallel with AI suggestions
  const promises: Promise<any>[] = [
    lexicalCandidates(query, limit * 2),
    semanticCandidates(query, limit * 2)
  ];

  // Add AI-enhanced suggestions if requested
  let aiSuggestionsPromise: Promise<any> | null = null;
  let taskSuggestionsPromise: Promise<any> | null = null;
  let userInsightsPromise: Promise<any> | null = null;

  if (includeAI) {
    aiSuggestionsPromise = intentPredictionSystem.getDidYouMeanSuggestions(
      query, 
      userId || 'anonymous', 
      context
    );
    
    if (includeTaskSuggestions) {
      taskSuggestionsPromise = intentPredictionSystem.predictTaskCompletion(
        query,
        userId || 'anonymous'
      );
    }

    userInsightsPromise = intentPredictionSystem.getUserLearningInsights(
      userId || 'anonymous'
    );
  }

  const results = await Promise.all([
    promises[0], // lexical
    promises[1], // semantic
    aiSuggestionsPromise,
    taskSuggestionsPromise,
    userInsightsPromise
  ]);

  const [lex, sem, aiSuggestions, taskSuggestions, userInsights] = results;
  
  // Merge traditional suggestions
  const traditionalSuggestions = rankMerge(lex, sem, limit);
  
  // Combine with AI suggestions if available
  let combinedSuggestions = traditionalSuggestions;
  if (aiSuggestions && aiSuggestions.didYouMean) {
    // Add AI suggestions with enhanced scoring
    const aiEnhanced = aiSuggestions.didYouMean.map((suggestion: any) => ({
      ...suggestion,
      source: 'ai',
      enhanced: true
    }));
    
    // Merge and deduplicate
    const allSuggestions = [...traditionalSuggestions, ...aiEnhanced];
    const uniqueSuggestions = new Map();
    
    for (const suggestion of allSuggestions) {
      const key = suggestion.term || suggestion.suggestion || suggestion.text;
      if (key && (!uniqueSuggestions.has(key) || suggestion.enhanced)) {
        uniqueSuggestions.set(key, suggestion);
      }
    }
    
    combinedSuggestions = Array.from(uniqueSuggestions.values())
      .sort((a, b) => (b.score || b.confidence || 0) - (a.score || a.confidence || 0))
      .slice(0, limit);
  }

  const responseData = {
    query,
    suggestions: combinedSuggestions,
    aiSuggestions: aiSuggestions || null,
    taskSuggestions: taskSuggestions || [],
    userProfile: userInsights ? {
      confidenceLevel: userInsights.confidenceLevel,
      learningPhase: userInsights.learningPhase,
      preferredIntents: userInsights.topIntents?.slice(0, 3) || []
    } : null,
    cached: false,
    took_ms: Math.round(performance.now() - started)
  };

  // Cache the combined results
  await redis.setCache(key, {
    suggestions: combinedSuggestions,
    aiSuggestions: aiSuggestions || null,
    taskSuggestions: taskSuggestions || [],
    userProfile: responseData.userProfile
  }, REDIS_TTL_SECONDS);

  return new Response(JSON.stringify(responseData), { 
    headers: { 'Content-Type': 'application/json' } 
  });
};
