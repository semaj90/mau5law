import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VectorSearchService } from '../src/lib/server/vector-search-service';
import * as cache from '../src/lib/server/cache/redis';

vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

describe('VectorSearchService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('falls back to mock data when Qdrant is unreachable', async () => {
    const fetchModule = await import('node-fetch');
    const fetch = (fetchModule as any).default as any;
    fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'error' });

    const cacheGetSpy = vi.spyOn(cache, 'cacheGet').mockResolvedValue(null as any);
    const cacheSetSpy = vi.spyOn(cache, 'cacheSet').mockResolvedValue('OK' as any);

    const res = await VectorSearchService.searchByEmbedding(new Float32Array([0, 1, 2]), { limit: 3 });
    expect(res.length).toBeGreaterThan(0);
    expect(cacheSetSpy).toHaveBeenCalled();
  });
});
