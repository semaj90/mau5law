import { gpuContextProvider } from './gpu-context-provider.js';
import type { ShaderResources } from './gpu-context-provider.js';
import { lodCacheEngine } from '../ai/lod-cache-engine.js';
import { telemetryBus } from '../telemetry/telemetry-bus.js';
import { gpuTelemetryService } from './gpu-telemetry-service.js';
import { classifyGPUError, computeBackoff, DEFAULT_RETRY_POLICY } from './gpu-error-utils.js';

interface VectorProcessOptions {
  pipeline: 'embedding-generation' | 'vector-clustering' | 'similarity-computation';
  input: Record<string, ArrayBufferView>;
  expected: 'compute' | 'vertex+fragment';
  label?: string;
}

interface VectorProcessResult {
  backend: string;
  durationMs: number;
  outputs: Record<string, ArrayBufferView> | null;
  shaderType: string | null;
  success: boolean;
  error?: unknown;
}

// Explicit GPU run (embedding) result used by higher-level encoder consumption
export interface GpuRunResult {
  backend: string;
  data: Float32Array;          // transformed values buffer
  stats?: Float32Array;         // optional [mean,std,(energy)?]* layout
  durationMs: number;
  dimension: number;
  segments: number;
}

/**
 * GPU Vector Processor
 * Demonstrates consumption of cached shader resources from LODCacheEngine and
 * unified compute dispatch via GPUContextProvider. Falls back gracefully.
 */
