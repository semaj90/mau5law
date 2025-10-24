// sveltekit-frontend/src/routes/api/ollama/generate/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { readBodyFast } from '$lib/server/utils/json-fast';
import { generateChatResponse, services } from '$lib/server/services';

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

/**
 * POST: Accepts either:
 * - messages: ChatMessage[] OR
 * - prompt: string (converted to a single user message)
 *
 * Returns the generated chat response and some metadata.
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await readBodyFast(request);
    const messages = (Array.isArray(body?.messages)
      ? (body.messages as ChatMessage[])
      : body?.prompt
      ? [{ role: 'user', content: String(body.prompt) }]
      : null) as ChatMessage[] | null;

    if (!messages || messages.length === 0) {
      return json({ error: 'messages or prompt required' }, { status: 400 });
    }

    const start = Date.now();
    const result = await generateChatResponse(messages, false);

    return json({
      result,
      response: result, // backward compatibility
      duration_ms: Date.now() - start,
      model: services.env.ollamaConfig?.chatModel ?? null,
      production: true,
      service: 'ollama-centralized'
    });
  } catch (err) {
    console.error('❌ ollama/generate POST error:', err);
    if (err instanceof Response) throw err;
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
};

/**
 * GET: Health check for configured Ollama service
 */
export const GET: RequestHandler = async () => {
  try {
    const ollamaUrl = services.env.ollamaConfig?.baseUrl;
    if (!ollamaUrl) throw new Error('Ollama base URL not configured');

    const resp = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });

    if (!resp.ok) throw error(503, 'Ollama service unavailable');

    const data = await resp.json();
    const models = Array.isArray(data.models) ? data.models as unknown[] : [];
    const modelNames = models.map((m) => String((m as Record<string, unknown>)?.name ?? ''));
    const hasGemma = modelNames.some((n) => n === services.env.ollamaConfig?.chatModel || n.startsWith('gemma'));

    return json({
      status: 'online',
      ollama_url: ollamaUrl,
      configured_model: services.env.ollamaConfig?.chatModel ?? null,
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
