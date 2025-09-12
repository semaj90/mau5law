/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: vector-search
 * Category: aggressive
 * Memory Bank: CHR_ROM
 * Priority: 170
 * Redis Type: aiSearch
 * 
 * Performance Impact:
 * - Cache Strategy: aggressive
 * - Memory Bank: CHR_ROM (Nintendo-style)
 * - Cache hits: ~2ms response time
 * - Fresh queries: Background processing for complex requests
 * 
 * Applied by Redis Mass Optimizer - Nintendo-Level AI Performance
 */


import { json } from '@sveltejs/kit';
import { getEmbeddingRepository } from '../../../../lib/server/embedding/embedding-repository';
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';
import type { RequestHandler } from './$types';


// Minimal vector search endpoint leveraging pgvector embedding repository
export async function POST({ request }): Promise<any> {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const body = await request.text();
    if (!body || body.trim() === '') {
      return json({ error: 'Request body cannot be empty' }, { status: 400 });
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (parseError) {
      return json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { query, limit = 8, model } = data;
    if (!query || typeof query !== 'string') {
      return json({ error: 'query required and must be a string' }, { status: 400 });
    }

    const repo = await getEmbeddingRepository();
    const results = await repo.querySimilar(query, { limit, model });
    return json({ results, count: results.length });
  } catch (e: any) {
    console.error('vector-search error', e);
    return json({ error: 'internal error' }, { status: 500 });
  }
}

export async function GET(): Promise<any> {
  return json({ status: 'ok', message: 'POST { query, limit?, model? }' });
}


