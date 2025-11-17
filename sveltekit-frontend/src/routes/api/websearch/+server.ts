import { getCachedSearch, setCachedSearch } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/search/langCache';
import { cosineSearchWeb } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/search/webVectorSearch';
import { logToolCall } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/training/query-logger';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  const { query, topK = 10, scope = 'web' } = await request.json();

  const cached = await getCachedSearch(query, scope);
  if (cached) {
    // Log cache hit
    await logToolCall(query, 'kb.search_web', { query, topK, scope, cached: true }, cached);
    return json({ ...cached, cached: true });
  }

  const result = await cosineSearchWeb({ query, topK, scope });
  await setCachedSearch(query, scope, result, 300);

  // Log fresh search
  await logToolCall(query, 'kb.search_web', { query, topK, scope, cached: false }, result);

  return json({ ...result, cached: false });
};