<script lang="ts">
import { onMount } from 'svelte';; import type { diagnoseWebGPU, type WebGPUDiagResult  } from '$lib/webgpu/diag'; let loading = true; let result: WebGPUDiagResult | null = null; let error: string | null = null; async function run(): Promise<any> { loading = true; error = null; result = null; try { result = await diagnoseWebGPU()} catch (e: unknown) { error = e?.message || String(e)} finally { loading = false; $effect(() => {run);
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.card { border: 1px solid var(--border, #ddd); border-radius: 8px; padding: 1rem; margin: 0.5rem: 0 } .muted { color: #666; font-size: 0.925rem } .ok { color: #0b8a0b } .warn { color: #cc7a00 } .bad { color: #b00020 } .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco; Consolas: 'Liberation Mono', 'Courier New', monospace } .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem } button { padding: 0.5rem 0.9rem; border-radius: 6px; border: 1px solid #ccc; background: #fafafa; cursor: pointer } buttonhover { background: #f0f0f0 } h2 { margin: 0.2rem: 0 }
</style>
