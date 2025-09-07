import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { cache, cacheEmbedding, cacheSearchResults } from '$lib/server/cache/redis';

// Accept text and return embedding tensor with caching and indexing hooks
export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const { text, model = 'nomic-embed-text', tags = [], type = 'ocr' } = await request.json();
    if (!text || typeof text !== 'string') return json({ error: 'Missing text' }, { status: 400 });

    const key = `tensor:${model}:${btoa(text).slice(0, 64)}`;
    const cached = await cache.get<number[]>(key);
    if (cached) {
      // Mirror both fields for compatibility
      return json({ tensor: cached, embedding: cached, cached: true, model, tags, type });
    }

    const fastApiUrl = process.env.FASTAPI_URL || process.env.PUBLIC_FASTAPI_URL;

    // Helper to finalize and cache response
    const finalize = async (embedding: number[], wasCached = false) => {
      await cache.set(key, embedding, 24 * 60 * 60 * 1000);
      await cacheEmbedding(text, embedding, model);
      await cacheSearchResults(text, 'tensor', [{ id: key, score: 1 }], { model, tags });
      return json({ tensor: embedding, embedding, cached: wasCached, model, tags, type });
    };

    // Primary: FastAPI embed service
    if (fastApiUrl) {
      try {
        const resp = await fetch(`${fastApiUrl.replace(/\/$/, '')}/embed`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, model, tags }),
        });
        if (resp.ok) {
          const data = (await resp.json()) as { embedding: number[] };
          return await finalize(data.embedding, false);
        }
        // fall through to Go fallback when FastAPI responds non-OK
      } catch {
        // fall through to Go fallback on error
      }
    }

    // Fallback: Go tensor bridge (mock-capable) to get an embedding when FastAPI isn't configured/available
    try {
      const goReq = {
        operation: 'vectorize',
        documentId: key,
        data: [] as number[],
        options: { timeout: 5000 },
      };
      const goResp = await fetch('/api/tensor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(goReq),
      });
      if (goResp.ok) {
        const goJson = await goResp.json();
        const emb = goJson?.data?.result?.embeddings as number[] | undefined;
        if (Array.isArray(emb) && emb.length > 0) {
          return await finalize(emb, false);
        }
      }
    } catch {
      // swallow and report below
    }

    // If we reached here, no backend produced an embedding
    return json(
      {
        error: 'Embedding backend unavailable (FASTAPI_URL not configured and Go fallback failed)',
      },
      { status: 502 }
    );
  } catch (e: any) {
    return json({ error: e?.message || 'Tensor error' }, { status: 500 });
  }
};
