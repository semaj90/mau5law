import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { aiSearch } from '$lib/server/search/aiSearchEngine';
import { articles } from '../articles.data';

export const POST: RequestHandler = async ({ request }) => {
  const { query } = await request.json().catch(() => ({ query: '' }));
  const sanitized = typeof query === 'string' ? query.trim() : '';

  if (!sanitized) {
    return json(
      { disclaimer: '', results: [], error: 'Query is required.' },
      { status: 400 }
    );
  }

  const data = await aiSearch(sanitized, articles);
  return json(data);
};
