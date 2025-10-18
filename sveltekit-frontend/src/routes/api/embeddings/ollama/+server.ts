/**
 * Ollama Embeddings API Proxy
 *
 * Proxies embedding requests to local Ollama instance
 * Uses embeddinggemma:latest model
 *
 * POST /api/embeddings/ollama
 * Body: { text: string | string[] }
 * Response: { embedding: number[] | number[][], model: string, duration: number }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = 'embeddinggemma:latest';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text } = await request.json();

    if (!text) {
      throw error(400, 'Missing required field: text');
    }

    const startTime = Date.now();

    // Handle batch embeddings
    if (Array.isArray(text)) {
      const embeddings = await Promise.all(
        text.map(t => embedSingle(t))
      );

      return json({
        embedding: embeddings.map(e => e.embedding),
        model: EMBEDDING_MODEL,
        duration: Date.now() - startTime,
        count: embeddings.length
      });
    }

    // Handle single embedding
    const result = await embedSingle(text);

    return json({
      embedding: result.embedding,
      model: EMBEDDING_MODEL,
      duration: Date.now() - startTime
    });
  } catch (err) {
    console.error('❌ [Ollama API] Embedding failed:', err);

    if (err instanceof Response) {
      throw err;
    }

    throw error(500, `Ollama embedding failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * Health check endpoint
 */
export const GET: RequestHandler = async () => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000)
    });

    if (!response.ok) {
      throw error(503, 'Ollama service unavailable');
    }

    const data = await response.json();
    const models = data.models || [];
    const hasEmbeddingModel = models.some((m: any) =>
      m.name === EMBEDDING_MODEL || m.name.startsWith('embeddinggemma')
    );

    return json({
      status: 'healthy',
      ollama_url: OLLAMA_BASE_URL,
      model: EMBEDDING_MODEL,
      model_available: hasEmbeddingModel,
      available_models: models.map((m: any) => m.name)
    });
  } catch (err) {
    console.error('❌ [Ollama API] Health check failed:', err);
    throw error(503, 'Ollama service unavailable');
  }
};

/**
 * Embed a single text using Ollama
 */
async function embedSingle(text: string): Promise<{
  embedding: number[];
  total_duration?: number;
  load_duration?: number;
}> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      prompt: text,
      keep_alive: '5m',
      options: {
        truncate: true
      }
    }),
    signal: AbortSignal.timeout(10000) // 10s timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.embedding || !Array.isArray(data.embedding)) {
    throw new Error('Invalid embedding response from Ollama');
  }

  return {
    embedding: data.embedding,
    total_duration: data.total_duration,
    load_duration: data.load_duration
  };
}