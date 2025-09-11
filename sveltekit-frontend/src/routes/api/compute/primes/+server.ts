import type { RequestHandler } from '@sveltejs/kit';
import { Worker } from 'node:worker_threads';
import os from 'node:os';
import path from 'node:path';

interface QueryParams {
  max: number;      // upper bound (exclusive)
  mode?: 'count' | 'list';
  workers?: number; // optional override for worker count
}

function parseParams(url: URL): QueryParams {
  const max = Number(url.searchParams.get('max') ?? '100000');
  const mode = (url.searchParams.get('mode') as 'count' | 'list') || 'count';
  const workers = url.searchParams.get('workers');
  return {
    max: Number.isFinite(max) && max > 0 ? max : 100000,
    mode,
    workers: workers ? Math.max(1, Math.min(Number(workers), os.cpus().length)) : undefined
  };
}

export const GET: RequestHandler = async ({ url }) => {
  const { max, mode, workers } = parseParams(url);
  const cpuCount = os.cpus().length;
  const workerCount = workers || cpuCount;

  const segmentSize = Math.ceil(max / workerCount);
  const scriptPath = path.resolve('src/lib/workers/prime-worker.ts');

  const started = performance.now();

  const promises: Promise<{ count: number; primes?: number[] }>[] = [];

  for (let i = 0; i < workerCount; i++) {
    const start = i * segmentSize;
    const end = Math.min(start + segmentSize, max);
    if (start >= end) break;

    promises.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(scriptPath, {
          workerData: { start, end, mode }
        });
        worker.on('message', (msg) => resolve(msg));
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) reject(new Error(`Worker ${i} exited with code ${code}`));
        });
      })
    );
  }

  try {
    const results = await Promise.all(promises);
    const totalCount = results.reduce((acc, r) => acc + r.count, 0);
    const primes = mode === 'list' ? results.flatMap(r => r.primes || []) : undefined;
    const durationMs = performance.now() - started;

    return new Response(
      JSON.stringify({
        max,
        mode,
        workers: workerCount,
        totalCount,
        primes,
        durationMs: Math.round(durationMs),
        throughput: Math.round(totalCount / (durationMs / 1000))
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Computation failed', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
