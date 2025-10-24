/// <reference types="vite/client" />
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { withValidationAndRate } from '$lib/server/middleware/validate-and-rate';
/*
 * Ollama Embeddings API Endpoint
 * Handles text embedding generation for legal documents
 */

const handler: RequestHandler = async ({ request }) => {
  // Helper to robustly extract an embedding array from multiple possible shapes
  function extractEmbedding(payload: unknown): number[] | undefined {
    if (!payload || typeof payload !== 'object') return undefined;
    const obj = payload as Record<string, unknown>;

    const tryArrayOfNumbers = (v: unknown): v is number[] => Array.isArray(v) && v.every(x => typeof x === 'number');

    const maybeEmbedding = obj['embedding'] ?? obj['vector'];
    if (tryArrayOfNumbers(maybeEmbedding)) return maybeEmbedding;

    const maybeEmbeddings = obj['embeddings'];
    if (Array.isArray(maybeEmbeddings) && maybeEmbeddings.length && tryArrayOfNumbers(maybeEmbeddings[0])) {
      return maybeEmbeddings[0] as number[];
    }

    const maybeData = obj['data'];
    if (Array.isArray(maybeData) && maybeData.length && typeof maybeData[0] === 'object') {
      const first = maybeData[0] as Record<string, unknown>;
      const e = first['embedding'] ?? first['embeddings'] ?? first['vector'];
      if (tryArrayOfNumbers(e)) return e as number[];
    }

    return undefined;
  }

  try {
    // Safely parse request body and assert minimal types to avoid `any`
    const reqBody = (await request.json()) as Record<string, unknown>;
    const text = typeof reqBody.text === 'string' ? reqBody.text : '';
    const model = typeof reqBody.model === 'string' ? reqBody.model : 'nomic-embed-text:latest';
    const normalize = typeof reqBody.normalize === 'boolean' ? reqBody.normalize : true;
    const truncate = typeof reqBody.truncate === 'boolean' ? reqBody.truncate : true;

    if (!text) {
      return json({ error: 'Text is required' }, { status: 400 });
    }
    // Truncate text if too long (embedding models have token limits)
    const truncatedText = truncate ? text.substring(0, 2000) : text;

    // Resolve Ollama base URL at runtime:
    const ollamaBase = await (async () => {
      // 1) Try dynamic import of a project helper if present
      try {
        // add a small typed shape for the helper module to avoid `any`
        type OllamaHelper = {
          getOllamaEndpoint?: () => string | Promise<string>;
        };
        // preserve runtime safety while providing a concrete type to TS
        const mod = (await import('$lib/server/ollama')) as Partial<OllamaHelper>;
        const getEndpoint = mod.getOllamaEndpoint;
        if (typeof getEndpoint === 'function') {
          // support sync or async return
          const raw = await Promise.resolve(getEndpoint());
          if (typeof raw === 'string' && raw.trim().length > 0) return raw;
          // coerce other truthy values to string safely
          if (raw != null) {
            const s = String(raw);
            if (s.trim().length > 0) return s;
          }
        }
      } catch {
        /* ignore if module not present */
      }

      // 2) Fallback to Vite env or Node env (use guarded casts)
      const imEnv = import.meta.env as unknown as Record<string, unknown> | undefined;
      const viteCandidate =
        imEnv && typeof imEnv.OLLAMA_URL === 'string' && imEnv.OLLAMA_URL.trim().length > 0
          ? (imEnv.OLLAMA_URL as string)
          : undefined;
      const nodeCandidate =
        typeof process?.env?.OLLAMA_URL === 'string' && process.env.OLLAMA_URL.trim().length > 0
          ? process.env.OLLAMA_URL
          : undefined;

      // 3) Final resolution: prefer explicit helper getOllamaEndpoint(), then env vars.
      // Try to use canonical helper if available
      try {
        const mod = await import('$lib/server/ollama');
        const getEndpoint = (mod as unknown as { getOllamaEndpoint?: () => string | Promise<string> })
          .getOllamaEndpoint;
        if (typeof getEndpoint === 'function') {
          const raw = await Promise.resolve(getEndpoint());
          if (typeof raw === 'string' && raw.trim().length > 0) return raw;
          if (raw != null) {
            const s = String(raw);
            if (s.trim().length > 0) return s;
          }
        }
      } catch {
        /* ignore - helper not present or failed */
      }

      // Fall back to configured env vars if helper isn't present/valid
      if (viteCandidate) return viteCandidate;
      if (nodeCandidate) return nodeCandidate;

      // No configured endpoint found — surface explicit configuration error
      throw new Error(
        'Ollama endpoint not configured. Add getOllamaEndpoint() in $lib/server/ollama or set OLLAMA_URL environment variable.'
      );
    })();

    const response = await fetch(`${String(ollamaBase).replace(/\/+$/, '')}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.replace(':latest', ''),
        // many Ollama embedding endpoints expect "input" or "prompt" — keep "prompt" as original
        prompt: truncatedText,
      }),
    });
    if (!response.ok) {
      throw new Error(`Ollama embeddings API error: ${response.status} ${response.statusText}`);
    }

    const dataRaw = (await response.json()) as unknown;

    const embedding = extractEmbedding(dataRaw);

    // Normalize embedding if requested
    let normalizedEmbedding = embedding;
    if (normalize && normalizedEmbedding) {
      const norm = Math.sqrt(normalizedEmbedding.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        normalizedEmbedding = normalizedEmbedding.map(val => val / norm);
      }
    }

    return json({
      success: true,
      embedding: normalizedEmbedding,
      dimensions: normalizedEmbedding?.length || 0,
      model,
      metadata: {
        originalTextLength: text.length,
        truncatedTextLength: truncatedText.length,
        normalized: normalize,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Embeddings API error:', error);
    return json(
      {
        success: false,
        error: 'Failed to generate embeddings',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

export const POST = withValidationAndRate(handler, null, {
  capacity: 60,
  refillPerSecond: 2,
  keyPrefix: 'rl:ollama:embed:',
});