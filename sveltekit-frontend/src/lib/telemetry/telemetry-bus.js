/**
 * Telemetry Bus - Event System for GPU Processing Telemetry
 */

export interface TelemetryEvent {
  type: string;
  timestamp: number;
  data: any;
  source?: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
}

export interface TelemetrySubscriber {
  (event: TelemetryEvent): void;
}

class TelemetryBus {
  private subscribers: Map<string, Set<TelemetrySubscriber>> = new Map();
  private globalSubscribers: Set<TelemetrySubscriber> = new Set();

  /**
   * Subscribe to specific event types
   */
  subscribe(eventType: string, callback: TelemetrySubscriber): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);

    return () => {
      const typeSubscribers = this.subscribers.get(eventType);
      if (typeSubscribers) {
        typeSubscribers.delete(callback);
        if (typeSubscribers.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(callback: TelemetrySubscriber): () => void {
    this.globalSubscribers.add(callback);
    return () => {
      this.globalSubscribers.delete(callback);
    };
  }

  /**
   * Emit an event
   */
  emit(type: string, data: any, source?: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info'): void {
    const event: TelemetryEvent = {
      type,
      timestamp: Date.now(),
      data,
      source,
      level
    };

    // Notify type-specific subscribers
    const typeSubscribers = this.subscribers.get(type);
    if (typeSubscribers) {
      typeSubscribers.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Telemetry subscriber error:', error);
        }
      });
    }

    // Notify global subscribers
    this.globalSubscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Telemetry global subscriber error:', error);
      }
    });
  }

  /**
   * Clear all subscribers
   */
  clear(): void {
    this.subscribers.clear();
    this.globalSubscribers.clear();
  }

  /**
   * Get current subscriber counts
   */
  getStats(): { typeSubscribers: number; globalSubscribers: number; eventTypes: string[] } {
    return {
      typeSubscribers: Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0),
      globalSubscribers: this.globalSubscribers.size,
      eventTypes: Array.from(this.subscribers.keys())
    };
  }
}

// Create singleton instance
export const telemetryBus = new TelemetryBus();

// Export convenience functions
export function emitGpuEvent(type: string, data: any): void {
  telemetryBus.emit(type, data, 'gpu');
}

export function emitPerformanceEvent(type: string, data: any): void {
  telemetryBus.emit(type, data, 'performance', 'info');
}

export function emitErrorEvent(type: string, error: any): void {
  telemetryBus.emit(type, error, 'error', 'error');
}

export default telemetryBus;