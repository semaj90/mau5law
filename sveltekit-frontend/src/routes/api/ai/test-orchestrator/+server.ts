/**
 * Test API for LLM Orchestrator Integration
 * Provides endpoints to test and verify the orchestrator bridge functionality
 */

import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { 
  testOrchestratorIntegration, 
  quickHealthCheck, 
  testSpecificOrchestrator 
} from '$lib/server/ai/orchestrator-test.js';
import { llmOrchestratorBridge } from '$lib/server/ai/llm-orchestrator-bridge.js';

// GET - Quick health check
export const GET: RequestHandler = async ({ url }) => {
  const testType = url.searchParams.get('test');
  const orchestrator = url.searchParams.get('orchestrator') as 'server' | 'client' | 'mcp' | null;
  const content = url.searchParams.get('content') || 'Test message';

  try {
    if (testType === 'full') {
      // Run full integration test suite
      const testResults = await testOrchestratorIntegration();
      return json({
        type: 'full_integration_test',
        ...testResults,
        timestamp: new Date().toISOString(),
      });
    }

    if (testType === 'specific' && orchestrator) {
      // Test specific orchestrator
      const result = await testSpecificOrchestrator(orchestrator, content);
      return json({
        type: 'specific_orchestrator_test',
        orchestrator,
        ...result,
        timestamp: new Date().toISOString(),
      });
    }

    // Default: Quick health check
    const healthResult = await quickHealthCheck();
    const metrics = llmOrchestratorBridge.getPerformanceMetrics();
    const activeRequests = llmOrchestratorBridge.getActiveRequests();

    return json({
      type: 'health_check',
      ...healthResult,
      performance: metrics,
      activeRequests: {
        count: activeRequests.length,
        requests: activeRequests.map(req => ({
          id: req.id,
          type: req.type,
          priority: req.options?.priority,
          timestamp: req.metadata?.timestamp,
        })),
      },
      endpoints: {
        fullTest: '/api/ai/test-orchestrator?test=full',
        specificTest: '/api/ai/test-orchestrator?test=specific&orchestrator=server&content=Hello',
        healthCheck: '/api/ai/test-orchestrator',
      },
    });

  } catch (error) {
    return json(
      {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};

// POST - Run custom test with specific parameters
export const POST: RequestHandler = async ({ request }) => {
  try {
    const testRequest = await request.json();
    
    const {
      type = 'chat',
      content = 'Test message',
      orchestrator = 'auto',
      priority = 'normal',
      temperature = 0.3,
      maxTokens = 200,
    } = testRequest;

    // Create test request for the bridge
    const bridgeRequest = {
      id: `custom-test-${Date.now()}`,
      type,
      content,
      context: {
        userId: testRequest.userId || 'test-user',
        sessionId: testRequest.sessionId || 'test-session',
        legalDomain: testRequest.legalDomain,
        documentType: testRequest.documentType,
      },
      options: {
        model: orchestrator,
        priority,
        temperature,
        maxTokens,
        useGPU: testRequest.useGPU !== false,
      },
      metadata: {
        source: 'custom_test_api',
        timestamp: Date.now(),
      },
    };

    const startTime = Date.now();
    const result = await llmOrchestratorBridge.processRequest(bridgeRequest);
    const apiLatency = Date.now() - startTime;

    return json({
      type: 'custom_test',
      request: {
        ...bridgeRequest,
        // Don't return metadata to keep response clean
        metadata: undefined,
      },
      result: {
        success: result.success,
        response: result.response,
        orchestratorUsed: result.orchestratorUsed,
        modelUsed: result.modelUsed,
        confidence: result.confidence,
        executionMetrics: {
          ...result.executionMetrics,
          apiLatency,
        },
        error: result.error,
      },
      analysis: {
        routingReason: getRoutingReason(result.orchestratorUsed, type, orchestrator),
        performanceGrade: getPerformanceGrade(result.executionMetrics.totalLatency),
        recommendedOptimizations: getOptimizationRecommendations(result),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return json(
      {
        type: 'custom_test_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};

// Helper functions

function getRoutingReason(orchestratorUsed: string, taskType: string, requestedOrchestrator: string): string {
  if (requestedOrchestrator !== 'auto') {
    return `Explicitly requested ${requestedOrchestrator} orchestrator`;
  }

  switch (orchestratorUsed) {
    case 'server':
      return `Server orchestrator chosen for ${taskType} - optimal for complex processing`;
    case 'client':
      return `Client orchestrator chosen for ${taskType} - optimal for low latency`;
    case 'mcp':
      return `MCP multi-core chosen for ${taskType} - optimal for parallel processing`;
    case 'hybrid':
      return `Hybrid approach used for ${taskType} - combining multiple orchestrators`;
    default:
      return `Routed to ${orchestratorUsed} orchestrator`;
  }
}

function getPerformanceGrade(latency: number): string {
  if (latency < 100) return 'A+ (Excellent)';
  if (latency < 300) return 'A (Very Good)';
  if (latency < 500) return 'B (Good)';
  if (latency < 1000) return 'C (Fair)';
  if (latency < 2000) return 'D (Poor)';
  return 'F (Very Poor)';
}

function getOptimizationRecommendations(result: any): string[] {
  const recommendations: string[] = [];
  
  if (result.executionMetrics.totalLatency > 1000) {
    recommendations.push('Consider using client-side orchestrator for faster responses');
  }
  
  if (result.executionMetrics.cacheHitRate === 0) {
    recommendations.push('Enable caching to improve repeat query performance');
  }
  
  if (!result.executionMetrics.gpuAccelerated && result.orchestratorUsed === 'server') {
    recommendations.push('Enable GPU acceleration for better performance');
  }
  
  if (result.confidence && result.confidence < 0.7) {
    recommendations.push('Consider using server orchestrator for higher quality responses');
  }
  
  if (result.executionMetrics.totalLatency < 50) {
    recommendations.push('Excellent performance! Current configuration is optimal');
  }
  
  return recommendations.length > 0 ? recommendations : ['Performance is good with current configuration'];
}

// OPTIONS handler for CORS
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};