export class GPUVectorProcessor {
  private failureWindow: { ts: number; backend: string }[] = [];
  private demotionCooldownMs = 15000;
  private lastDemotionAt = 0;
  private embeddingDimension = 384; // initial logical dimension
  private minDimension = 128;
  private dimensionSteps: Record<string, number> = {
    webgpu: 384,
    webgl2: 320,
    webgl1: 256,
    cpu: 192
  };
  // Stability / upscale tracking
  private successWindow: { ts: number; backend: string }[] = [];
  private upscaleCooldownMs = 45000; // wait 45s between upscale attempts
  private lastUpscaleAt = 0;
  private upscaleSuccessThreshold = 12; // number of successful recent ops
  private upscaleWindowMs = 30000; // consider successes in last 30s
  private hysteresisSuccessCount = 6; // minimum successes after demotion before any upscale attempt
  private successesSinceLastDemotion = 0;
  // WebGL1 cache for program + geometry (fullscreen quad) + uniform locations
  private webgl1Cache: {
    program: WebGLProgram;
    vbo: WebGLBuffer;
    attribLocation: number;
    uniforms: { uTex: WebGLUniformLocation | null; uPass: WebGLUniformLocation | null; uTotal: WebGLUniformLocation | null };
    texSize: number; // last texSize used (for potential viewport reuse)
  } | null = null;
  // WebGL1 pooled resources keyed by texSize + floatMode
  private webgl1Pool: Map<string, { free: Array<{ textures: WebGLTexture[]; framebuffers: WebGLFramebuffer[] }>; inUse: number }> = new Map();
  // WebGPU pipeline + buffer cache
  private webgpuCache: {
    device: GPUDevice;
    pipeline: GPUComputePipeline;
    bindGroupLayout: GPUBindGroupLayout;
    bindGroup: GPUBindGroup | null; // dynamic if buffer resized
    inBuffer: GPUBuffer; // staging/input
    outBuffer: GPUBuffer; // storage/output
    readBuffer: GPUBuffer; // map-readable copy buffer
    capacity: number; // float capacity
    workgroupSize: number;
    reduction?: {
      partialPipeline: GPUComputePipeline;
      finalPipeline: GPUComputePipeline;
      partialBuffer: GPUBuffer;
      statsBuffer: GPUBuffer;
      statsReadBuffer: GPUBuffer;
      partialBindGroup: GPUBindGroup;
      finalBindGroup: GPUBindGroup;
      segmentCapacity: number;
      segmentDim: number;
      cfgBuffer: GPUBuffer;
    } | null;
  } | null = null;
  private disposeWebGPUCache() {
    if (!this.webgpuCache) return;
    try {
      this.webgpuCache.inBuffer.destroy();
      this.webgpuCache.outBuffer.destroy();
      this.webgpuCache.readBuffer.destroy();
      if (this.webgpuCache.reduction) {
        try {
          this.webgpuCache.reduction.partialBuffer.destroy();
          this.webgpuCache.reduction.statsBuffer.destroy();
          this.webgpuCache.reduction.statsReadBuffer.destroy();
          this.webgpuCache.reduction.cfgBuffer.destroy();
        } catch {}
      }
    } catch (e) {
      console.warn('⚠️ Failed disposing WebGPU cache', e);
    }
    this.webgpuCache = null;
  }
  private ensureWebGPUPipeline(count: number) {
    const hybrid = (gpuContextProvider as any).getHybridContext?.();
    const ctxType = hybrid?.getActiveContextType?.();
    const device: GPUDevice | null = ctxType === 'webgpu' ? hybrid.gpuDevice : null;
    if (!device) return null;
    const workgroupSize = 128;
    if (this.webgpuCache && this.webgpuCache.capacity >= count) return this.webgpuCache;
    // Recreate pipeline & buffers (for first time or capacity expansion)
    this.disposeWebGPUCache();
    const wgsl = `@group(0) @binding(0) var<storage, read> inData: array<f32>;\n@group(0) @binding(1) var<storage, read_write> outData: array<f32>;\n@compute @workgroup_size(${workgroupSize}) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let i = gid.x; if (i < ${count}u) { let v = inData[i]; outData[i] = (v * 1.0005) + sin(v * 0.5) * 0.0003; } }`;
    const module = device.createShaderModule({ code: wgsl });
    const bindGroupLayout = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
    ]});
    const pipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }), compute: { module, entryPoint: 'main' } });
    const bytes = count * 4;
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const inBuffer = device.createBuffer({ size: bytes, usage });
    const outBuffer = device.createBuffer({ size: bytes, usage });
    const readBuffer = device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const bindGroup = device.createBindGroup({ layout: bindGroupLayout, entries: [
      { binding: 0, resource: { buffer: inBuffer } },
      { binding: 1, resource: { buffer: outBuffer } }
    ]});
    this.webgpuCache = { device, pipeline, bindGroupLayout, bindGroup, inBuffer, outBuffer, readBuffer, capacity: count, workgroupSize, reduction: null };
    return this.webgpuCache;
  }
  /** Ensure two-pass mean/std/energy (abs-mean) reduction resources (single workgroup per segment) */
  private ensureWebGPUReduction(segmentCount: number, segmentDim: number): boolean {
    if (!this.webgpuCache) return false;
    const device = this.webgpuCache.device;
    const existing = this.webgpuCache.reduction;
    if (existing && existing.segmentCapacity >= segmentCount && existing.segmentDim === segmentDim) {
      const cfg = new Uint32Array([segmentDim, segmentCount]);
      device.queue.writeBuffer(existing.cfgBuffer, 0, cfg);
      return true;
    }
    if (existing) {
      try { existing.partialBuffer.destroy(); existing.statsBuffer.destroy(); existing.statsReadBuffer.destroy(); existing.cfgBuffer.destroy(); } catch {}
    }
    try {
      const WG = 128;
  const partialWGSL = `struct Cfg { dim: u32, segments: u32 }; struct Partial { sum: f32, sumSq: f32, sumAbs: f32, count: u32 }; @group(0) @binding(0) var<storage, read> data: array<f32>; @group(0) @binding(1) var<storage, read_write> partials: array<Partial>; @group(0) @binding(2) var<uniform> cfg: Cfg; @compute @workgroup_size(${WG}) fn main(@builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) { let dim = cfg.dim; let segs = cfg.segments; let seg = wid.x; if (seg >= segs) { return; } var sum: f32 = 0.0; var sumSq: f32 = 0.0; var sumAbs: f32 = 0.0; var i: u32 = lid.x; let base = seg * dim; while (i < dim) { let v = data[base + i]; sum += v; sumSq += v * v; sumAbs += abs(v); i += ${WG}u; } var<workgroup> wSum: array<f32, ${WG}>; var<workgroup> wSumSq: array<f32, ${WG}>; var<workgroup> wSumAbs: array<f32, ${WG}>; wSum[lid.x] = sum; wSumSq[lid.x] = sumSq; wSumAbs[lid.x] = sumAbs; workgroupBarrier(); var off: u32 = ${WG/2}u; while (off > 0u) { if (lid.x < off) { wSum[lid.x] = wSum[lid.x] + wSum[lid.x + off]; wSumSq[lid.x] = wSumSq[lid.x] + wSumSq[lid.x + off]; wSumAbs[lid.x] = wSumAbs[lid.x] + wSumAbs[lid.x + off]; } workgroupBarrier(); off = off / 2u; } if (lid.x == 0u) { partials[seg].sum = wSum[0]; partials[seg].sumSq = wSumSq[0]; partials[seg].sumAbs = wSumAbs[0]; partials[seg].count = dim; } }`;
  const finalWGSL = `struct Cfg { dim: u32, segments: u32 }; struct Partial { sum: f32, sumSq: f32, sumAbs: f32, count: u32 }; struct Stat { mean: f32, std: f32, energy: f32 }; @group(0) @binding(0) var<storage, read> partials: array<Partial>; @group(0) @binding(1) var<storage, read_write> stats: array<Stat>; @group(0) @binding(2) var<uniform> cfg: Cfg; @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { let seg = gid.x; if (seg >= cfg.segments) { return; } let p = partials[seg]; let n = f32(p.count); let mean = p.sum / n; let variance = max(0.0, p.sumSq / n - mean * mean); let energy = p.sumAbs / n; stats[seg].mean = mean; stats[seg].std = sqrt(variance + 1e-6); stats[seg].energy = energy; }`;
      const partialModule = device.createShaderModule({ code: partialWGSL });
      const finalModule = device.createShaderModule({ code: finalWGSL });
      const layoutEntries: GPUBindGroupLayoutEntry[] = [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' as GPUBufferBindingType } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' as GPUBufferBindingType } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' as GPUBufferBindingType } }
      ];
      const partialBGL = device.createBindGroupLayout({ entries: layoutEntries });
      const finalBGL = device.createBindGroupLayout({ entries: layoutEntries });
      const partialPipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [partialBGL] }), compute: { module: partialModule, entryPoint: 'main' } });
      const finalPipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [finalBGL] }), compute: { module: finalModule, entryPoint: 'main' } });
  const partialBuf = device.createBuffer({ size: segmentCount * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
  // Each Stat now 12 bytes (mean,std,energy) – pad to 16 for alignment
  const statsStride = 16;
  const statsBuf = device.createBuffer({ size: segmentCount * statsStride, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const statsRead = device.createBuffer({ size: segmentCount * statsStride, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      const cfgArr = new Uint32Array([segmentDim, segmentCount]);
      const cfgBuffer = device.createBuffer({ size: 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(cfgBuffer, 0, cfgArr);
      const partialBG = device.createBindGroup({ layout: partialBGL, entries: [
        { binding: 0, resource: { buffer: this.webgpuCache.outBuffer } },
        { binding: 1, resource: { buffer: partialBuf } },
        { binding: 2, resource: { buffer: cfgBuffer } }
      ]});
      const finalBG = device.createBindGroup({ layout: finalBGL, entries: [
        { binding: 0, resource: { buffer: partialBuf } },
        { binding: 1, resource: { buffer: statsBuf } },
        { binding: 2, resource: { buffer: cfgBuffer } }
      ]});
      this.webgpuCache.reduction = { partialPipeline, finalPipeline, partialBuffer: partialBuf, statsBuffer: statsBuf, statsReadBuffer: statsRead, partialBindGroup: partialBG, finalBindGroup: finalBG, segmentCapacity: segmentCount, segmentDim, cfgBuffer };
      return true;
    } catch (e) {
      console.warn('⚠️ Reduction pipeline creation failed', e);
      this.webgpuCache.reduction = null;
      return false;
    }
  }
  private async runWebGPUCompute(input: Record<string, ArrayBufferView>): Promise<Record<string, ArrayBufferView>> {
    const start = performance.now();
    const firstKey = Object.keys(input)[0];
    if (!firstKey) return {};
    const arr = input[firstKey];
    const floatArray = arr instanceof Float32Array ? arr : new Float32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
    const count = floatArray.length;
    const cache = this.ensureWebGPUPipeline(count);
    if (!cache) {
      telemetryBus.publish({ type: 'gpu.vector.webgpu.compute' as any, meta: { backend: 'webgpu', durationMs: 0, reason: 'no-device' } });
      return { ...input };
    }
    const device = cache.device;
    try {
      device.queue.writeBuffer(cache.inBuffer, 0, floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);
      const workgroups = Math.ceil(count / cache.workgroupSize);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(cache.pipeline);
      pass.setBindGroup(0, cache.bindGroup!);
      pass.dispatchWorkgroups(workgroups);
      pass.end();
      encoder.copyBufferToBuffer(cache.outBuffer, 0, cache.readBuffer, 0, count * 4);
      // Attempt mean/std/energy reduction if data looks like batched embeddings (respect forced reduction mode)
      const dim = this.embeddingDimension;
      let stats: Float32Array | null = null;
      if (dim > 0 && count % dim === 0) {
        const segments = count / dim;
        const mode = (globalThis as any).__FORCE_REDUCTION_MODE__ || 'auto';
        const allowGPU = mode !== 'cpu';
        if (allowGPU && segments <= 8192 && this.ensureWebGPUReduction(segments, dim)) {
          const red = cache.reduction!;
          const p1 = encoder.beginComputePass();
          p1.setPipeline(red.partialPipeline);
          p1.setBindGroup(0, red.partialBindGroup);
          p1.dispatchWorkgroups(segments); // 1 workgroup per segment
          p1.end();
          const p2 = encoder.beginComputePass();
          p2.setPipeline(red.finalPipeline);
          p2.setBindGroup(0, red.finalBindGroup);
          const finalGroups = Math.ceil(segments / 64);
          p2.dispatchWorkgroups(finalGroups);
          p2.end();
          // Stats stride 16 bytes per segment
          encoder.copyBufferToBuffer(red.statsBuffer, 0, red.statsReadBuffer, 0, segments * 16);
        }
      }
      const commandBuf = encoder.finish();
      device.queue.submit([commandBuf]);
      await device.queue.onSubmittedWorkDone();
      await cache.readBuffer.mapAsync(GPUMapMode.READ);
      const mapped = cache.readBuffer.getMappedRange();
      const transformed = new Float32Array(mapped.slice(0, count * 4));
      cache.readBuffer.unmap();
      if (cache.reduction) {
        try {
          await cache.reduction.statsReadBuffer.mapAsync(GPUMapMode.READ);
          const sr = cache.reduction.statsReadBuffer.getMappedRange();
          const raw = new Float32Array(sr.slice(0));
          // Raw layout stride 4 floats per segment (mean,std,energy,pad)
          const segments = raw.length / 4;
          const compact = new Float32Array(segments * 3);
            for (let i = 0; i < segments; i++) {
              compact[i * 3] = raw[i * 4];
              compact[i * 3 + 1] = raw[i * 4 + 1];
              compact[i * 3 + 2] = raw[i * 4 + 2];
            }
          stats = compact; // [mean,std,energy]*
          cache.reduction.statsReadBuffer.unmap();
        } catch {}
      }

      const durationMs = performance.now() - start;
      telemetryBus.publish({ type: 'gpu.vector.webgpu.compute' as any, meta: { backend: 'webgpu', durationMs, count, workgroups, reused: true, reduction: !!stats } });
  if (stats) telemetryBus.publish({ type: 'gpu.vector.webgpu.reduction' as any, meta: { segments: stats.length / 3, dimension: dim, durationMs, energy: true } });
  const out: Record<string, ArrayBufferView> = { [firstKey]: transformed, transform: transformed };
      if (stats) out['stats'] = stats; // [mean0,std0, mean1,std1, ...]
      return out;
    } catch (e) {
      telemetryBus.publish({ type: 'gpu.vector.webgpu.compute' as any, meta: { backend: 'webgpu', error: (e as Error).message } });
      return { ...input };
    }
  }

  /** Manual override helpers for dashboard */
  async forceDemote(reason = 'manual-override') {
    telemetryBus.publish({ type: 'gpu.backend.override' as any, meta: { action: 'force-demote', reason, from: gpuContextProvider.getActiveBackend() } });
    await gpuContextProvider.demoteBackend(reason);
  }
  async forcePromote(target: string) {
    telemetryBus.publish({ type: 'gpu.backend.override' as any, meta: { action: 'force-promote', target } });
    await (gpuContextProvider as any).forceBackend?.(target);
  }

  async run(options: VectorProcessOptions): Promise<VectorProcessResult> {
    const start = performance.now();
    const backend = gpuContextProvider.getActiveBackend();

    telemetryBus.publish({ type: 'gpu.vector.process.start' as any, meta: { pipeline: options.pipeline, backend, label: options.label } });

    const shaderResources: ShaderResources | undefined = (lodCacheEngine as any).shaderResources?.get(options.pipeline);
    if (!shaderResources) {
      const durationMs = performance.now() - start;
      telemetryBus.publish({ type: 'gpu.vector.process.miss' as any, meta: { pipeline: options.pipeline, backend, durationMs } });
      return { backend, durationMs, outputs: null, shaderType: null, success: false, error: 'Shader resources not loaded' };
    }

    let shaderCode: string | undefined;
    let shaderType: string | null = null;
    if (options.expected === 'compute' && shaderResources.compute) {
      shaderCode = shaderResources.compute; shaderType = 'compute';
    } else if (options.expected === 'vertex+fragment' && shaderResources.vertex && shaderResources.fragment) {
      shaderCode = `/*VERTEX*/\n${shaderResources.vertex}\n/*FRAGMENT*/\n${shaderResources.fragment}`; shaderType = 'vertex+fragment';
    }

    if (!shaderCode) {
      const durationMs = performance.now() - start;
      telemetryBus.publish({ type: 'gpu.vector.process.typeMismatch' as any, meta: { pipeline: options.pipeline, backend, expected: options.expected } });
      return { backend, durationMs, outputs: null, shaderType: null, success: false, error: 'Shader type mismatch' };
    }

    let outputs: Record<string, ArrayBufferView> | null = null;
    let success = false;
    let lastError: unknown;

    for (let attempt = 0; attempt < DEFAULT_RETRY_POLICY.maxAttempts; attempt++) {
      try {
        if (shaderType === 'compute') {
          if (backend === 'webgpu') outputs = await this.runWebGPUCompute(options.input);
          else outputs = await gpuContextProvider.runComputeOperation(shaderCode, options.input, {});
        } else {
          if (backend === 'webgl2') outputs = await this.simulateWebGL2TransformFeedback(shaderResources, options.input);
          else if (backend === 'webgl1') outputs = await this.simulateWebGL1Framebuffer(shaderResources, options.input);
          else outputs = null;
        }
        success = true;
        break;
      } catch (e) {
        lastError = e;
        const classified = classifyGPUError(e);
        telemetryBus.publish({
          type: 'error',
          meta: { gpu: true, backend, pipeline: options.pipeline, category: classified.category, retryable: classified.retryable, message: classified.message }
        });
        gpuTelemetryService.recordError({ backend, pipeline: options.pipeline, category: classified.category, retryable: classified.retryable, message: classified.message, timestamp: Date.now() });
        this.trackFailure(backend);
        if (!classified.retryable || attempt === DEFAULT_RETRY_POLICY.maxAttempts - 1) break;
        const delay = computeBackoff(attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    if (!success) {
      this.maybeDemoteBackend(backend, options.pipeline);
    }

  if (success) this.trackSuccess(backend); // record stability
  const durationMs = performance.now() - start;
    telemetryBus.publish({ type: 'gpu.vector.process.end' as any, meta: { pipeline: options.pipeline, backend, durationMs, success, shaderType } });
    gpuTelemetryService.record({ pipeline: options.pipeline, backend, durationMs, success, shaderType, timestamp: Date.now() });

  if (success) this.checkForUpscaleOpportunity(backend);

    return { backend, durationMs, outputs, shaderType, success, error: success ? undefined : lastError };
  }

  /** Convenience wrapper for embedding-generation batch returning structured GpuRunResult */
  async runEmbeddingBatch(batched: Float32Array, label = 'embed-batch'): Promise<GpuRunResult | null> {
    const backend = gpuContextProvider.getActiveBackend();
    const expected: 'compute' | 'vertex+fragment' = backend === 'webgpu' ? 'compute' : (backend === 'webgl2' || backend === 'webgl1') ? 'vertex+fragment' : 'compute';
    const start = performance.now();
    const res = await this.run({ pipeline: 'embedding-generation', input: { data: batched }, expected, label });
    if (!res.success || !res.outputs) return null;
    const transformed = (res.outputs.transform as Float32Array) || (res.outputs.data as Float32Array) || Object.values(res.outputs)[0] as Float32Array;
    const stats = res.outputs.stats as Float32Array | undefined;
    const dim = this.embeddingDimension;
    const segments = dim > 0 ? Math.floor(transformed.length / dim) : 0;
    return { backend, data: transformed, stats, durationMs: performance.now() - start, dimension: dim, segments };
  }

  private trackFailure(backend: string) {
    const now = performance.now();
    this.failureWindow.push({ ts: now, backend });
    // Keep last 10s window
    this.failureWindow = this.failureWindow.filter(f => now - f.ts < 10000);
  }

  private trackSuccess(backend: string) {
    const now = performance.now();
    this.successWindow.push({ ts: now, backend });
    this.successWindow = this.successWindow.filter(s => now - s.ts < this.upscaleWindowMs);
    this.successesSinceLastDemotion++;
  }

  private maybeDemoteBackend(backend: string, pipeline: string) {
    if (backend === 'cpu' || backend === 'webgl1') return;
    const now = performance.now();
    if (now - this.lastDemotionAt < this.demotionCooldownMs) return;
    const failures = this.failureWindow.filter(f => f.backend === backend).length;
    if (failures < 3) return;
    const target = backend === 'webgpu' ? 'webgl2' : 'webgl1';
    telemetryBus.publish({ type: 'gpu.backend', meta: { demotion: true, from: backend, to: target, reason: 'failure-threshold' } });
    gpuTelemetryService.recordDemotion({ from: backend, to: target, reason: 'failure-threshold', timestamp: Date.now() });
    this.lastDemotionAt = now;
    this.successesSinceLastDemotion = 0; // reset hysteresis counter
    // Perform actual backend demotion and shader reload
    this.executeBackendDemotion(backend, target, pipeline).catch(err => {
      console.error('❌ Demotion execution failed:', err);
    });
  }

  private async executeBackendDemotion(from: string, to: string, pipeline: string) {
    const before = gpuContextProvider.getActiveBackend();
    const success = await gpuContextProvider.demoteBackend('failure-threshold');
    const after = gpuContextProvider.getActiveBackend();
    if (success && after !== before) {
      // Invalidate WebGL1 cached resources if backend changed (safety)
      this.disposeWebGL1Cache();
      this.disposeWebGL1Pool();
      this.disposeWebGL2Cache();
      this.disposeWebGPUCache();
      (lodCacheEngine as any).reloadVectorProcessingShaders?.();
      telemetryBus.publish({ type: 'gpu.backend', meta: { demotionApplied: true, from, to: after, pipeline } });
      this.applyAdaptiveEmbeddingDimension(after, from);
    }
  }

  private applyAdaptiveEmbeddingDimension(newBackend: string, previousBackend: string) {
    const target = this.dimensionSteps[newBackend] ?? this.embeddingDimension;
    if (target < this.embeddingDimension) {
      const oldDim = this.embeddingDimension;
      this.embeddingDimension = Math.max(target, this.minDimension);
      telemetryBus.publish({
        type: 'lod.embed.adapt' as any,
        meta: {
          fromDimension: oldDim,
          toDimension: this.embeddingDimension,
          backend: newBackend,
          previousBackend,
          reason: 'backend-demotion'
        }
      });
      gpuTelemetryService.record({
        pipeline: 'embedding-generation',
        backend: newBackend,
        durationMs: 0,
        success: true,
        shaderType: 'dimension-adapt'
      } as any);
    }
  }

  private checkForUpscaleOpportunity(currentBackend: string) {
    // Only attempt upscale if not already at highest tier (webgpu) or full dimension for tier
    const now = performance.now();
    if (now - this.lastDemotionAt < this.demotionCooldownMs * 2) return; // allow some breathing room after demotion
    if (now - this.lastUpscaleAt < this.upscaleCooldownMs) return;

    if (this.successesSinceLastDemotion < this.hysteresisSuccessCount) {
      telemetryBus.publish({ type: 'lod.embed.upscale.skipped' as any, meta: { backend: currentBackend, reason: 'hysteresis', successes: this.successesSinceLastDemotion, required: this.hysteresisSuccessCount } });
      return;
    }

    // Enough successes recently?
    const stableCount = this.successWindow.filter(s => s.backend === currentBackend).length;
    if (stableCount < this.upscaleSuccessThreshold) return;

    // Decide whether to upscale dimension or backend
    const backendOrder: string[] = ['cpu', 'webgl1', 'webgl2', 'webgpu'];
    const idx = backendOrder.indexOf(currentBackend);
    const canPromoteBackend = idx >= 0 && idx < backendOrder.length - 1 && currentBackend !== 'webgpu';
    const tierTarget = this.dimensionSteps[currentBackend] ?? this.embeddingDimension;
    const canIncreaseDimension = this.embeddingDimension < tierTarget;

    telemetryBus.publish({ type: 'lod.embed.upscale.attempt' as any, meta: { backend: currentBackend, stableCount, canPromoteBackend, canIncreaseDimension } });

    // Prefer dimension restoration first (cheap) then backend promotion
    if (canIncreaseDimension) {
      const oldDim = this.embeddingDimension;
      // Incrementally nudge dimension towards tier target (halfway step)
      const delta = Math.ceil((tierTarget - oldDim) / 2 / 16) * 16; // step in multiples of 16
      this.embeddingDimension = Math.min(tierTarget, oldDim + delta);
      this.lastUpscaleAt = now;
      telemetryBus.publish({ type: 'lod.embed.upscale.success' as any, meta: { type: 'dimension', from: oldDim, to: this.embeddingDimension, backend: currentBackend } });
      return;
    }

    if (canPromoteBackend) {
      const targetBackend = backendOrder[idx + 1] as any;
      // Attempt promotion by reinitializing with preferred backend
      telemetryBus.publish({ type: 'lod.embed.upscale.attempt' as any, meta: { type: 'backend', from: currentBackend, to: targetBackend } });
      this.promoteBackend(currentBackend, targetBackend).catch(err => {
        telemetryBus.publish({ type: 'lod.embed.upscale.failure' as any, meta: { type: 'backend', from: currentBackend, to: targetBackend, error: (err as Error).message } });
      });
    }
  }

  private async promoteBackend(from: string, to: string) {
    try {
      // Attempt to initialize provider with target preference (best-effort)
      const success = await gpuContextProvider.initialize({ preferredBackend: to as any, requireCompute: true, debug: false });
      if (!success) throw new Error('provider refused promotion');
      const active = gpuContextProvider.getActiveBackend();
      if (active === to) {
        this.disposeWebGL1Cache();
        this.disposeWebGL1Pool();
        this.disposeWebGL2Cache();
        this.disposeWebGPUCache();
        (lodCacheEngine as any).reloadVectorProcessingShaders?.();
        this.lastUpscaleAt = performance.now();
        telemetryBus.publish({ type: 'lod.embed.upscale.success' as any, meta: { type: 'backend', from, to } });
      } else {
        telemetryBus.publish({ type: 'lod.embed.upscale.failure' as any, meta: { type: 'backend', from, to, reason: 'active backend mismatch' } });
      }
    } catch (e) {
      telemetryBus.publish({ type: 'lod.embed.upscale.failure' as any, meta: { type: 'backend', from, to, error: (e as Error).message } });
    }
  }

  getCurrentEmbeddingDimension() { return this.embeddingDimension; }

  // WebGL2 transform feedback implementation with simple program+buffer caching
  private webgl2Cache: {
    program: WebGLProgram;
    vao: WebGLVertexArrayObject;
    attribLoc: number;
    uniforms: { uScale: WebGLUniformLocation | null; uPass: WebGLUniformLocation | null };
    outBuffer: WebGLBuffer; // base sized buffer reused / resized
    capacity: number; // float capacity
  } | null = null;
  private disposeWebGL2Cache() {
    try {
      if (!this.webgl2Cache) return;
      const hybrid = (gpuContextProvider as any).getHybridContext?.();
      const ctxType = hybrid?.getActiveContextType?.();
      const gl2: WebGL2RenderingContext | null = ctxType === 'webgl2' ? hybrid.webgl2Context : null;
      if (gl2) {
        gl2.deleteBuffer(this.webgl2Cache.outBuffer);
        gl2.deleteProgram(this.webgl2Cache.program);
        gl2.deleteVertexArray(this.webgl2Cache.vao);
      }
    } catch (e) {
      console.warn('⚠️ Failed disposing WebGL2 cache', e);
    } finally {
      this.webgl2Cache = null;
    }
  }
  private ensureWebGL2Cache(gl: WebGL2RenderingContext, neededFloats: number) {
    if (this.webgl2Cache && this.webgl2Cache.capacity >= neededFloats) return this.webgl2Cache;
    // (Re)create
    this.disposeWebGL2Cache();
    const vsSrc = `#version 300 es\nin float a_value;out float v_value;uniform float uScale;uniform float uPass;void main(){float x=a_value*(1.0+0.0005*uPass)+sin(a_value*0.5+uPass)*0.0003;v_value=x*uScale;gl_Position=vec4( (float(gl_VertexID)/1000.0)*0.0, 0.0, 0.0, 1.0);}`;
    const fsSrc = `#version 300 es\nprecision highp float;in float v_value;out vec4 fragColor;void main(){fragColor=vec4(v_value,0.0,0.0,1.0);}`; // not used (TF discards raster if we enable RASTERIZER_DISCARD)
    const compile = (type: number, src: string) => { const sh = gl.createShader(type)!; gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const info = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw new Error('webgl2 shader compile: '+info); } return sh; };
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram()!; gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.transformFeedbackVaryings(prog, ['v_value'], gl.INTERLEAVED_ATTRIBS); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { const info = gl.getProgramInfoLog(prog); throw new Error('webgl2 link: '+info); }
    gl.deleteShader(vs); gl.deleteShader(fs);
    const vao = gl.createVertexArray()!; gl.bindVertexArray(vao);
    const attribLoc = gl.getAttribLocation(prog, 'a_value');
    const uniforms = { uScale: gl.getUniformLocation(prog, 'uScale'), uPass: gl.getUniformLocation(prog, 'uPass') };
    const outBuffer = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, outBuffer); gl.bufferData(gl.ARRAY_BUFFER, neededFloats * 4, gl.DYNAMIC_COPY);
    this.webgl2Cache = { program: prog, vao, attribLoc, uniforms, outBuffer, capacity: neededFloats };
    return this.webgl2Cache;
  }
  private async simulateWebGL2TransformFeedback(_shaders: ShaderResources, input: Record<string, ArrayBufferView>): Promise<Record<string, ArrayBufferView>> {
    const start = performance.now();
    const hybrid = (gpuContextProvider as any).getHybridContext?.();
    const ctxType = hybrid?.getActiveContextType?.();
    const gl: WebGL2RenderingContext | null = ctxType === 'webgl2' ? hybrid.webgl2Context : null;
    if (!gl) {
      telemetryBus.publish({ type: 'gpu.vector.webgl2.compute' as any, meta: { backend: 'webgl2', durationMs: 0, reason: 'no-context' } });
      return { ...input };
    }
    const firstKey = Object.keys(input)[0];
    if (!firstKey) return {};
    const arr = input[firstKey];
    const floatArray = arr instanceof Float32Array ? arr : new Float32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
    const count = floatArray.length;
    try {
      const cache = this.ensureWebGL2Cache(gl, count);
      gl.useProgram(cache.program);
      gl.bindVertexArray(cache.vao);
      // Create / update input buffer separate from outBuffer (cannot reuse same binding for TF source & target)
      const inBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, inBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, floatArray, gl.STREAM_DRAW);
      gl.enableVertexAttribArray(cache.attribLoc);
      gl.vertexAttribPointer(cache.attribLoc, 1, gl.FLOAT, false, 0, 0);

      // Resize outBuffer if needed (already handled by recreate path)
      gl.bindBuffer(gl.ARRAY_BUFFER, cache.outBuffer);
      if (cache.capacity < count) { /* unreachable due to ensure capacity logic */ }

      const tf = gl.createTransformFeedback()!;
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, cache.outBuffer);

      gl.enable(gl.RASTERIZER_DISCARD);
      const passes = 2; // simple multi-pass accumulation
      for (let p = 0; p < passes; p++) {
        if (cache.uniforms.uScale) gl.uniform1f(cache.uniforms.uScale, 1.0 + p * 0.001);
        if (cache.uniforms.uPass) gl.uniform1f(cache.uniforms.uPass, p);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, count);
        gl.endTransformFeedback();
      }
      gl.disable(gl.RASTERIZER_DISCARD);

      // Read back result
      const result = new Float32Array(count);
      gl.bindBuffer(gl.ARRAY_BUFFER, cache.outBuffer);
      gl.getBufferSubData(gl.ARRAY_BUFFER, 0, result);

      // Cleanup transient input objects
      gl.deleteTransformFeedback(tf);
      gl.deleteBuffer(inBuffer);
      gl.bindVertexArray(null);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      const durationMs = performance.now() - start;
      telemetryBus.publish({ type: 'gpu.vector.webgl2.compute' as any, meta: { backend: 'webgl2', durationMs, count, passes, reused: !!this.webgl2Cache } });
      return { [firstKey]: result };
    } catch (e) {
      const durationMs = performance.now() - start;
      telemetryBus.publish({ type: 'gpu.vector.webgl2.compute' as any, meta: { backend: 'webgl2', durationMs, error: (e as Error).message } });
      return { ...input };
    }
  }

  // Simulation of WebGL1 framebuffer/texture pipeline (placeholder)
  private async simulateWebGL1Framebuffer(_shaders: ShaderResources, input: Record<string, ArrayBufferView>): Promise<Record<string, ArrayBufferView>> {
    const start = performance.now();
    try {
      const hybrid = (gpuContextProvider as any).getHybridContext?.();
      const ctxType = hybrid?.getActiveContextType?.();
      const gl: WebGLRenderingContext | null = ctxType === 'webgl' ? hybrid.webglContext : ctxType === 'webgl2' ? hybrid.webgl2Context : null;
      if (!gl) {
        telemetryBus.publish({ type: 'gpu.vector.webgl1.compute' as any, meta: { backend: 'webgl1', durationMs: 0, passes: 0, floatMode: 'unavailable', reason: 'no-gl-context' } });
        return { ...input }; // fallback echo
      }

      // Derive a primary input buffer
      const firstKey = Object.keys(input)[0];
      if (!firstKey) return {};
      const arr = input[firstKey];
      const floatArray = arr instanceof Float32Array ? arr : new Float32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
      const valueCount = floatArray.length;

      // Decide texture dimensions (pack 4 floats per RGBA pixel if float textures supported)
      const pixelsNeeded = Math.ceil(valueCount / 4);
      const texSize = Math.pow(2, Math.ceil(Math.log2(Math.ceil(Math.sqrt(pixelsNeeded))))) | 0; // power-of-two square
      const totalPixels = texSize * texSize;
      const paddedValues = totalPixels * 4;

      // Feature detection for float render target
      const extTexFloat = gl.getExtension('OES_texture_float');
      const extRTTFloat = gl.getExtension('WEBGL_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
      const canFloatRTT = !!extTexFloat && !!extRTTFloat;

      // Create helper to build texture
      const createTexture = (data: ArrayBufferView | null, float: boolean) => {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (float) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.FLOAT, data as any);
        } else {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, data as any);
        }
        return t;
      };

      // Pack data into Float32 RGBA or Uint8 RGBA
      let floatMode: 'fp32' | 'byte-pack' = canFloatRTT ? 'fp32' : 'byte-pack';
      let initialData: Float32Array | Uint8Array;
      if (floatMode === 'fp32') {
        initialData = new Float32Array(paddedValues);
        (initialData as Float32Array).set(floatArray);
      } else {
        // Simple byte quantization: clamp [-1,1] -> [0,255]
        const bytes = new Uint8Array(totalPixels * 4);
        for (let i = 0; i < valueCount; i++) {
          const v = Math.max(-1, Math.min(1, floatArray[i]));
          bytes[i] = Math.round((v * 0.5 + 0.5) * 255);
        }
        initialData = bytes;
      }

      // Borrow pooled buffers (creates if none free)
      const { textures, framebuffers, created } = this.borrowWebGL1Resources(gl, texSize, floatMode === 'fp32');
      // Upload initial data into first texture
      gl.bindTexture(gl.TEXTURE_2D, textures[0]);
      if (floatMode === 'fp32') gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.FLOAT, initialData as any);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, initialData as any);
      telemetryBus.publish({ type: 'gpu.vector.webgl1.pool' as any, meta: { action: 'borrow', key: `${texSize}-${floatMode}`, created } });

      // Retrieve or build cached program + quad
      if (!this.webgl1Cache) {
        const vsSrc = `attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=(a_pos+1.0)*0.5;gl_Position=vec4(a_pos,0.0,1.0);}`;
        const fsSrc = `precision highp float;varying vec2 v_uv;uniform sampler2D u_tex;uniform float u_pass;uniform float u_total;void main(){vec4 c=texture2D(u_tex,v_uv);c = c* (1.0 + 0.002*u_pass) + 0.0005*vec4(sin(u_pass+v_uv.x),cos(u_pass+v_uv.y),sin(u_pass*0.5),1.0);gl_FragColor=c;}`;
        const compile = (type: number, src: string) => { const sh = gl.createShader(type)!; gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const info = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw new Error('shader-compile: '+info); } return sh; };
        const vs = compile(gl.VERTEX_SHADER, vsSrc);
        const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
        const prog = gl.createProgram()!; gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { const info = gl.getProgramInfoLog(prog); throw new Error('program-link: '+info); }
        const quad = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
        const vbo = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
        const attribLocation = gl.getAttribLocation(prog, 'a_pos');
        const uniforms = { uTex: gl.getUniformLocation(prog, 'u_tex'), uPass: gl.getUniformLocation(prog, 'u_pass'), uTotal: gl.getUniformLocation(prog, 'u_total') };
        this.webgl1Cache = { program: prog, vbo, attribLocation, uniforms, texSize: texSize };
      }
      const { program: prog, vbo, attribLocation, uniforms } = this.webgl1Cache;
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.enableVertexAttribArray(attribLocation);
      gl.vertexAttribPointer(attribLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(uniforms.uTex, 0);
      const passes = 4;

      gl.viewport(0, 0, texSize, texSize);
      let src = 0, dst = 1;
      for (let p = 0; p < passes; p++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[dst]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[src]);
        gl.uniform1f(uniforms.uPass, p);
        gl.uniform1f(uniforms.uTotal, passes);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        // swap
        const tmp = src; src = dst; dst = tmp;
      }

      // Readback
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[src]);
      let outFloat: Float32Array;
      if (floatMode === 'fp32') {
        outFloat = new Float32Array(totalPixels * 4);
        gl.readPixels(0, 0, texSize, texSize, gl.RGBA, gl.FLOAT, outFloat);
      } else {
        const bytes = new Uint8Array(totalPixels * 4);
        gl.readPixels(0, 0, texSize, texSize, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        outFloat = new Float32Array(totalPixels * 4);
        for (let i = 0; i < totalPixels * 4; i++) {
          outFloat[i] = (bytes[i] / 255) * 2 - 1; // dequantize
        }
      }

      // Trim to original length
      const trimmed = outFloat.subarray(0, valueCount);

  // Return pooled resources (keeps GL objects alive for reuse)
  this.releaseWebGL1Resources(texSize, floatMode === 'fp32', textures as WebGLTexture[], framebuffers as WebGLFramebuffer[]);
  telemetryBus.publish({ type: 'gpu.vector.webgl1.pool' as any, meta: { action: 'release', key: `${texSize}-${floatMode}` } });

      const durationMs = performance.now() - start;
      telemetryBus.publish({ type: 'gpu.vector.webgl1.compute' as any, meta: { backend: 'webgl1', durationMs, passes, texSize, values: valueCount, floatMode } });
      return { [firstKey]: trimmed };
    } catch (e) {
      const durationMs = performance.now() - start;
      telemetryBus.publish({ type: 'gpu.vector.webgl1.compute' as any, meta: { backend: 'webgl1', durationMs, passes: 0, floatMode: 'error', error: (e as Error).message } });
      return { ...input }; // fallback echo on error
    }
  }

  private disposeWebGL1Cache() {
    try {
      if (!this.webgl1Cache) return;
      const hybrid = (gpuContextProvider as any).getHybridContext?.();
      const ctxType = hybrid?.getActiveContextType?.();
      const gl: WebGLRenderingContext | null = ctxType === 'webgl' ? hybrid.webglContext : ctxType === 'webgl2' ? hybrid.webgl2Context : null;
      if (gl) {
        gl.deleteBuffer(this.webgl1Cache.vbo);
        gl.deleteProgram(this.webgl1Cache.program);
      }
    } catch (e) {
      console.warn('⚠️ Failed disposing WebGL1 cache', e);
    } finally {
      this.webgl1Cache = null;
    }
  }

  private borrowWebGL1Resources(gl: WebGLRenderingContext, texSize: number, isFloat: boolean) {
    const key = `${texSize}-${isFloat ? 'fp32' : 'u8'}`;
    let bucket = this.webgl1Pool.get(key);
    if (!bucket) {
      bucket = { free: [], inUse: 0 };
      this.webgl1Pool.set(key, bucket);
    }
    if (bucket.free.length > 0) {
      const entry = bucket.free.pop()!;
      bucket.inUse++;
      return { ...entry, created: false };
    }
    // Create new pair
    const textures: WebGLTexture[] = [gl.createTexture()!, gl.createTexture()!];
    const framebuffers: WebGLFramebuffer[] = [gl.createFramebuffer()!, gl.createFramebuffer()!];
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, textures[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, isFloat ? gl.FLOAT : gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[i]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[i], 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    bucket.inUse++;
    return { textures, framebuffers, created: true };
  }

  private releaseWebGL1Resources(texSize: number, isFloat: boolean, textures: WebGLTexture[], framebuffers: WebGLFramebuffer[]) {
    const key = `${texSize}-${isFloat ? 'fp32' : 'u8'}`;
    const bucket = this.webgl1Pool.get(key);
    if (!bucket) return;
    bucket.free.push({ textures, framebuffers });
    bucket.inUse = Math.max(0, bucket.inUse - 1);
    // Optional eviction policy: cap free list size
    if (bucket.free.length > 6) {
      const evict = bucket.free.splice(0, bucket.free.length - 6);
      const hybrid = (gpuContextProvider as any).getHybridContext?.();
      const ctxType = hybrid?.getActiveContextType?.();
      const gl: WebGLRenderingContext | null = ctxType === 'webgl' ? hybrid.webglContext : ctxType === 'webgl2' ? hybrid.webgl2Context : null;
      if (gl) {
        evict.forEach(e => {
          e.textures.forEach(t => gl.deleteTexture(t));
          e.framebuffers.forEach(f => gl.deleteFramebuffer(f));
        });
      }
    }
  }

  private disposeWebGL1Pool() {
    const hybrid = (gpuContextProvider as any).getHybridContext?.();
    const ctxType = hybrid?.getActiveContextType?.();
    const gl: WebGLRenderingContext | null = ctxType === 'webgl' ? hybrid.webglContext : ctxType === 'webgl2' ? hybrid.webgl2Context : null;
    if (gl) {
      this.webgl1Pool.forEach(bucket => {
        bucket.free.forEach(e => {
          e.textures.forEach(t => gl.deleteTexture(t));
          e.framebuffers.forEach(f => gl.deleteFramebuffer(f));
        });
      });
    }
    this.webgl1Pool.clear();
  }

  dumpState() {
    return {
      cachedPipelines: Array.from(((lodCacheEngine as any).shaderResources?.keys?.() || []) as any),
      recentTelemetry: gpuTelemetryService.getRecent(10),
      aggregates: gpuTelemetryService.getAggregates()
    };
  }
}

export const gpuVectorProcessor = new GPUVectorProcessor();
