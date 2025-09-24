<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
  // Svelte 5 runes are auto-imported

</script>
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
    } catch (e: unknown) {
      error = e?.message || String(e);
    } finally {
      loading = false;
    }
  }

  $effect(run);
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
  <div class="nier-bits-card">Running diagnostics…</div>
{:else if error}
  <div class="nier-bits-card bad">Error: {error}</div>
{:else if result}
  <div class="grid">
    <div class="nier-bits-card">
      <h2>Status</h2>
      <ul>
        <li>Browser WebGPU Support: <span class={(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).supported ? 'ok' : 'bad'}>{(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).supported ? 'Yes' : 'No'}</span></li>
        <li>Adapter Found: <span class={(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).adapterFound ? 'ok' : 'bad'}>{(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).adapterFound ? 'Yes' : 'No'}</span></li>
        <li>Device Created: <span class={(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).deviceCreated ? 'ok' : 'bad'}>{(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).deviceCreated ? 'Yes' : 'No'}</span></li>
      </ul>
      {#if (result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).error}
        <div class="bad">{(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).error}</div>
      {/if}
    </div>

    <div class="nier-bits-card">
      <h2>Timings</h2>
      <div class="mono">
        <div>requestAdapter: {(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).timings.requestAdapterMs?.toFixed(1) ?? '—'} ms</div>
        <div>requestDevice: {(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).timings.requestDeviceMs?.toFixed(1) ?? '—'} ms</div>
      </div>
      <div class="muted">Tried: {(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).powerPreferenceTried.join(', ')}</div>
      {#if (result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).powerPreferenceUsed}
        <div>Used: <span class="mono">{(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).powerPreferenceUsed}</span></div>
      {/if}
    </div>

    <div class="nier-bits-card">
      <h2>Adapter</h2>
      {#if (result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).adapter}
        <div class="mono">{(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).adapter.label || '(no label)'} {(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).adapter.isFallbackAdapter ? ' — fallback' : ''}</div>
        <h3>Features</h3>
        <div class="mono" style="white-space: pre-wrap">{(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).adapter.features.join(', ') || '—'}</div>
        <h3>Limits</h3>
        <div class="mono" style="white-space: pre-wrap">{JSON.stringify(adapter).limits, null, 2)}</div>
      {:else}
        <div class="muted">No adapter details available.</div>
      {/if}
    </div>

    <div class="nier-bits-card">
      <h2>Device Limits</h2>
      <div class="mono" style="white-space: pre-wrap">{(result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).deviceLimits ? JSON.stringify(deviceLimits), null, 2) : '—'}</div>
    </div>
  </div>

  {#if (result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).warnings.length}
    <div class="nier-bits-card warn">
      <h2>Warnings</h2>
      <ul>
        {#each (result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).warnings as w}
          <li>{w}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if (result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).recommendedActions.length}
    <div class="nier-bits-card">
      <h2>Recommended Actions</h2>
      <ol>
        {#each (result as { supported?: unknown; adapterFound?: unknown; deviceCreated?: unknown; error?: unknown; timings?: unknown; powerPreferenceTried?: unknown; powerPreferenceUsed?: unknown; adapter?: unknown; deviceLimits?: unknown; warnings?: unknown; recommendedActions?: unknown }).recommendedActions as a}
          <li>{a}</li>
        {/each}
      </ol>
    </div>
  {/if}

