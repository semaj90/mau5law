// src/lib/server/ollama-service.ts

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';

const CHAT_MODEL = process.env.OLLAMA_MODEL ?? 'gemma3-legal:latest';

const REQUEST_TIMEOUT_MS =
  Number(process.env.OLLAMA_TIMEOUT_MS ?? '120000'); // 120s

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      reject(
        new DOMException(
          'The operation was aborted due to timeout',
          'TimeoutError'
        )
      )
    )
  ]).finally(() => clearTimeout(timeout));
}

export async function generateText(prompt: string): Promise<string> {
  const body = {
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    stream: false
  };

  const res = await withTimeout(
    fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }),
    REQUEST_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('❌ Ollama /api/chat error:', res.status, text.slice(0, 200));
    throw new Error(`Ollama chat failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    message?: { content: string };
  };

  return data.message?.content ?? '';
}

export async function callOllamaChat(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const body = {
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    stream: false
  };

  const res = await withTimeout(
    fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }),
    REQUEST_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('❌ Ollama /api/chat error:', res.status, text.slice(0, 200));
    throw new Error(`Ollama chat failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    message?: { content: string };
  };

  return data.message?.content ?? '';
}
