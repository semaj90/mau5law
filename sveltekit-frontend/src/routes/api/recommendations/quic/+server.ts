// Ultra-Fast QUIC Neo4j Recommendations API - 5-15ms Response Target
// Integrates with running QUIC Tensor Server (port 4433)

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import makeHttpErrorPayload from '$lib/server/api/makeHttpError';

// Import QUIC recommendation engine (will be available after build)
let QuicEngine: any = null;

// Lazy load the QUIC engine to handle build-time imports
async function getQuicEngine() {
  if (!QuicEngine) {
    try {
      const module = await import('$lib/services/quic-neo4j-recommendations');
      QuicEngine = new module.QuicNeo4jRecommendationEngine();
    } catch (err) {
      console.error('Failed to load QUIC engine:', err);
      throw error(503, makeHttpErrorPayload({ message: 'QUIC recommendation engine unavailable' }));
    }
  }
  return QuicEngine;
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const query = url.searchParams.get('q') || url.searchParams.get('query');
    const caseId = url.searchParams.get('caseId');
    const practiceArea = url.searchParams.get('practiceArea');
    const jurisdiction = url.searchParams.get('jurisdiction');
    const maxResults = parseInt(url.searchParams.get('maxResults') || '10');
    const threshold = parseFloat(url.searchParams.get('threshold') || '0.7');
    const useGPU = url.searchParams.get('useGPU') !== 'false';
    const useTensorCores = url.searchParams.get('useTensorCores') !== 'false';
    const benchmark = url.searchParams.get('benchmark') === 'true';

    if (!query) {
      throw error(
        400,
        makeHttpErrorPayload({ message: 'Query parameter (q or query) is required' })
      );
    }

    const engine = await getQuicEngine();

    // Run benchmark if requested
    if (benchmark) {
      const benchmarkResults = await engine.benchmarkPerformance(query);
      return json({
        success: true,
        benchmark: benchmarkResults,
        connection: engine.getConnectionInfo(),
        message: 'QUIC Neo4j Recommendation Engine benchmark completed',
      });
    }

    // Execute ultra-fast QUIC recommendation
    const startTime = performance.now();

    const recommendations = await engine.getRecommendations({
      query,
      caseId,
      practiceArea,
      jurisdiction,
      maxResults: Math.min(maxResults, 50), // Cap at 50
      threshold: Math.max(0.1, Math.min(threshold, 1.0)), // Clamp 0.1-1.0
      useGPU,
      useTensorCores,
    });

    const totalTime = performance.now() - startTime;

    // Add performance headers
    const response = json({
      success: true,
      query,
      ...recommendations,
      performance: {
        totalApiTime: totalTime,
        engineProcessingTime: recommendations.processingTime,
        overhead: totalTime - recommendations.processingTime,
        targetMet: recommendations.processingTime <= 15,
        protocolUsed: recommendations.protocol,
      },
      connection: engine.getConnectionInfo(),
    });

    // Performance monitoring headers
    response.headers.set('X-Response-Time', `${totalTime.toFixed(2)}ms`);
    response.headers.set('X-Protocol', recommendations.protocol);
    response.headers.set('X-Cache-Status', recommendations.cacheHit ? 'HIT' : 'MISS');
    response.headers.set(
      'X-GPU-Used',
      recommendations.tensorMetrics.tensorCoresUsed ? 'true' : 'false'
    );
    response.headers.set(
      'X-SIMD-Optimized',
      recommendations.metadata.simdOptimized ? 'true' : 'false'
    );

    return response;
  } catch (err) {
    console.error('QUIC recommendations API error:', err);

    if (err.status) {
      throw err; // Re-throw SvelteKit errors
    }

    return json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'QUIC recommendation failed',
        fallback: 'Consider using /api/search for HTTP fallback',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      query,
      caseId,
      practiceArea,
      jurisdiction,
      maxResults = 10,
      threshold = 0.7,
      useGPU = true,
      useTensorCores = true,
      batchQueries,
    } = body;

    if (!query && !batchQueries) {
      throw error(400, makeHttpErrorPayload({ message: 'Query or batchQueries required' }));
    }

    const engine = await getQuicEngine();
    const startTime = performance.now();

    // Handle batch processing for multiple queries
    if (batchQueries && Array.isArray(batchQueries)) {
      const batchResults = await Promise.allSettled(
        batchQueries.map((batchQuery: any) =>
          engine.getRecommendations({
            query: batchQuery.query || batchQuery,
            caseId: batchQuery.caseId,
            practiceArea: batchQuery.practiceArea || practiceArea,
            jurisdiction: batchQuery.jurisdiction || jurisdiction,
            maxResults: Math.min(batchQuery.maxResults || maxResults, 20),
            threshold: batchQuery.threshold || threshold,
            useGPU,
            useTensorCores,
          })
        )
      );

      const totalTime = performance.now() - startTime;
      const successful = batchResults.filter((r) => r.status === 'fulfilled');

      return json({
        success: true,
        batch: true,
        totalQueries: batchQueries.length,
        successfulQueries: successful.length,
        results: batchResults.map((result) =>
          result.status === 'fulfilled' ? result.value : { error: result.reason?.message }
        ),
        performance: {
          totalBatchTime: totalTime,
          averagePerQuery: totalTime / batchQueries.length,
          successRate: successful.length / batchQueries.length,
        },
      });
    }

    // Single query processing
    const recommendations = await engine.getRecommendations({
      query,
      caseId,
      practiceArea,
      jurisdiction,
      maxResults: Math.min(maxResults, 50),
      threshold: Math.max(0.1, Math.min(threshold, 1.0)),
      useGPU,
      useTensorCores,
    });

    const totalTime = performance.now() - startTime;

    return json({
      success: true,
      query,
      ...recommendations,
      performance: {
        totalApiTime: totalTime,
        engineProcessingTime: recommendations.processingTime,
        overhead: totalTime - recommendations.processingTime,
        targetMet: recommendations.processingTime <= 15,
      },
    });
  } catch (err) {
    console.error('QUIC recommendations POST error:', err);

    if (err.status) {
      throw err;
    }

    return json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'QUIC recommendation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};

export const OPTIONS: RequestHandler = async () => {
	// CORS preflight for QUIC connections
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, X-Protocol, X-Priority',
			'Access-Control-Max-Age': '86400',
			'Alt-Svc': 'h3=":4433"; ma=3600', // Advertise QUIC/HTTP3
			'X-API-Version': '1.0',
			'X-Supported-Protocols': 'QUIC, HTTP/2, HTTP/1.1',
			'X-Target-Latency': '5-15ms'
		}
	});
};