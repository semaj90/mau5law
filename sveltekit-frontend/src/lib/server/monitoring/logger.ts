import { dev } from "$app/environment";

/**
 * Advanced Logging & Performance Monitoring System
 * For Legal Case Management Application
 */


export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug" | "perf";
  message: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, any>;
  duration?: number;
  endpoint?: string;
  userAgent?: string;
  ip?: string;
}
export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: string;
  status: number;
  userId?: string;
  queryCount?: number;
  memoryUsage?: number;
}
class AppLogger {
  private logs: LogEntry[] = [];
  private metrics: PerformanceMetrics[] = [];
  private maxLogs = 10000;
  private maxMetrics = 5000;

  /**
   * Log application events with context
   */
  log(level: LogEntry["level"], message: string, metadata?: Partial<LogEntry>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    this.logs.push(entry);

    // Keep logs within limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs / 2);
    }
    // Console output in development
    if (dev) {
      console.log(
        `[${entry.level.toUpperCase()}] ${entry.timestamp}: ${message}`,
        metadata,
      );
    }
    // In production, you'd send to external logging service
    this.persistLog(entry);
  }
  /**
   * Log performance metrics
   */
  logPerformance(metrics: PerformanceMetrics) {
    this.metrics.push(metrics);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
    // Alert on slow requests
    if (metrics.duration > 5000) {
      this.log("warn", `Slow request detected: ${metrics.endpoint}`, {
        duration: metrics.duration,
        endpoint: metrics.endpoint,
      });
    }
  }
  /**
   * Get recent logs for admin dashboard
   */
  getRecentLogs(limit = 100): LogEntry[] {
    return this.logs.slice(-limit).reverse();
  }
  /**
   * Get performance analytics
   */
  getPerformanceAnalytics() {
    const recent = this.metrics.slice(-1000);

    return {
      totalRequests: recent.length,
      averageResponseTime:
        recent.reduce((sum, m) => sum + m.duration, 0) / recent.length,
      slowestEndpoints: this.getSlowEndpoints(recent),
      errorRate: recent.filter((m) => m.status >= 400).length / recent.length,
      peakHours: this.getPeakHours(recent),
    };
  }
  private getSlowEndpoints(metrics: PerformanceMetrics[]) {
    const endpointTimes = metrics.reduce(
      (acc, m) => {
        if (!acc[m.endpoint]) acc[m.endpoint] = [];
        acc[m.endpoint].push(m.duration);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    return Object.entries(endpointTimes)
      .map(([endpoint, times]) => ({
        endpoint,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        requests: times.length,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
  }
  private getPeakHours(metrics: PerformanceMetrics[]) {
    const hourCounts = metrics.reduce(
      (acc, m) => {
        const hour = new Date(m.timestamp).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), requests: count }))
      .sort((a, b) => b.requests - a.requests);
  }
  private async persistLog(entry: LogEntry) {
    // In production, implement database logging or external service
    // For now, we'll store critical logs in the database
    if (entry.level === "error" || entry.action) {
      try {
        // You could implement database storage here
        // await db.insert(auditLogs).values({...});
      } catch (error: any) {
        console.error("Failed to persist log:", error);
      }
    }
  }
  /**
   * Middleware for request logging
   */
  middleware() {
    return async (request: Request, next: () => Promise<Response>) => {
      const start = Date.now();
      const endpoint = new URL(request.url).pathname;
      const method = request.method;

      try {
        const response = await next();
        const duration = Date.now() - start;

        this.logPerformance({
          endpoint,
          method,
          duration,
          timestamp: new Date().toISOString(),
          status: response.status,
        });

        return response;
      } catch (error: any) {
        const duration = Date.now() - start;

        this.log("error", `Request failed: ${method} ${endpoint}`, {
          endpoint,
          duration,
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        });

        throw error;
      }
    };
  }
}
// Export singleton instance
export const logger = new AppLogger();

// Convenience methods
export const logInfo = (message: string, metadata?: unknown) =>
  logger.log("info", message, metadata);
export const logWarn = (message: string, metadata?: unknown) =>
  logger.log("warn", message, metadata);
export const logError = (message: string, metadata?: unknown) =>
  logger.log("error", message, metadata);
export const logDebug = (message: string, metadata?: unknown) =>
  logger.log("debug", message, metadata);

// User action logging for audit trail
export const logUserAction = (
  action: string,
  userId: string,
  metadata?: unknown,
) => {
  logger.log("info", `User action: ${action}`, {
    action,
    userId,
    metadata,
  });
};
