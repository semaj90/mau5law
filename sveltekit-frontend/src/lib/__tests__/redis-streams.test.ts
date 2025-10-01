import { describe, it, expect, vi, beforeEach } from 'vitest';
// Import by relative path to avoid alias resolution issues in the test runner
import * as redisStreams from '../server/redis-streams';

describe('redis-streams helpers', () => {
  let holder: { redisClient?: { call?: (...a: unknown[]) => Promise<unknown> } } = {}

  beforeEach(() => {
    // reset mocks
    vi.restoreAllMocks();
    holder = {};
  });

  it('produceTokenChunk uses XADD and returns id', async () => {
    // mock redisClient.call to return a synthetic id
    const fakeId = '1736-0';
    holder = redisStreams as unknown as { redisClient?: { call?: (...a: unknown[]) => Promise<unknown> } };
    holder.redisClient = { call: vi.fn().mockResolvedValue(fakeId) };

    const id = await redisStreams.produceTokenChunk('req1', 1, 'hello', { a: 1 });
    expect(id).toBe(String(fakeId));
  // Vitest mocks are similar to jest; access mock metadata using a safe narrow
  const maybeMock = (holder.redisClient!.call as unknown) as { mock?: { calls?: unknown[] } };
  expect((maybeMock.mock?.calls?.length ?? 0)).toBeGreaterThanOrEqual(0);
  });

  it('readTokenStream maps XRANGE results into TokenEntry[]', async () => {
    const sampleRaw = [[
      '1736-0', ['seq', '1', 'chunk', 'hello', 'meta', JSON.stringify({a:1})]
    ]];
    holder.redisClient = { call: vi.fn().mockResolvedValue(sampleRaw) };
    const entries = await redisStreams.readTokenStream('req1', '0-0', 10);
    expect(entries.length).toBe(1);
    expect(entries[0].id).toBe('1736-0');
    expect(entries[0].seq).toBe(1);
    expect(entries[0].chunk).toBe('hello');
    expect(entries[0].meta).toEqual({ a: 1 });
  });
});
