import type { RequestHandler } from './$types.js';
// AI Synthesizer API Route - Full Stack Integration
// Uses Neo4j, PostgreSQL/pgvector, XState, Redis, Ollama with gemma3-legal:latest
// TypeScript-safe with Drizzle ORM and MCP Context7 best practices
import { aiOrchestrator } from '$lib/server/ai/enhanced-ai-synthesis-orchestrator';
import { monitoringService } from '$lib/server/ai/monitoring-service';
// --- added imports ---
import { json, error } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import * as caching from '$lib/server/cache';

// Add typed result/metric definitions
type SynthResult = {
  synthesis?: string;
  sources?: Array<Record<string, unknown>>;
  confidence?: number;
  metadata?: Record<string, unknown>;
};

type Metric = { name: string; value: number };

// Safe error-to-string helper
function errToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// SSE stream storage for real-time updates
type ActiveStreamState = {
  query: string;
  startTime: number;
  status: 'initializing' | 'processing' | 'complete' | 'error';
  lastUpdate?: unknown;
  updates?: unknown[];
  result?: unknown;
  error?: string;
};
const activeStreams = new Map<string, ActiveStreamState>();
// Main synthesis endpoint
export const POST: RequestHandler = async ({ request, url: _url }) => {
  const startTime = Date.now();
  let requestId: string | undefined;
  try {
    // Parse request body with runtime checks
    const body = (await request.json()) as Record<string, unknown> | null;
    const rawQuery = body?.['query'];
    const context = body?.['context'];
    const rawOptions = (body?.['options'] as Record<string, unknown> | undefined) ?? {};

    if (!rawQuery || typeof rawQuery !== 'string') {
      throw error(400, 'Query is required and must be a string');
    }
    const query = rawQuery;
    const options = rawOptions;

    // Generate request ID for tracking
    requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    logger.info(`[API] Processing synthesis request ${requestId}: "${query}"`);

    // Check if streaming is requested
    if ((options as { stream?: unknown }).stream === true) {
      // Create stream ID for SSE
      const streamId = `stream_${requestId}`;
      // Initialize stream tracking
      activeStreams.set(streamId, {
        query,
        startTime,
        status: 'initializing',
      });
      // Start async processing
      processStreamingRequest(streamId, query, context, options as Record<string, unknown>);
      // Return stream ID immediately
      return json({
        success: true,
        streamId,
        message: 'Streaming synthesis initiated',
        streamUrl: `/api/ai-synthesizer/stream/${streamId}`,
      });
    }

    // Non-streaming request - process synchronously
    const rawResult = (await aiOrchestrator.process(query, {
      ...(options as Record<string, unknown>),
      context,
      requestId,
    })) as SynthResult;

    // Track metrics
    const processingTime = Date.now() - startTime;
    await monitoringService.recordMetric('api_request_duration', processingTime);
    await monitoringService.recordMetric('api_requests_total', 1);

    // Return successful result (use typed SynthResult)
    const sres: SynthResult = rawResult ?? {};
    return json({
      success: true,
      requestId,
      result: {
        synthesis: sres.synthesis ?? '',
        sources: sres.sources ?? [],
        confidence: sres.confidence ?? 0,
        metadata: {
          ...(sres.metadata ?? {}),
          requestId,
          processingTime,
        },
      },
    });
  } catch (err: unknown) {
    const errMsg = errToString(err);
    // Log error
    logger.error('[API] Synthesis error:', errMsg);
    // Track error metrics
    await monitoringService.recordMetric('api_errors_total', 1);
    // Determine status code if present or fallback to 500
    const statusCode = (err as { status?: number })?.status ?? 500;
    // Return error response
    return json(
      {
        success: false,
        error: errMsg || 'An error occurred during synthesis',
        requestId,
        processingTime: Date.now() - startTime,
      },
      { status: statusCode }
    );
  }
};
// Health check endpoint
export const GET: RequestHandler = async ({ url }) => {
  try {
    // If called with /test path, run integration tests (merged from prior GET_ALTERNATIVE)
    if (url.pathname.endsWith('/test')) {
      logger.info('[API] Running integration test...');
      const testQueries = [
        {
          query: 'What are the elements of negligence in tort law?',
          expectedSources: ['neo4j', 'pgvector', 'context7'],
        },
        {
          query: 'Explain the difference between void and voidable contracts',
          expectedSources: ['rag', 'ollama'],
        },
        {
          query: 'What is the statute of limitations for breach of contract?',
          expectedSources: ['neo4j', 'context7', 'ollama'],
        },
      ];
      const results: Array<any> = [];
      for (const test of testQueries) {
        const startTime = Date.now();
        try {
          const raw = (await aiOrchestrator.process(test.query, {
            test: true,
            timeout: 10000,
          })) as SynthResult;
          results.push({
            query: test.query,
            success: true,
            processingTime: Date.now() - startTime,
            confidence: raw.confidence ?? 0,
            sourcesUsed: (raw.metadata as Record<string, unknown>)?.['sourcesUsed'] ?? [],
            expectedSources: test.expectedSources,
          });
        } catch (err: unknown) {
          results.push({
            query: test.query,
            success: false,
            error: errToString(err),
            processingTime: Date.now() - startTime,
          });
        }
      }
      const successCount = results.filter(r => r.success).length;
      const avgProcessingTime =
        results.length > 0 ? results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / results.length : 0;
      return json({
        success: successCount === results.length,
        testsRun: results.length,
        testsPassed: successCount,
        avgProcessingTime: Math.round(avgProcessingTime),
        results,
        services: await aiOrchestrator.health(),
        timestamp: new Date().toISOString(),
      });
    }

    // Normal health endpoint logic follows
    // Get orchestrator health
    const health = await aiOrchestrator.health();

    // Safe cache stats retrieval: try known function names, fall back to defaults
    let cacheStats: {
      hits: number;
      misses: number;
      hitRate: number;
      memoryUsage: number;
    } = { hits: 0, misses: 0, hitRate: 0, memoryUsage: 0 };

    try {
      if (typeof (caching as any).getStats === 'function') {
        cacheStats = await (caching as any).getStats();
      } else if (typeof (caching as any).getMetrics === 'function') {
        cacheStats = await (caching as any).getMetrics();
      } else if ((caching as any).stats) {
        cacheStats = (caching as any).stats;
      }
    } catch (e) {
      console.debug('cache stats retrieval failed, using defaults:', String(e));
    }

    // Get monitoring metrics
    const metricsRaw = await monitoringService.getMetrics();
    const metrics = (metricsRaw as Metric[]) ?? [];

    // Compile comprehensive health status
    const status = {
      status: health.status,
      timestamp: new Date().toISOString(),
      version: '5.0.0',
      stack: {
        neo4j: health.services.neo4j || 'unknown',
        postgres: health.services.postgres || 'unknown',
        redis: health.services.redis || 'unknown',
        ollama: health.services.ollama || 'unknown',
        enhancedRAG: health.services.enhancedRAG || 'unknown',
        gpuOrchestrator: health.services.gpuOrchestrator || 'unknown',
        context7: health.services.context7 || 'unknown',
      },
      models: {
        primary: 'gemma3-legal:latest',
        embeddings: 'nomic-embed-text',
        fallback: 'gemma2:2b',
      },
      cache: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate,
        memoryUsage: cacheStats.memoryUsage,
      },
      monitoring: {
        totalRequests:
          (metrics.find(m => m?.name === 'api_requests_total') as Metric | undefined)?.value ?? 0,
        totalErrors: (metrics.find(m => m?.name === 'api_errors_total') as Metric | undefined)?.value ?? 0,
        avgResponseTime:
          (metrics.find(m => m?.name === 'api_request_duration_avg') as Metric | undefined)?.value ?? 0,
        uptime: process.uptime(),
      },
      features: {
        neo4j: health.services.neo4j === 'healthy',
        pgvector: health.services.postgres === 'healthy',
        redis: health.services.redis === 'healthy',
        ollama: health.services.ollama === 'healthy',
        xstate: true,
        langchain: true,
        legalbert: true,
        drizzle: true,
        autosolve: true,
        streaming: true,
        caching: true,
        monitoring: true,
      },
    };

    // Determine overall health
    const healthyServices = Object.values(health.services).filter(s => s === 'healthy').length;
    const totalServices = Object.keys(health.services).length;
    if (healthyServices === totalServices) {
      status.status = 'healthy';
    } else if (healthyServices >= totalServices * 0.5) {
      status.status = 'degraded';
    } else {
      status.status = 'unhealthy';
    }
    return json(status);
  } catch (err: unknown) {
    const errMsg = errToString(err);
    logger.error('[API] Health check error:', errMsg);
    return json(
      {
        status: 'error',
        error: errMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
};
// Helper function for streaming requests
async function processStreamingRequest(
  streamId: string,
  query: string,
  context: unknown,
  options: Record<string, unknown> | undefined
): Promise<void> {
  try {
    // Update stream status
    const stream = activeStreams.get(streamId);
    if (stream) {
      stream.status = 'processing';
    }
    // Process with streaming
    const generator = aiOrchestrator.processStream(query, {
      ...(options ?? {}),
      context,
      streamId,
    });
    // Collect stream updates
    const updates: unknown[] = [];
    for await (const update of generator as AsyncIterable<any>) {
      updates.push(update);
      // Update stream state
      if (stream) {
        stream.lastUpdate = update;
        stream.updates = updates;
      }
    }
    // Mark as complete (safely access .result / .chunk)
    if (stream) {
      stream.status = 'complete';
      const last = updates.length ? (updates[updates.length - 1] as any) : undefined;
      stream.result = last?.result ?? last?.chunk ?? last;
    }
  } catch (err: unknown) {
    const errMsg = errToString(err);
    logger.error(`[API] Streaming error for ${streamId}:`, errMsg);
    const stream = activeStreams.get(streamId);
    if (stream) {
      stream.status = 'error';
      stream.error = errMsg;
    }
  }
}
// Cleanup old streams periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  for (const [streamId, streamState] of activeStreams.entries()) {
    if (now - streamState.startTime > maxAge) {
      activeStreams.delete(streamId);
      logger.debug(`[API] Cleaned up old stream ${streamId}`);
    }
  }
}, 60000); // Check every minute
// Export for testing
export { activeStreams };
