// src/lib/server/rag/cache.ts

import crypto from 'node:crypto';
import { ensureRedis, redis } from '$lib/server/redis';

const TTL_SECONDS = Number(process.env.RAG_CACHE_TTL_SECONDS ?? 3600);

function stableStringify(obj: any) {
  // deterministic key material
  return JSON.stringify(obj, Object.keys(obj).sort());
}

export function ragCacheKey(input: {
  kind: 'rag_search' | 'context_chat';
  query: string;

  // filters
  caseId?: string | null;
  jurisdiction?: string | null;
  tagIds?: string[];

  // knobs
  limit?: number;
  scoreThreshold?: number;

  // versioning (prevents "wrong model reused" bugs)
  embedModel?: string;
  chatModel?: string;
  collection?: string;
}) {
  const normalized = {
    kind: input.kind,
    query: input.query.trim().toLowerCase(),
    caseId: input.caseId ?? null,
    jurisdiction: input.jurisdiction ?? null,
    tagIds: (input.tagIds ?? []).slice().sort(),
    limit: input.limit ?? null,
    scoreThreshold: input.scoreThreshold ?? null,
    embedModel: input.embedModel ?? process.env.EMBEDDING_MODEL ?? process.env.OLLAMA_MODEL_EMBED ?? null,
    chatModel: input.chatModel ?? process.env.OLLAMA_MODEL_CHAT ?? process.env.OLLAMA_MODEL ?? null,
    collection: input.collection ?? process.env.QDRANT_COLLECTION ?? null,
  };

  const hash = crypto.createHash('sha256').update(stableStringify(normalized)).digest('hex');
  return `rag:${normalized.kind}:${hash}`;
}

export async function cacheGetJSON<T>(key: string): Promise<T | null> {
  await ensureRedis();
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJSON(key: string, value: any, ttlSeconds = TTL_SECONDS) {
  await ensureRedis();
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}