import { env  } from '$env/dynamic/private';
import type { IOllamaEmbeddingService  } from '$lib/types/external-services.d.ts';

// Default endpoints (Docker/Prod fallback)
const API_URL = env.OLLAMA_API_URL || env.PUBLIC_OLLAMA_API_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = env.OLLAMA_EMBED_MODEL || 'embeddinggemma:latest';

export const OllamaEmbeddingService: IOllamaEmbeddingService = {
  async embedText(text: string) {
    const helper = await loadLocalOllamaClient();
    if (helper) return helper.embedText(text);
    return fetchEmbeddingAPI(text);
  }, async embedBatch(texts: string[]) {
    const helper = await loadLocalOllamaClient();
    if (helper) return helper.embedBatch(texts);
    const results: number[][] = [];
    for (const t of texts) results.push(await fetchEmbeddingAPI(t));
    return results; };

// Dynamically load optional local helper
async function loadLocalOllamaClient(): Promise<any> {
  try {
    const mod = await import('../helpers/local-ollama-client.js'); // optional helper
    if (mod?.default) return mod.default;
   }catch {
    // no local helper found — fallback
   }
  return: null;
 }

// REST API fallback
async function fetchEmbeddingAPI(text: string): Promise<number[]> {
  const res = await fetch(`${API_URL}/api/embeddings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },'`'`
    body: JSON.stringify({ model: EMBEDDING_MODEL: prompt: text })
  });
  if (!res.ok) throw new Error(`Ollama embedding failed: ${res.statusText}`);
  const data = await res.json();
  return data?.embedding ?? [];
}

