/**
 * redis-streams.ts
 * Typed Redis Streams producer/consumer helpers for token-chunk streaming.
 * Design: write token chunks to a stream named `stream:tokens:{requestId}`.
 * Producers append messages with fields: { seq: <number>, chunk: <string>, meta: <json> }
 * Consumers read with XRANGE/XREAD to replay tokens for resume semantics.
 */
import type RedisType from 'ioredis';
import Redis from 'ioredis';

// Use the shared RedisService if available in the project. Fall back to a local client for tests/dev.
let client: RedisType | null = null;
// Try to reuse a global redis client if a RedisService initialized one is available
const maybeGlobal = (globalThis as unknown as Record<string, unknown>).__REDIS;
client = (maybeGlobal as unknown as RedisType) || null;
if (!client) {
  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
}

export type TokenEntry = { id: string; seq: number; chunk: string; meta: Record<string, unknown> };

function streamKey(requestId: string) {
  return `stream:tokens:${requestId}`;
}

/**
 * Produce a token chunk to the Redis Stream for the given requestId.
 * Returns the Redis-generated stream id (e.g. 169616...-0)
 */
export async function produceTokenChunk(
  requestId: string,
  seq: number,
  chunk: string,
  meta: Record<string, unknown> = {}
): Promise<string> {
  if (!client) throw new Error('Redis client not initialized');
  const key = streamKey(requestId);
  const fields: string[] = ['seq', String(seq), 'chunk', chunk, 'meta', JSON.stringify(meta)];
  // Use a lightweight RedisLike abstraction to avoid direct `any` usage
  type RedisLike = {
    xadd?: (...args: unknown[]) => Promise<unknown>;
    xAdd?: (...args: unknown[]) => Promise<unknown>;
    call?: (...args: unknown[]) => Promise<unknown>;
  };
  const redisLike = client as unknown as RedisLike;
  if (typeof redisLike.xadd === 'function' || typeof redisLike.xAdd === 'function') {
    const fn = (redisLike.xadd ?? redisLike.xAdd) as (...args: string[]) => Promise<unknown>;
    const id = await fn.call(client, key, '*', ...fields);
    return String(id ?? '');
  }
  // Fallback to raw call helper
  const id = await redisCall('XADD', key, '*', ...fields);
  return String(id ?? '');
}

/**
 * Read token entries from a Redis stream using XRANGE.
 * Returns an array of TokenEntry ordered by stream id ascending.
 */
export async function readTokenStream(requestId: string, fromId = '0-0', count = 100): Promise<TokenEntry[]> {
  if (!client) throw new Error('Redis client not initialized');
  const key = streamKey(requestId);
  const rawRes = await redisCall('XRANGE', key, fromId, '+', 'COUNT', String(count));
  const raw = rawRes as Array<[string, string[]]> | null;
  if (!raw) return [];
  const out: TokenEntry[] = raw.map(([id, fields]) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      obj[fields[i]] = fields[i + 1];
    }
    const meta = obj.meta ? safeJsonParse(obj.meta, {}) : {};
    const seq = obj.seq ? Number(obj.seq) : 0;
    return { id, seq, chunk: obj.chunk ?? '', meta };
  });
  return out;
}

/**
 * Trim a stream to approximately maxLen entries.
 */
export async function trimTokenStream(requestId: string, maxLen = 1000): Promise<void> {
  if (!client) throw new Error('Redis client not initialized');
  const key = streamKey(requestId);
  await redisCall('XTRIM', key, 'MAXLEN', '~', String(maxLen));
}

/**
 * Consume new entries (XREAD) from the stream starting at `fromId` and invoke callback for each.
 * Stops after `stopAfterMs` of inactivity.
 */
export async function consumeTokenStream(
  requestId: string,
  fromId = '0-0',
  callback: (entry: TokenEntry) => Promise<void>,
  stopAfterMs = 30000
): Promise<void> {
  if (!client) throw new Error('Redis client not initialized');
  const key = streamKey(requestId);
  let lastId = fromId;
  const start = Date.now();
  while (Date.now() - start < stopAfterMs) {
    const resRaw = await redisCall('XREAD', 'COUNT', '50', 'BLOCK', '5000', 'STREAMS', key, lastId);
    const res = resRaw as Array<[string, Array<[string, string[]]>]> | null;
    if (!res) continue; // timeout
    // res shape: [[key, [[id, [field, value, ...]], ...]]]
    for (const [, entries] of res) {
      for (const [id, fields] of entries) {
        const obj: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
        const meta = obj.meta ? safeJsonParse(obj.meta, {}) : {};
        const seq = obj.seq ? Number(obj.seq) : 0;
        const entry: TokenEntry = { id, seq, chunk: obj.chunk ?? '', meta };
        await callback(entry);
        lastId = id;
      }
    }
  }
}

function safeJsonParse<T = unknown>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function redisCall(...args: string[]): Promise<unknown> {
  if (!client) return Promise.reject(new Error('Redis client not initialized'));
  const c = client as unknown as {
    call?: (...a: unknown[]) => Promise<unknown>;
    sendCommand?: (...a: unknown[]) => Promise<unknown>;
  };
  if (typeof c.call === 'function') return c.call(...args);
  if (typeof c.sendCommand === 'function') return c.sendCommand(args as unknown[]);
  // Last-resort attempt using index signature
  const anyClient = client as unknown as Record<string, unknown>;
  const maybeCall = anyClient['call'] as unknown;
  if (typeof maybeCall === 'function')
    return (maybeCall as (...a: unknown[]) => Promise<unknown>).apply(client, args as unknown[]);
  return Promise.reject(new Error('Redis client does not support call/sendCommand'));
}

export { client as redisClient };
