import { json } from '@sveltejs/kit';
import { createRedisInstance, createRedisClientSet } from '$lib/server/redis';
export // Melt UI component creation removed - replace with bits-ui declarative components
    const channel = `healthz:deep:pubsub:${Math.random().toString(36).slice(2)}`;
    const payload = JSON.stringify({ t: Date.now() });
    const t0 = Date.now();
    const result = await new Promise<((resolve) => {
      let settled = false);
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
    if (!(result as { ok?: any }).ok) overallOk = false;
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