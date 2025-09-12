import { telemetryBus } from '../telemetry/telemetry-bus.js';

export interface OperationSample {
  pipeline: string;
  backend: string;
  durationMs: number;
  success: boolean;
  shaderType: string | null;
  timestamp: number;
}

export interface GPUErrorSample {
  backend: string;
  pipeline?: string;
  category: string;
  retryable: boolean;
  message: string;
  timestamp: number;
}

export interface BackendDemotionEvent {
  from: string;
  to: string;
  reason: string;
  timestamp: number;
}

interface Aggregates {
  count: number;
  successes: number;
  totalMs: number;
  maxMs: number;
  minMs: number;
}

export class GPUTelemetryService {
  private samples: OperationSample[] = [];
  private aggregates: Record<string, Aggregates> = {};
  private maxSamples = 200;
  private errors: GPUErrorSample[] = [];
  private demotions: BackendDemotionEvent[] = [];

  record(sample: OperationSample): void {
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) this.samples.shift();

    const key = `${sample.pipeline}|${sample.backend}|${sample.shaderType || 'na'}`;
    const agg = this.aggregates[key] || { count: 0, successes: 0, totalMs: 0, maxMs: 0, minMs: Infinity };
    agg.count += 1;
    if (sample.success) agg.successes += 1;
    agg.totalMs += sample.durationMs;
    agg.maxMs = Math.max(agg.maxMs, sample.durationMs);
    agg.minMs = Math.min(agg.minMs, sample.durationMs);
    this.aggregates[key] = agg;
  }

  getRecent(limit = 25): OperationSample[] {
    return this.samples.slice(-limit);
  }

  getAggregates(): Array<OperationSample & { avgMs: number; successRate: number } > {
    const results: Array<OperationSample & { avgMs: number; successRate: number } > = [];
    for (const key of Object.keys(this.aggregates)) {
      const [pipeline, backend, shaderType] = key.split('|');
      const a = this.aggregates[key];
      results.push({
        pipeline,
        backend,
        shaderType: shaderType === 'na' ? null : shaderType,
        durationMs: a.totalMs,
        success: true,
        timestamp: Date.now(),
        avgMs: a.totalMs / a.count,
        successRate: a.successes / a.count,
        count: a.count,
        successes: a.successes,
        totalMs: a.totalMs,
        maxMs: a.maxMs,
        minMs: a.minMs
      } as any);
    }
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  dump(): { samples: OperationSample[]; aggregates: ReturnType<GPUTelemetryService['getAggregates']> } {
    return { samples: [...this.samples], aggregates: this.getAggregates() };
  }

  recordError(e: GPUErrorSample): void {
    this.errors.push(e);
    if (this.errors.length > 300) this.errors.shift();
  }

  recordDemotion(d: BackendDemotionEvent): void {
    this.demotions.push(d);
    if (this.demotions.length > 100) this.demotions.shift();
  }

  getErrors(limit = 50): GPUErrorSample[] {
    return this.errors.slice(-limit);
  }

  getDemotions(limit = 25): BackendDemotionEvent[] {
    return this.demotions.slice(-limit);
  }
}

export const gpuTelemetryService = new GPUTelemetryService();

// Optional: wire bus listener (can be expanded later)
telemetryBus.subscribe(evt => {
  if (evt.type === 'gpu.vector.process.end') {
    const meta = evt.meta as any;
    gpuTelemetryService.record({
      pipeline: meta.pipeline,
      backend: meta.backend,
      durationMs: meta.durationMs,
      success: meta.success,
      shaderType: meta.shaderType,
      timestamp: Date.now()
    });
  } else if (evt.type === 'error') {
    const meta = evt.meta as any;
    if (meta?.gpu && meta.category) {
      gpuTelemetryService.recordError({
        backend: meta.backend || 'unknown',
        pipeline: meta.pipeline,
        category: meta.category,
        retryable: !!meta.retryable,
        message: meta.message || 'unknown',
        timestamp: Date.now()
      });
    }
  } else if (evt.type === 'gpu.backend') {
    const meta = evt.meta as any;
    if (meta?.demotion) {
      gpuTelemetryService.recordDemotion({
        from: meta.from,
        to: meta.to,
        reason: meta.reason || 'unspecified',
        timestamp: Date.now()
      });
    }
  }
});
