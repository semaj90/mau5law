import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { searchLocal } from '$lib/search/local-pipeline';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const query = typeof body.query === 'string' ? body.query : '';
    const limit = Number.isFinite(body.limit) ? Math.max(1, Math.min(50, body.limit)) : 5;

    if (!query) return json({ results: [] }, { status: 200 });

    const results = await searchLocal(query, limit);
    return json({ results }, { status: 200 });
  } catch (err) {
    return json({ error: (err as Error).message || 'local-search failed' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const limit = Number(url.searchParams.get('limit') || '5');
  const results = q ? await searchLocal(q, isFinite(limit) ? limit : 5) : [];
  return json({ results });
};
