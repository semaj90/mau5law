// Minimal compatibility shim: expose a createClient function that returns an ioredis client
// This lets existing code that imports from 'redis' continue to work while we standardize on ioredis.
export async function createClient(opts?: any) {
  const url = typeof opts === 'string' ? opts : opts?.url || process.env.REDIS_URL || 'redis://127.0.0.1:4005';
  const { default: IORedis } = await import('ioredis');
  const client = new IORedis(url);

  // normalize a minimal surface area expected by code that uses node-redis
  return {
    connect: async () => { if (typeof client.connect === 'function') await client.connect(); },
    disconnect: async () => { if (typeof client.disconnect === 'function') await client.disconnect(); },
    quit: async () => { if (typeof client.quit === 'function') await client.quit(); },
    get: async (k: string) => client.get(k),
    setEx: async (k: string, ttl: number, v: string) => client.set(k, v, 'EX', ttl),
    del: async (k: string) => client.del(k),
    publish: async (ch: string, msg: string) => client.publish(ch, msg),
    subscribe: async (ch: string, cb: (msg: string) => void) => {
      // create a dedicated subscriber
      const sub = new IORedis(url);
      await sub.subscribe(ch);
      sub.on('message', (_ch: string, message: string) => cb(message));
      return sub;
    },
    on: (ev: string, fn: (...a: any[]) => void) => client.on(ev, fn),
    // expose raw client if needed
    _raw: client
  } as any;
}

export default createClient;
