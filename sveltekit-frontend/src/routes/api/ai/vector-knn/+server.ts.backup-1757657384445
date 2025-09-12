import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEmbeddingRepository } from '../../../../lib/server/embedding/embedding-repository';

// GET: smoke test description
export const GET: RequestHandler = async () => {
  return json({ status: 'ok', info: 'POST { query, limit?, model? } to run kNN search' });
};

// POST: embed query and return kNN results via repository
export const POST: RequestHandler = async ({ request }) => {
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

