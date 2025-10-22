/**
 * Embedding Service wrapper
 * - Provides a small, environment-configurable API for generating embeddings.
 * - Modes: "server" (calls backend endpoints), "wasm" (uses local worker), "gpu" (attempts GPU bridge)
 * - ENV used:
 *    EMBEDDING_MODE: 'server' | 'wasm' | 'gpu' (default: 'server')
 *    EMBEDDING_SERVICE_URL: base URL for server mode (default: '/api/embeddings/generate')
 */
import { browser } from '$app/environment';
import { createWorkerPool, getWorkerPool } from '$lib/workers/legal-ai-worker-pool';

export type EmbeddingOptions = {
  normalize?: boolean;
  model?: string;
  chunkSize?: number;
  overlap?: number;
  useCache?: boolean;
};

const DEFAULT_SERVICE_URL = '/api/embeddings/generate';

function env(name: string, fallback?: string): string | undefined {
  try {
    // access via import.meta.env in Vite/SvelteKit or process.env on server
    // keep simple and prefer process.env for Node and import.meta for browser builds
    // This helper intentionally returns undefined for missing values.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = typeof import.meta !== 'undefined' ? (import.meta as any) : undefined;
    if (meta && meta.env && meta.env[name] !== undefined) return String(meta.env[name]);
  } catch {}
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[name] !== undefined)
      return String(process.env[name]);
  } catch {}
  return fallback;
}

const MODE = (env('EMBEDDING_MODE') || 'server') as 'server' | 'wasm' | 'gpu';
const SERVICE_URL = (env('EMBEDDING_SERVICE_URL') || DEFAULT_SERVICE_URL) as string;

