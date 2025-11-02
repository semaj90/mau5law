// Lightweight Ollama HTTP client for local models
// Defaults target to http://localhost:11434
export interface ChatMessage { role: 'system' | 'user' | 'assistant';, content: string;
}
export interface ChatCompletionOptions {
  model?: string;
  stream?: boolean;
  temperature?: number;
}
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
export async function createEmbedding(prompt: string, model = 'embeddinggemma:latest'): Promise<number[]> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt })
    });
    if (!res.ok) throw new Error(`Ollama embeddings HTTP ${res.status}`);
    const data = (await res.json()) as { embedding?: number[] };
    if (!Array.isArray(data.embedding)) throw new Error('Invalid embedding payload');
    return data.embedding;
  } catch (err) {
    console.warn('[ollama-client] Embedding failed; returning zero vector:', err);
    return Array(384).fill(0);
  }
}
export async function chat(messages: ChatMessage[], opts: ChatCompletionOptions = {}): Promise<any> {
  const model = opts.model || 'gemma3-legal:latest';
  try {
    const res = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: opts.temperature ?? 0.2, stream: false })
    });
    if (!res.ok) throw new Error(`Ollama chat HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[ollama-client] Chat error:', err);
    throw err;
  }
}
