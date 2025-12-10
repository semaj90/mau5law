// src/lib/server/embedding-service.ts
// Simple wrapper around your embedding model (Ollama / Gemma / embeddinggemma, etc.)

// If you don't have a shared config file, you can inline:
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';

const DEFAULT_EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? 'embeddinggemma:latest';

type OllamaEmbedResponse = {
  embeddings: number[][];
};

export async function generateEmbedding(text: string): Promise<number[]> {
  const baseUrl = OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';

  const res = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_EMBED_MODEL,
      prompt: text
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('❌ Ollama embeddings error:', res.status, body.slice(0, 200));
    throw new Error(`Ollama embeddings failed: ${res.status}`);
  }

  const data = (await res.json()) as OllamaEmbedResponse;

  if (!data.embeddings?.[0]) {
    throw new Error('No embedding returned from Ollama');
  }

  // Return the first embedding (for a single text)
  return data.embeddings[0];
}
