/**
 * Unified GPU Summary Consumption Store
 * Consolidates GPU metrics, WebASM inference, vector search workflow, and MinIO cache
 * Integrates with existing GPU-aware cache and metrics batcher
 */

import type { GPUMetric, BatchedMetrics } from '$lib/services/gpuMetricsBatcher';
import { gpuMetricsBatcher } from '$lib/services/gpuMetricsBatcher';

// GPU Summary Interfaces
export interface WebASMInferenceMetrics {
  modelName: string;
  inferenceTime: number;
  tokensPerSecond: number;
  memoryUsage: number;
  wasmMemoryPages: number;
  simdInstructions: boolean;
  threadCount: number;
  timestamp: number;
}

export interface VectorSearchMetrics {
  queryId: string;
  searchTime: number;
  vectorDimensions: number;
  candidateCount: number;
  resultCount: number;
  indexType: 'ivf' | 'hnsw' | 'flat';
  similarityFunction: 'cosine' | 'euclidean' | 'dot_product';
  cacheHitRate: number;
  timestamp: number;
}

export interface MinIOCacheMetrics {
  operation: 'get' | 'put' | 'delete' | 'list';
  bucketName: string;
  objectKey?: string;
  transferSize: number;
  duration: number;
  cacheHit: boolean;
  compressionRatio?: number;
  timestamp: number;
}

export interface GPUBridgeMetrics {
  transferTime: number;
  computeTime: number;
  memoryBandwidth: number;
  utilization: number;
  powerEfficiency: number;
  timestamp: number;
}

export interface GPUSummary {
  // Performance metrics
  avgFps: number;
  minFps: number;
  maxFps: number;
  frameTimeMs: number;
  memoryUsageMB: number;

  // GPU utilization
  gpuUtilization: number;
  vramUsageMB: number;
  tensorCoreActive: boolean;
  webgpuSupported: boolean;

  // Active effects and features
  activeEffects: string[];
  renderingMode: 'webgl' | 'webgpu' | 'software';
  materialComplexity: 'low' | 'medium' | 'high' | 'ultra';

  // WebASM inference stats
  activeInferences: number;
  totalInferenceTime: number;
  avgTokensPerSecond: number;
  wasmMemoryUsage: number;

  // Vector search performance
  activeQueries: number;
  avgSearchTime: number;
  vectorCacheHitRate: number;
  totalVectorOperations: number;

  // MinIO cache stats
  cacheHitRate: number;
  totalTransferMB: number;
  avgCompressionRatio: number;
  activeBuckets: string[];

  // System health
  healthScore: number; // 0-100
  bottlenecks: string[];
  recommendations: string[];

  lastUpdated: number;
}

export interface GPUStoreState {
  currentSummary: GPUSummary | null;
  historicalMetrics: GPUMetric[];
  webAsmMetrics: WebASMInferenceMetrics[];
  vectorSearchMetrics: VectorSearchMetrics[];
  minioMetrics: MinIOCacheMetrics[];
  isCollecting: boolean;
  sessionId: string;
  startTime: number;
}

