import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


// Import all our AI suggestion services
import { testOllamaIntegration } from '$lib/services/ollama-suggestions-service.js';
import { testEnhancedRAGIntegration } from '$lib/services/enhanced-rag-suggestions-service.js';
import { aiSuggestionsClient } from '$lib/services/ai-suggestions-grpc-client.js';
import { pgvectorHealthCheck } from '$lib/server/db/pgvector-utils.js';
import { generateEnhancedEmbedding } from '$lib/server/ai/embeddings-enhanced.js';
import { db, healthCheck as dbHealthCheck } from '$lib/server/db/index.js';

export interface IntegrationTestResult {
  service: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  responseTime?: number;
  error?: string;
}

/**
 * Comprehensive AI Suggestions Integration Test
 * Tests all services, database connections, and Protocol Buffers integration
 */
export async function GET({ url }: RequestEvent): Promise<any> {
  const startTime = Date.now();
  const testResults: IntegrationTestResult[] = [];
  const testContent = "The defendant was found with stolen evidence. We need to analyze the chain of custody and prepare charges for prosecution.";
  
  // Test 1: Database Connection
  testResults.push(await testDatabaseConnection());
  
  // Test 2: pgvector Integration
  testResults.push(await testPgVectorIntegration());
  
  // Test 3: Embedding Generation
  testResults.push(await testEmbeddingGeneration(testContent));
  
  // Test 4: Ollama AI Service
  testResults.push(await testOllamaService());
  
  // Test 5: Enhanced RAG Service
  testResults.push(await testEnhancedRAGService());
  
  // Test 6: Protocol Buffers gRPC Client
  testResults.push(await testProtobufGRPCService());
  
  // Test 7: Main Suggestions API
  testResults.push(await testMainSuggestionsAPI());
  
  // Test 8: Streaming API
  testResults.push(await testStreamingAPI());
  
  // Test 9: Rating API
  testResults.push(await testRatingAPI());
  
  // Test 10: Health Check API
  testResults.push(await testHealthCheckAPI());
  
  // Calculate overall status
  const passCount = testResults.filter(r => r.status === 'pass').length;
  const failCount = testResults.filter(r => r.status === 'fail').length;
  const warningCount = testResults.filter(r => r.status === 'warning').length;
  
  const overallStatus = failCount > 0 ? 'critical' : 
                       warningCount > 0 ? 'warning' : 'healthy';
  
  const totalTime = Date.now() - startTime;
  
  return json({
    status: overallStatus,
    summary: {
      total: testResults.length,
      pass: passCount,
      fail: failCount,
      warning: warningCount,
      totalTime
    },
    results: testResults,
    timestamp: new Date().toISOString(),
    recommendations: generateRecommendations(testResults)
  });
}

