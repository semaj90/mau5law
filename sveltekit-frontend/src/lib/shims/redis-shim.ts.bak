// Tell the linter to ignore the 'no-unused-vars' rule for the next line
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Redis as IORedisType } from 'ioredis';

declare global {
  interface GlobalThis {
    __redisNoAuthWarned?: boolean;
  }
}

export type RedisCreateOptions = string | { url?: string; password?: string };

// Minimal compatibility shim: expose a createClient function that returns an ioredis client
// This lets existing code that imports from 'redis' continue to work while we standardize on ioredis.
export async function createClient(opts?: RedisCreateOptions) {
  const url = typeof opts === 'string' ? opts : (opts?.url ?? process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');
  const password = typeof opts === 'string' ? undefined : (opts?.password ?? process.env.REDIS_PASSWORD);
  const { default: IORedis } = await import('ioredis');

  // Minimal typed surface for the shim to avoid `any` usage
  type RedisLike = {
    on?: (ev: string, fn: (...args: unknown[]) => void) => void;
    connect?: () => Promise<void>;
    disconnect?: () => Promise<void>;
    quit?: () => Promise<void>;
    get?: (k: string) => Promise<string | null>;
    set?: (k: string, v: string, ...rest: unknown[]) => Promise<unknown>;
    del?: (k: string) => Promise<number>;
    subscribe?: (...channels: string[]) => Promise<unknown>;
    psubscribe?: (...patterns: string[]) => Promise<unknown>;
    publish?: (ch: string, msg: string) => Promise<number>;
    ping?: (message?: string) => Promise<string>;
    // event handlers for subscriber variants (single 'on' entry)
  };

  // Use a single argument to the constructor: either the url string or an options object { url, password }
  const clientInstance = password ? new IORedis({ url, password }) : new IORedis(url);
  const client = clientInstance as unknown as RedisLike;

  const getErrorMessage = (err: unknown): string => {
    if (
      err &&
      typeof err === 'object' &&
      'message' in err &&
      typeof (err as { message?: unknown }).message === 'string'
    ) {
      return (err as { message: string }).message;
    }
    return String(err);
  };

  // Attach minimal NOAUTH graceful handling
  client.on?.('error', (err: unknown) => {
    if (getErrorMessage(err).includes('NOAUTH')) {
      if (!globalThis.__redisNoAuthWarned) {
        console.warn(
          '[redis-shim] NOAUTH Authentication required — continuing with limited capabilities. Set REDIS_PASSWORD to enable auth.'
        );
        globalThis.__redisNoAuthWarned = true;
      }
    }
  });

  return {
    connect: async () => {
      if (typeof client.connect === 'function') await client.connect();
    },
    disconnect: async () => {
      if (typeof client.disconnect === 'function') await client.disconnect();
      else if (typeof client.quit === 'function') await client.quit();
    },
    quit: async () => {
      if (typeof client.quit === 'function') await client.quit();
    },
    // basic key/value operations
    get: async (k: string) => (client.get ? client.get(k) : Promise.resolve(null)),
    set: async (k: string, v: string) => (client.set ? client.set(k, v) : Promise.resolve(null)),
    // node-redis uses `setex` lowercase; keep that API
    setex: async (k: string, ttl: number, v: string) =>
      client.set ? client.set(k, v, 'EX', ttl) : Promise.resolve(null),
    del: async (k: string) => (client.del ? client.del(k) : Promise.resolve(0)),
    // pub/sub and publish;
    publish: async (ch: string, msg: string) => (client.publish ? client.publish(ch, msg) : Promise.resolve(0)),
    /**
     * subscribe can be used in two ways:
     *  - subscribe(...channels) -> returns number of subscriptions (or truthy)
     *  - subscribe(channel, callback) -> creates a dedicated subscriber and invokes callback on 'message'
     */
    subscribe: async (...args: unknown[]) => {
      const last = args[args.length - 1];
      if (typeof last === 'function') {
        const cb = last as (channel: string, message: string) => void;
        const channels = args.slice(0, -1).map(c => String(c)) as string[];
        const subInstance = password ? new IORedis({ url, password }) : new IORedis(url);
        const sub = subInstance as unknown as RedisLike;
        if (channels.length > 0 && typeof sub.subscribe === 'function') {
          await sub.subscribe(...channels);
        }
        sub.on?.('message', (channel: unknown, message: unknown) => cb(String(channel), String(message)));
        return sub;
      } else {
        const channels = args.map(c => String(c)) as string[];
        if (channels.length > 0 && typeof client.subscribe === 'function') {
          await client.subscribe(...channels);
        }
        return channels.length;
      }
    },
    /**
     * psubscribe supports the same callback-or-patterns behavior as subscribe
     */
    psubscribe: async (...args: unknown[]) => {
      const last = args[args.length - 1];
      if (typeof last === 'function') {
        const cb = last as (pattern: string, channel: string, message: string) => void;
        const patterns = args.slice(0, -1).map(p => String(p)) as string[];
        const subInstance = password ? new IORedis({ url, password }) : new IORedis(url);
        const sub = subInstance as unknown as RedisLike;
        if (patterns.length > 0 && typeof sub.psubscribe === 'function') {
          await sub.psubscribe(...patterns);
        }
        sub.on?.('pmessage', (_pattern: unknown, channel: unknown, message: unknown) =>
          cb(String(_pattern), String(channel), String(message))
        );
        return sub;
      } else {
        const patterns = args.map(p => String(p)) as string[];
        if (patterns.length > 0 && typeof client.psubscribe === 'function') {
          await client.psubscribe(...patterns);
        }
        return patterns.length;
      }
    },
    on: (ev: string, fn: (...a: unknown[]) => void) => {
      if (typeof client.on === 'function') return client.on(ev, fn);
    },
    ping: async (message?: string) =>
      typeof client.ping === 'function' ? client.ping(message) : Promise.resolve('PONG'),
    // expose raw client if needed
    _raw: clientInstance,
  } as unknown;
}
export default createClient;
