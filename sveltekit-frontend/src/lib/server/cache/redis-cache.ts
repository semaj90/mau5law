// Lightweight Redis JSON cache helper (ioredis) with safe fallbacks.
// Standardizes on REDIS_URL or localhost:6379.

let client: any | null = null;
const pending = new Map<string, Promise<any>>();

function getRedisUrl() {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

async function ensureClient() {
  if (client) return client;
  try {
    const mod = await import('ioredis');
    const Redis = (mod as any).default ?? (mod as any);
    client = new Redis(getRedisUrl());
    // best-effort connect
    await client.ping().catch(() => {});
    return client;
  } catch {
    client = null;
    return null;
  }
}

export async function getJSON<T = unknown>(key: string): Promise<T | null> {
  const c = await ensureClient();
  if (!c) return null;
  try {
    const v = await c.get(key);
    if (!v) return null;
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  const c = await ensureClient();
  if (!c) return;
  try {
    const s = JSON.stringify(value);
    if (ttlSeconds > 0) await c.set(key, s, 'EX', ttlSeconds);
    else await c.set(key, s);
  } catch {
    // ignore
  }
}

// Simple anti-stampede: coalesce concurrent misses per key in-process.
export async function withCache<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<{ value: T; cached: boolean }>{
  const hit = await getJSON<T>(key);
  if (hit != null) return { value: hit, cached: true };

  if (pending.has(key)) {
    const v = await pending.get(key)!;
    return { value: v as T, cached: false };
  }
  const p = (async () => {
    const v = await compute();
    // best effort set; ignore errors
    setJSON(key, v as unknown, ttlSeconds).catch(() => {});
    return v;
  })();
  pending.set(key, p);
  try {
    const v = await p;
    return { value: v as T, cached: false };
  } finally {
    pending.delete(key);
  }
}
