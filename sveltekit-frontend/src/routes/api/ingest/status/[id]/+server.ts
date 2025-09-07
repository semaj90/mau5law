import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { cache } from '$lib/server/cache/redis';

export const GET: RequestHandler = async (event: any) => {
  const id = event?.params?.id;
  const status = await cache.get<any>(`job:ingest:${id}`);
  if (!status) return json({ ok: false, error: 'not_found' }, { status: 404 });
  return json({ ok: true, status });
};
