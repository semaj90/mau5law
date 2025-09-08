import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { simdBodyParser } from '$lib/server/simd-body-parser';

type LoadTestBody = {
  endpoint: string; // e.g. "/api/v1/rag"
  payload: any;
  iterations?: number;
};

export const POST: RequestHandler = async ({ request, fetch, url }) => {
  const { endpoint, payload, iterations = 100 } = (await request.json().catch(() => ({}))) as LoadTestBody;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('/')) {
    throw error(400, 'Provide endpoint starting with /');
  }
  const iters = Math.max(1, Math.min(2000, Number(iterations) || 100));

  // Build absolute URL to target this same server
  const base = `${url.protocol}//${url.host}`;
  const target = `${base}${endpoint}`;

  // Helper to run one sweep
  const runSweep = async () => {
    const t0 = performance.now();
    for (let i = 0; i < iters; i++) {
      const r = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {})
      });
      // We only touch body to ensure full pipeline runs; discard content
      await r.text().catch(() => '');
    }
    return performance.now() - t0;
  };

  // Run with SIMD off
  simdBodyParser.toggleSIMD(false);
  const offMs = await runSweep();

  // Run with SIMD on
  simdBodyParser.toggleSIMD(true);
  const onMs = await runSweep();

  // Restore to env default (prefer enabled when env says so)
  const envDefault = process.env.USE_SIMDJSON_NODE === '1' || process.env.ENABLE_SIMD_JSON === 'true';
  simdBodyParser.toggleSIMD(Boolean(envDefault));

  return json({
    ok: true,
    endpoint,
    iterations: iters,
    off_ms: +offMs.toFixed(2),
    on_ms: +onMs.toFixed(2),
    speedup: +(offMs / Math.max(1e-6, onMs)).toFixed(2)
  });
};
