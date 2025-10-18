/**
 * Ollama Text Generation API Proxy
 *
 * Allows browser to call Ollama gemma3:270m via API
 *
 * POST /api/ollama/generate
 * Body: { prompt: string, model?: string, stream?: boolean }
 * Response: { response: string, duration: number }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = 'gemma3:270m';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { prompt, model = DEFAULT_MODEL, stream = false, options = {} } = await request.json();

    if (!prompt) {
      throw error(400, 'Missing required field: prompt');
    }

    const startTime = Date.now();

    // Call Ollama API
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream,
        options: {
          temperature: options.temperature ?? 0.7,
          top_p: options.topP ?? 0.9,
          top_k: options.topK ?? 50,
          num_predict: options.maxTokens ?? 512,
          ...options
        }
      }),
      signal: AbortSignal.timeout(30000) // 30s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw error(response.status, `Ollama API error: ${errorText}`);
    }

    const data = await response.json();

    return json({
      response: data.response,
      model: data.model || model,
      duration: Date.now() - startTime,
      context: data.context,
      total_duration: data.total_duration,
      load_duration: data.load_duration,
      prompt_eval_count: data.prompt_eval_count,
      eval_count: data.eval_count
    });
  } catch (err) {
    console.error('❌ [Ollama API] Generation failed:', err);

    if (err instanceof Response) {
      throw err;
    }

    throw error(500, `Ollama generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * GET endpoint to check Ollama availability
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

    const hasGemma = models.some((m: any) =>
      m.name === DEFAULT_MODEL || m.name.startsWith('gemma')
    );

    return json({
      status: 'online',
      ollama_url: OLLAMA_BASE_URL,
      available_models: models.map((m: any) => m.name),
      gemma3_270m_available: hasGemma
    });
  } catch (err) {
    console.error('❌ [Ollama API] Health check failed:', err);
    throw error(503, 'Ollama service unavailable');
  }
};
