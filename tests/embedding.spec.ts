import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmbeddingFromGemma } from '../src/lib/server/ai/embeddinggemma-service';
import * as cache from '../src/lib/server/cache/redis';

vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

describe('getEmbeddingFromGemma', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns embedding from Ollama and caches it', async () => {
    const fakeEmbedding = [0.1, 0.2, 0.3];
    const fetchModule = await import('node-fetch');
    const fetch = (fetchModule as any).default as any;
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: fakeEmbedding }) });

    const cacheGetSpy = vi.spyOn(cache, 'cacheGet').mockResolvedValue(null as any);
    const cacheSetSpy = vi.spyOn(cache, 'cacheSet').mockResolvedValue('OK' as any);

    const res = await getEmbeddingFromGemma('test');
    expect(res).toEqual(fakeEmbedding);
    expect(cacheGetSpy).toHaveBeenCalled();
    expect(cacheSetSpy).toHaveBeenCalled();
  });
});
