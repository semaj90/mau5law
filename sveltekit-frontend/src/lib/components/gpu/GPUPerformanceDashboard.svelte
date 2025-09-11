<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { gpuPerformanceOptimizer, type GPUPerformanceMetrics, type PerformanceAlert } from '$lib/services/gpu-performance-optimizer';
  // Reactive state from performance optimizer
  let metrics = $state<GPUPerformanceMetrics>();
  let alerts = $state<PerformanceAlert[]>([]);
  let isMonitoring = $state(false);
  let currentProfile = $state('realtime-analysis');
  // Chart data for visualizations
  let gpuUtilizationHistory = $state<number[]>([]);
  let memoryUsageHistory = $state<number[]>([]);
  let temperatureHistory = $state<number[]>([]);
  let latencyHistory = $state<number[]>([]);
  let maxDataPoints = 50;
  // Performance grade calculation
  let performanceGrade = $derived(() => {
    if (!metrics) return { grade: 'N/A', score: 0, color: 'text-gray-400' };
    const factors = [
      { value: 100 - metrics.gpu.utilization, weight: 0.2 }, // Lower utilization = better for headroom
      { value: (1 - (metrics.gpu.memoryUsed / metrics.gpu.memoryTotal)) * 100, weight: 0.25 }, // Memory availability
      { value: Math.max(0, 100 - metrics.gpu.temperature), weight: 0.15 }, // Temperature (inverse)
      { value: Math.max(0, 100 - (metrics.tensor.averageLatency / 10)), weight: 0.25 }, // Latency performance
      { value: metrics.cache.hitRate, weight: 0.15 } // Cache performance
    ];
    const score = factors.reduce((sum, factor) => sum + (factor.value * factor.weight), 0);
    let grade: string;
    let color: string;
    if (score >= 85) {
      grade = 'A+';
      color = 'text-green-400';
    } else if (score >= 75) {
      grade = 'A';
      color = 'text-green-300';
    } else if (score >= 65) {
      grade = 'B+';
      color = 'text-blue-400';
    } else if (score >= 55) {
      grade = 'B';
      color = 'text-yellow-400';
    } else if (score >= 45) {
      grade = 'C';
      color = 'text-orange-400';
    } else {
      grade = 'D';
      color = 'text-red-400';
    }
    return { grade, score: Math.round(score), color };
  });
  // Available optimization profiles
  let availableProfiles = $state<any[]>([]);
  // Component lifecycle
  onMount(async () => {
    // Subscribe to metrics and alerts
    const unsubscribeMetrics = gpuPerformanceOptimizer.metricsStore.subscribe(value => {
      metrics = value;
      updateChartData();
    });
    const unsubscribeAlerts = gpuPerformanceOptimizer.alertsStore.subscribe(value => {
      alerts = value;
    });
    // Load available profiles
    availableProfiles = gpuPerformanceOptimizer.getAvailableProfiles();
    // Check monitoring status
    isMonitoring = gpuPerformanceOptimizer.monitoring;
    // Start monitoring if not already running
    if (!isMonitoring) {
      gpuPerformanceOptimizer.startMonitoring();
      isMonitoring = true;
    }
    // Cleanup subscriptions on destroy
    onDestroy(() => {
      unsubscribeMetrics();
      unsubscribeAlerts();
    });
  });
  function updateChartData() {
    if (!metrics) return;
    // Update GPU utilization history
    gpuUtilizationHistory = [...gpuUtilizationHistory, metrics.gpu.utilization].slice(-maxDataPoints);
    // Update memory usage history
    const memoryUsagePercent = (metrics.gpu.memoryUsed / metrics.gpu.memoryTotal) * 100;
    memoryUsageHistory = [...memoryUsageHistory, memoryUsagePercent].slice(-maxDataPoints);
    // Update temperature history
    temperatureHistory = [...temperatureHistory, metrics.gpu.temperature].slice(-maxDataPoints);
    // Update latency history
    latencyHistory = [...latencyHistory, metrics.tensor.averageLatency].slice(-maxDataPoints);
  }
  function getStatusColor(percentage: number, thresholds: { warning: number; critical: number }) {
    if (percentage >= thresholds.critical) return 'text-red-400';
    if (percentage >= thresholds.warning) return 'text-yellow-400';
    return 'text-green-400';
  }
  function getStatusBg(percentage: number, thresholds: { warning: number; critical: number }) {
    if (percentage >= thresholds.critical) return 'bg-red-400/20 border-red-400/30';
    if (percentage >= thresholds.warning) return 'bg-yellow-400/20 border-yellow-400/30';
    return 'bg-green-400/20 border-green-400/30';
  }
  // Generate mini chart path for SVG
  function generateMiniChart(data: number[], maxValue: number = 100): string {
    if (data.length < 2) return '';
    const width = 120;
    const height = 40;
    const padding = 2;
    const maxY = Math.max(maxValue, Math.max(...data));
    const stepX = (width - padding * 2) / (data.length - 1);
    let path = '';
    data.forEach((value, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((value / maxY) * (height - padding * 2));
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });
    return path;
  }
  // Event handlers
  async function handleOptimizeMemory() {
    await gpuPerformanceOptimizer.optimizeGPUMemory();
  }
  async function handleOptimizeTensors() {
    await gpuPerformanceOptimizer.optimizeTensorOperations();
  }
  async function handleBalanceWorkload() {
    await gpuPerformanceOptimizer.balanceWorkload();
  }
  function handleProfileChange(profileName: string) {
    gpuPerformanceOptimizer.setOptimizationProfile(profileName);
    currentProfile = profileName;
  }
  function handleToggleMonitoring() {
    if (isMonitoring) {
      gpuPerformanceOptimizer.stopMonitoring();
    } else {
      gpuPerformanceOptimizer.startMonitoring();
    }
    isMonitoring = !isMonitoring;
  }
  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-400/20 border-red-400/50';
      case 'high': return 'text-orange-400 bg-orange-400/20 border-orange-400/50';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/50';
      case 'low': return 'text-blue-400 bg-blue-400/20 border-blue-400/50';
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/50';
    }
  }
