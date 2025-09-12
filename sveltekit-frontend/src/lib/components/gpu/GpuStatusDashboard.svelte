<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { telemetryBus } from '../../telemetry/telemetry-bus.js';
  import { gpuVectorProcessor } from '../../gpu/gpu-vector-processor.js';
  import { gpuTelemetryService } from '../../gpu/gpu-telemetry-service.js';

  interface TelemetryEvent {
    type: string;
    meta?: Record<string, any>;
    ts?: number;
  }

  let events: TelemetryEvent[] = [];
  const maxEvents = 150;

  // Aggregated metrics
  let backendStats: Record<string, { count: number; success: number; totalDuration: number; lastMs: number }> = {};

  let currentBackend = '';
  let embeddingDimension = 0;
  let upscaleCooldownRemaining = 0;
  let demotionCooldownRemaining = 0;
  let gpuStatsActive = false;
  let reductionMode: 'auto' | 'gpu' | 'cpu' = (globalThis as any).CLIENT_ENV?.REDUCTION_MODE || 'auto';

  let timerHandle: any = null;

  function classifyColor(type: string): string {
    if (type.includes('error')) return 'var(--gpu-log-error, #ff4d4f)';
    if (type.includes('demotion')) return 'var(--gpu-log-warn, #faad14)';
    if (type.includes('upscale')) return 'var(--gpu-log-upscale, #9254de)';
    if (type.includes('webgl1') || type.includes('webgl2') || type.includes('webgpu')) return 'var(--gpu-log-backend, #1890ff)';
    if (type.includes('adapt')) return 'var(--gpu-log-adapt, #52c41a)';
    return 'var(--gpu-log-default, #bbb)';
  }

  function updateState() {
    const state = gpuVectorProcessor.dumpState?.();
    embeddingDimension = (gpuVectorProcessor as any).embeddingDimension || state?.embeddingDimension || 0;
    currentBackend = state?.aggregates ? state.aggregates.currentBackend || '' : state?.currentBackend || '';
  }

  function recordEvent(ev: TelemetryEvent) {
    ev.ts = Date.now();
    events.unshift(ev);
    if (events.length > maxEvents) events.length = maxEvents;
    if (!backendStats[currentBackend]) backendStats[currentBackend] = { count: 0, success: 0, totalDuration: 0, lastMs: 0 };
  }

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = telemetryBus.subscribe((ev: any) => {
      if (!ev || !ev.type) return;
      recordEvent(ev);
      if (ev.type === 'gpu.vector.process.end') {
        const { backend, durationMs, success } = ev.meta || {};
        if (!backendStats[backend]) backendStats[backend] = { count: 0, success: 0, totalDuration: 0, lastMs: 0 };
        backendStats[backend].count++;
        backendStats[backend].lastMs = durationMs || 0;
        backendStats[backend].totalDuration += durationMs || 0;
        if (success) backendStats[backend].success++;
      }
      if (ev.type === 'lod.embed.pipeline.stats') {
        gpuStatsActive = true;
      }
      updateState();
    });

    updateState();
    timerHandle = setInterval(() => {
      updateState();
    }, 2000);
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (timerHandle) clearInterval(timerHandle);
  });

  function formatMs(v: number) { return v.toFixed(1) + 'ms'; }
  function successRate(b: string) {
    const s = backendStats[b];
    if (!s || s.count === 0) return '—';
    return ((s.success / s.count) * 100).toFixed(1) + '%';
  }
  function avgMs(b: string) {
    const s = backendStats[b];
    if (!s || s.count === 0) return '—';
    return formatMs(s.totalDuration / s.count);
  }

  function triggerTestRun() {
    // Example test invocation (embedding-generation assumed):
    gpuVectorProcessor.run({
      pipeline: 'embedding-generation',
      input: { data: new Float32Array(1024) },
      expected: 'compute',
      label: 'dashboard-test'
    } as any);
  }

  async function forceDemote() {
    await (gpuVectorProcessor as any).forceDemote?.();
  }
  async function forcePromote(to: string) {
    await (gpuVectorProcessor as any).forcePromote?.(to);
  }

  function clearLog() { events = []; }
  function setReductionMode(mode: 'auto' | 'gpu' | 'cpu') {
    reductionMode = mode;
    telemetryBus.publish({ type: 'gpu.reduction.mode' as any, meta: { mode } });
    // Expose on global for processor (simple approach without import cycles)
    (globalThis as any).__FORCE_REDUCTION_MODE__ = mode;
  }
