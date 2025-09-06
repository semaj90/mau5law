
// lib/server/ai/monitoring-service.ts
// Comprehensive monitoring and observability for AI synthesis pipeline

import { logger } from './logger';
import { EventEmitter } from "events";

export interface MetricData {
  requestId: string;
  processingTime: number;
  confidence: number;
  sourceCount: number;
  strategies: string[];
  qualityScore: number;
}

export interface AlertRule {
  name: string;
  condition: (metrics: any) => boolean;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface PerformanceMetrics {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  stdDev: number;
}

class MonitoringService extends EventEmitter {
  private metrics: Map<string, unknown[]> = new Map();
  private alerts: AlertRule[] = [];
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private performanceHistory: number[] = [];
  private errorLog: Array<{ timestamp: Date; error: string; context: any }> = [];
  private requestTracking: Map<string, any> = new Map();

  private counters = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    streamRequests: 0,
    feedbackReceived: 0,
  };

  private timings = {
    queryAnalysis: [],
    retrieval: [],
    ranking: [],
    promptConstruction: [],
    totalProcessing: [],
  };

  constructor() {
    super();
    this.initialize();
  }

  private initialize(): void {
    logger.info('[Monitoring] Initializing monitoring service...');

    // Set up default alert rules
    this.setupDefaultAlerts();

    // Start periodic metric aggregation
    setInterval(() => this.aggregateMetrics(), 60000); // Every minute

    // Start health check monitoring
    setInterval(() => this.runHealthChecks(), 30000); // Every 30 seconds

    // Clean up old data periodically
    setInterval(() => this.cleanupOldData(), 3600000); // Every hour

    logger.info('[Monitoring] Monitoring service initialized');
  }

  /**
   * Track incoming request
   */
  trackRequest(data: {
    requestId: string;
    userId: string;
    query: string;
    timestamp: Date;
    sessionId?: string;
  }): void {
    this.counters.totalRequests++;

    this.requestTracking.set(data.requestId, {
      ...data,
      startTime: Date.now(),
      stages: new Map(),
    });

    this.emit('request:start', data);
    logger.debug(`[Monitoring] Tracking request ${data.requestId}`);
  }

  /**
   * Track stage completion within a request
   */
  trackStage(requestId: string, stage: string, duration: number, metadata?: unknown): void {
    const request = this.requestTracking.get(requestId);
    if (request) {
      request.stages.set(stage, {
        duration,
        timestamp: Date.now(),
        metadata,
      });

      // Update timing arrays
      if (stage === 'query_analysis' && this.timings.queryAnalysis) {
        this.timings.queryAnalysis.push(duration);
      } else if (stage === 'retrieval' && this.timings.retrieval) {
        this.timings.retrieval.push(duration);
      } else if (stage === 'ranking' && this.timings.ranking) {
        this.timings.ranking.push(duration);
      } else if (stage === 'prompt_construction' && this.timings.promptConstruction) {
        this.timings.promptConstruction.push(duration);
      }

      this.emit('stage:complete', { requestId, stage, duration });
    }
  }

  /**
   * Track metrics for completed request
   */
  trackMetrics(metrics: MetricData): void {
    this.counters.successfulRequests++;
    this.performanceHistory.push(metrics.processingTime);
    this.timings.totalProcessing.push(metrics.processingTime);

    // Store metrics by various dimensions
    this.storeMetric('processing_time', metrics.processingTime);
    this.storeMetric('confidence', metrics.confidence);
    this.storeMetric('source_count', metrics.sourceCount);
    this.storeMetric('quality_score', metrics.qualityScore);

    // Track strategy usage
    for (const strategy of metrics.strategies) {
      this.incrementStrategyUsage(strategy);
    }

    // Check for alerts
    this.checkAlerts(metrics);

    // Complete request tracking
    const request = this.requestTracking.get(metrics.requestId);
    if (request) {
      request.endTime = Date.now();
      request.success = true;
      request.metrics = metrics;

      this.emit('request:complete', request);
    }

    logger.debug(`[Monitoring] Tracked metrics for ${metrics.requestId}`);
  }

