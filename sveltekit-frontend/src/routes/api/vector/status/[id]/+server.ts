import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { cache } from '$lib/server/cache/redis';

// GET /api/vector/status/[id]
export const GET: RequestHandler = async (event: any) => {
  const { params } = event;
  const id = params.id;
  if (!id) return json({ ok: false, error: 'missing id' }, { status: 400 });

  try {
    const key = `job:embedding:${id}`;
    const status = await cache.get<any>(key);
    if (!status) return json({ ok: false, error: 'not found' }, { status: 404 });
    return json({ ok: true, status });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
};
