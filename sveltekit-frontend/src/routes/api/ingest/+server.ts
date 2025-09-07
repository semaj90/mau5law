import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { cache } from '$lib/server/cache/redis';

// Minimal ingestion: push a doc payload onto Redis for background processing
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const id: string = body.id || `doc_${Date.now()}`;
    const content: string = String(body.content || '');
    const metadata = body.metadata ?? {};

    const payload = { id, content, metadata };
    if (!content) return json({ ok: false, error: 'content is required' }, { status: 400 });

    // Reuse existing queue infra; separate list for ingestion
    await cache.rpush('ingest_queue', JSON.stringify(payload));

    return json({ ok: true, status: 'queued', id });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
};