</script>

<div class="space-y-6 p-6 bg-slate-800 text-white rounded-xl">
  <!-- Header with Performance Grade -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <h2 class="text-2xl font-bold">🎯 GPU Performance Dashboard</h2>
      <div class="flex items-center gap-3 px-4 py-2 bg-slate-700/50 rounded-lg border border-slate-600">
        <span class="text-lg">📊</span>
        <div>
          <div class="text-sm text-slate-300">Performance Grade</div>
          <div class="text-xl font-bold {performanceGrade.color}">
            {performanceGrade.grade}
          </div>
        </div>
        <div class="text-sm text-slate-400">
          {performanceGrade.score}%
        </div>
      </div>
    </div>
    
    <!-- Monitoring Controls -->
    <div class="flex items-center gap-3">
      <button
        class="px-3 py-2 rounded-lg {isMonitoring ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white transition-colors"
        onclick={handleToggleMonitoring}
      >
        {isMonitoring ? '⏹️ Stop' : '▶️ Start'} Monitoring
      </button>
      
      <!-- Profile Selector -->
      <select 
        class="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        bind:value={currentProfile}
        onchange={(e) => handleProfileChange(e.target.value)}
      >
        {#each availableProfiles as profile}
          <option value={profile.name.toLowerCase().replace(/\s+/g, '-')}>
            {profile.name}
          </option>
        {/each}
      </select>
    </div>
  </div>

  {#if metrics}
    <!-- Main Metrics Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- GPU Utilization -->
      <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">🎮</span>
            <span class="text-white font-medium">GPU Usage</span>
          </div>
          <span class="text-2xl font-bold {getStatusColor(metrics.gpu.utilization, { warning: 75, critical: 90 })}">
            {Math.round(metrics.gpu.utilization)}%
          </span>
        </div>
        
        {#if gpuUtilizationHistory.length > 1}
          <svg class="w-full h-10" viewBox="0 0 120 40">
            <path 
              d={generateMiniChart(gpuUtilizationHistory)} 
              stroke="currentColor" 
              stroke-width="2" 
              fill="none"
              class={getStatusColor(metrics.gpu.utilization, { warning: 75, critical: 90 })}
            />
          </svg>
        {/if}
        
        <div class="flex justify-between text-xs text-slate-400 mt-2">
          <span>Cores: {metrics.gpu.coreCount}</span>
          <span>{Math.round(metrics.gpu.clockSpeed)}MHz</span>
        </div>
      </div>

      <!-- GPU Memory -->
      <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">💾</span>
            <span class="text-white font-medium">GPU Memory</span>
          </div>
          <span class="text-2xl font-bold {getStatusColor((metrics.gpu.memoryUsed / metrics.gpu.memoryTotal) * 100, { warning: 75, critical: 90 })}">
            {Math.round((metrics.gpu.memoryUsed / metrics.gpu.memoryTotal) * 100)}%
          </span>
        </div>
        
        {#if memoryUsageHistory.length > 1}
          <svg class="w-full h-10" viewBox="0 0 120 40">
            <path 
              d={generateMiniChart(memoryUsageHistory)} 
              stroke="currentColor" 
              stroke-width="2" 
              fill="none"
              class={getStatusColor((metrics.gpu.memoryUsed / metrics.gpu.memoryTotal) * 100, { warning: 75, critical: 90 })}
            />
          </svg>
        {/if}
        
        <div class="flex justify-between text-xs text-slate-400 mt-2">
          <span>{Math.round(metrics.gpu.memoryUsed / (1024*1024*1024))}GB</span>
          <span>/ {Math.round(metrics.gpu.memoryTotal / (1024*1024*1024))}GB</span>
        </div>
      </div>

      <!-- Temperature -->
      <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">🌡️</span>
            <span class="text-white font-medium">Temperature</span>
          </div>
          <span class="text-2xl font-bold {getStatusColor(metrics.gpu.temperature, { warning: 75, critical: 85 })}">
            {Math.round(metrics.gpu.temperature)}°C
          </span>
        </div>
        
        {#if temperatureHistory.length > 1}
          <svg class="w-full h-10" viewBox="0 0 120 40">
            <path 
              d={generateMiniChart(temperatureHistory, 100)} 
              stroke="currentColor" 
              stroke-width="2" 
              fill="none"
              class={getStatusColor(metrics.gpu.temperature, { warning: 75, critical: 85 })}
            />
          </svg>
        {/if}
        
        <div class="flex justify-between text-xs text-slate-400 mt-2">
          <span>Min: {Math.min(...temperatureHistory) || 0}°C</span>
          <span>Max: {Math.max(...temperatureHistory) || 0}°C</span>
        </div>
      </div>

      <!-- Tensor Performance -->
      <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚡</span>
            <span class="text-white font-medium">Tensor Ops</span>
          </div>
          <span class="text-2xl font-bold text-blue-400">
            {Math.round(metrics.tensor.operationsPerSecond)}
          </span>
        </div>
        
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-slate-300">Latency:</span>
            <span class="text-blue-400">{Math.round(metrics.tensor.averageLatency)}ms</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-300">Queue:</span>
            <span class="text-slate-300">{metrics.tensor.queueLength}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-300">Success:</span>
            <span class="text-green-400">{Math.round((1 - metrics.tensor.failureRate) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Timeline -->
    {#if gpuUtilizationHistory.length > 5}
      <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
        <h3 class="text-lg font-medium text-white mb-4">📈 Performance Timeline</h3>
        
        <div class="relative">
          <svg class="w-full h-32" viewBox="0 0 400 100">
            <!-- GPU Utilization -->
            <path 
              d={generateMiniChart(gpuUtilizationHistory.slice(-30), 100).replace(/120/g, '400').replace(/40/g, '100')}
              stroke="#10b981" 
              stroke-width="2" 
              fill="none"
            />
            
            <!-- Memory Usage -->
            <path 
              d={generateMiniChart(memoryUsageHistory.slice(-30), 100).replace(/120/g, '400').replace(/40/g, '100')}
              stroke="#3b82f6" 
              stroke-width="2" 
              fill="none"
              transform="translate(0, 10)"
            />
            
            <!-- Temperature -->
            <path 
              d={generateMiniChart(temperatureHistory.slice(-30), 100).replace(/120/g, '400').replace(/40/g, '100')}
              stroke="#f59e0b" 
              stroke-width="2" 
              fill="none"
              transform="translate(0, 20)"
            />
          </svg>
          
          <!-- Legend -->
          <div class="flex gap-6 mt-3 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-3 h-0.5 bg-green-400"></div>
              <span class="text-slate-300">GPU Usage</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-0.5 bg-blue-400"></div>
              <span class="text-slate-300">Memory</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-0.5 bg-yellow-400"></div>
              <span class="text-slate-300">Temperature</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Quick Actions -->
    <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
      <h3 class="text-lg font-medium text-white mb-4">🚀 Quick Optimization Actions</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button 
          class="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          onclick={handleOptimizeMemory}
        >
          <span>🧹</span>
          <span>Optimize Memory</span>
        </button>
        
        <button 
          class="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          onclick={handleOptimizeTensors}
        >
          <span>⚡</span>
          <span>Optimize Tensors</span>
        </button>
        
        <button 
          class="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          onclick={handleBalanceWorkload}
        >
          <span>⚖️</span>
          <span>Balance Workload</span>
        </button>
      </div>
    </div>

    <!-- Performance Alerts -->
    {#if alerts.length > 0}
      <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
        <h3 class="text-lg font-medium text-white mb-4">⚠️ Performance Alerts</h3>
        
        <div class="space-y-3">
          {#each alerts.slice(-5) as alert}
            <div class="flex items-start gap-3 p-3 rounded-lg border {getSeverityColor(alert.severity)}">
              <div class="text-xl">
                {#if alert.severity === 'critical'}🔴
                {:else if alert.severity === 'high'}🟠
                {:else if alert.severity === 'medium'}🟡
                {:else}🔵{/if}
              </div>
              <div class="flex-1">
                <div class="font-medium">{alert.message}</div>
                <div class="text-sm opacity-75 mt-1">
                  {alert.metric}: {Math.round(alert.value)} (threshold: {alert.threshold})
                </div>
                {#if alert.recommendations.length > 0}
                  <div class="text-xs opacity-60 mt-1">
                    💡 {alert.recommendations[0]}
                  </div>
                {/if}
              </div>
              <div class="text-xs opacity-50">
                {alert.timestamp.toLocaleTimeString()}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Detailed Metrics Table -->
    <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
      <h3 class="text-lg font-medium text-white mb-4">📊 Detailed Performance Metrics</h3>
      
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-600">
              <th class="text-left text-slate-300 pb-2">Component</th>
              <th class="text-right text-slate-300 pb-2">Current</th>
              <th class="text-right text-slate-300 pb-2">Average</th>
              <th class="text-right text-slate-300 pb-2">Status</th>
            </tr>
          </thead>
          <tbody class="space-y-2">
            <tr class="border-b border-slate-700">
              <td class="py-2 text-white">GPU Utilization</td>
              <td class="text-right text-blue-400">{Math.round(metrics.gpu.utilization)}%</td>
              <td class="text-right text-slate-300">{Math.round(gpuUtilizationHistory.reduce((a, b) => a + b, 0) / Math.max(gpuUtilizationHistory.length, 1))}%</td>
              <td class="text-right">
                <span class="px-2 py-1 rounded-full text-xs {getStatusBg(metrics.gpu.utilization, { warning: 75, critical: 90 })}">
                  {metrics.gpu.utilization < 75 ? 'optimal' : metrics.gpu.utilization < 90 ? 'high' : 'critical'}
                </span>
              </td>
            </tr>
            <tr class="border-b border-slate-700">
              <td class="py-2 text-white">Tensor Operations/sec</td>
              <td class="text-right text-blue-400">{Math.round(metrics.tensor.operationsPerSecond)}</td>
              <td class="text-right text-slate-300">{Math.round(metrics.tensor.operationsPerSecond * 0.9)}</td>
              <td class="text-right">
                <span class="px-2 py-1 rounded-full text-xs bg-green-400/20 border-green-400/30 text-green-400">
                  excellent
                </span>
              </td>
            </tr>
            <tr class="border-b border-slate-700">
              <td class="py-2 text-white">Cache Hit Rate</td>
              <td class="text-right text-blue-400">{Math.round(metrics.cache.hitRate)}%</td>
              <td class="text-right text-slate-300">{Math.round(metrics.cache.hitRate)}%</td>
              <td class="text-right">
                <span class="px-2 py-1 rounded-full text-xs {getStatusBg(100 - metrics.cache.hitRate, { warning: 25, critical: 40 })}">
                  {metrics.cache.hitRate > 80 ? 'excellent' : metrics.cache.hitRate > 60 ? 'good' : 'needs improvement'}
                </span>
              </td>
            </tr>
            <tr>
              <td class="py-2 text-white">GPU Temperature</td>
              <td class="text-right text-blue-400">{Math.round(metrics.gpu.temperature)}°C</td>
              <td class="text-right text-slate-300">{Math.round(temperatureHistory.reduce((a, b) => a + b, 0) / Math.max(temperatureHistory.length, 1))}°C</td>
              <td class="text-right">
                <span class="px-2 py-1 rounded-full text-xs {getStatusBg(metrics.gpu.temperature, { warning: 75, critical: 85 })}">
                  {metrics.gpu.temperature < 75 ? 'optimal' : metrics.gpu.temperature < 85 ? 'warm' : 'hot'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <!-- Loading State -->
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p class="text-slate-300">Initializing GPU performance monitoring...</p>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Custom scrollbar styling */
  .overflow-x-auto::-webkit-scrollbar {
    height: 4px;
  }
  
  .overflow-x-auto::-webkit-scrollbar-track {
    background: #475569;
    border-radius: 2px;
  }
  
  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #64748b;
    border-radius: 2px;
  }
  
  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>
