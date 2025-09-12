/**
 * Production-Grade Telemetry Event Bus
 * Lightweight, high-performance event collection and analytics
 * Integrates with Nintendo memory architecture for optimal performance
 */

import { ENV_CONFIG } from '$lib/config/env.js';

export type TelemetryEvent = 
  | Telemetry.GPUEvent 
  | Telemetry.PerformanceEvent 
  | Telemetry.ErrorEvent;

interface TelemetryOptions {
  maxBufferSize: number;
  flushInterval: number; // milliseconds
  enableDebug: boolean;
  endpoint?: string;
}

interface TelemetryMetrics {
  eventsCollected: number;
  eventsFlushed: number;
  bufferSize: number;
  avgFlushTime: number;
  lastFlushTimestamp: number;
}

export class TelemetryEventBus {
  private static instance: TelemetryEventBus;
  private eventBuffer: TelemetryEvent[] = [];
  private sessionId: string;
  private flushTimer: number | null = null;
  private metrics: TelemetryMetrics;
  
  private readonly options: TelemetryOptions = {
    maxBufferSize: 100,
    flushInterval: 30000, // 30 seconds
    enableDebug: ENV_CONFIG.GPU_DEBUG,
    endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT
  };

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.metrics = {
      eventsCollected: 0,
      eventsFlushed: 0,
      bufferSize: 0,
      avgFlushTime: 0,
      lastFlushTimestamp: 0
    };

    this.startAutoFlush();
    
    // Browser integration
    if (typeof window !== 'undefined') {
      window.__TELEMETRY__ = this;
    }

