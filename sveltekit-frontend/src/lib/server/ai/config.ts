// lib/server/ai/config.ts
// Configuration and utility functions for the RAG pipeline

import { z } from "zod";
import crypto from "crypto";
import type { RAGConfiguration } from './types.js';
import { logger } from './logger.js';
import { URL } from "url";

// === ENVIRONMENT VALIDATION ===

const EnvSchema = z.object({
  // Ollama Configuration
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text:latest'),
  OLLAMA_LLM_MODEL: z.string().default('gemma3-legal:latest'),

  // Database Configuration
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.string().regex(/^\d+$/).transform(Number).default('5432'),
  DATABASE_NAME: z.string().default('legal_ai_db'),
  DATABASE_USER: z.string().default('legal_admin'),
  DATABASE_PASSWORD: z.string().default('123456'),
  DATABASE_MAX_CONNECTIONS: z.string().regex(/^\d+$/).transform(Number).default('20'),
  DATABASE_IDLE_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('20'),
  DATABASE_SSL: z.string().transform(s => s === 'true').default('false'),

  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number).default('6379'),
  REDIS_DB: z.string().regex(/^\d+$/).transform(Number).default('0'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_MAX_RETRIES: z.string().regex(/^\d+$/).transform(Number).default('3'),

  // RAG Configuration
  RAG_CHUNK_SIZE: z.string().regex(/^\d+$/).transform(Number).default('1500'),
  RAG_CHUNK_OVERLAP: z.string().regex(/^\d+$/).transform(Number).default('300'),
  RAG_MAX_SOURCES: z.string().regex(/^\d+$/).transform(Number).default('10'),
  RAG_SIMILARITY_THRESHOLD: z.string().regex(/^0?\.\d+$/).transform(Number).default('0.5'),
  RAG_CACHE_TTL: z.string().regex(/^\d+$/).transform(Number).default('86400'),
  RAG_MAX_RETRIES: z.string().regex(/^\d+$/).transform(Number).default('3'),
  RAG_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).default('30000'),

  // Security & Rate Limiting
  RAG_RATE_LIMIT_PER_MINUTE: z.string().regex(/^\d+$/).transform(Number).default('60'),
  RAG_MAX_QUERY_LENGTH: z.string().regex(/^\d+$/).transform(Number).default('2000'),
  RAG_MAX_DOCUMENT_SIZE: z.string().regex(/^\d+$/).transform(Number).default('10485760'), // 10MB

  // Feature Flags
  RAG_ENABLE_CACHING: z.string().transform(s => s === 'true').default('true'),
  RAG_ENABLE_METRICS: z.string().transform(s => s === 'true').default('true'),
  RAG_ENABLE_AUTO_TAGGING: z.string().transform(s => s === 'true').default('true'),
  RAG_ENABLE_CHUNKING_OPTIMIZATION: z.string().transform(s => s === 'true').default('true'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

// Parse and validate environment variables
function parseEnvironment() {
  try {
    return EnvSchema.parse(process.env);
  } catch (error: any) {
    logger.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}

export const env = parseEnvironment();
;
// === RAG CONFIGURATION ===

export function createRAGConfig(): RAGConfiguration {
  return {
    embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
    embeddingDimensions: 768, // nomic-embed-text default
    llmModel: env.OLLAMA_LLM_MODEL,
    ollamaBaseUrl: env.OLLAMA_URL,
    chunkSize: env.RAG_CHUNK_SIZE,
    chunkOverlap: env.RAG_CHUNK_OVERLAP,
    maxRetries: env.RAG_MAX_RETRIES,
    timeoutMs: env.RAG_TIMEOUT_MS,
    cacheEnabled: env.RAG_ENABLE_CACHING,
    cacheTtl: env.RAG_CACHE_TTL
};
}

// === UTILITY FUNCTIONS ===

/**
 * Creates a SHA-256 hash of the input text
 */
export function hashText(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

/**
 * Creates a deterministic ID from multiple components
 */
export function createId(...components: string[]): string {
  return hashText(components.join('|'));
}

/**
 * Sanitizes user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"`]/g, '') // Remove SQL injection chars
    .trim()
    .substring(0, env.RAG_MAX_QUERY_LENGTH);
}

/**
 * Validates if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Creates a retry wrapper with exponential backoff
 */
export function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = env.RAG_MAX_RETRIES,
  baseDelay: number = 1000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        resolve(result);
        return;
      } catch (error: any) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          logger.error(`Operation failed after ${maxRetries + 1} attempts:`, lastError);
          reject(lastError);
          return;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  });
}

/**
 * Creates a timeout wrapper for async operations
 */
export function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number = env.RAG_TIMEOUT_MS,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    })
  ]);
}

/**
 * Rate limiter using in-memory store (consider Redis for production)
 */