async function callServerEmbeddings(texts: string[] | string, options?: EmbeddingOptions) {
  const body = Array.isArray(texts)
    ? { texts: texts, model: options?.model, options }
    : { text: texts, model: options?.model, options };
  const resp = await fetch(SERVICE_URL + (Array.isArray(texts) ? '?action=batch' : ''), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Embedding server error: ${resp.status} ${resp.statusText}`);
  }
  const json = await resp.json();
  if (!json || json.success === false) {
    throw new Error(`Embedding server returned failure: ${json?.error || 'unknown'}`);
  }
  // Normalise response shapes: prefer { data.embeddings } or { embeddings }
  if (json.data?.embeddings) return json.data.embeddings as number[][];
  if (json.embeddings) return json.embeddings as number[][];
  if (json.data?.embedding) return Array.isArray(json.data.embedding[0]) ? json.data.embedding : [json.data.embedding];
  if (json.data?.embedding) return [json.data.embedding];
  // last attempt: assume top-level `data` is the embedding or embeddings
  if (json.data && Array.isArray(json.data)) return json.data as number[][];
  throw new Error('Unexpected embedding response shape from server');
}

async function callWasmWorker(texts: string[] | string, options?: EmbeddingOptions) {
  if (!browser) throw new Error('WASM worker can only be used in browser environment');
  // Use singleton worker pool (the pool's internal embedding path calls /api/embeddings/generate by default)
  let pool = getWorkerPool();
  if (!pool) pool = createWorkerPool({ maxWorkers: 2, enableSIMD: true });
  if (Array.isArray(texts)) {
    // sequentially generate embeddings for the batch to keep worker protocol simple
    const results: number[][] = [];
    for (const t of texts) {
      const res = await pool.generateEmbeddings(t, options?.model, options);
      if (!res.success) throw new Error(res.error || 'Worker embedding failed');
      // worker returns data as-is; try to normalize
      const data = res.data as any;
      if (Array.isArray(data?.embeddings)) results.push(...(data.embeddings as number[][]));
      else if (Array.isArray(data?.embedding)) results.push(data.embedding as number[]);
      else if (Array.isArray(data)) results.push(data as number[]);
      else throw new Error('Unexpected worker embedding shape');
    }
    return results;
  } else {
    const res = await pool.generateEmbeddings(texts, options?.model, options);
    if (!res.success) throw new Error(res.error || 'Worker embedding failed');
    const data = res.data as any;
    if (Array.isArray(data?.embedding)) return data.embedding as number[];
    if (Array.isArray(data)) return data as number[];
    throw new Error('Unexpected worker embedding shape');
  }
}

async function callGpuBridge(texts: string[] | string, options?: EmbeddingOptions) {
  // GPU bridge uses the gpu-integration-bridge service which may call local FastAPI/Ollama
  const GPU_URL = env('GPU_EMBEDDING_URL') || '/api/gpu/embeddings';
  const body = Array.isArray(texts)
    ? { texts, model: options?.model, options }
    : { text: texts, model: options?.model, options };
  const resp = await fetch(GPU_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`GPU embedding bridge error: ${resp.status}`);
  const json = await resp.json();
  if (json?.embeddings) return json.embeddings as number[][];
  if (json?.embedding) return Array.isArray(json.embedding[0]) ? json.embedding : [json.embedding];
  throw new Error('Unexpected GPU bridge response');
}

export async function generateEmbeddings(
  texts: string[] | string,
  options?: EmbeddingOptions
): Promise<number[][] | number[]> {
  const mode = (options && (options as any).mode) || MODE;
  switch (mode) {
    case 'wasm':
      return callWasmWorker(texts, options);
    case 'gpu':
      return callGpuBridge(texts, options);
    case 'server':
    default:
      return callServerEmbeddings(texts, options);
  }
}

export default { generateEmbeddings };
// Lightweight embedding service shim for local/dev usage
// Provides both default and named exports used across the codebase
export type EmbeddingResponse = { embeddings: number[][]; model?: string };
function hashToFloat32(seed: string, i: number) {
  let h = 2166136261;
  for (let c = 0; c < seed.length; c++)
    ((h ^= seed.charCodeAt(c)), (h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)));
  // pseudo-random but deterministic per index
  const x = Math.sin(h + i) * 10000;
  return (x - Math.floor(x)) * 2 - 1; // [-1, 1]
}
export async function createEmbedding(text: string, dims = 384): Promise<number[]> {
  const arr = new Array(dims).fill(0).map((_, i) => hashToFloat32(text, i));
  // L2 normalize
  const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1;
  return arr.map(v => v / norm);
}
export async function createEmbeddings(texts: string[] | string, dims = 384): Promise<number[][]> {
  const list = Array.isArray(texts) ? texts : [texts];
  return Promise.all(list.map(t => createEmbedding(t, dims)));
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
      return { ...cached, cached: true };
    }
    try {
      const response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model,
          ...(dimensions && { dimensions }),
        }),
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
  async embedBatch(texts: string[], options: EmbeddingOptions = {}): Promise<EmbeddingResult[]> {
    const results = await Promise.allSettled(texts.map(text => this.embed(text, options)));
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
  async searchSimilar(queryText: string, options: EmbeddingOptions & { limit?: number } = {}): Promise<any> {
    const { limit = 5, ...embedOptions } = options;
    // Generate embedding for query
    const queryResult = await this.embed(queryText, embedOptions);
    // Search for similar evidence
    const response = await fetch(`${this.baseUrl}/evidence-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embedding: queryResult.embedding,
        limit,
      }),
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
      keys: Array.from(this.cache.keys()),
    };
  }
  private createCacheKey(text: string, model?: string, dimensions?: number): string {
    const textHash = this.simpleHash(text);
    return `${model || 'openai'}-${dimensions || 'default'}-${textHash}`;
  }
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  private getErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'INVALID_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 429:
        return 'RATE_LIMITED';
      case 500:
        return 'INTERNAL_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }
}
// Singleton instance
export const embeddingService = new EmbeddingService();
// Export types
export type { EmbeddingOptions, EmbeddingResult, EmbeddingError };
export default embeddingService;
