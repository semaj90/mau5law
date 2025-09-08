import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { simdBodyParser } from '$lib/server/simd-body-parser';

export const POST: RequestHandler = async ({ request }) => {
  const { endpoint, hot } = await request.json().catch(() => ({ }));
  if (typeof endpoint !== 'string' || typeof hot !== 'boolean') {
    return json({ ok: false, error: "Provide { endpoint: string, hot: boolean }" }, { status: 400 });
  }
  simdBodyParser.configureHotEndpoint(endpoint, hot);
  return json({ ok: true });
};
