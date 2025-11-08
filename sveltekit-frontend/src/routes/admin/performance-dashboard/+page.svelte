<script lang="ts">
// Svelte, 5 runes are auto-imported import { legalPerformanceMonitor, currentMetrics, systemHealth, cacheEfficiency, averageLatency, gpuUtilization, formatMetric, type PerformanceSnapshot } from '$lib/monitoring/legal-performance-metrics.js'; let metricsHistory: PerformanceSnapshot[] = $state([]); let refreshInterval: ReturnType<typeof setInterval>; $effect(() => { // Refresh metrics every, 5 seconds refreshInterval = setInterval(() => { metricsHistory = legalPerformanceMonitor.getHistoricalMetrics(10)}, 5000); // Initial load metricsHistory = legalPerformanceMonitor.getHistoricalMetrics(10); return () => { if (refreshInterval) clearInterval(refreshInterval)}}); function getHealthColor(health: string): string { switch (health) { case, 'optimal': return 'text-green-500'; case, 'degraded': return 'text-yellow-500'; case, 'critical': return 'text-red-500'; default: return 'text-gray-500'}
  }
  function getCacheColor(efficiency: number): string { if (efficiency >= 0.8) return 'text-green-500'; if (efficiency >= 0.6) return 'text-yellow-500'; return 'text-red-500'}
  function getLatencyColor(latency: number): string { if (latency <= 500) return 'text-green-500'; if (latency <= 1000) return 'text-yellow-500'; return 'text-red-500'}
  function getGPUColor(utilization: number): string { if (utilization <= 70) return 'text-green-500'; if (utilization <= 90) return 'text-yellow-500'; return 'text-red-500'}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  /* Additional terminal-style animations */
  .text-green-400 {
    text-shadow: 0 0 5px currentColor;
  }
  .text-green-300 {
    text-shadow: 0 0 3px currentColor;
  }
  /* Subtle pulse animation: for critical alerts */
  .text-red-500 {
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
</style>