class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly windowMs = 60 * 1000; // 1 minute
  private readonly maxRequests = env.RAG_RATE_LIMIT_PER_MINUTE;

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let requests = this.requests.get(identifier) || [];
    requests = requests.filter(time => time > windowStart);

    if (requests.length >= this.maxRequests) {
      return false;
    }

    requests.push(now);
    this.requests.set(identifier, requests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => time > windowStart);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

export const rateLimiter = new RateLimiter();
;
/**
 * Circuit breaker pattern for external service calls
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly name: string = 'Unknown'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      logger.error(`Circuit breaker ${this.name} opened after ${this.failures} failures`);
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Create circuit breakers for external services
export const circuitBreakers = {
  ollama: new CircuitBreaker(5, 60000, 'Ollama'),
  database: new CircuitBreaker(3, 30000, 'Database'),
  redis: new CircuitBreaker(3, 30000, 'Redis')
};

/**
 * Performance metrics collector
 */
class MetricsCollector {
  private metrics = new Map<string, number[]>();
  private counters = new Map<string, number>();

  recordTiming(operation: string, duration: number): void {
    if (!env.RAG_ENABLE_METRICS) return;

    const timings = this.metrics.get(operation) || [];
    timings.push(duration);

    // Keep only last 1000 measurements
    if (timings.length > 1000) {
      timings.shift();
    }

    this.metrics.set(operation, timings);
  }

  incrementCounter(name: string, value: number = 1): void {
    if (!env.RAG_ENABLE_METRICS) return;

    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  getAverageTime(operation: string): number {
    const timings = this.metrics.get(operation) || [];
    return timings.length > 0 ? timings.reduce((a, b) => a + b, 0) / timings.length : 0;
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};

    // Timing metrics
    for (const [operation, timings] of this.metrics.entries()) {
      if (timings.length > 0) {
        result[`${operation}_avg_ms`] = this.getAverageTime(operation);
        result[`${operation}_min_ms`] = Math.min(...timings);
        result[`${operation}_max_ms`] = Math.max(...timings);
        result[`${operation}_count`] = timings.length;
      }
    }

    // Counter metrics
    for (const [name, value] of this.counters.entries()) {
      result[name] = value;
    }

    return result;
  }

  reset(): void {
    this.metrics.clear();
    this.counters.clear();
  }
}

export const metrics = new MetricsCollector();
;
/**
 * Timing decorator for measuring function execution time
 */
export function measureTime(operation: string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await method.apply(this, args);
        metrics.recordTiming(operation, Date.now() - start);
        return result;
      } catch (error: any) {
        metrics.recordTiming(`${operation}_error`, Date.now() - start);
        throw error;
      }
    } as T;
  };
}

/**
 * Validates document size before processing
 */
export function validateDocumentSize(content: string): void {
  const sizeBytes = Buffer.byteLength(content, 'utf8');
  if (sizeBytes > env.RAG_MAX_DOCUMENT_SIZE) {
    throw new Error(`Document size (${sizeBytes} bytes) exceeds maximum allowed size (${env.RAG_MAX_DOCUMENT_SIZE} bytes)`);
  }
}

/**
 * Extracts legal entities from text using simple patterns
 */
export function extractLegalEntities(text: string): Array<{ type: string; value: string; confidence: number }> {
  const entities: Array<{ type: string; value: string; confidence: number }> = [];

  // Case law citations
  const casePattern = /\b\d{1,4}\s+[A-Z][a-z]+\s+\d{1,4}\b/g;
  const caseMatches = text.match(casePattern) || [];
  caseMatches.forEach((match: string) => {
    entities.push({ type: 'case_citation', value: match.trim(), confidence: 0.8 });
  });

  // Statute references
  const statutePattern = /\b\d+\s+U\.?S\.?C\.?\s+§?\s*\d+/g;
  const statuteMatches = text.match(statutePattern) || [];
  statuteMatches.forEach((match: string) => {
    entities.push({ type: 'statute', value: match.trim(), confidence: 0.9 });
  });

  // Dollar amounts
  const dollarPattern = /\$[\d,]+(?:\.\d{2})?/g;
  const dollarMatches = text.match(dollarPattern) || [];
  dollarMatches.forEach((match: string) => {
    entities.push({ type: 'monetary_amount', value: match.trim(), confidence: 0.95 });
  });

  return entities;
}

/**
 * Creates a unique session ID
 */
export function createSessionId(): string {
  return `rag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// === HEALTH CHECK UTILITIES ===

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export async function checkServiceHealth(name: string, checkFn: () => Promise<any>): Promise<HealthStatus> {
  const start = Date.now();

  try {
    await withTimeout(checkFn(), 5000, `${name} health check timed out`);

    return {
      service: name,
      status: 'healthy',
      responseTime: Date.now() - start
};
  } catch (error: any) {
    return {
      service: name,
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
};
  }
}
