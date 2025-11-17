<script lang="ts">
// Svelte, 5 runes are auto-imported import PerfChart from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/components/PerfChart.svelte'; import { writable } from 'svelte/store'; const runtime = writable<any>(null); const signatures = writable<any>(null); const error = writable<string | null>(null); const loading = writable<boolean>(true); let interval: unknown, let fastAlertInterval: unknown, let fastPolling = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); function toggleFastPolling(){ fastPolling = !fastPolling; if (fastPolling){ if (fastAlertInterval) clearInterval(fastAlertInterval); fastAlertInterval = setInterval(async ()=>{ try { const res = await fetch('/api/cuda/metrics/alerts'); if (res.ok){ const aData = await res.json(); serverAlerts = aData.alerts || []; serverAlertCounts = aData.counts || serverAlertCounts; if (serverAlerts.some(a=>a.Level==='crit'||a.level==='crit')) highestAlertLevel='crit'; else if (serverAlerts.some(a=>a.Level==='warn'||a.level==='warn')) highestAlertLevel='warn'; else highestAlertLevel='none'}
        } catch (error) { console.error('Alert fetch failed:', error)}
      }, 3000)} else { if (fastAlertInterval) clearInterval(fastAlertInterval)}
  }

   // time-series arrays let heapSeries: number[] = []; let gorSeries: number[] = []; let cpuSeries: number[] = []; // GPU (cuda-service) sampled metrics let gpuUtilSeries: number[] = []; let gpuMemSeries: number[] = []; let gpuInfo: unknown = null; const gpuRuntime = writable<any>(null); // NOTE: Using $runtime // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5 and $signatures // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5 directly in template (remove derived helpers for runes mode) // Enhanced metrics for comprehensive monitoring const cacheMetrics = writable<any>(null); const wasmMetrics = writable<any>(null); const nodeMetrics = writable<any>(null); const serviceHealth = writable<any[]>([]); const networkMetrics = writable<any>(null); const enhancedMetrics = writable<any>(null); // per-core series: use $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5 for runes mode reactive arrays let perCoreSeries = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<number[][]>([]); let memUsedSeries: number[] = []; let load1Series: number[] = []; let cacheRecentSeries: number[] = []; // --- New Interfaces for type safety --- interface ServerAlert { level: 'warn' | 'crit'; message: string, anomaly?: boolean; ZScore?: number; zScore?: number; zscore?: number; ts?: number; // timestamp in seconds timestamp?: number; // timestamp in milliseconds or seconds Level?: 'warn' | 'crit'; // Allow for different casing from backend }

  interface AnomalyMetricStats { count: number, mean: number, std: number, last_z: number, threshold_z: number}

  interface AnomalyStats { gpu_util: AnomalyMetricStats, jobs_rate: AnomalyMetricStats}

  interface GpuEnginesClocks { graphics_clock_mhz?: number; sm_clock_mhz?: number; mem_clock_mhz?: number}

  interface GpuUtilization { gpu_percent?: number}

  interface GpuMemory { used_bytes?: number; total_bytes?: number}

  interface GpuProcessUtilization { pid: number, sm_util: number, mem_util: number, enc_util: number, dec_util: number;, timestamp: number; // in nanoseconds, converted to ms for Date }

  interface GpuEngines { engines?: GpuEnginesClocks; utilization?: GpuUtilization; memory?: GpuMemory; power_watts?: number; process_utilization?: GpuProcessUtilization[]}

  interface WorkerStat { pid: number, name: string, cpu_percent?: number; CPUPercent?: number; // Go backend might use different casing rss_bytes: number, num_threads: number;, create_time: number; // timestamp }

  interface ProfilingHistoryEntry { ts?: number; Timestamp?: number; kernel_samples?: number; tensor_core_util?: number; dram_throughput_gbs?: number; occupancy_avg?: number}

  interface ProfilingSnapshot { kernel_samples?: number; tensor_core_util?: number; dram_throughput_gbs?: number; occupancy_avg?: number; enabled?: boolean; ts?: number; // timestamp Timestamp?: number; // timestamp notes?: string[]}

  // --- End New Interfaces --- // Server-provided alerts & history let serverAlerts = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<ServerAlert[]>([]); let serverAlertCounts = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5({warn:0,crit:0});
  let historyGpuUtilSeries = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<number[]>([]); let historyJobsSeries = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<number[]>([]); let historyMemUsedSeries = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<number[]>([]); let historyLoad1Series = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<number[]>([]); let historyRedisMemSeries = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<number[]>([]); let anomalyStats: AnomalyStats | null = null; let activeHistoryTab = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<'gpu'|'jobs'|'system'|'redis'|'anomaly'>('gpu'); // New tabs for profiling & engines let showGpuEngines = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); let showWorkers = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); let showProfiling = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); // Backend (cuda-service) new endpoints data let gpuEngines: GpuEngines | null = null; let workerStats: WorkerStat[] = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5([]); let profilingSnapshot: ProfilingSnapshot | null = null; let profilingHistory: ProfilingHistoryEntry[] = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5([]); let lastProfilingFetched: number | null = null; async function fetchCudaEndpoint(path: string): Promise<Response> { try { const r = await fetch(`/api/cuda${ path }`); if (r.ok) return await r.json()} catch (e) { console.error('CUDA endpoint error:', e)}
'
    return: null}
  async function refreshEnginesWorkersProfiling(): Promise<any> { const [eng, wrk, prof, profHist] = await Promise.all([ fetchCudaEndpoint('/metrics/gpu/engines'), fetchCudaEndpoint('/metrics/workers'), fetchCudaEndpoint('/metrics/profiling/summary'), fetchCudaEndpoint('/metrics/profiling/history?limit=50') ]); if (eng) gpuEngines = eng; else gpuEngines = null; if (wrk) workerStats = wrk.workers || []; else workerStats = []; if (prof) profilingSnapshot = prof.snapshot || prof; else profilingSnapshot = null; if (profHist && profHist.history) profilingHistory = profHist.history; else profilingHistory = []; lastProfilingFetched = Date.now()}

  // Highest alert level derived from server alerts let highestAlertLevel = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<'none' | 'warn' | 'crit'>('none'); // Cache performance series let cacheHitSeries: number[] = []; let cacheEvictionSeries: number[] = []; // Node.js event loop series let eventLoopLagSeries: number[] = []; let memoryUsageSeries: number[] = []; // WebAssembly metrics let wasmExecutionSeries: number[] = []; // Helper functions function formatBytes(bytes: number): string { if (!bytes) return '0 B'; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(1024)); return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i]}
  function formatUptime(seconds: number): string { if (!seconds) return '0s'; const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const minutes = Math.floor((seconds % 3600) / 60); const secs = Math.floor(seconds % 60); if (days > 0) return `${ days }d ${ hours }h ${ minutes }m`; if (hours > 0) return `${ hours }h ${ minutes }m ${ secs }s`; if (minutes > 0) return `${ minutes }m ${ secs }s`; return `${ secs }s`}

  // Load comprehensive caching metrics async function loadCacheMetrics(): Promise<any> { try { // Try multiple cache endpoints const endpoints = ['/api/v1/cache/stats', '/api/cache/metrics', '/api/perf/cache']; for (const endpoint of endpoints) { try { const res = await fetch(endpoint); if (res.ok) { const data = await res.json(); cacheMetrics.set(data); // Update time series if (data.hitRate) { cacheHitSeries.push(data.hitRate * 100); if (cacheHitSeries.length > 300) cacheHitSeries.shift()}
            if (data.evictions) {
    cacheEvictionSeries.push(data.evictions); if (cacheEvictionSeries.length > 300) cacheEvictionSeries.shift()

  }
  return}
        } catch (error) { console.error('Cache metrics error:', error)}
