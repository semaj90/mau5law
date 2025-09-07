import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { cache } from '$lib/server/cache/redis';

// Small ingest endpoint: text -> cache key -> queued to backends (stub)
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { text, model = 'nomic-embed-text', tags = [], id, embedding } = body || {};

  // If embedding is provided, index immediately (fan-out best effort)
  if (id && Array.isArray(embedding) && embedding.length) {
    try {
      const { indexPgVector } = await import('$lib/server/indexers/pgvector-indexer');
      const { indexQdrant } = await import('$lib/server/indexers/qdrant-indexer');
      const { indexNeo4j } = await import('$lib/server/indexers/neo4j-indexer');
      const [pg, qd, nj] = await Promise.all([
        indexPgVector({ id, text: text || '', embedding }).catch((e) => ({ ok: false, error: String(e) })),
        indexQdrant({ id, text: text || '', embedding }).catch((e) => ({ ok: false, error: String(e) })),
        indexNeo4j({ id, text: text || '', embedding }).catch((e) => ({ ok: false, error: String(e) }))
      ]);
      return json({ ok: true, id, text, status: { pg, qdrant: qd, neo4j: nj } });
    } catch (e) {
      return json({ ok: false, error: String(e) }, { status: 500 });
    }
  }

  if (!text) return json({ error: 'Missing text' }, { status: 400 });
  const key = `ingest:${model}:${btoa(text).slice(0, 32)}`;
  await cache.set(key, { text, model, tags }, 10 * 60 * 1000);
  return json({ ok: true, key });
};
