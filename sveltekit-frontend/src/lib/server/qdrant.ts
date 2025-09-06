import { fetchOllama } from "$lib/utils/fetch-with-timeout";

// File: src/lib/server/qdrant.ts

export async function fetchEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetchOllama('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data && data.embedding && Array.isArray(data.embedding)) {
      return data.embedding;
    }

    return [];
  } catch (err: any) {
    console.error('Qdrant embedding fetch failed:', err);
    return [];
  }
}