// Self-prompting endpoint: expands user query into enriched prompt using passages + graph context.
import type { RequestHandler } from '@sveltejs/kit';
import { getRedisService } from '$lib/server/redis/redis-service';
import { db } from '$lib/server/database';
import { getEmbedding } from '$lib/server/services/embedding-service';
import postgres from 'postgres';

interface Passage { id: string; text: string; pagerank?: number; }
const sql = (db as any).session?.client as ReturnType<typeof postgres> | undefined;
const REDIS_TTL_SECONDS = 300;

async function initialVectorSearch(query: string, k: number): Promise<Passage[]> {
  if (!sql) return [];
  try {
    let queryEmbedding = await getEmbedding(query, 'ollama');
    const dimRow = await sql`SELECT vector_dims(embedding) as dim FROM passages WHERE embedding IS NOT NULL LIMIT 1`;
    const targetDim = (dimRow as any[])[0]?.dim ?? queryEmbedding.length;
    if (queryEmbedding.length !== targetDim) {
      if (queryEmbedding.length > targetDim) queryEmbedding = queryEmbedding.slice(0, targetDim);
      else queryEmbedding = queryEmbedding.concat(new Array(targetDim - queryEmbedding.length).fill(0));
    }
    const embLiteral = `[${queryEmbedding.join(',')}]`;
    const rows = await sql`
      SELECT id, text, pagerank, 1 - (embedding <=> ${embLiteral}::vector) AS similarity
      FROM passages
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embLiteral}::vector
      LIMIT ${k}
    `;
    return rows as any;
  } catch (e) {
    console.error('initialVectorSearch error', e);
    return [];
  }
}
async function fetchGraphNeighbors(passageIds: string[], k: number): Promise<Passage[]> {
  if (!sql || passageIds.length === 0) return [];
  const rows = await sql`
    SELECT DISTINCT p.id, p.text, p.pagerank
    FROM graph_edges ge
    JOIN passages p ON p.id = ge.dst_id
    WHERE ge.src_id = ANY(${passageIds}::uuid[])
      AND ge.edge_type IN ('similarity','citation')
    ORDER BY ge.weight DESC
    LIMIT ${k}
  `;
  return rows as any;
}
function extractConcepts(passages: Passage[]): string[] {
  const tokens = new Map<string, number>();
  for (const p of passages) {
    for (const w of p.text.split(/[^A-Za-z]+/)) {
      const t = w.toLowerCase();
      if (t.length < 5 || t.length > 32) continue;
      tokens.set(t, (tokens.get(t) ?? 0) + 1);
    }
  }
  return Array.from(tokens.entries())
    .sort((a,b)=> b[1]-a[1])
    .slice(0, 15)
    .map(e=> e[0]);
}
function composePrompt(userQuery: string, core: Passage[], neighbors: Passage[], concepts: string[], tokenBudget = 1200) {
  // Basic pruning: truncate each passage to first 280 chars for now
  const trim = (s:string)=> s.length>280? s.slice(0,277)+'…' : s;
  const coreText = core.map((p,i)=>`[CORE ${i+1} ${p.id}] ${trim(p.text)}`).join('\n');
  const neighborText = neighbors.slice(0, 8).map((p,i)=>`[REL ${i+1} ${p.id}] ${trim(p.text)}`).join('\n');
  return `User Intent: ${userQuery}\nKey Concepts: ${concepts.join(', ')}\nCore Passages:\n${coreText}\nRelated Passages:\n${neighborText}\nInstructions: Provide a comprehensive legal answer citing the most relevant clauses. Emphasize accuracy and legal context.`;
}

export const POST: RequestHandler = async ({ request }) => {
  const t0 = performance.now();
  const { query, k = 5, neighborK = 12, useCache = true } = await request.json();
  if (!query) return new Response(JSON.stringify({ error: 'query required'}), { status:400 });
  const redis = getRedisService();
  const cacheKey = `selfp:v1:${query.toLowerCase()}:${k}:${neighborK}`;
  if (useCache) {
    const cached = await redis.getCache(cacheKey);
    if (cached) {
      return new Response(JSON.stringify({ ...cached, cached: true, took_ms: Math.round(performance.now()-t0) }), { headers: { 'Content-Type':'application/json' } });
    }
  }
  const core = await initialVectorSearch(query, k);
  const neighbors = core.length ? await fetchGraphNeighbors(core.map(p=>p.id), neighborK) : [];
  const concepts = extractConcepts(core.concat(neighbors));
  const prompt = composePrompt(query, core, neighbors, concepts);
  const payload = { query, prompt, coreIds: core.map(p=>p.id), neighborCount: neighbors.length, concepts, cached:false };
  await redis.setCache(cacheKey, payload, REDIS_TTL_SECONDS);
  return new Response(JSON.stringify({ ...payload, took_ms: Math.round(performance.now()-t0) }), { headers: { 'Content-Type':'application/json' } });
};
