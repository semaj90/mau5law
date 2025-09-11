/**
 * LLM Orchestrator Integration Test Suite
 * Tests the bridge connection between local and server orchestrators
 */

import { llmOrchestratorBridge } from './llm-orchestrator-bridge.js';
import type { LLMBridgeRequest } from './llm-orchestrator-bridge.js';

export async function testOrchestratorIntegration(): Promise<{
  success: boolean;
  results: any[];
  summary: string;
}> {
  const results: any[] = [];
  let successCount = 0;

  console.log('🚀 Starting LLM Orchestrator Integration Tests...\n');

  // Test 1: Basic chat functionality
  try {
    console.log('Test 1: Basic Chat Request...');
    const chatRequest: LLMBridgeRequest = {
      id: 'test-chat-1',
      type: 'chat',
      content: 'Hello! Can you explain what a contract is in simple terms?',
      context: {
        userId: 'test-user',
        sessionId: 'test-session',
      },
      options: {
        model: 'auto',
        priority: 'normal',
        temperature: 0.3,
        maxTokens: 200,
      },
      metadata: {
        source: 'test',
        timestamp: Date.now(),
      },
    };

    const chatResult = await llmOrchestratorBridge.processRequest(chatRequest);
    results.push({
      test: 'Basic Chat',
      success: chatResult.success,
      orchestrator: chatResult.orchestratorUsed,
      model: chatResult.modelUsed,
      latency: chatResult.executionMetrics.totalLatency,
      response: chatResult.response.substring(0, 100) + '...',
    });

    if (chatResult.success) {
      successCount++;
      console.log(`✅ Chat test passed - ${chatResult.orchestratorUsed} orchestrator`);
    } else {
      console.log(`❌ Chat test failed: ${chatResult.error}`);
    }
  } catch (error) {
    console.log(`❌ Chat test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    results.push({
      test: 'Basic Chat',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  console.log('');

  // Test 2: Legal analysis
  try {
    console.log('Test 2: Legal Analysis Request...');
    const legalRequest: LLMBridgeRequest = {
      id: 'test-legal-1',
      type: 'legal_analysis',
      content: 'What are the essential elements required for a valid contract under common law?',
      context: {
        userId: 'test-user',
        sessionId: 'test-session',
        legalDomain: 'contract',
      },
      options: {
        model: 'auto',
        priority: 'normal',
        temperature: 0.2,
        maxTokens: 300,
      },
      metadata: {
        source: 'test',
        timestamp: Date.now(),
      },
    };

    const legalResult = await llmOrchestratorBridge.processRequest(legalRequest);
    results.push({
      test: 'Legal Analysis',
      success: legalResult.success,
      orchestrator: legalResult.orchestratorUsed,
      model: legalResult.modelUsed,
      latency: legalResult.executionMetrics.totalLatency,
      confidence: legalResult.confidence,
      response: legalResult.response.substring(0, 100) + '...',
    });

    if (legalResult.success) {
      successCount++;
      console.log(`✅ Legal analysis test passed - ${legalResult.orchestratorUsed} orchestrator`);
    } else {
      console.log(`❌ Legal analysis test failed: ${legalResult.error}`);
    }
  } catch (error) {
    console.log(`❌ Legal analysis test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    results.push({
      test: 'Legal Analysis',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  console.log('');

  // Test 3: Embedding generation
  try {
    console.log('Test 3: Embedding Generation...');
    const embeddingRequest: LLMBridgeRequest = {
      id: 'test-embedding-1',
      type: 'embedding',
      content: 'Contract law governs the formation and enforcement of agreements between parties.',
      context: {
        userId: 'test-user',
        sessionId: 'test-session',
      },
      options: {
        model: 'auto',
        priority: 'normal',
      },
      metadata: {
        source: 'test',
        timestamp: Date.now(),
      },
    };

    const embeddingResult = await llmOrchestratorBridge.processRequest(embeddingRequest);
    results.push({
      test: 'Embedding Generation',
      success: embeddingResult.success,
      orchestrator: embeddingResult.orchestratorUsed,
      model: embeddingResult.modelUsed,
      latency: embeddingResult.executionMetrics.totalLatency,
      response: typeof embeddingResult.response === 'string' ? 
        `Generated ${embeddingResult.response.length} chars` : 
        'Embedding generated',
    });

    if (embeddingResult.success) {
      successCount++;
      console.log(`✅ Embedding test passed - ${embeddingResult.orchestratorUsed} orchestrator`);
    } else {
      console.log(`❌ Embedding test failed: ${embeddingResult.error}`);
    }
  } catch (error) {
    console.log(`❌ Embedding test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    results.push({
      test: 'Embedding Generation',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  console.log('');

  // Test 4: Realtime chat (client-side preference)
  try {
    console.log('Test 4: Realtime Chat (Client Preference)...');
    const realtimeRequest: LLMBridgeRequest = {
      id: 'test-realtime-1',
      type: 'chat',
      content: 'Quick question: Is verbal agreement legally binding?',
      context: {
        userId: 'test-user',
        sessionId: 'test-session',
      },
      options: {
        model: 'auto',
        priority: 'realtime',
        maxLatency: 500,
        temperature: 0.4,
        maxTokens: 150,
      },
      metadata: {
        source: 'test',
        timestamp: Date.now(),
      },
    };

    const realtimeResult = await llmOrchestratorBridge.processRequest(realtimeRequest);
    results.push({
      test: 'Realtime Chat',
      success: realtimeResult.success,
      orchestrator: realtimeResult.orchestratorUsed,
      model: realtimeResult.modelUsed,
      latency: realtimeResult.executionMetrics.totalLatency,
      metLatencyTarget: realtimeResult.executionMetrics.totalLatency < 500,
      response: realtimeResult.response.substring(0, 100) + '...',
    });

    if (realtimeResult.success) {
      successCount++;
      console.log(`✅ Realtime test passed - ${realtimeResult.orchestratorUsed} orchestrator (${realtimeResult.executionMetrics.totalLatency.toFixed(2)}ms)`);
    } else {
      console.log(`❌ Realtime test failed: ${realtimeResult.error}`);
    }
  } catch (error) {
    console.log(`❌ Realtime test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    results.push({
      test: 'Realtime Chat',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  console.log('');

  // Test 5: Bridge status check
  try {
    console.log('Test 5: Bridge Status Check...');
    const status = await llmOrchestratorBridge.getStatus();
    const metrics = llmOrchestratorBridge.getPerformanceMetrics();

    results.push({
      test: 'Bridge Status',
      success: true,
      bridgeStatus: status.bridge.status,
      totalRequests: metrics.totalRequests,
      successRate: metrics.successfulRequests / Math.max(metrics.totalRequests, 1),
      averageLatency: metrics.averageLatency,
      serverOrchestrator: status.serverOrchestrator.status || 'unknown',
      clientOrchestrator: status.clientOrchestrator.modelsLoaded || 0,
    });

    successCount++;
    console.log(`✅ Status check passed - Bridge: ${status.bridge.status}`);
    console.log(`   Server Orchestrator: ${status.serverOrchestrator.status || 'unknown'}`);
    console.log(`   Client Orchestrator: ${status.clientOrchestrator.modelsLoaded || 0} models loaded`);
  } catch (error) {
    console.log(`❌ Status check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    results.push({
      test: 'Bridge Status',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const totalTests = 5;
  const successRate = (successCount / totalTests) * 100;
  
  console.log('\n📊 Test Summary:');
  console.log(`   Tests passed: ${successCount}/${totalTests} (${successRate.toFixed(1)}%)`);
  console.log(`   Total requests processed: ${llmOrchestratorBridge.getPerformanceMetrics().totalRequests}`);

  const summary = `LLM Orchestrator Integration: ${successCount}/${totalTests} tests passed (${successRate.toFixed(1)}%)`;

  return {
    success: successCount === totalTests,
    results,
    summary,
  };
}

// Function to run a quick health check
export async function quickHealthCheck(): Promise<{
  healthy: boolean;
  status: any;
  timestamp: string;
}> {
  try {
    const status = await llmOrchestratorBridge.getStatus();
    const healthy = status.bridge.status === 'healthy' || status.bridge.status === 'degraded';
    
    return {
      healthy,
      status,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      healthy: false,
      status: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date().toISOString(),
    };
  }
}

// Function to test specific orchestrator
export async function testSpecificOrchestrator(
  orchestratorType: 'server' | 'client' | 'mcp',
  content: string = 'Test message'
): Promise<any> {
  const request: LLMBridgeRequest = {
    id: `test-specific-${orchestratorType}-${Date.now()}`,
    type: 'chat',
    content,
    context: {
      userId: 'test-user',
      sessionId: 'test-session',
    },
    options: {
      model: orchestratorType === 'server' ? 'server-orchestrator' : 
             orchestratorType === 'client' ? 'gemma270m' : 'auto',
      priority: 'normal',
      temperature: 0.3,
      maxTokens: 200,
    },
    metadata: {
      source: 'specific-test',
      timestamp: Date.now(),
    },
  };

  try {
    const result = await llmOrchestratorBridge.processRequest(request);
    return {
      success: result.success,
      orchestratorUsed: result.orchestratorUsed,
      expectedOrchestrator: orchestratorType,
      matchesExpected: result.orchestratorUsed === orchestratorType || 
                      (orchestratorType === 'mcp' && result.orchestratorUsed === 'mcp'),
      response: result.response,
      metrics: result.executionMetrics,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      expectedOrchestrator: orchestratorType,
    };
  }
}