import stream from "stream";
// Simple in-memory registry for active RAG streams to support interrupt & summary
// NOTE: Non-persistent; fine for dev. For prod, consider Redis channel or durable map.
import { randomUUID, createHash } from 'crypto';

// TTL (ms) after which inactive streams are cleaned
const STREAM_TTL_MS = 5 * 60 * 1000; // 5 minutes
let lastSweep = Date.now();

export interface ActiveStream {
  id: string;
  createdAt: number;
  controller: AbortController; // to cancel upstream model/provider
  tokens: string[]; // accumulated tokens for optional summarization
  interrupted?: boolean;
  summarySent?: boolean;
  lastActivity?: number;
}

const streams = new Map<string, ActiveStream>();

// Optional Redis integration for distributed registry & summary cache
import Redis from 'ioredis';
let redis: Redis | null = null;
const redisUrl = (process as any).env.RAG_REDIS_URL;
if (redisUrl) {
  try {
    redis = new Redis(redisUrl);
    // ioredis connects automatically
  } catch {
    redis = null;
  }
}

const SUMMARY_CACHE_PREFIX = 'rag:summary:';

export function createStream(): ActiveStream {
  const controller = new AbortController();
  const id = randomUUID();
  const now = Date.now();
  const stream: ActiveStream = { id, createdAt: now, controller, tokens: [], lastActivity: now };
  streams.set(id, stream);
  sweepIfNeeded();
  return stream;
}

export function getStream(id: string): ActiveStream | undefined {
  return streams.get(id);
}

export function removeStream(id: string) {
  streams.delete(id);
}

export function recordToken(id: string, token: string) {
  const s = streams.get(id);
  if (s && !s.interrupted) {
    s.tokens.push(token);
    s.lastActivity = Date.now();
  }
}

export function interruptStream(id: string, mode: 'graceful' | 'force' = 'graceful') {
  const s = streams.get(id);
  if (!s) return false;
  s.interrupted = true;
  if (mode === 'force') {
    s.controller.abort();
    return true;
  }
  // graceful: allow caller to finish but mark interrupted so upstream can stop generation
  return true;
}

export function generateSummary(id: string, maxSentences = 3): string | undefined {
  const s = streams.get(id);
  if (!s) return undefined;
  if (!s.tokens.length) return undefined;
  const text = s.tokens.join(' ');
  return summarizeText(text, maxSentences);
}

export function listActive() {
  return Array.from(streams.values()).map((s) => ({ id: s.id, tokens: s.tokens.length }));
}

// Retrieve or compute & store summary in cache (memory/redis)
export async function cachedSummary(text: string, maxSentences = 3): Promise<string | undefined> {
  if (!text) return undefined;
  const hash = createHash('sha256').update(text).digest('hex');
  const key = SUMMARY_CACHE_PREFIX + hash + ':' + maxSentences;
  // Redis first
  if (redis) {
    try {
      const existing = await redis.get(key);
      if (existing) return existing;
    } catch {}
  }
  // Memory cache via Map keyed by key (reuse streams map not ideal) – lightweight singleton
  const mem =
    (globalThis as any).__ragSummaryCache || ((globalThis as any).__ragSummaryCache = new Map());
  if (mem.has(key)) return mem.get(key);
  const summary = summarizeText(text, maxSentences);
  if (summary) {
    mem.set(key, summary);
    if (redis) {
      try {
        await (redis as any).set(key, summary, 'EX', 3600);
      } catch {}
    }
  }
  return summary;
}

// --------- Internal helpers ---------

function summarizeText(text: string, maxSentences: number): string | undefined {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!sentences.length) return text.slice(0, 300);
  // Build TF counts
  const termFreq: Record<string, number> = {};
  const sentenceTerms: string[][] = [];
  for (const s of sentences) {
    const terms = s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2);
    const unique = new Set<string>();
    for (const t of terms) {
      unique.add(t);
      termFreq[t] = (termFreq[t] || 0) + 1;
    }
    sentenceTerms.push(Array.from(unique));
  }
  // IDF approximation
  const totalSent = sentences.length;
  const idf: Record<string, number> = {};
  for (const [term, tf] of Object.entries(termFreq)) {
    idf[term] = Math.log(1 + totalSent / (1 + tf));
  }
  // Score sentences
  const scored = sentences.map((s, i) => {
    const terms = sentenceTerms[i];
    let score = 0;
    for (const t of terms) score += idf[t] || 0;
    // Position boost: first + last
    if (i === 0 || i === totalSent - 1) score *= 1.15;
    return { s, score, i };
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored
    .slice(0, maxSentences)
    .map((x) => x.s)
    .join(' ');
}

function sweepIfNeeded() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return; // sweep at most once per minute
  lastSweep = now;
  for (const [id, stream] of streams.entries()) {
    if (now - stream.createdAt > STREAM_TTL_MS) streams.delete(id);
  }
}
