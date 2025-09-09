/**
 * GPU Metrics Store using Svelte 5 Runes
 * Provides reactive state management for GPU metrics monitoring
 */

import type { GPUMetric, BatchedMetrics } from '$lib/services/gpuMetricsBatcher';

interface GPUMetricsState {
  sessionId: string;
  metrics: GPUMetric[];
  isActive: boolean;
  serverHealthy: boolean;
  consecutiveFailures: number;
  backoffMultiplier: number;
  lastFlushTime: number;
  totalSamplesSent: number;
  currentFPS: number;
  averageFPS: number;
  activeEffects: string[];
  renderingMode: 'webgl' | 'webgpu' | 'software' | null;
}

class GPUMetricsStore {
  // Core state using runes
  private state = $state<GPUMetricsState>({
    sessionId: '',
    metrics: [],
    isActive: false,
    serverHealthy: true,
    consecutiveFailures: 0,
    backoffMultiplier: 1,
    lastFlushTime: 0,
    totalSamplesSent: 0,
    currentFPS: 0,
    averageFPS: 0,
    activeEffects: [],
    renderingMode: null
  });

  // Derived values for performance metrics
  metricsCount = $derived(this.state.metrics.length);
  isHealthy = $derived(this.state.serverHealthy && this.state.consecutiveFailures < 3);
  shouldBackoff = $derived(this.state.consecutiveFailures >= 3);
  currentBackoffDelay = $derived(30000 * this.state.backoffMultiplier);
  
  // FPS-specific derived values
  recentFPSSamples = $derived(() => {
    const now = Date.now();
    return this.state.metrics
      .filter(m => m.fps && now - m.timestamp < 5000) // Last 5 seconds
      .map(m => m.fps!)
      .slice(-30); // Last 30 samples
  });
  
  minFPS = $derived(() => {
    const samples = this.recentFPSSamples;
    return samples.length > 0 ? Math.min(...samples) : 0;
  });
  
  maxFPS = $derived(() => {
    const samples = this.recentFPSSamples;
    return samples.length > 0 ? Math.max(...samples) : 0;
  });
  
  // Performance status derived from FPS
  performanceStatus = $derived(() => {
    const avgFps = this.state.averageFPS;
    if (avgFps >= 55) return { level: 'excellent', color: 'green' };
    if (avgFps >= 30) return { level: 'good', color: 'yellow' };
    if (avgFps >= 15) return { level: 'poor', color: 'orange' };
    return { level: 'critical', color: 'red' };
  });
  
