import { json } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';

export const GET = async () => {
  const start = Date.now();
  let redisOk = false;
  let latencyMs: number | null = null;
  try {
    const pingStart = Date.now();
    await (redis as any).ping();
    latencyMs = Date.now() - pingStart;
    redisOk = true;
  } catch (e: any) {
    redisOk = false;
  }
  return json({
    status: redisOk ? 'ok' : 'degraded',
    redis: { ok: redisOk, latencyMs },
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    totalTimeMs: Date.now() - start
  }, { status: redisOk ? 200 : 503 });
};
