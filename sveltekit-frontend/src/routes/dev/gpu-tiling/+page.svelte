<script lang="ts">
import { embedText } from '$lib // TODO: Verify store subscription is correct for Svelte 5/ai/tensor-client';
  let text = 'A short legal passage about indemnification and liability.';
  let simdParse = true
  let gpuTile = true
  let result: unknown = null
  let ocrBusy = $state // TODO: Verify store subscription is correct for Svelte 5<boolean>(false);
  let runBusy = $state // TODO: Verify store subscription is correct for Svelte 5<boolean>(false);
  let webgpuSupported = typeof navigator !== 'undefined' && !!(navigator as: unknown).gpu
  async function run(): Promise<any> {
    runBusy = true
    result = null
    try {
      const r = await embedText(text, { simdParse, gpuTile });
      result = r} catch (e: unknown) {
      result = { error: e?.message || String(e) }} finally {
      runBusy = false}
  }
  async function onImageSelected(e: Event): Promise<any> {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0];
    if (!file) return
    ocrBusy = true
    try {
      const form = new FormData();
      form.append('image', file, file.name);
      const resp = await fetch('/api/ocr', { method: 'POST', body: form });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'OCR failed');
      text = data?.text || ''} catch (e: unknown) {
      alert(e?.message || String(e))} finally {
      ocrBusy = false}
  }
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page {
    padding: 1rem;
    display: grid;
    gap: 1rem;
  }
  .controls {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }
  .inputs {
    display: grid;
    gap: 0.75rem;
  }
  .inputs .text textarea {
    width: 100%;
  }
  .actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }
</style>