  /**
   * Track cache hit
   */
  trackCacheHit(requestId: string): void {
    this.counters.cacheHits++;
    this.emit('cache:hit', { requestId, timestamp: Date.now() });
  }

  /**
   * Track cache miss
   */
  trackCacheMiss(requestId: string): void {
    this.counters.cacheMisses++;
    this.emit('cache:miss', { requestId, timestamp: Date.now() });
  }

  /**
   * Track stream completion
   */
  trackStreamCompletion(data: { streamId: string; requestId: string; duration: number }): void {
    this.counters.streamRequests++;
    this.storeMetric('stream_duration', data.duration);
    this.emit('stream:complete', data);
  }

  /**
   * Track errors
   */
  trackError(data: { requestId: string; error: string; stack?: string; userId: string }): void {
    this.counters.failedRequests++;

    this.errorLog.push({
      timestamp: new Date(),
      error: data.error,
      context: data,
    });

    // Keep only last 1000 errors
    if (this.errorLog.length > 1000) {
      this.errorLog.shift();
    }

    // Complete request tracking with error
    const request = this.requestTracking.get(data.requestId);
    if (request) {
      request.endTime = Date.now();
      request.success = false;
      request.error = data.error;

      this.emit('request:error', request);
    }

    // Check if error rate is too high
    const errorRate = this.counters.failedRequests / this.counters.totalRequests;
    if (errorRate > 0.1) {
      // More than 10% error rate
      this.emit('alert', {
        severity: 'critical',
        message: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
        context: data,
      });
    }

    logger.error(`[Monitoring] Tracked error for ${data.requestId}: ${data.error}`);
  }

