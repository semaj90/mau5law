/**
 * Shared metric types for client and server-side observability
 */

export interface CognitiveMetrics {
  routingEfficiency: number;
  cacheHitRatio: number;
  gpuUtilization: number;
  consciousnessLevel: number;
  quantumCoherence: number;
  timestamp: string;
}

export interface RouteMetrics {
  routeId: string;
  pathname: string;
  loadTime: number;
  renderTime: number;
  hydrationTime?: number;
  serverTiming: Record<string, number>;
  webVitals?: {
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
  };
  timestamp: number;
  requestId?: string;
}

export interface TimingMetrics {
  pageLoad: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  serverTiming: Record<string, number>;
  customMarks: Record<string, number>;
  requestId?: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface ClientMetricsPayload {
  metrics: RouteMetrics[];
  timestamp: number;
  userAgent: string;
  url: string;
}

export interface PerformanceMetrics {
  overall: {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    timestamp: string;
  };
  frontend: {
    averageLoadTime: number;
    averageRenderTime: number;
    totalRequests: number;
    webVitalsAverages: {
      lcp: number;
      fid: number;
      cls: number;
      fcp: number;
    };
  };
  backend: {
    averageResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    uptime: number;
  };
  cognitive: CognitiveMetrics;
}

export interface SystemMetrics {
  health: PerformanceMetrics;
  resources: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    gpu?: {
      utilization: number;
      memory: {
        used: number;
        total: number;
      };
      temperature: number;
    };
  };
  services: {
    databases: Record<string, { status: string; responseTime?: number }>;
    aiServices: Record<string, { status: string; responseTime?: number }>;
    microservices: Record<string, { status: string; responseTime?: number }>;
  };
}

export interface MetricsAggregation {
  timeWindow: string;
  totalRequests: number;
  averageLoadTime: number;
  averageRenderTime: number;
  errorRate: number;
  webVitalsAverages: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
  };
  topRoutes: Array<{
    route: string;
    requests: number;
    averageTime: number;
  }>;
  cognitiveMetrics: CognitiveMetrics;
}

// ---- Cognitive Metrics Builders & Utilities ----

export interface PartialCognitiveMetrics {
  routingEfficiency?: number;
  cacheHitRatio?: number;
  gpuUtilization?: number;
  consciousnessLevel?: number;
  quantumCoherence?: number;
  timestamp?: string;
}

/**
 * Normalize a raw metric (0-100 nominal) into bounded range with optional clamping.
 */
export function clampMetric(value: number | undefined, min = 0, max = 100): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.min(max, Math.max(min, value));
}

/**
 * Build a complete CognitiveMetrics object, filling defaults and timestamp.
 */
export function buildCognitiveMetrics(partial: PartialCognitiveMetrics): CognitiveMetrics {
  return {
    routingEfficiency: clampMetric(partial.routingEfficiency),
    cacheHitRatio: clampMetric(partial.cacheHitRatio),
    gpuUtilization: clampMetric(partial.gpuUtilization),
    consciousnessLevel: clampMetric(partial.consciousnessLevel),
    quantumCoherence: clampMetric(partial.quantumCoherence),
    timestamp: partial.timestamp || new Date().toISOString()
  };
}

/**
 * Derive synthetic emergent cognitive fields if not supplied by server subsystems.
 * consciousnessLevel: weighted mean of efficiency & cache quality signals.
 * quantumCoherence: sinusoidal temporal modulation blended with GPU utilization (for demo UX).
 */
export function deriveEmergentCognitiveSignals(base: CognitiveMetrics): CognitiveMetrics {
  const derivedConsciousness = base.consciousnessLevel || clampMetric((base.routingEfficiency * 0.5 + base.cacheHitRatio * 0.5));
  const timeFactor = Date.now() / 12000; // slow oscillation
  const wave = (Math.sin(timeFactor) + 1) / 2; // 0..1
  const derivedQuantum = base.quantumCoherence || clampMetric(base.gpuUtilization * 0.4 + wave * 60);
  return { ...base, consciousnessLevel: derivedConsciousness, quantumCoherence: derivedQuantum };
}