    if (this.options.enableDebug) {
      console.log('[Telemetry] Event bus initialized', {
        sessionId: this.sessionId,
        options: this.options
      });
    }
  }

  static getInstance(): TelemetryEventBus {
    if (!TelemetryEventBus.instance) {
      TelemetryEventBus.instance = new TelemetryEventBus();
    }
    return TelemetryEventBus.instance;
  }

  /**
   * Emit GPU performance event
   */
  emitGPUEvent(data: Omit<Telemetry.GPUEvent, 'timestamp' | 'sessionId'>): void {
    const event: Telemetry.GPUEvent = {
      ...data,
      timestamp: performance.now(),
      sessionId: this.sessionId
    };
    
    this.addEvent(event);
  }

  /**
   * Emit performance timing event
   */
  emitPerformanceEvent(data: Omit<Telemetry.PerformanceEvent, 'timestamp' | 'sessionId'>): void {
    const event: Telemetry.PerformanceEvent = {
      ...data,
      timestamp: performance.now(),
      sessionId: this.sessionId
    };
    
    this.addEvent(event);
  }

  /**
   * Emit error event
   */
  emitError(data: Omit<Telemetry.ErrorEvent, 'timestamp' | 'sessionId'>): void {
    const event: Telemetry.ErrorEvent = {
      ...data,
      timestamp: performance.now(),
      sessionId: this.sessionId
    };
    
    this.addEvent(event);
    
    // Immediate flush for errors
    if (data.type === 'critical') {
      this.flush();
    }
  }

  /**
   * Performance measurement utility
   */
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    component: string = 'unknown'
  ): Promise<T> {
    const start = performance.now();
    let success = false;
    let error: Error | undefined;

    try {
      const result = await fn();
      success = true;
      return result;
    } catch (err) {
      error = err as Error;
      this.emitError({
        type: 'error',
        message: error.message,
        stack: error.stack,
        component
      });
      throw err;
    } finally {
      const duration = performance.now() - start;
      
      this.emitPerformanceEvent({
        type: 'api_latency',
        duration,
        operation,
        success
      });
    }
  }

  /**
   * Nintendo Memory Bank telemetry
   */
  emitMemoryBankUsage(bank: Nintendo.MemoryBank): void {
    const utilizationPercent = (bank.used / bank.size) * 100;
    
    this.emitPerformanceEvent({
      type: 'cache_hit',
      duration: 0,
      operation: `${bank.type}_usage`,
      success: utilizationPercent < 90 // Flag high memory usage
    });

    if (this.options.enableDebug) {
      console.log(`[Telemetry] ${bank.type} utilization: ${utilizationPercent.toFixed(1)}%`);
    }
  }

  /**
   * Vector encoding performance tracking
   */
  emitVectorEncodingMetrics(
    dimensions: number,
    encodingTime: number,
    compressionRatio: number,
    success: boolean
  ): void {
    this.emitPerformanceEvent({
      type: 'vector_encoding',
      duration: encodingTime,
      operation: `vector_encode_${dimensions}d`,
      success
    });

    if (this.options.enableDebug) {
      console.log('[Telemetry] Vector encoding', {
        dimensions,
        encodingTime: `${encodingTime.toFixed(2)}ms`,
        compressionRatio: `${(compressionRatio * 100).toFixed(1)}%`,
        success
      });
    }
  }

  /**
   * Get current telemetry metrics
   */
  getMetrics(): TelemetryMetrics & { bufferUtilization: number } {
    return {
      ...this.metrics,
      bufferUtilization: (this.eventBuffer.length / this.options.maxBufferSize) * 100
    };
  }

  /**
   * Export telemetry data for analysis
   */
  async exportData(): Promise<Blob> {
    const exportData = {
      sessionId: this.sessionId,
      exportTimestamp: Date.now(),
      metrics: this.getMetrics(),
      events: [...this.eventBuffer],
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        viewport: typeof window !== 'undefined' 
          ? { width: window.innerWidth, height: window.innerHeight }
          : null,
        gpu: typeof window !== 'undefined' && window.__GPU_MANAGER__ 
          ? await this.getGPUInfo()
          : null
      }
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  }

  /**
   * Force flush events
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const flushStart = performance.now();
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    
    try {
      if (this.options.endpoint) {
        await this.sendToEndpoint(events);
      }
      
      this.metrics.eventsFlushed += events.length;
      this.metrics.bufferSize = this.eventBuffer.length;
      
    } catch (error) {
      // Re-add events on failure (with buffer limit)
      const remainingSpace = this.options.maxBufferSize - this.eventBuffer.length;
      if (remainingSpace > 0) {
        this.eventBuffer.unshift(...events.slice(-remainingSpace));
      }
      
      if (this.options.enableDebug) {
        console.error('[Telemetry] Flush failed:', error);
      }
    }
    
    const flushTime = performance.now() - flushStart;
    this.metrics.avgFlushTime = (this.metrics.avgFlushTime + flushTime) / 2;
    this.metrics.lastFlushTimestamp = Date.now();
  }

  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush
    this.flush();
    
    if (typeof window !== 'undefined') {
      delete window.__TELEMETRY__;
    }
  }

  // Private methods

  private addEvent(event: TelemetryEvent): void {
    this.eventBuffer.push(event);
    this.metrics.eventsCollected++;
    this.metrics.bufferSize = this.eventBuffer.length;
    
    // Auto-flush if buffer is full
    if (this.eventBuffer.length >= this.options.maxBufferSize) {
      this.flush();
    }
  }

  private startAutoFlush(): void {
    if (typeof window !== 'undefined') {
      this.flushTimer = window.setInterval(() => {
        this.flush();
      }, this.options.flushInterval);
    }
  }

  private async sendToEndpoint(events: TelemetryEvent[]): Promise<void> {
    if (!this.options.endpoint) return;
    
    const payload = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      events
    };

    const response = await fetch(this.options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Telemetry endpoint returned ${response.status}`);
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getGPUInfo(): Promise<any> {
    try {
      if (window.__GPU_MANAGER__) {
        return {
          acceleration: window.__GPU_MANAGER__.getAcceleration(),
          contextType: 'detected'
        };
      }
    } catch {
      return null;
    }
    return null;
  }
}

// Export singleton instance
export const telemetryBus = TelemetryEventBus.getInstance();

// Convenience functions
export const trackGPU = (data: Omit<Telemetry.GPUEvent, 'timestamp' | 'sessionId'>) => 
  telemetryBus.emitGPUEvent(data);

export const trackPerformance = (data: Omit<Telemetry.PerformanceEvent, 'timestamp' | 'sessionId'>) => 
  telemetryBus.emitPerformanceEvent(data);

export const trackError = (data: Omit<Telemetry.ErrorEvent, 'timestamp' | 'sessionId'>) => 
  telemetryBus.emitError(data);

export const measureAsync = <T>(
  operation: string, 
  fn: () => Promise<T>, 
  component?: string
) => telemetryBus.measurePerformance(operation, fn, component);