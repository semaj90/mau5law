/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: vector-knn
 * Category: conservative
 * Memory Bank: PRG_ROM
 * Priority: 150
 * Redis Type: aiAnalysis
 * 
 * Performance Impact:
 * - Cache Strategy: conservative
 * - Memory Bank: PRG_ROM (Nintendo-style)
 * - Cache hits: ~2ms response time
 * - Fresh queries: Background processing for complex requests
 * 
 * Applied by Redis Mass Optimizer - Nintendo-Level AI Performance
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEmbeddingRepository } from '../../../../lib/server/embedding/embedding-repository';
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';

// GET: smoke test description
const originalGETHandler: RequestHandler = async () => {
  return json({ status: 'ok', info: 'POST { query, limit?, model? } to run kNN search' });
};

// POST: embed query and return kNN results via repository
const originalPOSTHandler: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { query, limit = 5, model } = body || {};
    if (!query || typeof query !== 'string') {
      return json({ error: 'query required and must be a string' }, { status: 400 });
    }

    const repo = await getEmbeddingRepository();
    const results = await repo.querySimilar(query, { limit, model });
    return json({ results, count: results.length });
  } catch (err: any) {
    console.error('vector-knn error', err?.message || err);
    return json({ error: String(err?.message || err) }, { status: 500 });
  }
};



export const GET = redisOptimized.aiAnalysis(originalGETHandler);
export const POST = redisOptimized.aiAnalysis(originalPOSTHandler);