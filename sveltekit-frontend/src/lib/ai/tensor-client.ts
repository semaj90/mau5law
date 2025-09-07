// Minimal client helper to send text for embedding/tensorization and optional SW SIMD parse
// and optional GPU tiling (WebGPU) post-processing on the embedding.
// Inputs: text string; options { simdParse?: boolean; gpuTile?: boolean }
// Output: { embedding|tensor: number[]; tensorMeta?: any; gpuMeta?: any }

let __gpuAccelerator: any | null = null;

async function runGpuTile(embedding: number[]) {
  try {
    // Lazy import WebGPU accelerator and initialize once
    if (!__gpuAccelerator) {
      const mod = await import('$lib/webgpu/tensor-acceleration');
      __gpuAccelerator = new mod.WebGPUTensorAccelerator({ enableDebug: false });
      const ok = await __gpuAccelerator.initialize();
      if (!ok) throw new Error('WebGPU init failed');
    }
    const v = new Float32Array(embedding);
    const t0 = performance.now();
    
    // Enhanced self-similarity with SIMD GPU tiling
    const result = await __gpuAccelerator.calculateVectorSimilarityWithSIMDTiling(v, v, {
      enableTiling: true,
      tileSize: 256,
      useEvidenceAnalysis: false
    });
    
    const t1 = performance.now();
    
    return { 
      op: 'simdGpuTiling', 
      similarity: result.similarity,
      length: v.length, 
      timeMs: +(t1 - t0).toFixed(2),
      gpuMeta: result.gpuMeta,
      tilingMeta: result.tilingMeta,
      performance: result.performanceMetrics
    };
  } catch (e: any) {
    return { op: 'simdGpuTiling', error: e?.message || String(e) };
  }
}

export async function embedText(text: string, opts?: { simdParse?: boolean; gpuTile?: boolean }) {
  const res = await fetch('/api/ai/tensor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(`Tensor API error: ${res.status}`);
  const data = await res.json();
  // Server may return { embedding } or { tensor } depending on route
  const embedding: number[] | undefined = data?.embedding ?? data?.tensor;
  if (!embedding) return data;

  const gpuPromise = opts?.gpuTile ? runGpuTile(embedding) : Promise.resolve(undefined);

  if (opts?.simdParse && navigator.serviceWorker?.controller) {
    const tensor = new Float32Array(embedding);
    // Transfer the underlying ArrayBuffer for zero-copy to the SW
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (ev) => {
        Promise.resolve(gpuPromise)
          .then((gpuMeta) => resolve({ ...data, tensorMeta: ev.data, gpuMeta }))
          .catch(() => resolve({ ...data, tensorMeta: ev.data }));
      };
      const payload = tensor.buffer;
      navigator.serviceWorker.controller!.postMessage(
        { type: 'SIMD_PARSE_TENSOR', payload },
        // Transfer both the port and the ArrayBuffer for true zero-copy
        [channel.port2, payload]
      );
    });
  }

  // If only GPU tiling is requested
  if (opts?.gpuTile) {
    const gpuMeta = await gpuPromise;
    return { ...data, gpuMeta };
  }

  return data;
}