  // Effect summary
  effectsSummary = $derived(() => {
    const summary: Record<string, number> = {};
    const recentMetrics = this.state.metrics.slice(-50); // Last 50 samples
    
    recentMetrics.forEach(metric => {
      metric.effectsActive?.forEach(effect => {
        summary[effect] = (summary[effect] || 0) + 1;
      });
    });
    
    return Object.entries(summary)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10); // Top 10 effects
  });

  constructor() {
    this.setupReactiveEffects();
  }

  private setupReactiveEffects(): void {
    // React to health status changes
    $effect(() => {
      if (this.shouldBackoff) {
        console.warn(`🔄 GPU Metrics: Backing off due to ${this.state.consecutiveFailures} failures, delay: ${this.currentBackoffDelay}ms`);
      }
    });
    
    // React to metrics accumulation
    $effect(() => {
      if (this.metricsCount > 0 && this.metricsCount % 25 === 0) {
        console.debug(`📊 GPU Metrics: ${this.metricsCount} samples collected, avg FPS: ${this.state.averageFPS.toFixed(1)}`);
      }
    });
    
    // React to performance status changes
    $effect(() => {
      const { level } = this.performanceStatus;
      if (level === 'critical' && this.state.isActive) {
        console.warn('⚠️ GPU Performance: Critical FPS detected, consider reducing effects');
      }
    });
    
    // Update average FPS when new metrics arrive
    $effect(() => {
      const fpsSamples = this.recentFPSSamples;
      if (fpsSamples.length > 0) {
        const newAvg = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
        this.updateAverageFPS(newAvg);
      }
    });
  }

  // Public methods to update state
  setSessionId(sessionId: string): void {
    this.state.sessionId = sessionId;
  }

  setActive(isActive: boolean): void {
    this.state.isActive = isActive;
  }

  addMetric(metric: GPUMetric): void {
    this.state.metrics = [...this.state.metrics, metric];
    
    // Update current FPS if present
    if (metric.fps) {
      this.state.currentFPS = metric.fps;
    }
    
    // Update active effects
    if (metric.effectsActive) {
      this.state.activeEffects = metric.effectsActive;
    }
    
    // Update rendering mode
    if (metric.renderingMode) {
      this.state.renderingMode = metric.renderingMode;
    }
  }

  clearMetrics(): void {
    const clearedCount = this.state.metrics.length;
    this.state.metrics = [];
    this.state.totalSamplesSent += clearedCount;
    this.state.lastFlushTime = Date.now();
  }

  updateServerHealth(healthy: boolean): void {
    this.state.serverHealthy = healthy;
  }

  incrementFailures(): void {
    this.state.consecutiveFailures++;
    
    // Exponential backoff
    if (this.shouldBackoff) {
      this.state.backoffMultiplier = Math.min(this.state.backoffMultiplier * 2, 8);
    }
  }

  resetFailures(): void {
    this.state.consecutiveFailures = 0;
    this.state.backoffMultiplier = 1;
  }

  private updateAverageFPS(newAvg: number): void {
    this.state.averageFPS = Math.round(newAvg * 10) / 10; // Round to 1 decimal
  }

  // Getters for external access
  get sessionId(): string { return this.state.sessionId; }
  get metrics(): GPUMetric[] { return this.state.metrics; }
  get isActive(): boolean { return this.state.isActive; }
  get currentFPS(): number { return this.state.currentFPS; }
  get averageFPS(): number { return this.state.averageFPS; }
  get activeEffects(): string[] { return this.state.activeEffects; }
  get renderingMode(): 'webgl' | 'webgpu' | 'software' | null { return this.state.renderingMode; }
  get totalSamplesSent(): number { return this.state.totalSamplesSent; }
  
  // Create batch data for sending
  createBatch(): BatchedMetrics {
    const now = Date.now();
    const startTime = this.state.metrics.length > 0 ? this.state.metrics[0].timestamp : now;
    const fpsSamples = this.state.metrics.filter(m => m.fps).map(m => m.fps!);
    
    const effectsSummary: Record<string, number> = {};
    this.state.metrics.forEach(metric => {
      metric.effectsActive?.forEach(effect => {
        effectsSummary[effect] = (effectsSummary[effect] || 0) + 1;
      });
    });

    return {
      sessionId: this.state.sessionId,
      startTime,
      endTime: now,
      samples: [...this.state.metrics], // Copy to avoid mutation
      avgFps: fpsSamples.length > 0 ? fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length : 0,
      minFps: fpsSamples.length > 0 ? Math.min(...fpsSamples) : 0,
      maxFps: fpsSamples.length > 0 ? Math.max(...fpsSamples) : 0,
      effectsSummary,
      totalSamples: this.state.metrics.length
    };
  }
}

// Create and export the store instance
export const gpuMetricsStore = new GPUMetricsStore();

// Helper functions for components
export function useGPUMetrics() {
  return {
    store: gpuMetricsStore,
    metricsCount: gpuMetricsStore.metricsCount,
    isHealthy: gpuMetricsStore.isHealthy,
    performanceStatus: gpuMetricsStore.performanceStatus,
    currentFPS: () => gpuMetricsStore.currentFPS,
    averageFPS: () => gpuMetricsStore.averageFPS,
    minFPS: gpuMetricsStore.minFPS,
    maxFPS: gpuMetricsStore.maxFPS,
    activeEffects: () => gpuMetricsStore.activeEffects,
    effectsSummary: gpuMetricsStore.effectsSummary,
    renderingMode: () => gpuMetricsStore.renderingMode,
    totalSamplesSent: () => gpuMetricsStore.totalSamplesSent
  };
}