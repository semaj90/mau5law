<script lang="ts">
  import { onMount } from 'svelte';
  import { gpuTelemetryService } from '../../gpu/gpu-telemetry-service.js';
  import { gpuVectorProcessor } from '../../gpu/gpu-vector-processor.js';
  import { telemetryBus } from '../../telemetry/telemetry-bus.js';

  let aggregates: any[] = [];
  let recent: any[] = [];
  let errors: any[] = [];
  let demotions: any[] = [];
  let memory: any = null;
  let expanded = false;

  let unsub: () => void;
  function refresh() {
    aggregates = gpuTelemetryService.getAggregates();
    recent = gpuTelemetryService.getRecent(10);
    errors = gpuTelemetryService.getErrors(15);
    demotions = gpuTelemetryService.getDemotions(10);
    memory = (window as any).gpuContextProvider?.getMemoryUsage?.() || null;
  }

  onMount(() => {
    refresh();
    const interval = setInterval(refresh, 1200);
    unsub = telemetryBus.subscribe(() => refresh());
    return () => { clearInterval(interval); unsub && unsub(); };
  });
</script>

<style>
  .panel { font-family: system-ui, sans-serif; background:#111; color:#eee; padding:0.75rem; border:1px solid #333; border-radius:8px; font-size:12px; }
  .section { margin-top:0.75rem; }
  table { width:100%; border-collapse:collapse; }
  th, td { padding:4px 6px; text-align:left; border-bottom:1px solid #222; }
  th { background:#222; font-weight:600; }
  .ok { color:#5fbf5f; }
  .warn { color:#f5c04f; }
  .bad { color:#ff5f5f; }
  button { background:#222; color:#ddd; border:1px solid #444; padding:4px 8px; border-radius:4px; cursor:pointer; }
  button:hover { background:#2d2d2d; }
  .grid { display:grid; gap:4px; grid-template-columns: repeat(auto-fit,minmax(140px,1fr)); }
  .badge { background:#222; padding:2px 6px; border-radius:4px; font-size:10px; }
</style>

<div class="panel">
  <div style="display:flex; justify-content:space-between; align-items:center;">
    <strong>GPU Diagnostics</strong>
    <button on:click={() => expanded = !expanded}>{expanded ? 'Hide' : 'Show'}</button>
  </div>
  {#if expanded}
    <div class="section">
      <strong>Aggregates</strong>
      <table>
        <thead><tr><th>Pipeline</th><th>Backend</th><th>Shader</th><th>Avg ms</th><th>Max</th><th>Success%</th><th>Count</th></tr></thead>
        <tbody>
          {#each aggregates as a}
            <tr>
              <td>{a.pipeline}</td>
              <td>{a.backend}</td>
              <td>{a.shaderType || '-'}</td>
              <td class={a.avgMs < 2 ? 'ok' : a.avgMs < 8 ? 'warn' : 'bad'}>{a.avgMs.toFixed(2)}</td>
              <td>{a.maxMs.toFixed(1)}</td>
              <td class={a.successRate > 0.95 ? 'ok' : a.successRate > 0.8 ? 'warn' : 'bad'}>{(a.successRate*100).toFixed(1)}%</td>
              <td>{a.count}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="section">
      <strong>Recent</strong>
      <div class="grid">
        {#each recent as r}
          <div class="badge">{r.pipeline}:{r.backend} {r.durationMs.toFixed(1)}ms {r.success ? '✓' : '✗'}</div>
        {/each}
      </div>
    </div>

    <div class="section">
      <strong>Errors</strong>
      {#if errors.length === 0}
        <div class="badge ok">None</div>
      {:else}
        <div class="grid">
          {#each errors as e}
            <div class="badge {e.retryable ? 'warn' : 'bad'}" title={e.message}>{e.category}</div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="section">
      <strong>Backend Demotions</strong>
      {#if demotions.length === 0}
        <div class="badge ok">None</div>
      {:else}
        <div class="grid">
          {#each demotions as d}
            <div class="badge bad" title={d.reason}>{d.from}→{d.to}</div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="section">
      <strong>Memory</strong>
      {#if memory}
        <div class="grid">
          <div class="badge">Alloc: {(memory.allocatedBytes/1024/1024).toFixed(2)}MB</div>
          <div class="badge">Peak: {(memory.peakBytes/1024/1024).toFixed(2)}MB</div>
          <div class="badge">Allocs: {memory.allocations}</div>
          <div class="badge">Frees: {memory.deallocations}</div>
        </div>
      {:else}
        <div class="badge">N/A</div>
      {/if}
    </div>

    <div class="section">
      <strong>Dump State</strong>
      <pre style="max-height:200px; overflow:auto; background:#000; padding:6px;">{JSON.stringify(gpuVectorProcessor.dumpState(), null, 2)}</pre>
    </div>
  {/if}
</div>
