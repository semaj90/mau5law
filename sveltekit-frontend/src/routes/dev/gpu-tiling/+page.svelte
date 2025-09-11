<script lang="ts">
  import { embedText } from '$lib/ai/tensor-client';

  let text = 'A short legal passage about indemnification and liability.';
  let simdParse = true;
  let gpuTile = true;
  let result: any = null;
  let ocrBusy = false;
  let runBusy = false;
  let webgpuSupported = typeof navigator !== 'undefined' && !!(navigator as any).gpu;

  async function run() {
    runBusy = true;
    result = null;
    try {
      const r = await embedText(text, { simdParse, gpuTile });
      result = r;
    } catch (e: any) {
      result = { error: e?.message || String(e) };
    } finally {
      runBusy = false;
    }
  }

  async function onImageSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    ocrBusy = true;
    try {
      const form = new FormData();
      form.append('image', file, file.name);
      const resp = await fetch('/api/ocr', { method: 'POST', body: form });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'OCR failed');
      text = data?.text || '';
    } catch (e: any) {
      alert(e?.message || String(e);
    } finally {
      ocrBusy = false;
    }
  }
</script>

<div class="page">
  <h1>GPU Tiling + SIMD Demo (OCR → Embedding)</h1>
  <p>WebGPU: {webgpuSupported ? 'available' : 'unavailable'}</p>

  <div class="controls">
    <label>
      <input type="checkbox" bind:checked={simdParse}>
      SIMD parse in Service Worker (zero‑copy)
    </label>
    <label>
      <input type="checkbox" bind:checked={gpuTile} disabled={!webgpuSupported}>
      GPU tiling (WebGPU)
    </label>
  </div>

  <div class="inputs">
    <div>
      <label>Pick image for OCR:</label>
      <input type="file" accept="image/*" onchange={onImageSelected} disabled={ocrBusy}>
      {#if ocrBusy}<span>OCR…</span>{/if}
    </div>
    <div class="text">
      <label>Text</label>
      <textarea bind:value={text} rows="6" />
    </div>
  </div>

  <div class="actions">
    <button onclick={run} disabled={runBusy}>Process</button>
    {#if runBusy}<span>Running…</span>{/if}
  </div>

  {#if result}
    <h3>Result</h3>
    <pre>{JSON.stringify(result, null, 2)}</pre>
  {/if}
</div>

<style>
  .page { padding: 1rem; display: grid; gap: 1rem; }
  .controls { display: flex; gap: 1.5rem; align-items: center; }
  .inputs { display: grid; gap: .75rem; }
  .inputs .text textarea { width: 100%; }
  .actions { display: flex; gap: .75rem; align-items: center; }
</style>

