/**
 * Client-side observability integration
 * Connects timing metrics with SvelteKit architecture and server-side observability
 */

import { timingMetrics, createTimedFetch, type TimingMetrics } from './timing-metrics.js';
import { browser } from '$app/environment';
import { page } from '$app/stores';
import { get } from 'svelte/store';

export interface ObservabilityConfig {
  enableMetrics: boolean;
  enablePerformanceTracking: boolean;
  enableWebVitals: boolean;
  metricsEndpoint: string;
  batchSize: number;
  flushInterval: number;
  debugMode: boolean;
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

class ObservabilityClient {
  private config: ObservabilityConfig = {
    enableMetrics: true,
    enablePerformanceTracking: true,
    enableWebVitals: true,
    metricsEndpoint: '/api/v1/metrics/client',
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
    debugMode: false
  };

  private metricsBuffer: RouteMetrics[] = [];
  private flushTimer?: number;
  private initialized = false;
  private currentRoute?: string;

  /**
   * Initialize observability client with configuration
   */
  initialize(config?: Partial<ObservabilityConfig>): void {
    if (!browser || this.initialized) return;

    this.config = { ...this.config, ...config };
    
    if (this.config.debugMode) {
      console.log('🔍 Observability client initializing with config:', this.config);
    }

    // Initialize timing metrics
    timingMetrics.initialize();

    // Set up periodic metrics flushing
    if (this.config.flushInterval > 0) {
      this.flushTimer = window.setInterval(() => {
        this.flushMetrics();
      }, this.config.flushInterval);
    }

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flushMetrics(); // Flush when page becomes hidden
      }
    });

    // Track before unload
    window.addEventListener('beforeunload', () => {
      this.flushMetrics();
    });

    this.initialized = true;
    
    if (this.config.debugMode) {
      console.log('✅ Observability client initialized');
    }
  }

  /**
   * Track route navigation with comprehensive metrics
   */
  trackRouteNavigation(routeId: string, pathname: string): void {
    if (!browser || !this.config.enableMetrics) return;

    const startTime = performance.now();
    this.currentRoute = routeId;
    
    timingMetrics.mark(`route-start-${routeId}`);
    
    // Schedule metrics collection after route is fully loaded
    requestIdleCallback(() => {
      this.collectRouteMetrics(routeId, pathname, startTime);
    });
  }

  /**
   * Track component mount performance
   */
  trackComponentMount(componentName: string): () => void {
    if (!browser || !this.config.enablePerformanceTracking) return () => {};

    const startTime = performance.now();
    timingMetrics.mark(`component-mount-start-${componentName}`);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      timingMetrics.mark(`component-mount-end-${componentName}`);
      timingMetrics.measure(
        `component-mount-${componentName}`,
        `component-mount-start-${componentName}`,
        `component-mount-end-${componentName}`
      );

      if (this.config.debugMode) {
        console.log(`⚡ Component mount: ${componentName} = ${Math.round(duration * 100) / 100}ms`);
      }
    };
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string, method: string = 'GET'): {
    start: () => void;
    end: (response?: Response) => void;
  } {
    let startTime: number;
    let requestId: string;

    return {
      start: () => {
        startTime = performance.now();
        requestId = crypto.randomUUID();
        timingMetrics.mark(`api-call-start-${endpoint}`);
        
        if (this.config.debugMode) {
          console.log(`🚀 API call started: ${method} ${endpoint} (${requestId.slice(0, 8)})`);
        }
      },
      
      end: (response?: Response) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        timingMetrics.mark(`api-call-end-${endpoint}`);
        
        const serverTiming = response ? timingMetrics.extractServerTiming(response) : {};
        const serverRequestId = response ? timingMetrics.extractRequestId(response) : undefined;
        
        if (this.config.debugMode) {
          console.log(`✅ API call completed: ${method} ${endpoint}`, {
            clientDuration: `${Math.round(duration * 100) / 100}ms`,
            serverTiming,
            requestId: (serverRequestId || requestId).slice(0, 8),
            status: response?.status
          });
        }
      }
    };
  }

  /**
   * Create enhanced fetch with observability
   */
  createObservableFetch(): typeof fetch {
    if (!browser) return fetch;
    
    return createTimedFetch(fetch);
  }

  /**
   * Get current performance snapshot
   */
  getPerformanceSnapshot(): {
    timing: TimingMetrics;
    route: string | undefined;
    memory?: any;
    connection?: any;
  } {
    const snapshot = {
      timing: timingMetrics.getMetrics(),
      route: this.currentRoute,
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : undefined,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : undefined
    };

    return snapshot;
  }

  /**
   * Manually flush metrics to server
   */
  async flushMetrics(): Promise<void> {
    if (!browser || this.metricsBuffer.length === 0) return;

    const metricsToSend = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      const response = await fetch(this.config.metricsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: metricsToSend,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });

      if (this.config.debugMode) {
        console.log(`📊 Metrics flushed: ${metricsToSend.length} entries`, response.status);
      }
    } catch (error) {
      if (this.config.debugMode) {
        console.warn('⚠️ Failed to flush metrics:', error);
      }
      // Re-add failed metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToSend);
    }
  }

  /**
   * Collect comprehensive route metrics
   */
  private collectRouteMetrics(routeId: string, pathname: string, startTime: number): void {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    timingMetrics.mark(`route-end-${routeId}`);
    
    const renderTime = timingMetrics.measure(
      `route-render-${routeId}`,
      `route-start-${routeId}`,
      `route-end-${routeId}`
    );

    // Get Web Vitals if available
    const webVitals = this.config.enableWebVitals ? {
      lcp: timingMetrics.getMetrics().largestContentfulPaint,
      fid: timingMetrics.getMetrics().firstInputDelay,
      cls: timingMetrics.getMetrics().cumulativeLayoutShift,
      fcp: timingMetrics.getMetrics().firstContentfulPaint
    } : undefined;

    const routeMetrics: RouteMetrics = {
      routeId,
      pathname,
      loadTime,
      renderTime,
      serverTiming: {}, // Will be populated by Server-Timing headers during SSR
      webVitals,
      timestamp: Date.now()
    };

    // Add to buffer
    this.metricsBuffer.push(routeMetrics);

    // Auto-flush if buffer is full
    if (this.metricsBuffer.length >= this.config.batchSize) {
      this.flushMetrics();
    }

    if (this.config.debugMode) {
      console.log('📈 Route metrics collected:', routeMetrics);
    }
  }

  /**
   * Cleanup and destroy observability client
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    this.flushMetrics(); // Final flush
    timingMetrics.destroy();
    this.initialized = false;
    
    if (this.config.debugMode) {
      console.log('🔍 Observability client destroyed');
    }
  }
}

// Singleton instance
export const observabilityClient = new ObservabilityClient();

// Auto-initialize in browser with default config
if (browser) {
  // Check for debug mode from URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = urlParams.has('debug-observability') || 
                   localStorage.getItem('observability-debug') === 'true';

  observabilityClient.initialize({ 
    debugMode,
    enableMetrics: true,
    enablePerformanceTracking: true,
    enableWebVitals: true
  });
}

// SvelteKit integration helpers
export function trackPageLoad(routeId: string) {
  if (browser) {
    observabilityClient.trackRouteNavigation(routeId, window.location.pathname);
  }
}

export function trackComponent(componentName: string) {
  if (browser) {
    return observabilityClient.trackComponentMount(componentName);
  }
  return () => {};
}

export function trackAPI(endpoint: string, method?: string) {
  if (browser) {
    return observabilityClient.trackAPICall(endpoint, method);
  }
  return {
    start: () => {},
    end: () => {}
  };
}

// Export for advanced usage
export { observabilityClient };