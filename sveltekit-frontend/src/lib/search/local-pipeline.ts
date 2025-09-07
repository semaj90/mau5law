import Fuse from 'fuse.js';

export interface LocalDoc {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface LocalSearchResult extends LocalDoc {
  score: number; // 0..1 (higher is better)
}

type MaybePromise<T> = T | Promise<T>;

// Very small in-memory TTL cache (fallback when Redis is not available)
class TinyTTLCache<V> {
  private map = new Map<string, { v: V; t: number }>();
  constructor(private ttlMs = 60_000) {}
  get(k: string): V | undefined {
    const hit = this.map.get(k);
    if (!hit) return undefined;
    if (Date.now() - hit.t > this.ttlMs) {
      this.map.delete(k);
      return undefined;
    }
    return hit.v;
  }
  set(k: string, v: V): void {
    this.map.set(k, { v, t: Date.now() });
  }
}

export class LocalSearchPipeline {
  private fuse: Fuse<LocalDoc>;
  private docs = new Map<string, LocalDoc>();
  private fallbackCache = new TinyTTLCache<LocalSearchResult[]>(90_000);
  private ready = false;
  private redis:
    | undefined
    | {
        get: (key: string) => MaybePromise<string | null>;
        setex?: (key: string, seconds: number, value: string) => MaybePromise<any>;
        set?: (key: string, value: string) => MaybePromise<any>;
        expire?: (key: string, seconds: number) => MaybePromise<any>;
      };

  constructor() {
    this.fuse = new Fuse([], {
      includeScore: true,
      threshold: 0.33,
      keys: [
        { name: 'text', weight: 0.8 },
        { name: 'metadata.title', weight: 0.2 },
      ] as any,
    });
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return;

    // Try to attach Redis cache if available (multiple possible modules in repo)
    try {
      const modA: any = await import('$lib/server/cache/redis');
      if (modA?.cache?.get && (modA.cache.setex || modA.cache.set || modA.cache.expire)) {
        this.redis = modA.cache;
      } else if (modA?.default?.get) {
        this.redis = modA.default;
      }
    } catch {}

    if (!this.redis) {
      try {
        const modB: any = await import('$lib/server/cache/redis-service');
        if (modB?.redis?.get) this.redis = modB.redis;
      } catch {}
    }

    // Seed with a tiny demo set if empty so first searches return something
    if (this.docs.size === 0) {
      const seed: LocalDoc[] = [
        {
          id: 'seed-1',
          text: 'Contract indemnification clause and liability limitations for commercial agreements.',
          metadata: { title: 'Indemnification Basics', type: 'contract' },
        },
        {
          id: 'seed-2',
          text: 'Case law summary regarding breach of contract and damages calculation methods.',
          metadata: { title: 'Breach and Damages', type: 'case-law' },
        },
      ];
      this.addDocuments(seed);
    }

    this.ready = true;
  }

  addDocuments(docs: LocalDoc[]): void {
    if (!docs?.length) return;
    for (const d of docs) this.docs.set(d.id, d);
    this.rebuildIndex();
  }

  removeDocument(id: string): void {
    this.docs.delete(id);
    this.rebuildIndex();
  }

  private rebuildIndex(): void {
    this.fuse.setCollection(Array.from(this.docs.values()));
  }

  async search(query: string, limit = 5): Promise<LocalSearchResult[]> {
    await this.ensureReady();
    if (!query || typeof query !== 'string') return [];

    const key = `local-search:${query}:${limit}`;

    // Redis cache first
    if (this.redis?.get) {
      try {
        const cached = await this.redis.get(key);
        if (cached) {
          const parsed = JSON.parse(cached) as LocalSearchResult[];
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    } else {
      const hit = this.fallbackCache.get(key);
      if (hit) return hit;
    }

    // Fuse v7: search takes only the query; enforce limit by slicing
    const hits = this.fuse.search(query).slice(0, limit);
    const results: LocalSearchResult[] = hits.map((h) => ({
      id: h.item.id,
      text: h.item.text,
      metadata: h.item.metadata,
      score: 1 - (h.score ?? 0),
    }));

    // Cache result
    const payload = JSON.stringify(results);
    if (this.redis?.setex) {
      try {
        await this.redis.setex(key, 90, payload);
      } catch {}
    } else if (this.redis?.set) {
      try {
        await this.redis.set(key, payload);
        if (this.redis.expire) await this.redis.expire(key, 90);
      } catch {}
    } else {
      this.fallbackCache.set(key, results);
    }

    return results;
  }

  stats() {
    return {
      docs: this.docs.size,
      hasRedis: Boolean(this.redis),
      fuseSize: (this as any).fuse?._docs?.length ?? undefined,
    };
  }
}

export const localSearchPipeline = new LocalSearchPipeline();

export async function searchLocal(query: string, limit = 5) {
  return localSearchPipeline.search(query, limit);
}

export async function addLocalDocuments(docs: LocalDoc[]) {
  return localSearchPipeline.addDocuments(docs);
}

export function localSearchStats() {
  return localSearchPipeline.stats();
}