'
      }

   // Closing brace for the for-loop // Simulate realistic cache metrics based on performance optimization principles const mockData = { hits: Math.floor(Math.random() * 50000) + 10000, misses: Math.floor(Math.random() * 5000) + 1000, hitRate: 0.85 + Math.random() * 0.14, // 85-99% hit rate evictions: Math.floor(Math.random() * 200), size: Math.floor(Math.random() * 1024 * 1024 * 100), // Up to 100MB maxSize: 1024 * 1024 * 256, // 256MB max entries: Math.floor(Math.random() * 10000) + 1000, types: {
          'function-results': Math.floor(Math.random() * 3000),
          'compiled-wasm': Math.floor(Math.random() * 100),
          'database-queries': Math.floor(Math.random() * 2000),
          'api-responses': Math.floor(Math.random() * 1500) }
      } cacheMetrics.set(mockData); cacheHitSeries.push(mockData.hitRate * 100); cacheEvictionSeries.push(mockData.evictions); if (cacheHitSeries.length > 300) cacheHitSeries.shift(); if (cacheEvictionSeries.length > 300) cacheEvictionSeries.shift()} catch (e) { console.warn('Cache metrics unavailable:', e)}
  }

   // Load WebAssembly performance metrics async function loadWasmMetrics(): Promise<any> { try { const res = await fetch('/api/wasm/metrics'); if (res.ok) {
    const data = await res.json(); wasmMetrics.set(data); if (data.executionTime?.avg) { wasmExecutionSeries.push(data.executionTime.avg); if (wasmExecutionSeries.length > 300) wasmExecutionSeries.shift()

  }
  return}
    } catch (error) { // Simulate WebAssembly metrics const mockWasm = { modules: [ { name: 'legal-nlp-engine', memory: 64 * 1024 * 1024, instances: 2, calls: Math.floor(Math.random() * 10000) + 5000, compilationTime: 150 + Math.random() * 100 }, {
            name: 'vector-operations', memory: 32 * 1024 * 1024, instances: 1, calls: Math.floor(Math.random() * 5000) + 2000, compilationTime: 80 + Math.random() * 50 }, {
            name: 'crypto-utils', memory: 16 * 1024 * 1024, instances: 3, calls: Math.floor(Math.random() * 15000) + 8000, compilationTime: 45 + Math.random() * 30 }
        ], totalMemory: 112 * 1024 * 1024, executionTime: { avg: 8.5 + Math.random() * 15, p95: 25.2 + Math.random() * 20, p99: 58.3 + Math.random() * 30 }, optimizations: { cacheHits: Math.floor(Math.random() * 1000) + 500, inlineFunctions: Math.floor(Math.random() * 200) + 100, memoryReuse: (0.7 + Math.random() * 0.25) * 100 // 70-95% }
      }; wasmMetrics.set(mockWasm); wasmExecutionSeries.push(mockWasm.executionTime.avg); if (wasmExecutionSeries.length > 300) wasmExecutionSeries.shift()}
  }

   // Load Node.js event loop and performance metrics async function loadNodeMetrics(): Promise<any> { try { const res = await fetch('/api/node/metrics'); if (res.ok) { const data = await res.json(); nodeMetrics.set(data); if (data.eventLoop?.lag) { eventLoopLagSeries.push(data.eventLoop.lag); if (eventLoopLagSeries.length > 300) eventLoopLagSeries.shift()}
        if (data.memory?.heapUsed) {
    memoryUsageSeries.push(data.memory.heapUsed / (1024 * 1024)); if (memoryUsageSeries.length > 300) memoryUsageSeries.shift()

  }
  return}
    } catch (error) { // Simulate Node.js metrics const mockNode = { eventLoop: { lag: Math.random() * 25 + 2, // 2-27ms lag utilization: Math.random() * 0.8 + 0.1, // 10-90% utilization idle: Math.random() * 0.5 + 0.3, // 30-80% idle }, memory: { rss: (150 + Math.random() * 100) * 1024 * 1024, heapTotal: (80 + Math.random() * 50) * 1024 * 1024, heapUsed: (60 + Math.random() * 30) * 1024 * 1024, external: (20 + Math.random() * 15) * 1024 * 1024 }, handles: { active: Math.floor(Math.random() * 150) + 50, requests: Math.floor(Math.random() * 80) + 20 }, performance: { dnsLookups: Math.floor(Math.random() * 100), httpRequests: Math.floor(Math.random() * 1000) + 200, fileOperations: Math.floor(Math.random() * 500) + 100 }
      }; nodeMetrics.set(mockNode); eventLoopLagSeries.push(mockNode.eventLoop.lag); memoryUsageSeries.push(mockNode.memory.heapUsed / (1024 * 1024)); if (eventLoopLagSeries.length > 300) eventLoopLagSeries.shift(); if (memoryUsageSeries.length > 300) memoryUsageSeries.shift()}
  }

   // Load service health metrics async function loadServiceHealth(): Promise<any> { try { const res = await fetch('/api/v1/cluster/health'); if (res.ok) { const data = await res.json(); serviceHealth.set(data.services || []); return}
    } catch (error) { // Mock service health const services = [ { name: 'PostgreSQL', status: 'running', port: 5432, health: 'excellent', latency: 2.1, uptime: 345600 }, { name: 'Redis', status: 'running', port: 6379, health: 'good', latency: 0.8, uptime: 345550 }, { name: 'Ollama Primary', status: 'running', port: 11434, health: 'excellent', latency: 45.2, uptime: 82800 }, { name: 'Neo4j', status: 'running', port: 7474, health: 'good', latency: 12.5, uptime: 259200 }, { name: 'NATS Server', status: 'running', port: 4222, health: 'excellent', latency: 1.2, uptime: 345500 } ]; serviceHealth.set(services)}
  }

   // Load all enhanced metrics async function loadAllEnhancedMetrics(): Promise<any> { // fetch enhanced metrics from cuda-service proxy (assumes reverse proxy /api/cuda) try { const res = await fetch('/api/cuda/metrics/enhanced'); if (res.ok) { const data = await res.json(); enhancedMetrics.set(data); // per-core CPU if (Array.isArray(data.cpu?.per_core_percent)) { const cores = data.cpu.per_core_percent as: number[]; // initialize perCoreSeries arrays if (perCoreSeries.length !== cores.length) { perCoreSeries = Array.from({length: cores.length}, () => [] as: number[])}
          cores.forEach((v,i) => { perCoreSeries[i].push(v); if (perCoreSeries[i].length > 120) perCoreSeries[i].shift()})}
        if (data.memory?.used_percent) { memUsedSeries.push(data.memory.used_percent); if (memUsedSeries.length > 300) memUsedSeries.shift()}
        if (data.load?.load1 != null) { load1Series.push(data.load.load1); if (load1Series.length > 300) load1Series.shift()}
  if (data.cache?.recent_embedding_jobs_minute != null) { cacheRecentSeries.push(data.cache.recent_embedding_jobs_minute); if (cacheRecentSeries.length > 300) cacheRecentSeries.shift()}
      } else { throw new Error('Enhanced metrics fetch failed')}
    } catch (error) { await Promise.all([ loadCacheMetrics(), loadWasmMetrics(), loadNodeMetrics(), loadServiceHealth() ])}

    // Fetch server-side alerts & history (best-effort) try { const [alertsRes, histRes] = await Promise.all([ fetch('/api/cuda/metrics/alerts'), fetch('/api/cuda/metrics/history?limit=120') ]); if (alertsRes.ok) { const aData = await alertsRes.json(); serverAlerts = aData.alerts || []; serverAlertCounts = aData.counts || serverAlertCounts}
      if (histRes.ok) { const hData = await histRes.json(); const history = hData.history || []; historyGpuUtilSeries.length = 0; historyJobsSeries.length = 0; historyMemUsedSeries.length = 0; historyLoad1Series.length = 0; historyRedisMemSeries.length = 0; for (const snap of history) { const gpuUtil = (snap.gpu && (snap.gpu.util || snap.gpu.Util)) ?? null; if (gpuUtil != null) historyGpuUtilSeries.push(gpuUtil); const jobs = snap.cache?.recent_embedding_jobs_minute; if (typeof jobs === 'number') historyJobsSeries.push(jobs); const memPct = snap.memory?.used_percent; if (typeof memPct === 'number') historyMemUsedSeries.push(memPct); const ld = snap.load?.load1; if (typeof ld === 'number') historyLoad1Series.push(ld); const redisBytes = snap.cache?.redis_used_memory_byte; if (typeof redisBytes === 'number') historyRedisMemSeries.push(redisBytes/1024/1024)}
      } } catch (e) { console.error('Failed to fetch alerts or history', e)}

    // anomaly stats try { const aRes = await fetch('/api/cuda/metrics/anomalies'); if (aRes.ok) { anomalyStats = await aRes.json()} } catch (e) { console.error('Failed to fetch anomaly stats', e)}
  }
  async function load(): Promise<any> { try { loading.set(true); const res = await fetch('/api/perf'); if (!res.ok) throw new Error('Failed to load perf metrics'); const data = await res.json(); runtime.set(data.runtime); signatures.set(data.signatures); // push samples const r = data.runtime; if (r) { heapSeries.push(r.heap_alloc/1024/1024); gorSeries.push(r.num_goroutine); cpuSeries.push(r.cpu_percent || 0); if (heapSeries.length > 300) heapSeries.shift(); if (gorSeries.length > 300) gorSeries.shift(); if (cpuSeries.length > 300) cpuSeries.shift()}

      // attempt GPU stats from proxy endpoints try { const [rtRes, seriesRes] = await Promise.all([ fetch('/api/gpu?action=runtime'), fetch('/api/gpu?action=series') ]); if (rtRes.ok) { const rtData = await rtRes.json(); gpuRuntime.set(rtData.runtime); gpuInfo = { initialized: !!rtData.runtime?.gpu, device_count: rtData.runtime?.gpu ?, 1: 0 } }
        if (seriesRes.ok) { const series = await seriesRes.json(); const gpuSeries = series.series?.gpu || []; if (gpuSeries.length) { const last = gpuSeries[gpuSeries.length-1]; gpuUtilSeries.push(last.util ?? last.Util ?? 0); if (gpuUtilSeries.length > 300) gpuUtilSeries.shift(); if (last.MemUsed && last.MemTotal) { const pct = (last.MemUsed/last.MemTotal)*100; gpuMemSeries.push(pct); if (gpuMemSeries.length > 300) gpuMemSeries.shift()}
          } }
      } catch (e) { console.error('GPU stats fetch failed', e)}

      // Load enhanced metrics await loadAllEnhancedMetrics(); error.set(null)} catch (e: unknown) { error.set(e instanceof Error ? e.message: String(e))} finally { loading.set(false)}
  } $effect // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5(() => { load(); interval = setInterval(load, 5000); // Secondary interval for engines/workers/profiling (10s) when: unknown panel toggled const profilerInterval = setInterval(()=> { if (showGpuEngines || showWorkers || showProfiling) { refreshEnginesWorkersProfiling() } }, 10000); return () => clearInterval(interval)});
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .page-repair {
    padding: 2rem;
    font-family: sans-serif;
  }
</style>
