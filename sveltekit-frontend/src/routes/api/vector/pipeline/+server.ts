import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { cache } from '$lib/server/cache/redis';
import { embedText } from '$lib/server/embedding-gateway';
import { hashString32 } from '$lib/utils/chunk';

export const POST: RequestHandler = async ({ request, fetch }) => {
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
      const model =
        payload.model ||
        process.env.EMBED_MODEL ||
        process.env.PUBLIC_EMBED_MODEL ||
        'nomic-embed-text';
      const { embeddings } = await embedText(fetch, [text], model);
      const embed = embeddings[0];
      await cache.set(`embedding:${model}:${hash}`, embed, 24 * 60 * 60 * 1000);
    } catch (err: any) {
      console.warn('embed failed (will enqueue):', err?.message || err);
      // TODO: enqueue job to background worker (RabbitMQ / Redis stream)
    }

    // Always enqueue for background durability/DB persistence. Prefer RabbitMQ when available.
    const job = { id, text, model: payload.model || 'embeddinggemma-300m' };
    try {
      // dynamic import so we don't require amqplib at runtime if not installed
      const { publishToQueue } = await import('$lib/server/rabbitmq');
      await publishToQueue('evidence.embedding.queue', job);
      console.log('📤 Enqueued job to RabbitMQ: ', id);
    } catch (e) {
      // Fall back to Redis list-based queue
      try {
        if (cache.client) {
          await cache.rpush('embedding:jobs', JSON.stringify(job));
          console.log('📤 Enqueued job to Redis list: ', id);
        }
      } catch (err) {
        console.warn('Failed to enqueue job to Redis as fallback:', err?.message || err);
      }
    }

    return json({ ok: true, id }, { status: 202 });
  } catch (err: any) {
    return json({ ok: false, error: err.message || String(err) }, { status: 500 });
  }
};
