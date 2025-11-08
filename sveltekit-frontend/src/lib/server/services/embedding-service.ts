/**
 * Embedding Service
 * Unified entry point that can talk to Ollama, TensorRT-LLM, or future backends
 * while applying Redis-based caching and automatic model fallbacks.
 */

type BackendResolver = (name?: string) => string;

let resolveBackendFromProvider: BackendResolver | undefined;
let redisClient:
  | {
      get: (key: string) => Promise<string | null>;
      set: (key: string, value: string, opts?: { EX?: number }) => Promise<void>;
    }
  | undefined;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cfg = require('$lib/services/providers/ollama/config');
  resolveBackendFromProvider = cfg?.getBackend;
} catch {
  // Provider registry not available in this environment (tests, type-checking, etc.)
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const redisModule = require('$lib/server/cache/redis');
  redisClient = redisModule?.redis;
} catch {
  // Redis cache is optional; continue without caching.
}

export type EmbeddingMode = 'tensorrt' | 'ollama' | 'webgpu';

export interface EmbedRequest {
  texts: string[];
  model?: string;
  mode?: EmbeddingMode;
  normalize?: boolean; // Added property
  batchSize?: number; // Added property
  requestId?: string; // Added property
}

export interface EmbedResponse {
  embeddings: number[][];
  gpuTime?: number; // Added property
  parallelWorkers?: number; // Added property
  requestId?: string;
  source: string;
  cacheHit: boolean;
  fallbackModel?: string;
}

const DEFAULT_MODEL = 'embeddinggemma:latest';
const FALLBACK_MODELS = ['nomic-embed-text:latest'];
const CACHE_TTL_SECONDS = 3600;
const EXPECTED_DIMENSIONS = 384;

function getBackendSafe(name?: string): string {
  if (resolveBackendFromProvider) {
    return resolveBackendFromProvider(name);
  }

  switch (name) {
    case 'tensorrt':
      return 'http://localhost:8001';
    case 'webgpu':
      return 'http://localhost:3002';
    case 'ollama':
    default:
      return (process.env.PUBLIC_OLLAMA_URL as string) || 'http://localhost:11434';
  }
}

function resolveEndpoint(baseUrl: string, mode?: EmbeddingMode): string {
  const trimmed = baseUrl.replace(/\/$/, '');
  if (mode === 'tensorrt') {
    return `${trimmed}/v2/models/embeddings/infer`;
  }
  return `${trimmed}/api/embeddings`;
}

function normalizeVectors(payload: unknown): number[][] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;

  if (Array.isArray(data.embeddings)) {
    return data.embeddings as number[][];
  }

  if (data.data && Array.isArray((data.data as Record<string, unknown>).embeddings)) {
    return ((data.data as Record<string, unknown>).embeddings ?? []) as number[][];
  }

  if (Array.isArray(data.embedding)) {
    return [data.embedding as number[]];
  }

  if (Array.isArray(data.data)) {
    return data.data as number[][];
  }

  return [];
}

function enforceDimensions(vectors: number[][]): number[][] {
  if (!vectors.length || EXPECTED_DIMENSIONS <= 0) {
    return vectors;
  }

  const [first] = vectors;
  if (first && first.length === EXPECTED_DIMENSIONS) {
    return vectors;
  }

  console.warn(
    `Embedding dimension mismatch (expected ${EXPECTED_DIMENSIONS}, received ${first?.length ?? 0}).` +
      ' Results will be truncated to maintain consistent dimensionality.'
  );
  return vectors.map((vector) => vector.slice(0, EXPECTED_DIMENSIONS));
}

function getModelCandidates(requested?: string): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const pushUnique = (model?: string) => {
    if (!model) return;
    if (!seen.has(model)) {
      seen.add(model);
      ordered.push(model);
    }
  };

  pushUnique(requested);
  pushUnique(DEFAULT_MODEL);
  for (const fallback of FALLBACK_MODELS) {
    pushUnique(fallback);
  }

  return ordered;
}

async function tryReadCache(model: string, texts: string[]): Promise<number[][] | null> {
  if (!redisClient) return null;
  const cacheKey = buildCacheKey(model, texts);
  try {
    const cached = await redisClient.get(cacheKey);
    return cached ? (JSON.parse(cached) as number[][]) : null;
  } catch (err) {
    console.warn('Embedding cache get failed: ', err);
    return null;
  }
}

async function writeCache(model: string, texts: string[], vectors: number[][]): Promise<void> {
  if (!redisClient) return;
  const cacheKey = buildCacheKey(model, texts);
  try {
    await redisClient.set(cacheKey, JSON.stringify(vectors), { EX: CACHE_TTL_SECONDS });
  } catch (err) {
    console.warn('Embedding cache set failed: ', err);
  }
}

function buildCacheKey(model: string, texts: string[]): string {
  return `emb:${model}:${JSON.stringify(texts)}`;
}

async function fetchEmbeddings(
  model: string,
  texts: string[],
  mode?: EmbeddingMode
): Promise<{ vectors: number[][]; source: string }> {
  const backend = resolveBackend(mode);
  const endpoint = resolveEndpoint(backend, mode);
  const payload = {
    model,
    input: texts.length === 1 ? texts[0] : texts,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Embedding request failed (${model}): ${response.status} ${response.statusText}`
    );
  }

  const json = await response.json();
  const vectors = normalizeVectors(json);
  if (!vectors.length) {
    throw new Error(`Embedding response did not include embeddings for model ${model}`);
  }

  return { vectors: enforceDimensions(vectors), source: backend };
}

function resolveBackend(mode?: EmbeddingMode): string {
  switch (mode) {
    case 'tensorrt':
      return getBackendSafe('tensorrt');
    case 'webgpu':
      return getBackendSafe('webgpu');
    case 'ollama':
    default:
      return getBackendSafe('ollama');
  }
}

export async function generateEmbeddings({
  texts,
  model = DEFAULT_MODEL,
  mode,
}: EmbedRequest): Promise<EmbedResponse> {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('generateEmbeddings requires a non-empty texts array');
  }

  const modelCandidates = getModelCandidates(model);
  let lastError: unknown;

  for (const candidate of modelCandidates) {
    const cached = await tryReadCache(candidate, texts);
    if (cached) {
      return { embeddings: cached, source: 'redis', cacheHit: true, fallbackModel: candidate };
    }

    try {
      const { vectors, source } = await fetchEmbeddings(candidate, texts, mode);
      await writeCache(candidate, texts, vectors);
      const fallbackModelUsed = candidate !== model ? candidate : undefined;
      return {
        embeddings: vectors,
        source,
        cacheHit: false,
        fallbackModel: fallbackModelUsed,
      };
    } catch (err) {
      lastError = err;
      console.warn(`Embedding model ${candidate} failed. Trying next fallback...`, err);
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All embedding models failed to generate embeddings');
}

export async function generateEmbedding(
  text: string,
  options?: Omit<EmbedRequest, 'texts'>
): Promise<{ embedding: number[]; source: string; cacheHit: boolean; fallbackModel?: string }> {
  const { embeddings, source, cacheHit, fallbackModel } = await generateEmbeddings({
    texts: [text],
    model: options?.model,
    mode: options?.mode,
  });

  return { embedding: embeddings[0], source, cacheHit, fallbackModel };
}
