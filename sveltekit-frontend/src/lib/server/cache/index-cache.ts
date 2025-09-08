/**
 * Index Cache Helper
 * - Persists embedding shards, ranking bitmaps, and CHR pattern manifests in Redis
 * - Provides coarse-grained TTL and versioning
 */

type RedisJSON = {
  getJSON: <T = unknown>(key: string) => Promise<T | null>;
  setJSON: (key: string, value: unknown, ttlSeconds?: number) => Promise<void>;
};

let cache: RedisJSON | null = null;
async function ensure() {
  if (cache) return cache;
  try {
    // @ts-ignore
    const mod = await import('./redis-cache');
    cache = { getJSON: mod.getJSON, setJSON: mod.setJSON } as RedisJSON;
  } catch {
    cache = null;
  }
  return cache;
}

export interface EmbeddingShard {
  id: string; // e.g., doc:chunk:hash
  dim: number;
  vec: number[]; // small shards or PQ codebooks in future
  createdAt: string;
}

export interface RankingBitmap {
  id: string; // e.g., query:hash
  bitmapHex: string; // compact hitset
  createdAt: string;
}

export interface CHRManifest {
  id: string; // e.g., chr:bundle:<query-hash>
  keys: string[]; // list of CHR keys persisted elsewhere
  ttlSec: number;
  createdAt: string;
}

export async function putEmbeddingShard(shard: EmbeddingShard, ttlSec = 24 * 3600) {
  const c = await ensure(); if (!c) return;
  await c.setJSON(`index:shard:${shard.id}`, shard, ttlSec);
}

export async function getEmbeddingShard(id: string) {
  const c = await ensure(); if (!c) return null;
  return c.getJSON<EmbeddingShard>(`index:shard:${id}`);
}

export async function putRankingBitmap(b: RankingBitmap, ttlSec = 3600) {
  const c = await ensure(); if (!c) return;
  await c.setJSON(`index:rank:${b.id}`, b, ttlSec);
}

export async function getRankingBitmap(id: string) {
  const c = await ensure(); if (!c) return null;
  return c.getJSON<RankingBitmap>(`index:rank:${id}`);
}

export async function putCHRManifest(m: CHRManifest, ttlSec = 600) {
  const c = await ensure(); if (!c) return;
  await c.setJSON(`index:chr:${m.id}`, m, ttlSec);
}

export async function getCHRManifest(id: string) {
  const c = await ensure(); if (!c) return null;
  return c.getJSON<CHRManifest>(`index:chr:${id}`);
}
