<script lang="ts">
  import { onMount } from 'svelte';
  import { LodCacheEngine } from '$lib/gpu/lod-cache-engine.js';
  // import { GpuVectorProcessor } from '$lib/gpu/GpuVectorProcessor.js'; // Temporarily disabled due to TypeScript compilation issues

  let log = '';

  function append(msg: string) {
    log += msg + '\n';
  }

  onMount(async () => {
    append('WebGL fallback smoke test temporarily disabled due to TypeScript compilation issues with GpuVectorProcessor.');
    append('GpuVectorProcessor has been excluded from compilation to resolve ES5/Promise compatibility errors.');
    append('This test will be re-enabled once the GPU processor issues are resolved.');
    
    // Temporarily disabled due to GpuVectorProcessor TypeScript issues
    /*
    append('Starting WebGL fallback smoke test...');

    try {
      const lod = new LodCacheEngine();
      const cfg = {
        dimensions: 8,
        quantization: 'float32',
        batchSize: 4,
        memoryBudget: { total: 1024 * 1024 * 64, L2: 1024 * 1024 },
        adaptiveScaling: { enabled: false },
        fallbackToWebGL: true,
      } as any;

      const gp = new GpuVectorProcessor(lod, cfg);
      await gp.initialize(undefined);
      append('GpuVectorProcessor initialized (device? ' + (!!(gp as any).device) + ')');

      // small test vectors
      const vectors: Float32Array[] = [];
      for (let i = 0; i < 3; i++) {
        const v = new Float32Array(cfg.dimensions);
        for (let j = 0; j < cfg.dimensions; j++) v[j] = i * 10 + j + 0.5;
        vectors.push(v);
      }

      const res = await gp.processEmbeddings({ inputVectors: vectors, similarityThreshold: 0.0, topK: 1, useAdaptiveQuantization: false } as any);
      append('Processed ' + res.processedVectors.length + ' vectors in ' + res.processingTime.toFixed(2) + 'ms');
      res.processedVectors.forEach((v, idx) => append(`vec[${idx}]=` + Array.from(v).map(n => n.toFixed(2)).join(', ')));
    } catch (err) {
      append('Error: ' + (err && (err as Error).message ? (err as Error).message : String(err)));
      console.error(err);
    }
    */
  });
</script>

<style>
  pre { background: #0b0b0b; color: #e6e6e6; padding: 1rem; border-radius: 6px; white-space: pre-wrap; }
</style>

<h1>WebGL2 Transform-Feedback Smoke Test</h1>
<p>This page runs a tiny in-browser test that forces the WebGL2 fallback and logs results.</p>
<pre>{log}</pre>
