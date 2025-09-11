import { json } from '@sveltejs/kit';
import { createRedisInstance, createRedisClientSet } from '$lib/server/redis';

export const GET = async () => {
  const started = Date.now();
  const checks: any = { ping: {}, rw: {}, pubsub: {} };
  let overallOk = true;

  // Simple ping
  try {
    const client = createRedisInstance();
    const t0 = Date.now();
    await (client as any).ping();
    checks.ping = { ok: true, latencyMs: Date.now() - t0 };
    await client.quit();
  } catch (e: any) {
    checks.ping = { ok: false, error: e.message };
    overallOk = false;
  }

  // Read/Write round trip
  try {
    const client = createRedisInstance();
    const key = `healthz:deep:test:${Math.random().toString(36).slice(2)}`;
    const value = Date.now().toString();
    const t0 = Date.now();
    await (client as any).setex(key, 30, value);
    const got = await client.get(key);
    await client.del(key);
    const dt = Date.now() - t0;
    const ok = got === value;
    if (!ok) overallOk = false;
    checks.rw = { ok, roundTripMs: dt };
    await client.quit();
  } catch (e: any) {
    checks.rw = { ok: false, error: e.message };
    overallOk = false;
  }

  // Pub/Sub validation (pattern + direct)
  try {
    const { primary, subscriber, publisher } = createRedisClientSet();
    const channel = `healthz:deep:pubsub:${Math.random().toString(36).slice(2)}`;
    const payload = JSON.stringify({ t: Date.now() });
    const t0 = Date.now();
    const result = await new Promise<{ ok: boolean; latencyMs?: number; error?: string }>((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
            resolve({ ok: false, error: 'timeout' });
        }
      }, 1500);
      (subscriber as any).once('message', (_ch: string, msg: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve({ ok: msg === payload, latencyMs: Date.now() - t0 });
      });
      (subscriber as any).subscribe(channel).then(() => {
        (publisher as any).publish(channel, payload).catch(() => {});
      });
    });
    checks.pubsub = result;
    if (!result.ok) overallOk = false;
    await Promise.all([primary.quit(), subscriber.quit(), publisher.quit()].map(p => p.catch(()=>{})));
  } catch (e: any) {
    checks.pubsub = { ok: false, error: e.message };
    overallOk = false;
  }

  // Aggregate
  const durationMs = Date.now() - started;
  return json({
    status: overallOk ? 'ok' : 'fail',
    checks,
    durationMs,
    timestamp: new Date().toISOString()
  }, { status: overallOk ? 200 : 503 });
};
