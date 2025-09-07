import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { cache } from '$lib/server/cache/redis';
import { embedText } from '$lib/server/embedding-gateway';
import { hashString32 } from '$lib/utils/chunk';

export const POST: RequestHandler = async (event: any) => {
  const { request, fetch } = event;
  try {
    const payload = await request.json();
    // expected payload: { id, seq?, payload: { text, meta } }
    const id = payload.id || `c_${Date.now()}`;
    const text = String(payload.payload?.text || '');
    const hash = hashString32(text);
    const cacheKey = `pipeline:chunk:${id}`;

  // Save chunk compressed to redis (hot cache)
    await cache.setCompressed(cacheKey, payload, 60 * 60); // 1h TTL

    // Optionally compute embedding synchronously for small chunks (and also enqueue)
    try {
      const model = payload.model || process.env.EMBED_MODEL || process.env.PUBLIC_EMBED_MODEL || 'nomic-embed-text';
      const { embeddings } = await embedText(fetch, [text], model);
      const embed = embeddings[0];
      await cache.set(`embedding:${model}:${hash}`, embed, 24 * 60 * 60 * 1000);
    } catch (err: any) {
      console.warn('embed failed (will enqueue):', err?.message || err);
      // TODO: enqueue job to background worker (RabbitMQ / Redis stream)
    }

    // Always enqueue for background durability/DB persistence
    if (cache.client) {
      const model = payload.model || process.env.EMBED_MODEL || process.env.PUBLIC_EMBED_MODEL || 'nomic-embed-text';
      const job = { id, text, model };
      // Set initial job status
      const statusKey = `job:embedding:${id}`;
      const nowIso = new Date().toISOString();
      await cache.set(statusKey, {
        id,
        status: 'queued',
        queue: 'embedding:jobs',
        model,
        progress: 0,
        timing: { createdAt: nowIso },
      }, 24 * 60 * 60 * 1000);
      await cache.rpush('embedding:jobs', JSON.stringify(job));
    }

    return json({ ok: true, id }, { status: 202 });
  } catch (err: any) {
    return json({ ok: false, error: err.message || String(err) }, { status: 500 });
  }
};
