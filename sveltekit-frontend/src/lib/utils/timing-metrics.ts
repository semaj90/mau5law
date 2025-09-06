/**
 * Client-side timing utility for UX metrics extraction
 * Complements server-side Server-Timing headers for full observability
 */

export interface TimingMetrics {
  // Navigation timing
  pageLoad: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;

  // Server timing (from Server-Timing headers)
  serverTiming: Record<string, number>;

  // Custom timing marks
  customMarks: Record<string, number>;
  
  // Request metadata
  requestId?: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface PerformanceEntry {
  name: string;
  duration: number;
  startTime: number;
  entryType: string;
}

class TimingMetricsCollector {
  private customMarks: Record<string, number> = {};
  private observers: PerformanceObserver[] = [];

  /**
   * Initialize performance monitoring with Web Vitals
   */
  initialize(): void {
    if (typeof window === 'undefined') return;

    // Observe Core Web Vitals
    this.observeWebVitals();
    
    // Mark initialization
    this.mark('timing-collector-init');
  }

  /**
   * Extract Server-Timing headers from response
   */
  extractServerTiming(response: Response): Record<string, number> {
    const serverTiming: Record<string, number> = {};
    
    const timingHeader = response.headers.get('Server-Timing');
    if (!timingHeader) return serverTiming;

    // Parse Server-Timing header format: "name;dur=123, name2;dur=456"
    const timings = timingHeader.split(',').map(t => t.trim());
    
    for (const timing of timings) {
      const parts = timing.split(';');
      const name = parts[0]?.trim();
      const durPart = parts.find(p => p.startsWith('dur='));
      
      if (name && durPart) {
        const duration = parseFloat(durPart.replace('dur=', ''));
        if (!isNaN(duration)) {
          serverTiming[name] = duration;
        }
      }
    }

    return serverTiming;
  }

  /**
   * Extract request ID from response headers
   */
  extractRequestId(response: Response): string | undefined {
    return response.headers.get('X-Request-ID') || 
           response.headers.get('Request-ID') ||
           response.headers.get('x-request-id');
  }

  /**
   * Get comprehensive timing metrics
   */
  getMetrics(): TimingMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const firstContentfulPaint = paint.find(p => p.name === 'first-contentful-paint')?.startTime;
    const largestContentfulPaint = this.getLCP();
    const firstInputDelay = this.getFID();
    const cumulativeLayoutShift = this.getCLS();

    return {
      // Navigation timing
      pageLoad: navigation ? navigation.loadEventEnd - navigation.navigationStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.navigationStart : 0,
      firstContentfulPaint,
      largestContentfulPaint,
      firstInputDelay,
      cumulativeLayoutShift,

      // Server timing (populated during fetch)
      serverTiming: {},

      // Custom marks
      customMarks: { ...this.customMarks },

      // Metadata
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  /**
   * Create a performance mark
   */
  mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
      this.customMarks[name] = performance.now();
    }
  }

  /**
   * Measure duration between marks
   */
  measure(name: string, startMark: string, endMark?: string): number {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        return measure ? measure.duration : 0;
      } catch (error) {
        console.warn('Performance measure failed:', error);
        return 0;
      }
    }
    return 0;
  }

  /**
   * Enhanced fetch wrapper with timing extraction
   */
  async instrumentedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const startTime = performance.now();
    const requestId = crypto.randomUUID();
    
    // Add request ID to headers
    const headers = new Headers(init?.headers);
    headers.set('X-Client-Request-ID', requestId);
    
    try {
      const response = await fetch(input, {
        ...init,
        headers
      });
      
      const endTime = performance.now();
      const clientDuration = endTime - startTime;
      
      // Extract server timing
      const serverTiming = this.extractServerTiming(response);
      const serverRequestId = this.extractRequestId(response);
      
      // Log metrics for observability
      this.logRequestMetrics({
        url: typeof input === 'string' ? input : input.toString(),
        method: init?.method || 'GET',
        clientDuration,
        serverTiming,
        requestId: serverRequestId || requestId,
        status: response.status,
        timestamp: Date.now()
      });
      
      return response;
      
    } catch (error) {
      const endTime = performance.now();
      const clientDuration = endTime - startTime;
      
      // Log failed request
      this.logRequestMetrics({
        url: typeof input === 'string' ? input : input.toString(),
        method: init?.method || 'GET',
        clientDuration,
        serverTiming: {},
        requestId,
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * Send metrics to analytics endpoint
   */
  async sendMetrics(endpoint: string = '/api/v1/metrics/timing'): Promise<void> {
    const metrics = this.getMetrics();
    
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics)
      });
    } catch (error) {
      console.warn('Failed to send timing metrics:', error);
    }
  }

  /**
   * Observe Web Vitals using PerformanceObserver
   */
  private observeWebVitals(): void {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.customMarks['largest-contentful-paint'] = lastEntry.startTime;
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer failed:', e);
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.processingStart && entry.startTime) {
              this.customMarks['first-input-delay'] = entry.processingStart - entry.startTime;
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer failed:', e);
      }

      // Cumulative Layout Shift
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.customMarks['cumulative-layout-shift'] = clsValue;
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer failed:', e);
      }
    }
  }

  private getLCP(): number | undefined {
    return this.customMarks['largest-contentful-paint'];
  }

  private getFID(): number | undefined {
    return this.customMarks['first-input-delay'];
  }

  private getCLS(): number | undefined {
    return this.customMarks['cumulative-layout-shift'];
  }

  private logRequestMetrics(metrics: {
    url: string;
    method: string;
    clientDuration: number;
    serverTiming: Record<string, number>;
    requestId: string;
    status: number;
    error?: string;
    timestamp: number;
  }): void {
    // Console logging for development
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('🔄 Request Metrics:', {
        url: metrics.url,
        method: metrics.method,
        clientMs: Math.round(metrics.clientDuration * 100) / 100,
        serverTiming: metrics.serverTiming,
        requestId: metrics.requestId.slice(0, 8),
        status: metrics.status
      });
    }

    // Store in session for debugging
    try {
      const stored = sessionStorage.getItem('timing-metrics') || '[]';
      const history = JSON.parse(stored);
      history.push(metrics);
      
      // Keep only last 50 requests
      const trimmed = history.slice(-50);
      sessionStorage.setItem('timing-metrics', JSON.stringify(trimmed));
    } catch (e) {
      // Silent fail for storage issues
    }
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (e) {
        console.warn('Failed to disconnect observer:', e);
      }
    });
    this.observers = [];
    this.customMarks = {};
  }
}

// Singleton instance
export const timingMetrics = new TimingMetricsCollector();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  timingMetrics.initialize();
}

// Convenience exports
export const { 
  mark, 
  measure, 
  getMetrics, 
  instrumentedFetch,
  extractServerTiming,
  extractRequestId,
  sendMetrics 
} = timingMetrics;

// SvelteKit integration helper
export function createTimedFetch(baseFetch = fetch) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    return timingMetrics.instrumentedFetch(input, init);
  };
}