async function testDatabaseConnection(): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const health = await dbHealthCheck();
    const responseTime = Date.now() - startTime;
    
    if (health.status === 'healthy') {
      return {
        service: 'Database Connection',
        status: 'pass',
        message: 'Database connection successful',
        details: health,
        responseTime
      };
    } else {
      return {
        service: 'Database Connection',
        status: 'fail',
        message: 'Database connection failed',
        details: health,
        responseTime,
        error: health.error
      };
    }
  } catch (error: any) {
    return {
      service: 'Database Connection',
      status: 'fail',
      message: 'Database connection test failed',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testPgVectorIntegration(): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const health = await pgvectorHealthCheck();
    const responseTime = Date.now() - startTime;
    
    if (health.available) {
      return {
        service: 'pgvector Integration',
        status: 'pass',
        message: `pgvector is available with ${health.functions.length} custom functions`,
        details: health,
        responseTime
      };
    } else {
      return {
        service: 'pgvector Integration',
        status: 'fail',
        message: 'pgvector extension not available',
        details: health,
        responseTime,
        error: health.error
      };
    }
  } catch (error: any) {
    return {
      service: 'pgvector Integration',
      status: 'fail',
      message: 'pgvector test failed',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testEmbeddingGeneration(content: string): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const embedding = await generateEnhancedEmbedding(content, {
      provider: 'nomic-embed',
      legalDomain: true,
      cache: true
    });
    
    const responseTime = Date.now() - startTime;
    
    if (Array.isArray(embedding) && embedding.length > 0) {
      return {
        service: 'Embedding Generation',
        status: 'pass',
        message: `Generated ${embedding.length}-dimensional embedding`,
        details: {
          dimensions: embedding.length,
          sampleValues: embedding.slice(0, 5),
          provider: 'nomic-embed'
        },
        responseTime
      };
    } else {
      return {
        service: 'Embedding Generation',
        status: 'fail',
        message: 'Invalid embedding generated',
        details: { embedding },
        responseTime
      };
    }
  } catch (error: any) {
    return {
      service: 'Embedding Generation',
      status: 'fail',
      message: 'Embedding generation failed',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testOllamaService(): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const result = await testOllamaIntegration();
    const responseTime = Date.now() - startTime;
    
    if (result.success) {
      return {
        service: 'Ollama AI Service',
        status: 'pass',
        message: `Ollama service operational with model ${result.model}`,
        details: {
          model: result.model,
          availableModels: result.availableModels,
          testSuggestion: result.testSuggestion
        },
        responseTime
      };
    } else {
      return {
        service: 'Ollama AI Service',
        status: 'fail',
        message: 'Ollama service not available',
        details: result,
        responseTime,
        error: result.error
      };
    }
  } catch (error: any) {
    return {
      service: 'Ollama AI Service',
      status: 'fail',
      message: 'Ollama test failed',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testEnhancedRAGService(): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const result = await testEnhancedRAGIntegration();
    const responseTime = Date.now() - startTime;
    
    if (result.success) {
      return {
        service: 'Enhanced RAG Service',
        status: 'pass',
        message: 'Enhanced RAG service operational',
        details: {
          serviceAvailable: result.serviceAvailable,
          version: result.version,
          testSuggestion: result.testSuggestion,
          responseTime: result.responseTime
        },
        responseTime
      };
    } else {
      return {
        service: 'Enhanced RAG Service',
        status: result.serviceAvailable ? 'warning' : 'fail',
        message: result.serviceAvailable ? 'Service available but test failed' : 'Enhanced RAG service not available',
        details: result,
        responseTime,
        error: result.error
      };
    }
  } catch (error: any) {
    return {
      service: 'Enhanced RAG Service',
      status: 'fail',
      message: 'Enhanced RAG test failed',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testProtobufGRPCService(): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const isHealthy = await aiSuggestionsClient.healthCheck();
    const status = aiSuggestionsClient.getConnectionStatus();
    const responseTime = Date.now() - startTime;
    
    if (isHealthy) {
      return {
        service: 'Protocol Buffers gRPC',
        status: 'pass',
        message: 'gRPC service is healthy and connected',
        details: status,
        responseTime
      };
    } else {
      return {
        service: 'Protocol Buffers gRPC',
        status: 'warning',
        message: 'gRPC service not available (HTTP fallback will be used)',
        details: status,
        responseTime
      };
    }
  } catch (error: any) {
    return {
      service: 'Protocol Buffers gRPC',
      status: 'warning',
      message: 'gRPC test failed (HTTP fallback available)',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testMainSuggestionsAPI(): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch('/api/ai/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: "Test legal analysis request for evidence authentication",
        reportType: 'prosecution_memo',
        maxSuggestions: 3,
        useVectorSearch: true,
        useOllamaAI: true,
        useEnhancedRAG: false // Disable to avoid timeout in tests
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const result = await response.json();
      
      return {
        service: 'Main Suggestions API',
        status: 'pass',
        message: `API returned ${result.suggestions?.length || 0} suggestions`,
        details: {
          suggestionsCount: result.suggestions?.length || 0,
          confidence: result.confidence,
          servicesUsed: result.servicesUsed
        },
        responseTime
      };
    } else {
      const errorText = await response.text();
      return {
        service: 'Main Suggestions API',
        status: 'fail',
        message: `API request failed with status ${response.status}`,
        responseTime,
        error: errorText
      };
    }
  } catch (error: any) {
    return {
      service: 'Main Suggestions API',
      status: 'fail',
      message: 'API test failed',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testStreamingAPI(): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch('/api/ai/suggestions/stream?content=Test streaming suggestions&max=2', {
      method: 'GET'
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
      return {
        service: 'Streaming API',
        status: 'pass',
        message: 'Streaming API is operational',
        details: {
          contentType: response.headers.get('content-type'),
          status: response.status
        },
        responseTime
      };
    } else {
      return {
        service: 'Streaming API',
        status: 'fail',
        message: `Streaming API failed with status ${response.status}`,
        responseTime
      };
    }
  } catch (error: any) {
    return {
      service: 'Streaming API',
      status: 'fail',
      message: 'Streaming API test failed',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testRatingAPI(): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    // Test GET endpoint (should require userId)
    const response = await fetch('/api/ai/suggestions/rate');
    const responseTime = Date.now() - startTime;
    
    // Should return 400 for missing userId
    if (response.status === 400) {
      return {
        service: 'Rating API',
        status: 'pass',
        message: 'Rating API is operational (validation working)',
        details: {
          status: response.status,
          validation: 'userId parameter required'
        },
        responseTime
      };
    } else {
      return {
        service: 'Rating API',
        status: 'warning',
        message: 'Rating API responded unexpectedly',
        details: { status: response.status },
        responseTime
      };
    }
  } catch (error: any) {
    return {
      service: 'Rating API',
      status: 'fail',
      message: 'Rating API test failed',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testHealthCheckAPI(): Promise<IntegrationTestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch('/api/ai/suggestions/health');
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const health = await response.json();
      
      return {
        service: 'Health Check API',
        status: 'pass',
        message: `Health check API operational (${health.status})`,
        details: health,
        responseTime
      };
    } else {
      return {
        service: 'Health Check API',
        status: 'fail',
        message: `Health check API failed with status ${response.status}`,
        responseTime
      };
    }
  } catch (error: any) {
    return {
      service: 'Health Check API',
      status: 'fail',
      message: 'Health check API test failed',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function generateRecommendations(results: IntegrationTestResult[]): string[] {
  const recommendations: string[] = [];
  
  const failedTests = results.filter(r => r.status === 'fail');
  const warningTests = results.filter(r => r.status === 'warning');
  
  if (failedTests.length > 0) {
    recommendations.push(`${failedTests.length} critical services are down - check service status and logs`);
  }
  
  if (warningTests.length > 0) {
    recommendations.push(`${warningTests.length} services have warnings - monitor for degraded performance`);
  }
  
  // Specific recommendations
  const dbTest = results.find(r => r.service === 'Database Connection');
  if (dbTest?.status === 'fail') {
    recommendations.push('Database connection failed - check PostgreSQL service and connection string');
  }
  
  const pgVectorTest = results.find(r => r.service === 'pgvector Integration');
  if (pgVectorTest?.status === 'fail') {
    recommendations.push('pgvector extension not available - install with CREATE EXTENSION vector;');
  }
  
  const ollamaTest = results.find(r => r.service === 'Ollama AI Service');
  if (ollamaTest?.status === 'fail') {
    recommendations.push('Ollama service not available - start Ollama and pull required models');
  }
  
  const ragTest = results.find(r => r.service === 'Enhanced RAG Service');
  if (ragTest?.status === 'fail') {
    recommendations.push('Enhanced RAG service not available - check Go microservice on port 8094');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All AI suggestion services are operational - system ready for production use');
  }
  
  return recommendations;
}