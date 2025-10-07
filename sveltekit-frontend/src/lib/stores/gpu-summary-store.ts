/**
 * Minimal GPU summary store stub
 * Purpose: provide lightweight types and a noop store API to unblock imports
 * This is intentionally small and conservative. Replace with full implementation later.
 */
export interface WebASMInferenceMetrics {
  modelName?: string;
  inferenceTime?: number;
  tokensPerSecond?: number;
  memoryUsage?: number;
  wasmMemoryPages?: number;
  simdInstructions?: boolean;
  threadCount?: number;
  timestamp?: number;
}

export interface GPUBridgeMetrics {
  transferTime: number;
  computeTime: number;
  memoryBandwidth: number;
  utilization: number;
  powerEfficiency: number;
  timestamp: number;
}

export const gpuSummaryStore = {
  // No-op updater used by services during conservative triage
  updateGPUBridge(_metrics: GPUBridgeMetrics | Partial<WebASMInferenceMetrics>) {
    // intentionally no-op; keeps callers safe until a full store is implemented
    return;
  },
};

export default gpuSummaryStore;