  /**
   * Register health check
   */
  registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
    logger.info(`[Monitoring] Registered health check: ${name}`);
  }

  /**
   * Get current statistics
   */
  getStats(): unknown {
    const cacheHitRate =
      this.counters.cacheHits / (this.counters.cacheHits + this.counters.cacheMisses) || 0;

    const successRate = this.counters.successfulRequests / this.counters.totalRequests || 0;

    const performanceMetrics = this.calculatePerformanceMetrics(this.timings.totalProcessing);

    const stageMetrics = {
      queryAnalysis: this.calculatePerformanceMetrics(this.timings.queryAnalysis),
      retrieval: this.calculatePerformanceMetrics(this.timings.retrieval),
      ranking: this.calculatePerformanceMetrics(this.timings.ranking),
      promptConstruction: this.calculatePerformanceMetrics(this.timings.promptConstruction),
    };

    return {
      counters: this.counters,
      rates: {
        cacheHitRate: (cacheHitRate * 100).toFixed(2) + '%',
        successRate: (successRate * 100).toFixed(2) + '%',
        errorRate: ((1 - successRate) * 100).toFixed(2) + '%',
      },
      performance: {
        overall: performanceMetrics,
        stages: stageMetrics,
      },
      recentErrors: this.errorLog.slice(-10),
      activeRequests: this.requestTracking.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Get detailed metrics for analysis
   */
  getDetailedMetrics(timeRange?: { start: Date; end: Date }): unknown {
    const metrics = {};

    for (const [name, values] of this.metrics) {
      if (values.length > 0) {
        const numericValues = values.filter((v): v is number => typeof v === 'number');
        metrics[name] = {
          count: numericValues.length,
          min: numericValues.length > 0 ? Math.min(...numericValues) : 0,
          max: numericValues.length > 0 ? Math.max(...numericValues) : 0,
          mean: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0,
          latest: numericValues[numericValues.length - 1] || 0,
          trend: this.calculateTrend(numericValues),
        };
      }
    }

    return metrics;
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportPrometheusMetrics(): string {
    const lines = [];

    // Counter metrics
    lines.push(`# HELP ai_synthesis_requests_total Total number of synthesis requests`);
    lines.push(`# TYPE ai_synthesis_requests_total counter`);
    lines.push(`ai_synthesis_requests_total ${this.counters.totalRequests}`);

    lines.push(`# HELP ai_synthesis_requests_success Successful synthesis requests`);
    lines.push(`# TYPE ai_synthesis_requests_success counter`);
    lines.push(`ai_synthesis_requests_success ${this.counters.successfulRequests}`);

    lines.push(`# HELP ai_synthesis_cache_hits Cache hits`);
    lines.push(`# TYPE ai_synthesis_cache_hits counter`);
    lines.push(`ai_synthesis_cache_hits ${this.counters.cacheHits}`);

    // Histogram metrics
    const performanceMetrics = this.calculatePerformanceMetrics(this.timings.totalProcessing);

    lines.push(`# HELP ai_synthesis_duration_seconds Processing duration`);
    lines.push(`# TYPE ai_synthesis_duration_seconds summary`);
    lines.push(`ai_synthesis_duration_seconds{quantile="0.5"} ${performanceMetrics.p50 / 1000}`);
    lines.push(`ai_synthesis_duration_seconds{quantile="0.95"} ${performanceMetrics.p95 / 1000}`);
    lines.push(`ai_synthesis_duration_seconds{quantile="0.99"} ${performanceMetrics.p99 / 1000}`);

    return lines.join('\n');
  }

  // === PRIVATE HELPER METHODS ===

  private setupDefaultAlerts(): void {
    // High processing time alert
    this.alerts.push({
      name: 'high_processing_time',
      condition: (metrics) => metrics.processingTime > 10000, // > 10 seconds
      message: 'Processing time exceeded 10 seconds',
      severity: 'warning',
    });

    // Low confidence alert
    this.alerts.push({
      name: 'low_confidence',
      condition: (metrics) => metrics.confidence < 0.5,
      message: 'Low confidence score detected',
      severity: 'warning',
    });

    // Low quality score alert
    this.alerts.push({
      name: 'low_quality',
      condition: (metrics) => metrics.qualityScore < 0.6,
      message: 'Low quality score detected',
      severity: 'info',
    });

    // No sources found alert
    this.alerts.push({
      name: 'no_sources',
      condition: (metrics) => metrics.sourceCount === 0,
      message: 'No sources found for query',
      severity: 'warning',
    });
  }

  private checkAlerts(metrics: MetricData): void {
    for (const alert of this.alerts) {
      if (alert.condition(metrics)) {
        this.emit('alert', {
          name: alert.name,
          severity: alert.severity,
          message: alert.message,
          context: metrics,
          timestamp: new Date(),
        });

        logger.warn(`[Monitoring] Alert triggered: ${alert.name} - ${alert.message}`);
      }
    }
  }

  private async runHealthChecks(): Promise<void> {
    const results = new Map<string, boolean>();

    for (const [name, check] of this.healthChecks) {
      try {
        const healthy = await check();
        results.set(name, healthy);

        if (!healthy) {
          this.emit('health:unhealthy', {
            component: name,
            timestamp: new Date(),
          });
        }
      } catch (error: any) {
        results.set(name, false);
        logger.error(`[Monitoring] Health check failed for ${name}:`, error);
      }
    }

    this.emit('health:check', {
      results: Object.fromEntries(results),
      timestamp: new Date(),
    });
  }

  private storeMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name);
    values.push(value);

    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
  }

  private incrementStrategyUsage(strategy: string): void {
    const key = `strategy_${strategy}`;
    const current = (this.metrics.get(key) as number[]) || [0];
    current[0]++;
    this.metrics.set(key, current);
  }

  private calculatePerformanceMetrics(values: number[]): PerformanceMetrics {
    if (!values || values.length === 0) {
      return { p50: 0, p95: 0, p99: 0, mean: 0, stdDev: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const len = sorted.length;

    const p50 = sorted[Math.floor(len * 0.5)];
    const p95 = sorted[Math.floor(len * 0.95)];
    const p99 = sorted[Math.floor(len * 0.99)];
    const mean = values.reduce((a, b) => a + b, 0) / len;

    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / len;
    const stdDev = Math.sqrt(variance);

    return { p50, p95, p99, mean, stdDev };
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 10) return 'stable';

    const recent = values.slice(-10);
    const older = values.slice(-20, -10);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private aggregateMetrics(): void {
    // Aggregate and emit periodic metrics
    const stats = this.getStats();

    this.emit('metrics:aggregate', {
      stats,
      timestamp: new Date(),
    });

    // Log summary
    logger.info('[Monitoring] Metrics summary:', {
      requests: this.counters.totalRequests,
      successRate: (stats as any).rates?.successRate,
      cacheHitRate: (stats as any).rates?.cacheHitRate,
      avgProcessingTime: (stats as any).performance?.overall?.mean,
    });
  }

  private cleanupOldData(): void {
    // Clean up old request tracking
    const oneHourAgo = Date.now() - 3600000;

    for (const [requestId, data] of this.requestTracking) {
      if (data.startTime < oneHourAgo) {
        this.requestTracking.delete(requestId);
      }
    }

    // Trim timing arrays
    const maxLength = 10000;
    for (const key of Object.keys(this.timings)) {
      if (this.timings[key].length > maxLength) {
        this.timings[key] = this.timings[key].slice(-maxLength);
      }
    }

    // Trim performance history
    if (this.performanceHistory.length > maxLength) {
      this.performanceHistory = this.performanceHistory.slice(-maxLength);
    }

    logger.debug('[Monitoring] Cleaned up old monitoring data');
  }

  /**
   * Record a metric value
   */
  async recordMetric(
    metric: string,
    value: number,
    labels?: Record<string, string>
  ): Promise<void> {
    const data = {
      // id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Remove if not in MetricData interface
      timestamp: new Date(),
      type: 'metric',
      source: labels?.source || 'system',
      level: 'info',
      category: 'metric',
      data: {
        metric,
        value,
        labels,
      },
    };

    // Ensure metrics is typed as array, not Map
    if (Array.isArray(this.metrics)) {
      this.metrics.push(data);
    } else {
      // Handle case where metrics might be a Map
      const metricsList = this.metrics.get(metric) || [];
      metricsList.push(value);
      this.metrics.set(metric, metricsList);
    }
    this.emit('metric:recorded', data);

    logger.debug(`[Monitoring] Recorded metric ${metric}: ${value}`, labels);
  }

  /**
   * Get all metrics
   */
  async getMetrics(): Promise<MetricData[]> {
    const allMetrics: MetricData[] = [];
    for (const [key, values] of this.metrics) {
      if (Array.isArray(values)) {
        values.forEach(value => {
          if (typeof value === 'number') {
            allMetrics.push({
              requestId: key,
              processingTime: value,
              confidence: 0.8,
              sourceCount: 1,
              strategies: ['default'],
              qualityScore: 0.7
            } as MetricData);
          }
        });
      }
    }
    return allMetrics;
  }

  /**
   * Get aggregated metrics by name
   */
  async getMetricStats(metricName: string): Promise<{
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    latest: number;
  }> {
    const metricData = Array.from((this.metrics as any).values())
      .flat()
      .filter((m: any) => m.data?.metric === metricName)
      .map((m: any) => m.data?.value || 0);

    if (metricData.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0, latest: 0 };
    }

    const sum = metricData.reduce((a, b) => a + b, 0);
    const avg = sum / metricData.length;
    const min = Math.min(...metricData);
    const max = Math.max(...metricData);
    const latest = metricData[metricData.length - 1];

    return { count: metricData.length, sum, avg, min, max, latest };
  }

  /**
   * Shutdown monitoring service
   */
  async shutdown(): Promise<void> {
    // Export final metrics
    const finalStats = this.getStats();
    logger.info('[Monitoring] Final statistics:', finalStats);

    // Clear intervals
    this.removeAllListeners();

    logger.info('[Monitoring] Monitoring service shutdown complete');
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
;
// Types are already exported as interfaces above