</script>

<style>
  :global(.gpu-dashboard) { font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.3; }
  .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .panel { background: var(--gpu-panel-bg, #1e1f22); padding: 0.75rem 0.9rem; border-radius: 6px; border: 1px solid #2a2c30; }
  .panel h3 { margin: 0 0 0.5rem; font-size: 0.9rem; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600; color: #ccc; }
  .metrics table { width: 100%; border-collapse: collapse; }
  .metrics th, .metrics td { text-align: left; padding: 2px 4px; font-size: 12px; }
  .metrics th { color: #888; font-weight: 500; }
  .log { max-height: 240px; overflow-y: auto; font-family: monospace; font-size: 11px; }
  .event { display: flex; justify-content: space-between; padding: 2px 4px; border-bottom: 1px solid #2a2c30; }
  .event:last-child { border-bottom: none; }
  .event-type { font-weight: 600; }
  .controls button { background: #2d2f33; border: 1px solid #3a3d42; color: #ddd; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .controls button:hover { background: #35383d; }
</style>

<div class="gpu-dashboard">
  <div class="grid">
    <div class="panel">
      <h3>Status</h3>
      <div>Backend: <strong>{currentBackend || '—'}</strong></div>
      <div>Embedding Dim: <strong>{embeddingDimension}</strong></div>
      <div>GPU Stats: {gpuStatsActive ? '✅ active' : '—'}</div>
      <div>Reduction Mode: {reductionMode}</div>
    </div>

    <div class="panel metrics">
      <h3>Performance</h3>
      <table>
        <thead>
          <tr><th>Backend</th><th>Avg</th><th>Last</th><th>Success</th><th>Samples</th></tr>
        </thead>
        <tbody>
          {#each Object.keys(backendStats) as b}
            <tr>
              <td>{b}</td>
              <td>{avgMs(b)}</td>
              <td>{backendStats[b].lastMs ? formatMs(backendStats[b].lastMs) : '—'}</td>
              <td>{successRate(b)}</td>
              <td>{backendStats[b].count}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="panel controls">
      <h3>Controls</h3>
      <button on:click={triggerTestRun}>Test Run</button>
      <button on:click={() => console.log('GPU Vector Processor state:', gpuVectorProcessor.dumpState?.())}>Dump State</button>
      <button on:click={clearLog}>Clear Log</button>
      <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
        <button on:click={forceDemote} title="Force demote to next lower tier">Force Demote</button>
        <button on:click={() => forcePromote('webgl1')}>To WebGL1</button>
        <button on:click={() => forcePromote('webgl2')}>To WebGL2</button>
        <button on:click={() => forcePromote('webgpu')}>To WebGPU</button>
      </div>
      <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;">
        <button on:click={() => setReductionMode('auto')} title="Auto reduction selection">Auto</button>
        <button on:click={() => setReductionMode('gpu')} title="Force GPU stats path">GPU</button>
        <button on:click={() => setReductionMode('cpu')} title="Force CPU reduction path">CPU</button>
      </div>
    </div>

    <div class="panel">
      <h3>Recent Events</h3>
      <div class="log">
        {#each events as ev}
          <div class="event" style="color:{classifyColor(ev.type)}">
            <span class="event-type">{ev.type}</span>
            <span>{new Date(ev.ts || 0).toLocaleTimeString()}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
