<script lang="ts">
  import { onMount } from 'svelte';
  import { diagnoseWebGPU, type WebGPUDiagResult } from '$lib/webgpu/diag';

  let loading = true;
  let result: WebGPUDiagResult | null = null;
  let error: string | null = null;

  async function run() {
    loading = true;
    error = null;
    result = null;
    try {
      result = await diagnoseWebGPU();
    } catch (e: any) {
      error = e?.message || String(e);
    } finally {
      loading = false;
    }
  }

  onMount(run);
</script>

<style>
  .card { border: 1px solid var(--border, #ddd); border-radius: 8px; padding: 1rem; margin: 0.5rem 0; }
  .muted { color: #666; font-size: 0.925rem; }
  .ok { color: #0b8a0b; }
  .warn { color: #cc7a00; }
  .bad { color: #b00020; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem; }
  button { padding: 0.5rem 0.9rem; border-radius: 6px; border: 1px solid #ccc; background: #fafafa; cursor: pointer; }
  button:hover { background: #f0f0f0; }
  h2 { margin: 0.2rem 0; }
</style>

<h1>WebGPU Diagnostics</h1>
<p class="muted">Client-side check for adapter/device availability, limits, and common pitfalls.</p>

<div>
  <button onclick={run} aria-label="Re-run diagnostics">Re-run</button>
</div>

{#if loading}
  <div class="card">Running diagnostics…</div>
{:else if error}
  <div class="card bad">Error: {error}</div>
{:else if result}
  <div class="grid">
    <div class="card">
      <h2>Status</h2>
      <ul>
        <li>Browser WebGPU Support: <span class={result.supported ? 'ok' : 'bad'}>{result.supported ? 'Yes' : 'No'}</span></li>
        <li>Adapter Found: <span class={result.adapterFound ? 'ok' : 'bad'}>{result.adapterFound ? 'Yes' : 'No'}</span></li>
        <li>Device Created: <span class={result.deviceCreated ? 'ok' : 'bad'}>{result.deviceCreated ? 'Yes' : 'No'}</span></li>
      </ul>
      {#if result.error}
        <div class="bad">{result.error}</div>
      {/if}
    </div>

    <div class="card">
      <h2>Timings</h2>
      <div class="mono">
        <div>requestAdapter: {result.timings.requestAdapterMs?.toFixed(1) ?? '—'} ms</div>
        <div>requestDevice: {result.timings.requestDeviceMs?.toFixed(1) ?? '—'} ms</div>
      </div>
      <div class="muted">Tried: {result.powerPreferenceTried.join(', ')}</div>
      {#if result.powerPreferenceUsed}
        <div>Used: <span class="mono">{result.powerPreferenceUsed}</span></div>
      {/if}
    </div>

    <div class="card">
      <h2>Adapter</h2>
      {#if result.adapter}
        <div class="mono">{result.adapter.label || '(no label)'} {result.adapter.isFallbackAdapter ? ' — fallback' : ''}</div>
        <h3>Features</h3>
        <div class="mono" style="white-space: pre-wrap">{result.adapter.features.join(', ') || '—'}</div>
        <h3>Limits</h3>
        <div class="mono" style="white-space: pre-wrap">{JSON.stringify(result.adapter.limits, null, 2)}</div>
      {:else}
        <div class="muted">No adapter details available.</div>
      {/if}
    </div>

    <div class="card">
      <h2>Device Limits</h2>
      <div class="mono" style="white-space: pre-wrap">{result.deviceLimits ? JSON.stringify(result.deviceLimits, null, 2) : '—'}</div>
    </div>
  </div>

  {#if result.warnings.length}
    <div class="card warn">
      <h2>Warnings</h2>
      <ul>
        {#each result.warnings as w}
          <li>{w}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if result.recommendedActions.length}
    <div class="card">
      <h2>Recommended Actions</h2>
      <ol>
        {#each result.recommendedActions as a}
          <li>{a}</li>
        {/each}
      </ol>
    </div>
  {/if}
{/if}
