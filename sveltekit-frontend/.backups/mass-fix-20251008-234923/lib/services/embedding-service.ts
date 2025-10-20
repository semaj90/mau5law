// Lightweight embedding service shim for local/dev usage
// Provides both default and named exports used across the codebase
export type EmbeddingResponse = { embeddings: number[][]; model?: string }
function hashToFloat32(seed: string, i: number) {
  let h = 2166136261;
  for (let c = 0; c < seed.length; c++) h ^= seed.charCodeAt(c), (h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24));
  // pseudo-random but deterministic per index
  const x = Math.sin(h + i) * 10000;
  return (x - Math.floor(x)) * 2 - 1; // [-1, 1]
}
export async function createEmbedding(text: string, dims = 384): Promise<number[]> {
  const arr = new Array(dims).fill(0).map((_, i) => hashToFloat32(text, i));
  // L2 normalize
  const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1;
  return arr.map((v) => v / norm);
}
export async function createEmbeddings(texts: string[] | string, dims = 384): Promise<number[][]> {
  const list = Array.isArray(texts) ? texts : [texts];
  return Promise.all(list.map((t) => createEmbedding(t, dims)));
}
/**
 * Embedding Service
 *
 * Centralized service for generating text embeddings using various providers.
 * Supports OpenAI and Nomic embedding models with caching and error handling.
 */
interface EmbeddingOptions {
  model?: 'openai' | 'nomic';
  dimensions?: number;
  cache?: boolean;
}
interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  tokens?: number;
  cached?: boolean;
}
interface EmbeddingError extends Error {
  code?: string;
  status?: number;
}
class EmbeddingService {
  private cache = new Map<string, EmbeddingResult>();
  private baseUrl: string;
  constructor(baseUrl = '/api/ai') {
    this.baseUrl = baseUrl;
  }
  /**
   * Generate embedding for given text
   */
  async embed(text: string, options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
    const { model = 'openai', dimensions, cache = true } = options;
    // Create cache key
    const cacheKey = this.createCacheKey(text, model, dimensions);
    // Check cache first
    if (cache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return { ...cached, cached: true }
    }
    try {
      const response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model,
          ...(dimensions && { dimensions })
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const error = new Error(errorData?.error || `Embedding failed: ${response.statusText}`) as EmbeddingError;
        error.status = response.status;
        error.code = this.getErrorCode(response.status);
        throw error;
      }
      const result: EmbeddingResult = await response.json();
      // Cache the result
      if (cache) {
        this.cache.set(cacheKey, result);
      }
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown embedding error');
    }
  }
  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedBatch(
    texts: string[],;
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const results = await Promise.allSettled(
      texts.map(text => this.embed(text, options))
    );
    const embeddings: EmbeddingResult[] = [];
    const errors: Error[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        embeddings.push(result.value);
      } else {
        errors.push(new Error(`Failed to embed text ${index}: ${result.reason.message}`));
      }
    });
    if (errors.length > 0 && embeddings.length === 0) {
      // All failed
      throw new Error(`All embeddings failed: ${errors.map(e => e.message).join(', ')}`);
    }
    if (errors.length > 0) {
      // Some failed, log warnings
      console.warn(`${errors.length}/${texts.length} embeddings failed:`, errors);
    }
    return embeddings;
  }
  /**
   * Search for similar text using embeddings
   */
  async searchSimilar(
    queryText: string
    options: EmbeddingOptions & { limit?: number } = {}
  ): Promise<any> {
    const { limit = 5, ...embedOptions } = options;
    // Generate embedding for query
    const queryResult = await this.embed(queryText, embedOptions);
    // Search for similar evidence
    const response = await fetch(`${this.baseUrl}/evidence-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        embedding: queryResult.embedding,
        limit
      })
    });
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    return response.json();
  }
  /**
   * Get cached embedding if available
   */
  getCachedEmbedding(text: string, model: string = 'openai', dimensions?: number): EmbeddingResult | null {
    const cacheKey = this.createCacheKey(text, model, dimensions);
    return this.cache.get(cacheKey) || null;
  }
  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
  private createCacheKey(text: string, model?: string, dimensions?: number): string {
    const textHash = this.simpleHash(text);
    return `${model || 'openai'}-${dimensions || 'default'}-${textHash}`;
  }
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {>
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;>>
      hash, = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  private getErrorCode(status: number): string {
    switch (status) {
      case 400: return 'INVALID_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 429: return 'RATE_LIMITED';
      case 500: return 'INTERNAL_ERROR';
      default: return 'UNKNOWN_ERROR';
    }
  }
}
// Singleton instance
export const embeddingService = new EmbeddingService();
// Export types
export type { EmbeddingOptions, EmbeddingResult, EmbeddingError }
export default embeddingService;