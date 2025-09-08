// Minimal compatibility shim: expose a createClient function that returns an ioredis client
// This lets existing code that imports from 'redis' continue to work while we standardize on ioredis.
export async function createClient(opts?: any) {
  const url = typeof opts === 'string' ? opts : opts?.url || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const { default: IORedis } = await import('ioredis');
  const client = new IORedis(url);

  // normalize a minimal surface area expected by code that uses node-redis
  return {
    connect: async () => {
      if (typeof client.connect === 'function') await client.connect();
    },
    disconnect: async () => {
      if (typeof client.disconnect === 'function') await client.disconnect();
    },
    quit: async () => {
      if (typeof client.quit === 'function') await client.quit();
    },
    // basic key/value operations
    get: async (k: string) => client.get(k),
    set: async (k: string, v: string) => client.set(k, v),
    // node-redis uses `setex` lowercase; keep that API
    setex: async (k: string, ttl: number, v: string) => client.set(k, v, 'EX', ttl),
    del: async (k: string) => client.del(k),

    // pub/sub and publish
    publish: async (ch: string, msg: string) => client.publish(ch, msg),

    /**
     * subscribe can be used in two ways in various codebases:
     *  - subscribe(...channels) -> uses the same wrapped client to subscribe and returns a count/true-ish value
     *  - subscribe(channel, callback) -> create a dedicated subscriber and invoke callback on 'message'
     * The shim supports both patterns.
     */
    subscribe: async (...args: any[]) => {
      const last = args[args.length - 1];
      if (typeof last === 'function') {
        const cb = last as (channel: string, message: string) => void;
        const channels = args.slice(0, -1);
        const sub = new IORedis(url);
        // wait for subscription(s)
        if (channels.length > 0) {
          await sub.subscribe(...channels);
        }
        sub.on('message', (channel: string, message: string) => cb(channel, message));
        return sub;
      } else {
        // subscribe using the existing client instance
        const channels = args as string[];
        if (channels.length > 0 && typeof client.subscribe === 'function') {
          await (client as any).subscribe(...channels);
        }
        return channels.length;
      }
    },

    /**
     * pattern subscribe, supports same callback-or-channels behavior as subscribe
     */
    psubscribe: async (...args: any[]) => {
      const last = args[args.length - 1];
      if (typeof last === 'function') {
        const cb = last as (pattern: string, channel: string, message: string) => void;
        const patterns = args.slice(0, -1);
        const sub = new IORedis(url);
        if (patterns.length > 0) {
          await (sub as any).psubscribe(...patterns);
        }
        sub.on('pmessage', (_pattern: string, channel: string, message: string) =>
          cb(_pattern, channel, message)
        );
        return sub;
      } else {
        const patterns = args as string[];
        if (patterns.length > 0 && typeof (client as any).psubscribe === 'function') {
          await (client as any).psubscribe(...patterns);
        }
        return patterns.length;
      }
    },

    on: (ev: string, fn: (...a: any[]) => void) => client.on(ev, fn),
    ping: async (message?: string) =>
      typeof client.ping === 'function' ? client.ping(message) : Promise.resolve('PONG'),
    // expose raw client if needed
    _raw: client,
  } as any;
}

export default createClient;
