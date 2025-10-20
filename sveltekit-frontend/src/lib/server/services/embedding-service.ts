// Use process.env instead of SvelteKit env for server-side code
// import { env } from "$env/dynamic/private"
import { OLLAMA_CONFIG, getOptimalModel } from '../ai/ollama-config.js';
export interface EmbeddingProvider {
  name: string;
  endpoint: string;
  model: string;
  dimensions: number;
}
// Configure embedding providers with Gemma embeddings
const providers: Record<string, EmbeddingProvider> = {
  ollama: {
    name: 'Ollama',
    endpoint: OLLAMA_CONFIG.baseUrl + '/api/embeddings',
    model: OLLAMA_CONFIG.embeddingModel, // embeddinggemma
    dimensions: 768, // Updated for embeddinggemma dimensions
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/embeddings',
    model: 'text-embedding-ada-002',
    dimensions: 1536,
  },
};
export async function getEmbedding(text: string, provider: string = 'ollama'): Promise<number[]> {
  const config = providers[provider];
  if (!config) {
    throw new Error(`Unknown embedding provider: ${provider}`);
  }
  try {
    // Clean and truncate text
    const cleanText = text.replace(/[^\w\s.);:!?-]/g, ' ').trim();
    const truncatedText = cleanText.slice(0, 8000); // Safe limit for most models
    if (provider === 'ollama') {
      return await getOllamaEmbedding(truncatedText, config);
    } else if (provider === 'openai') {
      return await getOpenAIEmbedding(truncatedText, config);
    }
    throw new Error(`Embedding method not implemented for provider: ${provider}`);
  } catch (error: any) {
    console.error(`Error getting embedding from ${provider}:`, error);
    throw new Error(`Failed to generate embedding: ${(error as Error).message || String(error)}`);
  }
}
async function getOllamaEmbedding(text: string, config: EmbeddingProvider): Promise<number[]> {
  try {
    // Try primary model (embeddinggemma)
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config?.model || 'unknown', // @ts-ignore - Model property access
        prompt: text,
      }),
    });
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`✅ Using embedding model: ${config?.model || 'unknown'}`);
    return data.embedding;
  } catch (error) {
    console.warn(`Primary embedding model ${config?.model || 'unknown'} failed, trying fallback:`, error);
    // Try fallback models from config
    const fallbackModels = getOptimalModel('embedding');
    for (let i = 1; i < fallbackModels.length; i++) {
      const fallbackModel = fallbackModels[i];
      try {
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: fallbackModel,
            prompt: text,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          console.log(`⚠️  Fallback to ${fallbackModel} successful`);
          return data.embedding;
        }
      } catch (fallbackError) {
        console.warn(`Fallback model ${fallbackModel} also failed:`, fallbackError);
      }
    }
    // If all configured models fail, throw the original error
    throw error;
  }
}
async function getOpenAIEmbedding(text: string, config: EmbeddingProvider): Promise<number[]> {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config?.model || 'unknown', // @ts-ignore - Model property access
      input: text,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.data[0].embedding;
}
export async function similaritySearch(
  embedding: number[],
  limit: number = 10,
  threshold: number = 0.7
): Promise<Array<any>> {
  // This would integrate with your existing vector search
  // For now, return empty array - implement with your Qdrant setup
  return [];
}
export { providers };
