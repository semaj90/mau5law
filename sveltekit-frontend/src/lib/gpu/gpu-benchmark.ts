import { gpuVectorProcessor } from './gpu-vector-processor.js';
import { telemetryBus } from '../telemetry/telemetry-bus.js';

export interface EmbeddingBenchmarkOptions {
  runs?: number;            // number of repetitions per mode
  size?: number;            // floats per segment (dimension); if omitted use current embedding dimension
  segments?: number;        // number of segments to simulate
  modes?: Array<'gpu' | 'cpu'>; // which paths to benchmark
  warmup?: number;          // warmup runs not timed
  label?: string;           // optional label
}

export interface EmbeddingBenchmarkResultEntry {
  mode: 'gpu' | 'cpu';
  runs: number;
  samples: number;         // segments * dimension
  meanMs: number;
  p95Ms: number;
  bestMs: number;
  worstMs: number;
  dimension: number;
  segments: number;
  backend: string;
  statsUsed: boolean;      // whether GPU stats were applied (for gpu mode)
}

export interface EmbeddingBenchmarkSummary {
  label: string;
  dimension: number;
  segments: number;
  entries: EmbeddingBenchmarkResultEntry[];
  timestamp: number;
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a,b)=>a-b);
  const idx = Math.min(sorted.length - 1, Math.floor((p/100) * sorted.length));
  return sorted[idx];
}

export async function runEmbeddingBenchmark(opts: EmbeddingBenchmarkOptions = {}): Promise<EmbeddingBenchmarkSummary> {
  const runs = opts.runs ?? 8;
  const warmup = opts.warmup ?? 2;
  const segments = opts.segments ?? 8;
  const modes = opts.modes ?? ['gpu','cpu'];
  // Determine dimension from processor
  const dim = (gpuVectorProcessor as any).getCurrentEmbeddingDimension?.() || opts.size || 384;
  const label = opts.label || 'embedding-benchmark';

  // Synthetic input: segments * dim random-ish floats in [-0.5,0.5]
  function makeBatch() {
    const data = new Float32Array(segments * dim);
    for (let i=0;i<data.length;i++) data[i] = (Math.sin(i*0.1327)+Math.cos(i*0.017))*0.25;
    return data;
  }

  const entries: EmbeddingBenchmarkResultEntry[] = [];

  for (const mode of modes) {
    const durations: number[] = [];
    let backend = 'cpu';
    let statsUsed = false;

    // Configure forced reduction / path flags
    const originalReductionMode = (globalThis as any).__FORCE_REDUCTION_MODE__;

    if (mode === 'gpu') {
      (globalThis as any).__FORCE_REDUCTION_MODE__ = 'gpu';
    } else if (mode === 'cpu') {
      (globalThis as any).__FORCE_REDUCTION_MODE__ = 'cpu';
    }

    for (let i=0;i<warmup + runs;i++) {
      const batch = makeBatch();
      const start = performance.now();
      const result = await (gpuVectorProcessor as any).runEmbeddingBatch?.(batch, `${label}-${mode}`);
      const dur = performance.now() - start;
      backend = result?.backend || backend;
      if (i >= warmup) durations.push(dur);
      if (mode === 'gpu' && result?.stats) statsUsed = true;
    }

    // Restore reduction mode
    (globalThis as any).__FORCE_REDUCTION_MODE__ = originalReductionMode;

    const mean = durations.reduce((s,v)=>s+v,0)/durations.length || 0;
    const entry: EmbeddingBenchmarkResultEntry = {
      mode,
      runs,
      samples: segments * dim,
      meanMs: mean,
      p95Ms: percentile(durations,95),
      bestMs: Math.min(...durations),
      worstMs: Math.max(...durations),
      dimension: dim,
      segments,
      backend,
      statsUsed
    };
    entries.push(entry);

    telemetryBus.publish({ type: 'gpu.benchmark.result' as any, meta: { label, ...entry } });
  }

  const summary: EmbeddingBenchmarkSummary = { label, dimension: dim, segments, entries, timestamp: Date.now() };
  telemetryBus.publish({ type: 'gpu.benchmark.summary' as any, meta: summary });
  // Expose last summary for quick inspection
  (globalThis as any).__LAST_GPU_BENCHMARK__ = summary;
  return summary;
}

// Attach helper to window in browser context automatically
if (typeof window !== 'undefined') {
  (window as any).runEmbeddingBenchmark = runEmbeddingBenchmark;
}
