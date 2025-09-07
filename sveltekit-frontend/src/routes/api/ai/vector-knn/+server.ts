import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEmbeddingRepository } from '$lib/server/embedding/embedding-repository';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { query, limit = 8, threshold, model } = await request.json();
    if (!query || typeof query !== 'string') {
      return json({ error: 'query required' }, { status: 400 });
    }
    const repo = await getEmbeddingRepository();
    const results = await repo.querySimilar(query, { limit, threshold, model });
    return json({ count: results.length, results });
  } catch (e: any) {
    return json({ error: e?.message || 'failed' }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  return json({ status: 'ok', message: 'POST { query, limit?, threshold?, model? }' });
};
