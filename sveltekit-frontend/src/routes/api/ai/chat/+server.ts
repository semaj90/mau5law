// Minimal, conflict-free AI chat proxy (vLLM first, Ollama fallback)
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

const VLLM = ((import.meta as any).env?.VLLM_ENDPOINT as string) ?? 'http://localhost:8000/v1';
const OLLAMA = ((import.meta as any).env?.OLLAMA_ENDPOINT as string) ?? 'http://localhost:11434';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const messages: Msg[] = Array.isArray(body?.messages) ? body.messages : [];
    const model: string = body?.model || 'gemma3-legal';
    const temperature: number = typeof body?.temperature === 'number' ? body.temperature : 0.2;

    // Prepend a legal-focused system prompt for better outputs
    const systemPrompt: Msg = {
      role: 'system',
      content:
        'You are a concise, accurate legal AI assistant specializing in deeds, contracts, citations, and risk analysis. ' +
        'Cite assumptions, flag ambiguities, and avoid giving definitive legal advice. Prefer bullet points and short paragraphs.',
    };
    const chatMessages =
      messages.length > 0 && messages[0]?.role !== 'system'
        ? [systemPrompt, ...messages]
        : messages.length > 0
          ? messages
          : [systemPrompt];

    if (messages.length === 0) {
      return json({ error: 'messages required' }, { status: 400 });
    }

    // Prefer Ollama gemma3-legal first
    try {
      const ollamaRes = await fetch(`${OLLAMA}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          stream: false,
          options: {
            temperature,
            num_ctx: (import.meta as any).env?.OLLAMA_NUM_CTX
              ? Number((import.meta as any).env.OLLAMA_NUM_CTX)
              : 8192,
          },
        }),
      });
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        const text = data?.message?.content ?? data?.response ?? '';
        return json({ backend: 'ollama', model, text, raw: data });
      }
    } catch {}

    // Fallback: vLLM (OpenAI-compatible /chat/completions)
    try {
      const vllmRes = await fetch(`${VLLM}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: body?.openaiModel || 'mistralai/Mistral-7B-Instruct-v0.3',
          temperature,
          messages: chatMessages,
          stream: false,
        }),
      });
      if (vllmRes.ok) {
        const data = await vllmRes.json();
        const text = data?.choices?.[0]?.message?.content ?? '';
        return json({ backend: 'vllm', model: data?.model, text, raw: data });
      }
    } catch {}

    return json({ error: 'No AI backend reachable' }, { status: 503 });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  const result: any = { ok: true, backends: {} };
  try {
    const [ver, tags] = await Promise.all([
      fetch(`${OLLAMA}/api/version`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${OLLAMA}/api/tags`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    result.backends.ollama = {
      version: ver?.version || null,
      has_gemma3_legal: Array.isArray(tags?.models)
        ? tags.models.some((m: any) => (m?.name || '').startsWith('gemma3-legal'))
        : false,
    };
  } catch {}
  try {
    const vModels = await fetch(`${VLLM}/models`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    result.backends.vllm = {
      reachable: Boolean(vModels),
      models: Array.isArray(vModels?.data) ? vModels.data.map((m: any) => m.id) : [],
    };
  } catch {}
  return json(result);
};