// Create the unified GPU summary store using Svelte 5 runes
function createGPUSummaryStore() {
  let state = $state<GPUStoreState>({
    currentSummary: null,
    historicalMetrics: [],
    webAsmMetrics: [],
    vectorSearchMetrics: [],
    minioMetrics: [],
    isCollecting: false,
    sessionId: '',
    startTime: Date.now()
  });

  // WebGL/WebGPU context detection
  let webglContext: WebGLRenderingContext | null = null;
  let webgpuDevice: GPUDevice | null = null;

  // Performance tracking
  let frameCount = 0;
  let lastSummaryUpdate = 0;
  let summaryUpdateInterval = 5000; // 5 seconds

  // Initialize GPU contexts and start collection
  async function initialize(): Promise<boolean> {
    try {
      // Initialize WebGPU if available
      if ('gpu' in navigator) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            webgpuDevice = await adapter.requestDevice();
            console.log('🚀 GPUStore: WebGPU context initialized');
          }
        } catch (error) {
          console.warn('GPUStore: WebGPU initialization failed');
        }
      }

      // Fallback to WebGL
      if (!webgpuDevice) {
        const canvas = document.createElement('canvas');
        webglContext = canvas.getContext('webgl2') || canvas.getContext('webgl');
        console.log('🚀 GPUStore: WebGL context initialized');
      }

      // Get session ID from metrics batcher
      state.sessionId = gpuMetricsBatcher.getSessionId();
      state.isCollecting = true;

      // Start periodic summary updates
      requestAnimationFrame(updateLoop);

      console.log('✅ GPUStore: Unified GPU summary store initialized');
      return true;
    } catch (error) {
      console.error('❌ GPUStore: Initialization failed:', error);
      return false;
    }
  }

  // Main update loop
  function updateLoop() {
    frameCount++;
    const now = Date.now();

    // Update summary every 5 seconds or on demand
    if (now - lastSummaryUpdate >= summaryUpdateInterval) {
      updateSummary();
      lastSummaryUpdate = now;
    }

    if (state.isCollecting) {
      requestAnimationFrame(updateLoop);
    }
  }

  // Generate comprehensive GPU summary
  function updateSummary() {
    const now = Date.now();
    const recentWindow = 30000; // 30 seconds
    const recentMetrics = state.historicalMetrics.filter(m =>
      now - m.timestamp <= recentWindow
    );

    if (recentMetrics.length === 0) {
      return;
    }

    // Calculate FPS stats
    const fpsValues = recentMetrics.filter(m => m.fps).map(m => m.fps!);
    const avgFps = fpsValues.length > 0 ?
      fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length : 0;
    const minFps = fpsValues.length > 0 ? Math.min(...fpsValues) : 0;
    const maxFps = fpsValues.length > 0 ? Math.max(...fpsValues) : 0;

    // Calculate frame time
    const frameTimeValues = recentMetrics.filter(m => m.frameTime).map(m => m.frameTime!);
    const frameTimeMs = frameTimeValues.length > 0 ?
      frameTimeValues.reduce((a, b) => a + b, 0) / frameTimeValues.length : 0;

    // Memory usage
    const memoryValues = recentMetrics.filter(m => m.memoryUsage).map(m => m.memoryUsage!);
    const memoryUsageMB = memoryValues.length > 0 ?
      memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length : 0;

    // Active effects analysis
    const effectsMap = new Map<string, number>();
    recentMetrics.forEach(m => {
      m.effectsActive?.forEach(effect => {
        effectsMap.set(effect, (effectsMap.get(effect) || 0) + 1);
      });
    });
    const activeEffects = Array.from(effectsMap.entries())
      .filter(([_, count]) => count > recentMetrics.length * 0.1) // 10% threshold
      .map(([effect, _]) => effect);

    // WebASM inference stats
    const recentInferences = state.webAsmMetrics.filter(m =>
      now - m.timestamp <= recentWindow
    );
    const activeInferences = recentInferences.length;
    const totalInferenceTime = recentInferences.reduce((sum, m) => sum + m.inferenceTime, 0);
    const avgTokensPerSecond = recentInferences.length > 0 ?
      recentInferences.reduce((sum, m) => sum + m.tokensPerSecond, 0) / recentInferences.length : 0;
    const wasmMemoryUsage = recentInferences.length > 0 ?
      recentInferences.reduce((sum, m) => sum + m.memoryUsage, 0) / recentInferences.length : 0;

    // Vector search performance
    const recentSearches = state.vectorSearchMetrics.filter(m =>
      now - m.timestamp <= recentWindow
    );
    const activeQueries = recentSearches.length;
    const avgSearchTime = recentSearches.length > 0 ?
      recentSearches.reduce((sum, m) => sum + m.searchTime, 0) / recentSearches.length : 0;
    const vectorCacheHitRate = recentSearches.length > 0 ?
      recentSearches.reduce((sum, m) => sum + m.cacheHitRate, 0) / recentSearches.length : 0;
    const totalVectorOperations = recentSearches.reduce((sum, m) => sum + m.candidateCount, 0);

    // MinIO cache stats
    const recentMinIOOps = state.minioMetrics.filter(m =>
      now - m.timestamp <= recentWindow
    );
    const minIOCacheHitRate = recentMinIOOps.length > 0 ?
      recentMinIOOps.filter(m => m.cacheHit).length / recentMinIOOps.length : 0;
    const totalTransferMB = recentMinIOOps.reduce((sum, m) => sum + m.transferSize, 0) / (1024 * 1024);
    const avgCompressionRatio = recentMinIOOps
      .filter(m => m.compressionRatio)
      .reduce((sum, m, _, arr) => sum + (m.compressionRatio! / arr.length), 0);
    const activeBuckets = Array.from(new Set(recentMinIOOps.map(m => m.bucketName)));

    // Calculate health score and identify bottlenecks
    const { healthScore, bottlenecks, recommendations } = calculateHealthMetrics(
      avgFps, memoryUsageMB, avgSearchTime, minIOCacheHitRate, activeEffects.length
    );

    // Determine rendering mode and material complexity
    const renderingMode = webgpuDevice ? 'webgpu' : (webglContext ? 'webgl' : 'software');
    const materialComplexity = determineMaterialComplexity(activeEffects, avgFps);

    state.currentSummary = {
      // Performance metrics
      avgFps: Math.round(avgFps * 100) / 100,
      minFps: Math.round(minFps * 100) / 100,
      maxFps: Math.round(maxFps * 100) / 100,
      frameTimeMs: Math.round(frameTimeMs * 100) / 100,
      memoryUsageMB: Math.round(memoryUsageMB),

      // GPU utilization
      gpuUtilization: Math.min(100, Math.max(0, (avgFps / 60) * 100)),
      vramUsageMB: Math.round(memoryUsageMB * 0.7), // Estimate VRAM usage
      tensorCoreActive: recentMetrics.some(m => m.tensorCoreActive),
      webgpuSupported: webgpuDevice !== null,

      // Active effects and features
      activeEffects,
      renderingMode,
      materialComplexity,

      // WebASM inference stats
      activeInferences,
      totalInferenceTime: Math.round(totalInferenceTime),
      avgTokensPerSecond: Math.round(avgTokensPerSecond * 100) / 100,
      wasmMemoryUsage: Math.round(wasmMemoryUsage),

      // Vector search performance
      activeQueries,
      avgSearchTime: Math.round(avgSearchTime * 100) / 100,
      vectorCacheHitRate: Math.round(vectorCacheHitRate * 100) / 100,
      totalVectorOperations,

      // MinIO cache stats
      cacheHitRate: Math.round(minIOCacheHitRate * 100) / 100,
      totalTransferMB: Math.round(totalTransferMB * 100) / 100,
      avgCompressionRatio: Math.round(avgCompressionRatio * 100) / 100,
      activeBuckets,

      // System health
      healthScore,
      bottlenecks,
      recommendations,

      lastUpdated: now
    };
  }

  // Calculate system health score and identify issues
  function calculateHealthMetrics(
    avgFps: number,
    memoryUsageMB: number,
    avgSearchTime: number,
    cacheHitRate: number,
    effectsCount: number
  ): { healthScore: number; bottlenecks: string[]; recommendations: string[] } {
    let healthScore = 100;
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    // FPS performance (30% weight)
    if (avgFps < 30) {
      healthScore -= 30;
      bottlenecks.push('low_fps');
      recommendations.push('Reduce visual effects or lower material complexity');
    } else if (avgFps < 45) {
      healthScore -= 15;
      bottlenecks.push('moderate_fps');
      recommendations.push('Consider optimizing shader complexity');
    }

    // Memory usage (25% weight)
    if (memoryUsageMB > 2000) {
      healthScore -= 25;
      bottlenecks.push('high_memory');
      recommendations.push('Critical memory usage - disable heavy effects immediately');
    } else if (memoryUsageMB > 1000) {
      healthScore -= 15;
      bottlenecks.push('moderate_memory');
      recommendations.push('High memory usage - monitor closely');
    }

    // Search performance (20% weight)
    if (avgSearchTime > 1000) {
      healthScore -= 20;
      bottlenecks.push('slow_search');
      recommendations.push('Vector search is slow - check index optimization');
    } else if (avgSearchTime > 500) {
      healthScore -= 10;
      bottlenecks.push('moderate_search');
      recommendations.push('Consider vector quantization for faster search');
    }

    // Cache performance (15% weight)
    if (cacheHitRate < 0.5) {
      healthScore -= 15;
      bottlenecks.push('poor_cache');
      recommendations.push('Low cache hit rate - review caching strategy');
    } else if (cacheHitRate < 0.7) {
      healthScore -= 8;
      recommendations.push('Cache hit rate could be improved');
    }

    // Effects complexity (10% weight)
    if (effectsCount > 8) {
      healthScore -= 10;
      bottlenecks.push('too_many_effects');
      recommendations.push('Too many visual effects active - disable some for better performance');
    }

    return {
      healthScore: Math.max(0, Math.round(healthScore)),
      bottlenecks,
      recommendations
    };
  }

  // Determine material complexity based on active effects and performance
  function determineMaterialComplexity(effects: string[], fps: number): 'low' | 'medium' | 'high' | 'ultra' {
    const complexEffects = effects.filter(effect =>
      effect.includes('pbr') ||
      effect.includes('ultra') ||
      effect.includes('anisotropic') ||
      effect.includes('msaa')
    ).length;

    if (complexEffects >= 3 || fps < 30) return 'ultra';
    if (complexEffects >= 2 || fps < 45) return 'high';
    if (complexEffects >= 1 || fps < 55) return 'medium';
    return 'low';
  }

  // Add GPU metric (from metrics batcher)
  function addGPUMetric(metric: GPUMetric) {
    state.historicalMetrics.push(metric);

    // Keep only last 1000 metrics to prevent memory bloat
    if (state.historicalMetrics.length > 1000) {
      state.historicalMetrics = state.historicalMetrics.slice(-1000);
    }
  }

  // Add WebASM inference metric
  function addWebASMMetric(metric: WebASMInferenceMetrics) {
    state.webAsmMetrics.push(metric);

    // Keep only last 500 inference metrics
    if (state.webAsmMetrics.length > 500) {
      state.webAsmMetrics = state.webAsmMetrics.slice(-500);
    }
  }

  // Add vector search metric
  function addVectorSearchMetric(metric: VectorSearchMetrics) {
    state.vectorSearchMetrics.push(metric);

    // Keep only last 500 search metrics
    if (state.vectorSearchMetrics.length > 500) {
      state.vectorSearchMetrics = state.vectorSearchMetrics.slice(-500);
    }
  }

  // Add MinIO cache metric
  function addMinIOMetric(metric: MinIOCacheMetrics) {
    state.minioMetrics.push(metric);

    // Keep only last 500 MinIO metrics
    if (state.minioMetrics.length > 500) {
      state.minioMetrics = state.minioMetrics.slice(-500);
    }
  }

  // Process batched metrics from GPU metrics batcher
  function processBatchedMetrics(batch: BatchedMetrics) {
    // Add all samples to historical metrics
    batch.samples.forEach(sample => addGPUMetric(sample));

    console.log(`📊 GPUStore: Processed batch of ${batch.totalSamples} metrics`);

    // Trigger immediate summary update for large batches
    if (batch.totalSamples >= 20) {
      updateSummary();
    }
  }

  // Get performance insights
  function getPerformanceInsights(): {
    fpsStability: number;
    memoryTrend: 'increasing' | 'stable' | 'decreasing';
    recommendedSettings: Record<string, any>;
  } {
    const recentMetrics = state.historicalMetrics.slice(-100);
    if (recentMetrics.length < 10) {
      return {
        fpsStability: 0,
        memoryTrend: 'stable',
        recommendedSettings: {}
      };
    }

    // Calculate FPS stability (coefficient of variation)
    const fpsValues = recentMetrics.filter(m => m.fps).map(m => m.fps!);
    const avgFps = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
    const fpsVariance = fpsValues.reduce((sum, fps) => sum + Math.pow(fps - avgFps, 2), 0) / fpsValues.length;
    const fpsStability = avgFps > 0 ? Math.max(0, 100 - (Math.sqrt(fpsVariance) / avgFps * 100)) : 0;

    // Memory trend analysis
    const memoryValues = recentMetrics.filter(m => m.memoryUsage).map(m => m.memoryUsage!);
    const firstHalf = memoryValues.slice(0, Math.floor(memoryValues.length / 2));
    const secondHalf = memoryValues.slice(Math.floor(memoryValues.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const memoryTrend = secondAvg > firstAvg * 1.1 ? 'increasing' :
                       secondAvg < firstAvg * 0.9 ? 'decreasing' : 'stable';

    // Generate recommended settings
    const recommendedSettings = {
      materialType: avgFps >= 45 ? 'phong' : 'basic',
      meshComplexity: avgFps >= 60 ? 'high' : avgFps >= 45 ? 'medium' : 'low',
      textureFiltering: avgFps >= 50 ? 'anisotropic' : 'bilinear',
      antiAliasing: avgFps >= 55 ? 'msaa' : avgFps >= 40 ? 'fxaa' : 'none',
      fogEffect: avgFps >= 45,
      shadowCasting: avgFps >= 50,
      depthOfField: avgFps >= 55
    };

    return {
      fpsStability: Math.round(fpsStability),
      memoryTrend,
      recommendedSettings
    };
  }

  // Stop collection and cleanup
  function stop() {
    state.isCollecting = false;
    console.log('🛑 GPUStore: Stopped collection');
  }

  // Reset all metrics
  function reset() {
    state.historicalMetrics = [];
    state.webAsmMetrics = [];
    state.vectorSearchMetrics = [];
    state.minioMetrics = [];
    state.currentSummary = null;
    state.startTime = Date.now();
    console.log('🔄 GPUStore: Reset all metrics');
  }

  // Export current data for analysis
  function exportData() {
    return {
      sessionId: state.sessionId,
      startTime: state.startTime,
      currentSummary: state.currentSummary,
      totalMetrics: state.historicalMetrics.length,
      totalInferences: state.webAsmMetrics.length,
      totalSearches: state.vectorSearchMetrics.length,
      totalMinIOOps: state.minioMetrics.length,
      exportTime: Date.now()
    };
  }

  return {
    // State (read-only)
    get state() { return state; },
    get isCollecting() { return state.isCollecting; },
    get currentSummary() { return state.currentSummary; },
    get sessionId() { return state.sessionId; },

    // Actions
    initialize,
    stop,
    reset,

    // Metric addition methods
    addGPUMetric,
    addWebASMMetric,
    addVectorSearchMetric,
    addMinIOMetric,
    processBatchedMetrics,

    // GPU bridge metric update
    updateGPUBridge: (metric: GPUBridgeMetrics) => {
      // For now, fold GPU bridge metrics into webAsmMetrics summary fields
      state.webAsmMetrics.push({
        modelName: 'gpu-bridge',
        inferenceTime: metric.computeTime,
        tokensPerSecond: 0,
        memoryUsage: Math.round(metric.memoryBandwidth),
        wasmMemoryPages: 0,
        simdInstructions: true,
        threadCount: 0,
        timestamp: metric.timestamp
      });
      updateSummary();
    },

    // Analysis methods
    getPerformanceInsights,
    updateSummary,
    exportData
  };
}

// Create and export the global store instance
export const gpuSummaryStore = createGPUSummaryStore();

// Initialize the store when imported (browser only)
if (typeof window !== 'undefined') {
  gpuSummaryStore.initialize();
}

// Integration helpers for external services

/**
 * Track WebASM inference performance
 */
export function trackWebASMInference(
  modelName: string,
  startTime: number,
  endTime: number,
  tokenCount: number,
  memoryUsage: number,
  wasmPages: number,
  simdSupported: boolean,
  threadCount: number
) {
  const inferenceTime = endTime - startTime;
  const tokensPerSecond = tokenCount / (inferenceTime / 1000);

  gpuSummaryStore.addWebASMMetric({
    modelName,
    inferenceTime,
    tokensPerSecond,
    memoryUsage,
    wasmMemoryPages: wasmPages,
    simdInstructions: simdSupported,
    threadCount,
    timestamp: Date.now()
  });
}

/**
 * Track vector search performance
 */
export function trackVectorSearch(
  queryId: string,
  searchTime: number,
  vectorDimensions: number,
  candidateCount: number,
  resultCount: number,
  indexType: 'ivf' | 'hnsw' | 'flat',
  similarityFunction: 'cosine' | 'euclidean' | 'dot_product',
  cacheHitRate: number
) {
  gpuSummaryStore.addVectorSearchMetric({
    queryId,
    searchTime,
    vectorDimensions,
    candidateCount,
    resultCount,
    indexType,
    similarityFunction,
    cacheHitRate,
    timestamp: Date.now()
  });
}

/**
 * Track MinIO cache operations
 */
export function trackMinIOOperation(
  operation: 'get' | 'put' | 'delete' | 'list',
  bucketName: string,
  transferSize: number,
  duration: number,
  cacheHit: boolean,
  objectKey?: string,
  compressionRatio?: number
) {
  gpuSummaryStore.addMinIOMetric({
    operation,
    bucketName,
    objectKey,
    transferSize,
    duration,
    cacheHit,
    compressionRatio,
    timestamp: Date.now()
  });
}

/**
 * Track WebASM-GPU bridge operations
 */
export function trackGPUBridgeOperation(
  transferTime: number,
  computeTime: number,
  memoryBandwidth: number,
  utilization: number,
  powerEfficiency: number
) {
  gpuSummaryStore.updateGPUBridge({
    transferTime,
    computeTime,
    memoryBandwidth,
    utilization,
    powerEfficiency,
    timestamp: Date.now()
  });
}