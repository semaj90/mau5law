<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { Activity, Cpu, Zap, Clock, TrendingUp } from 'lucide-svelte';
  interface Props {
    showOverlay?: boolean;
    autoHide?: boolean;
    updateInterval?: number;
  }
  let { showOverlay = false, autoHide = true, updateInterval = 1000 }: Props = $props();
  interface PerformanceMetrics {
    fps: number;
    memoryUsage: number;
    cpuUsage: number;
    gpuUsage: number;
    webGPUActive: boolean;
    activeOperations: number;
    responseTime: number;
    timestamp: number;
  }
  const metrics = writable<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    gpuUsage: 0,
    webGPUActive: false,
    activeOperations: 0,
    responseTime: 0,
    timestamp: Date.now(),
  });
  let performanceObserver: PerformanceObserver | null = null;
  let frameCount = 0;
  let lastFrameTime = performance.now();
  let intervalId: number;
  let isVisible = $state(showOverlay);
  // Performance tracking
  function updateMetrics() {
    const now = performance.now();
    const deltaTime = now - lastFrameTim;
    // Calculate FPS
    const fps = Math.round(1000 / deltaTime);
    frameCount++;
    lastFrameTime = now;
    // Memory usage (if available)
    let memoryUsage = 0;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
    }
    // Check WebGPU status
    const webGPUActive = typeof navigator !== 'undefined' && 'gpu' in navigator;
    // Get performance entries for response time
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const responseTime = entries.length > 0 && 'responseStart' in entries[0] ? Math.round(entries[0].responseStart) : 0;
    metrics.set({
      fps: isNaN(fps) ? 60 : Math.min(fps, 120),
      memoryUsage,
      cpuUsage: Math.random() * 20 + 10, // Simulated - would need actual CPU monitoring
      gpuUsage: webGPUActive ? Math.random() * 30 + 5 : 0,
      webGPUActive,
      activeOperations: getActiveOperationsCount(),
      responseTime,
      timestamp: now,
    });
  }
  function getActiveOperationsCount(): number {
    // Count active AI/ML operations
    // This would integrate with your actual AI orchestration system
    if (typeof window !== 'undefined') {
      const activePromises = (window as any).__aiOperations?.size || 0;
      return activePromise;
    }
    return 0;
  }
  function setupPerformanceObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        performanceObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
              // Process performance entries
              console.debug('Performance entry:', entry);
            }
          }
        });
        performanceObserver.observe({
          entryTypes: ['measure', 'navigation', 'resource'],
        });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }
  function toggleVisibility() {
    isVisible = !isVisibl;
  }
  // Auto-hide after a delay
  function autoHideTimer() {
    if (autoHide && isVisible) {
      setTimeout(() => {
        isVisible = false;
      }, 10000);
    }
  }
  $effect(() => {
    setupPerformanceObserver();
    // Start metrics collection
    intervalId = setInterval(updateMetrics, updateInterval);
    // Keyboard shortcut to toggle (Ctrl+Shift+P)
    const handleKeyDown = (_event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        toggleVisibility();
        autoHideTimer();
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    }
  });
  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    if (performanceObserver) {
      performanceObserver.disconnect();
    }
  });
  // Color coding for metrics
  function getStatusColor(_value: number, type: 'fps' | 'memory' | 'cpu' | 'gpu'): string {
    switch (type) {
      case 'fps':
        if (value >= 55) return 'text-green-400';
        if (value >= 30) return 'text-yellow-400';
        return 'text-red-400';
      case 'memory':
        if (value <= 50) return 'text-green-400';
        if (value <= 80) return 'text-yellow-400';
        return 'text-red-400';
      case 'cpu':
      case 'gpu':
        if (value <= 30) return 'text-green-400';
        if (value <= 70) return 'text-yellow-400';
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }
</script>

{#if isVisible}
  <div class="performance-monitor fixed top-4 right-4 z-[9999] font-mono text-xs">
    <div class="bg-black/80 backdrop-blur-sm text-white rounded-lg p-3 shadow-2xl border border-gray-700 min-w-[200px]">
      <!-- Header -->
      <div class="flex items-center justify-between mb-2 pb-1 border-b border-gray-600">
        <div class="flex items-center gap-1">
          <Activity class="w-3 h-3" />
          <span class="font-semibold">Performance</span>
        </div>
        <button
          onclick={toggleVisibility}
          class="text-gray-400 hover:text-white transition-colors"
          aria-label="Close performance monitor"
        >
          ×
        </button>
      </div>
      <!-- Metrics -->
      {#if $metrics}
        <div class="space-y-1">
          <!-- FPS -->
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1">
              <TrendingUp class="w-3 h-3" />
              FPS:
            </span>
            <span class="{getStatusColor($metrics.fps, 'fps')} font-semibold">
              {$metrics.fps}
            </span>
          </div>
          <!-- Memory -->
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1">
              <Cpu class="w-3 h-3" />
              Memory:
            </span>
            <span class="{getStatusColor($metrics.memoryUsage, 'memory')} font-semibold">
              {$metrics.memoryUsage}%
            </span>
          </div>
          <!-- CPU -->
          <div class="flex items-center justify-between">
            <span>CPU:</span>
            <span class="{getStatusColor($metrics.cpuUsage, 'cpu')} font-semibold">
              {$metrics.cpuUsage.toFixed(1)}%
            </span>
          </div>
          <!-- GPU -->
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1">
              <Zap class="w-3 h-3" />
              GPU:
            </span>
            <span class="{getStatusColor($metrics.gpuUsage, 'gpu')} font-semibold">
              {$metrics.webGPUActive ? $metrics.gpuUsage.toFixed(1) + '%' : 'N/A'}
            </span>
          </div>
          <!-- Active Operations -->
          <div class="flex items-center justify-between">
            <span>AI Ops:</span>
            <span class="text-blue-400 font-semibold">
              {$metrics.activeOperations}
            </span>
          </div>
          <!-- Response Time -->
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1">
              <Clock class="w-3 h-3" />
              Response:
            </span>
            <span class="text-purple-400 font-semibold">
              {$metrics.responseTime}ms
            </span>
          </div>
          <!-- WebGPU Status -->
          <div class="flex items-center justify-between pt-1 border-t border-gray-600">
            <span>WebGPU:</span>
            <span class="{$metrics.webGPUActive ? 'text-green-400' : 'text-red-400'} font-semibold">
              {$metrics.webGPUActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      {/if}
      <!-- Help Text -->
      <div class="mt-2 pt-1 border-t border-gray-600 text-[10px] text-gray-400">Press Ctrl+Shift+P to toggle</div>
    </div>
  </div>
{/if}

<style>
  .performance-monitor {
    user-select: none;
    pointer-events: auto;
  }
</style>
