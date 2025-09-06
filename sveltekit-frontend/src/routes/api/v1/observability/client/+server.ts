/**
 * Client-side metrics collection endpoint
 * Integrates with server-side observability infrastructure
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ClientMetricsPayload, TimingMetrics, PerformanceMetrics } from '$lib/types/metrics';

// In-memory metrics store for development (replace with database/Redis in production)
const metricsStore = {
  clientMetrics: [] as ClientMetricsPayload[],
  timingMetrics: [] as TimingMetrics[],
  aggregatedStats: {
    totalRequests: 0,
    averageLoadTime: 0,
    averageRenderTime: 0,
    webVitalsAverages: {
      lcp: 0,
      fid: 0,
      cls: 0,
      fcp: 0
    },
    lastUpdated: Date.now()
  }
};

function updateAggregatedStats() {
  const allMetrics = metricsStore.clientMetrics.flatMap(payload => payload.metrics);
  
  if (allMetrics.length === 0) return;

  // Calculate averages
  const totalLoadTime = allMetrics.reduce((sum, m) => sum + m.loadTime, 0);
  const totalRenderTime = allMetrics.reduce((sum, m) => sum + m.renderTime, 0);
  
  metricsStore.aggregatedStats = {
    totalRequests: allMetrics.length,
    averageLoadTime: totalLoadTime / allMetrics.length,
    averageRenderTime: totalRenderTime / allMetrics.length,
    webVitalsAverages: {
      lcp: calculateWebVitalAverage(allMetrics, 'lcp'),
      fid: calculateWebVitalAverage(allMetrics, 'fid'),
      cls: calculateWebVitalAverage(allMetrics, 'cls'),
      fcp: calculateWebVitalAverage(allMetrics, 'fcp')
    },
    lastUpdated: Date.now()
  };
}

function calculateWebVitalAverage(metrics: any[], vital: string): number {
  const validValues = metrics
    .map(m => m.webVitals?.[vital])
    .filter(v => typeof v === 'number' && !isNaN(v));
  
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
}

function logMetricsForDevelopment(payload: ClientMetricsPayload, requestId: string) {
  console.log(`📊 [${requestId.slice(0, 8)}] Client Metrics Received:`, {
    timestamp: new Date(payload.timestamp).toISOString(),
    metricsCount: payload.metrics.length,
    userAgent: payload.userAgent.slice(0, 50) + '...',
    url: payload.url
  });

  payload.metrics.forEach((metric, index) => {
    console.log(`  📈 [${requestId.slice(0, 8)}] Route ${index + 1}:`, {
      route: metric.routeId || 'unknown',
      path: metric.pathname,
      loadTime: `${Math.round(metric.loadTime)}ms`,
      renderTime: `${Math.round(metric.renderTime)}ms`,
      serverTiming: Object.keys(metric.serverTiming).length > 0 ? metric.serverTiming : 'none',
      webVitals: metric.webVitals ? {
        lcp: metric.webVitals.lcp ? `${Math.round(metric.webVitals.lcp)}ms` : 'N/A',
        fid: metric.webVitals.fid ? `${Math.round(metric.webVitals.fid)}ms` : 'N/A',
        cls: metric.webVitals.cls ? Math.round(metric.webVitals.cls * 1000) / 1000 : 'N/A',
        fcp: metric.webVitals.fcp ? `${Math.round(metric.webVitals.fcp)}ms` : 'N/A'
      } : 'N/A'
    });
  });
}

export const POST: RequestHandler = async ({ request, getClientAddress, locals }) => {
  const requestStart = performance.now();
  const requestId = (locals as any).requestId || crypto.randomUUID();

  try {
    const payload: ClientMetricsPayload = await request.json();
    
    // Validate payload
    if (!payload.metrics || !Array.isArray(payload.metrics)) {
      return json({ 
        error: 'Invalid payload: metrics array required',
        requestId 
      }, { status: 400 });
    }

    // Store metrics (in production, save to PostgreSQL/Redis)
    metricsStore.clientMetrics.push({
      ...payload,
      timestamp: Date.now() // Use server timestamp for consistency
    });

    // Keep only last 1000 entries to prevent memory issues
    if (metricsStore.clientMetrics.length > 1000) {
      metricsStore.clientMetrics = metricsStore.clientMetrics.slice(-1000);
    }

    // Update aggregated statistics
    updateAggregatedStats();

    // Log for development visibility
    if (process.env.NODE_ENV !== 'production') {
      logMetricsForDevelopment(payload, requestId);
    }

    const processingTime = performance.now() - requestStart;

    return json({
      success: true,
      requestId,
      processed: payload.metrics.length,
      processingTime: Math.round(processingTime * 100) / 100,
      timestamp: Date.now()
    }, {
      headers: {
        'X-Request-ID': requestId,
        'Server-Timing': `client-metrics-processing;dur=${processingTime.toFixed(2)}`
      }
    });

  } catch (error) {
    const processingTime = performance.now() - requestStart;
    
    console.error(`❌ [${requestId.slice(0, 8)}] Client metrics processing failed:`, error);
    
    return json({
      error: 'Failed to process client metrics',
      requestId,
      processingTime: Math.round(processingTime * 100) / 100
    }, { 
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'Server-Timing': `client-metrics-processing;dur=${processingTime.toFixed(2)}`
      }
    });
  }
};

export const GET: RequestHandler = async ({ url, locals }) => {
  const requestId = (locals as any).requestId || crypto.randomUUID();
  const action = url.searchParams.get('action') || 'stats';

  try {
    switch (action) {
      case 'stats':
        return json({
          aggregatedStats: metricsStore.aggregatedStats,
          totalStoredMetrics: metricsStore.clientMetrics.length,
          healthScore: calculateHealthScore(),
          requestId
        });

      case 'recent':
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const recentMetrics = metricsStore.clientMetrics
          .slice(-limit)
          .map(payload => ({
            timestamp: payload.timestamp,
            metricsCount: payload.metrics.length,
            averageLoadTime: payload.metrics.reduce((sum, m) => sum + m.loadTime, 0) / payload.metrics.length,
            routes: payload.metrics.map(m => m.routeId || m.pathname)
          }));

        return json({
          recentMetrics,
          requestId
        });

      case 'health':
        const healthScore = calculateHealthScore();
        return json({
          status: healthScore > 80 ? 'excellent' : healthScore > 60 ? 'good' : healthScore > 40 ? 'fair' : 'poor',
          score: healthScore,
          checks: {
            averageLoadTime: metricsStore.aggregatedStats.averageLoadTime < 3000,
            averageRenderTime: metricsStore.aggregatedStats.averageRenderTime < 1000,
            lcpUnder2_5s: (metricsStore.aggregatedStats.webVitalsAverages.lcp || 0) < 2500,
            fidUnder100ms: (metricsStore.aggregatedStats.webVitalsAverages.fid || 0) < 100,
            clsUnder0_1: (metricsStore.aggregatedStats.webVitalsAverages.cls || 0) < 0.1
          },
          aggregatedStats: metricsStore.aggregatedStats,
          requestId
        });

      case 'performance':
        const performanceMetrics: PerformanceMetrics = {
          overall: {
            status: calculateHealthScore() > 80 ? 'excellent' : 
                   calculateHealthScore() > 60 ? 'good' : 
                   calculateHealthScore() > 40 ? 'fair' : 'poor',
            score: calculateHealthScore(),
            timestamp: new Date().toISOString()
          },
          frontend: {
            averageLoadTime: metricsStore.aggregatedStats.averageLoadTime,
            averageRenderTime: metricsStore.aggregatedStats.averageRenderTime,
            totalRequests: metricsStore.aggregatedStats.totalRequests,
            webVitalsAverages: metricsStore.aggregatedStats.webVitalsAverages
          },
          backend: {
            averageResponseTime: 0, // Would be populated from server metrics
            requestsPerSecond: 0,   // Would be calculated from time windows
            errorRate: 0,           // Would be tracked from error logs
            uptime: process.uptime() * 1000 // Convert to ms
          },
          cognitive: {
            routingEfficiency: 85,    // Would come from cognitive modules
            cacheHitRatio: 92,       // Would come from cache metrics
            gpuUtilization: 45,      // Would come from GPU monitoring
            consciousnessLevel: 12,   // Emergent behavior metric
            quantumCoherence: 50,     // Quantum state coherence
            timestamp: new Date().toISOString()
          }
        };

        return json({
          performance: performanceMetrics,
          requestId
        });

      case 'clear':
        // Clear metrics (development only)
        if (process.env.NODE_ENV !== 'production') {
          const clearedCount = metricsStore.clientMetrics.length;
          metricsStore.clientMetrics = [];
          metricsStore.timingMetrics = [];
          updateAggregatedStats();
          
          console.log(`🧹 [${requestId.slice(0, 8)}] Cleared ${clearedCount} client metrics`);
          
          return json({
            success: true,
            message: `Cleared ${clearedCount} metrics`,
            requestId
          });
        }
        return json({ error: 'Clear action not available in production', requestId }, { status: 403 });

      default:
        return json({ error: 'Invalid action', availableActions: ['stats', 'recent', 'health', 'performance', 'clear'], requestId }, { status: 400 });
    }
  } catch (error) {
    console.error(`❌ [${requestId.slice(0, 8)}] Client metrics GET failed:`, error);
    return json({
      error: 'Internal server error',
      requestId
    }, { status: 500 });
  }
};

function calculateHealthScore(): number {
  const stats = metricsStore.aggregatedStats;
  
  if (stats.totalRequests === 0) return 100; // No data yet, assume healthy
  
  let score = 100;
  
  // Load time scoring (0-30 points)
  if (stats.averageLoadTime > 5000) score -= 30;
  else if (stats.averageLoadTime > 3000) score -= 20;
  else if (stats.averageLoadTime > 2000) score -= 10;
  else if (stats.averageLoadTime > 1000) score -= 5;
  
  // Render time scoring (0-20 points)
  if (stats.averageRenderTime > 2000) score -= 20;
  else if (stats.averageRenderTime > 1000) score -= 10;
  else if (stats.averageRenderTime > 500) score -= 5;
  
  // Web Vitals scoring (0-50 points total)
  const { lcp, fid, cls, fcp } = stats.webVitalsAverages;
  
  // LCP (0-15 points)
  if (lcp > 4000) score -= 15;
  else if (lcp > 2500) score -= 10;
  else if (lcp > 1500) score -= 5;
  
  // FID (0-15 points)  
  if (fid > 300) score -= 15;
  else if (fid > 100) score -= 10;
  else if (fid > 50) score -= 5;
  
  // CLS (0-10 points)
  if (cls > 0.25) score -= 10;
  else if (cls > 0.1) score -= 5;
  
  // FCP (0-10 points)
  if (fcp > 3000) score -= 10;
  else if (fcp > 1800) score -= 5;
  
  return Math.max(0, Math.min(100, score));
}

// Cleanup old metrics periodically (only in server environment)
if (typeof setInterval !== 'undefined' && typeof process !== 'undefined') {
  const cleanupInterval = setInterval(() => {
    if (metricsStore.clientMetrics.length > 500) {
      const removed = metricsStore.clientMetrics.length - 500;
      metricsStore.clientMetrics = metricsStore.clientMetrics.slice(-500);
      updateAggregatedStats();
      console.log(`🧹 Auto-cleaned ${removed} old client metrics`);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  // Cleanup on process exit
  process.on('exit', () => {
    clearInterval(cleanupInterval);
  });
}