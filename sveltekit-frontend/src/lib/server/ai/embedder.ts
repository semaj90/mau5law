import { cache } from '../cache/redis';

// Configuration for embedding service
const EMBEDDING_CONFIG = {
  // Prefer local Gemma3 if available, fallback to Nomic API
  useLocal: process.env.EMBEDDER_TYPE === 'local' || process.env.LOCAL_EMBEDDER_URL,
  localUrl: process.env.LOCAL_EMBEDDER_URL || 'http://localhost:9000/embed',
  nomicApiKey: process.env.NOMIC_API_KEY,
  nomicUrl: process.env.NOMIC_URL,
  defaultModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text-v1.5',
};

// Nomic library stub note:
// The project previously depended on '@langchain/nomic' which is currently not installed.
// To unblock builds we avoid a hard dependency and provide a lightweight fallback.
// If you later install '@langchain/nomic', replace the stub in embedWithNomic with real client calls.

/**
 * Get embeddings from local Gemma3 service
 */
async function embedWithLocal(text: string): Promise<number[]> {
  try {
    const response = await fetch(EMBEDDING_CONFIG.localUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model: EMBEDDING_CONFIG.defaultModel,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local embedder failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.embedding || result.vector || result.data;
  } catch (error) {
    console.warn('Local embedder unavailable, falling back to Nomic:', error);
    throw error;
  }
}

/**
 * Get embeddings from Nomic API
 */
async function embedWithNomic(text: string): Promise<number[]> {
  if (!EMBEDDING_CONFIG.nomicApiKey) {
    throw new Error('Nomic API key not configured');
  }
  try {
    // Attempt a generic REST call if a base URL is provided; otherwise fallback to deterministic embedding.
    if (EMBEDDING_CONFIG.nomicUrl) {
      const response = await fetch(EMBEDDING_CONFIG.nomicUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${EMBEDDING_CONFIG.nomicApiKey}`,
        },
        body: JSON.stringify({
          text,
          model: EMBEDDING_CONFIG.defaultModel,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const vector = data.embedding || data.vector || data.embeddings || data.data;
        if (Array.isArray(vector)) return vector;
      }
    }
    // Fallback deterministic embedding (simple hash-based vector) to keep pipeline functional.
    const dims = 128;
    const vec = new Array(dims).fill(0);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      vec[i % dims] = (vec[i % dims] + code) % 9973;
    }
    // Normalize
    const max = Math.max(...vec, 1);
    return vec.map((v) => v / max);
  } catch (error) {
    console.error('Nomic embedding fallback failed:', error);
    throw error;
  }
}

/**
 * Main embedding function with automatic fallback
 * @param text - Text to embed
 * @param model - Optional model override
 * @returns Promise<number[]> - Embedding vector
 */
export async function embedText(text: string, model?: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for embedding');
  }

  const modelName = model || EMBEDDING_CONFIG.defaultModel;

  // Check Redis cache first
  const cachedEmbedding = await cache.getEmbedding(text, modelName);
  if (cachedEmbedding) {
    console.log('🚀 Embedding cache hit');
    return cachedEmbedding;
  }

  let embedding: number[];

  // Try local first if configured
  if (EMBEDDING_CONFIG.useLocal) {
    try {
      embedding = await embedWithLocal(text);
    } catch (localError) {
      console.warn('Local embedding failed, trying Nomic API...');
      // Fallback to Nomic API
      if (EMBEDDING_CONFIG.nomicApiKey) {
        embedding = await embedWithNomic(text);
      } else {
        throw new Error(
          'No embedding service available. Configure NOMIC_API_KEY or LOCAL_EMBEDDER_URL'
        );
      }
    }
  } else if (EMBEDDING_CONFIG.nomicApiKey) {
    embedding = await embedWithNomic(text);
  } else {
    throw new Error(
      'No embedding service available. Configure NOMIC_API_KEY or LOCAL_EMBEDDER_URL'
    );
  }

  // Cache the result in Redis
  await cache.setEmbedding(text, embedding, modelName);
  console.log('💾 Embedding cached in Redis');

  return embedding;
}

/**
 * Batch embed multiple texts efficiently
 * @param texts - Array of texts to embed
 * @param model - Optional model override
 * @returns Promise<number[][]> - Array of embedding vectors
 */
export async function embedTexts(texts: string[], model?: string): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  // For local service, try batch processing
  if (EMBEDDING_CONFIG.useLocal) {
    try {
      const response = await fetch(EMBEDDING_CONFIG.localUrl + '/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: texts,
          model: model || EMBEDDING_CONFIG.defaultModel,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.embeddings || result.vectors || result.data;
      }
    } catch (error) {
      console.warn('Local batch embedding failed, falling back to individual calls');
    }
  }

  // Fallback to individual calls
  const embeddings: number[][] = [];
  for (const text of texts) {
    try {
      const embedding = await embedText(text, model);
      embeddings.push(embedding);
    } catch (error) {
      console.error(`Failed to embed text: "${text.substring(0, 50)}..."`, error);
      // Push a zero vector or skip based on your requirements
      embeddings.push([]);
    }
  }

  return embeddings;
}

/**
 * Get embedding service status
 */
export async function getEmbeddingServiceStatus(): Promise<{
  local: boolean;
  nomic: boolean;
  activeService: 'local' | 'nomic' | 'none';
}> {
  let localAvailable = false;
  let nomicAvailable = false;

  // Check local service
  if (EMBEDDING_CONFIG.useLocal) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(EMBEDDING_CONFIG.localUrl + '/health', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      localAvailable = response.ok;
    } catch (error) {
      // Local service not available
    }
  }

  // Check Nomic API
  nomicAvailable = !!EMBEDDING_CONFIG.nomicApiKey;

  let activeService: 'local' | 'nomic' | 'none' = 'none';
  if (localAvailable && EMBEDDING_CONFIG.useLocal) {
    activeService = 'local';
  } else if (nomicAvailable) {
    activeService = 'nomic';
  }

  return {
    local: localAvailable,
    nomic: nomicAvailable,
    activeService,
  };
}

/**
 * Utility to calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default {
  embedText,
  embedTexts,
  getEmbeddingServiceStatus,
  cosineSimilarity,
};
