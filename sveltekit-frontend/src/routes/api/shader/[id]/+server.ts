import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { cacheShader, getCachedShader } from '$lib/server/cache/redis';

export const GET: RequestHandler = async ({ params }) => {
  const id = params.id;
  if (!id) throw error(400, 'Missing shader id');
  const wgsl = await getCachedShader(id);
  if (!wgsl) return json({ id, wgsl: null });
  return json({ id, wgsl });
};

export const POST: RequestHandler = async ({ params, request }) => {
  const id = params.id;
  if (!id) throw error(400, 'Missing shader id');
  const { wgsl, ttlMs = 6 * 60 * 60 * 1000 } = await request.json();
  if (typeof wgsl !== 'string' || !wgsl.trim()) throw error(400, 'Missing wgsl');
  await cacheShader(id, wgsl, ttlMs);
  return json({ id, stored: true });
};
