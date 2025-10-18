import Redis from 'ioredis';
import { formatErrorResponse } from './errors';

let _redis: Redis | null = null;
try {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  _redis = new Redis({ host, port });
} catch (e) {
  // ignore redis init failures; logger will fallback to console
  _redis = null;
}

export async function logStructuredError(payload: {
  source: string;
  level: 'error' | 'warn' | 'info';
  event: string;
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
}) {
  const record = {
    timestamp: new Date().toISOString(),
    ...payload,
    error:
      payload.error instanceof Error
        ? { message: payload.error.message, stack: (payload.error as Error).stack }
        : payload.error,
  };

  try {
    if (_redis) {
      // ioredis typings sometimes don't include list helpers in this workspace; cast to any
      const r = _redis as any;
      await r.lpush('structured_errors', JSON.stringify(record));
      // cap list
      await r.ltrim('structured_errors', 0, 999);
      // attempt Sentry capture for errors (optional). Import the adapter lazily; it is non-blocking.
      try {
        const sentryAdapter = await import('./log-adapters/sentry');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const captureException = (sentryAdapter as any).captureException;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isEnabled = (sentryAdapter as any).isEnabled;
        if (isEnabled) {
          // record an info log that Sentry is active (only once ideally; lightweight here)
          // eslint-disable-next-line no-console
          console.info('[logger] Sentry adapter is active');
        }
        if (payload.level === 'error' && typeof captureException === 'function') {
          captureException(payload.error ?? payload.message, {
            source: payload.source,
            event: payload.event,
            context: payload.context,
          });
        }
      } catch (sentryErr) {
        // ignore sentry failures - optional integration
      }
      return;
    }
  } catch (e) {
    console.warn('[logger] Redis logging failed, falling back to console', e);
  }

  // Fallback to console
  if (payload.level === 'error') console.error('[logger]', record);
  else if (payload.level === 'warn') console.warn('[logger]', record);
  else console.info('[logger]', record);
}

export async function captureAndFormat(error: unknown) {
  // If error is structured, return as-is; else wrap
  try {
    return formatErrorResponse(error);
  } catch (e) {
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        status: 500,
      },
    };
  }
}
// Simple in-memory metric counters (can be replaced by Prometheus client later)
const counters: Record<string, number> = {};
export function incrementMetric(name: string, value = 1) {
  counters[name] = (counters[name] || 0) + value;
}
export function getMetricsSnapshot() {
  return { ...counters };
}
/**
 * Server-side logger utility
 */
export class Logger {
  private static instance: Logger;
  private constructor() {}
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  info(message: string, meta?: unknown) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  }
  error(message: string, error?: unknown) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  }
  warn(message: string, meta?: unknown) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  }
  debug(message: string, meta?: unknown) {
    if (import.meta.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  }
}
export const logger = Logger.getInstance();
export default logger;
