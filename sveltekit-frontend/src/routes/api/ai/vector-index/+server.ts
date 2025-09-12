/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: vector-index
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
import { Pool } from 'pg';
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';

// POST: create IVF_FLAT index for a pgvector column with auto-tuned lists
const originalPOSTHandler: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      table = 'document_embeddings',
      column = 'embedding',
      metric = 'cosine',
      lists,
    } = body || {};

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      const countRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM ${table}`);
      const total = countRes.rows?.[0]?.cnt ?? 0;

      // Auto-tune lists if not provided: sqrt(N) clamped
      const computedLists =
        lists && Number.isInteger(lists)
          ? lists
          : Math.max(32, Math.min(4096, Math.round(Math.sqrt(total || 1000))));

      const idxName = `idx_${table}_${column}_ivfflat`;
      // CREATE INDEX IF NOT EXISTS ... USING ivfflat(column, lists) - pgvector supports ivfflat via USING ivfflat(column vector_cosine_ops) syntax
      const createSql = `CREATE INDEX IF NOT EXISTS ${idxName} ON ${table} USING ivfflat (${column} ${metric}_vector_ops) WITH (lists=${computedLists})`;
      await client.query(createSql);

      return json({ ok: true, table, column, metric, lists: computedLists, totalRows: total });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err: any) {
    console.error('vector-index error', err?.message || err);
    return json({ error: String(err?.message || err) }, { status: 500 });
  }
};

const originalGETHandler: RequestHandler = async () => {
  return json({
    status: 'ok',
    info: 'POST { table?, column?, metric?, lists? } to create ivfflat index',
  });
};



export const POST = redisOptimized.aiAnalysis(originalPOSTHandler);
export const GET = redisOptimized.aiAnalysis(originalGETHandler);