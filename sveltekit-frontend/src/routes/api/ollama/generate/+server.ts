/**
 * Ollama Text Generation API Proxy - Production Ready
 *
 * Endpoint: /api/ollama/generate
 * Category: standard
 * Priority: 110
 *
 * Allows browser to call Ollama via centralized service
 *
 * POST /api/ollama/generate
 * Body: { prompt: string } or { messages: Array<{role, content}> }
 * Response: { result: string, duration: number }
 *
 * Production Services:
 * - Ollama AI: Centralized generation via services.ts
 * - Redis: Automatic caching
 * - Dynamic model configuration from environment
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { readBodyFast } from '$lib/server/utils/json-fast';
import { generateChatResponse, services } from '$lib/server/services';

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export const POST: RequestHandler = async ({ request }) => {
  try {
  const body = await readBodyFast(request);
  const messages = (Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : body?.prompt ? [{ role: 'user', content: String(body.prompt) }] : null) as ChatMessage[] | null;

    if (!messages) {
      return json({ error: 'messages or prompt required' }, { status: 400 });
    }

    const startTime = Date.now();

    console.log('🚀 ollama/generate: Using centralized service with', services.env.ollamaConfig.chatModel);

  const response = await generateChatResponse(messages, false);

    return json({
      result: response,
      response: response, // backward compatibility
      duration: Date.now() - startTime,
      model: services.env.ollamaConfig.chatModel,
      production: true,
      service: 'ollama-centralized'
    });
  } catch (err) {
    console.error('❌ ollama/generate error:', err);

    if (err instanceof Response) {
      throw err;
    }

    return json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

/**
 * GET endpoint to check Ollama availability via centralized service
 */
export const GET: RequestHandler = async () => {
  try {
    const ollamaUrl = services.env.ollamaConfig.baseUrl;

    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      throw error(503, 'Ollama service unavailable');
    }

    const data = await response.json();
    const models = Array.isArray(data.models) ? (data.models as unknown[]) : [];
    const modelNames = models.map((m) => String((m as Record<string, unknown>)?.name ?? ''));
    const hasGemma = modelNames.some((n) => n === services.env.ollamaConfig.chatModel || n.startsWith('gemma'));

    return json({
      status: 'online',
      ollama_url: ollamaUrl,
      configured_model: services.env.ollamaConfig.chatModel,
      available_models: modelNames,
      gemma_available: hasGemma,
      production: true,
      service: 'ollama-centralized'
    });
  } catch (err) {
    console.error('❌ [Ollama API] Health check failed:', err);
    throw error(503, 'Ollama service unavailable');
  }
};
