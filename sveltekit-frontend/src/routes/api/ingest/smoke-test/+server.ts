import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { cache } from '$lib/server/cache/redis';

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const content: string = body.content || 'This is a short sample legal text about contract liabilities and indemnification.';
  const id: string = body.id || `smoke_${Date.now()}`;
  const payload = { id, content, metadata: { source: 'smoke-test' } };

  await cache.rpush('ingest_queue', JSON.stringify(payload));
  // Initialize queued status so UI has immediate feedback
  await cache.set(`job:ingest:${id}`, { id, status: 'queued', progress: 0 }, 86400);

  // Poll until completion or timeout
  const started = Date.now();
  const timeoutMs = Math.min(30000, Number(body.timeoutMs) || 15000);
  let status: any = null;
  while (Date.now() - started < timeoutMs) {
    status = await cache.get(`job:ingest:${id}`);
    if (status && (status.status === 'completed' || status.status === 'failed')) break;
    await sleep(750);
  }

  return json({ ok: true, id, status: status || { status: 'timeout' } });
};
