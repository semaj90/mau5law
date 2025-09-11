/**
 * LLM Orchestrator Bridge - Unifies local and server orchestrators
 * Connects enhanced-orchestrator.ts, unified-client-llm-orchestrator.ts, and API endpoints
 * 
 * Architecture:
 * - Server-side: Enhanced AI Synthesis Orchestrator (XState + Ollama + pgvector + Neo4j)
 * - Client-side: Unified Client LLM Orchestrator (Gemma + ONNX)
 * - Bridge: Routes requests to optimal orchestrator based on task type and context
 */

import { orchestrator as enhancedOrchestrator } from './enhanced-orchestrator.js';
import { unifiedClientLLMOrchestrator } from '$lib/ai/unified-client-llm-orchestrator.js';
import { mcpMultiCore } from '$lib/server/mcp/multi-core-integration.js';
import type { MCPTask } from '$lib/server/mcp/multi-core-integration.js';
import { logger } from './logger.js';
import type { ClientLLMRequest, InferenceResult } from '$lib/ai/unified-client-llm-orchestrator.js';

export interface LLMBridgeRequest {
  id: string;
  type: 'chat' | 'legal_analysis' | 'document_processing' | 'embedding' | 'search' | 'workflow';
  content: string;
  context?: {
    userId?: string;
    sessionId?: string;
    caseId?: string;
    documentType?: string;
    legalDomain?: string;
    previousContext?: string[];
  };
  options?: {
    model?: 'auto' | 'gemma3-legal' | 'gemma270m' | 'legal-bert' | 'server-orchestrator';
    priority?: 'low' | 'normal' | 'high' | 'realtime';
    useGPU?: boolean;
    enableStreaming?: boolean;
    maxLatency?: number;
    temperature?: number;
    maxTokens?: number;
  };
  metadata?: {
    source?: 'web' | 'api' | 'component';
    userAgent?: string;
    timestamp?: number;
  };
}

export interface LLMBridgeResponse {
  success: boolean;
  response: string;
  orchestratorUsed: 'server' | 'client' | 'hybrid';
  modelUsed: string;
  executionMetrics: {
    totalLatency: number;
    routingTime: number;
    processingTime: number;
    cacheHitRate?: number;
    memoryUsed?: number;
    gpuAccelerated?: boolean;
  };
  confidence?: number;
  citations?: any[];
  followupSuggestions?: string[];
  error?: string;
  requestId: string;
}

export class LLMOrchestratorBridge {
  private requestCounter = 0;
  private activeRequests = new Map<string, LLMBridgeRequest>();
  private performanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    averageLatency: 0,
    cacheHitRate: 0,
    serverRoutedRequests: 0,
    clientRoutedRequests: 0,
  };

  constructor() {
    this.initializeBridge();
  }

  private async initializeBridge() {
    logger.info('[LLM Bridge] Initializing orchestrator bridge...');
    
    try {
      // Ensure both orchestrators are initialized
      await this.checkServerOrchestrator();
      await this.checkClientOrchestrator();
      
      logger.info('[LLM Bridge] Bridge initialized successfully');
    } catch (error) {
      logger.error('[LLM Bridge] Initialization failed:', error);
    }
  }

  /**
   * Main entry point - routes requests to optimal orchestrator
   */
  async processRequest(request: LLMBridgeRequest): Promise<LLMBridgeResponse> {
    const startTime = performance.now();
    const requestId = this.generateRequestId();
    request.id = requestId;

    this.activeRequests.set(requestId, request);
    this.performanceMetrics.totalRequests++;

    try {
      logger.info(`[LLM Bridge] Processing request ${requestId}: ${request.type}`);

      // Step 1: Determine optimal orchestrator
      const routingDecision = await this.determineOrchestrator(request);
      const routingTime = performance.now() - startTime;

      logger.info(`[LLM Bridge] Routing to ${routingDecision.orchestrator} for ${request.type}`);

      // Step 2: Execute with selected orchestrator
      const processingStartTime = performance.now();
      let result: LLMBridgeResponse;

      switch (routingDecision.orchestrator) {
        case 'server':
          result = await this.executeServerOrchestrator(request, routingDecision);
          this.performanceMetrics.serverRoutedRequests++;
          break;
        
        case 'client':
          result = await this.executeClientOrchestrator(request, routingDecision);
          this.performanceMetrics.clientRoutedRequests++;
          break;
        
        case 'mcp':
          result = await this.executeMCPOrchestrator(request, routingDecision);
          break;
        
        case 'hybrid':
          result = await this.executeHybridOrchestrator(request, routingDecision);
          break;
        
        default:
          throw new Error(`Unknown orchestrator: ${routingDecision.orchestrator}`);
      }

      const processingTime = performance.now() - processingStartTime;
      const totalLatency = performance.now() - startTime;

      // Step 3: Update metrics and finalize response
      result.executionMetrics.routingTime = routingTime;
      result.executionMetrics.processingTime = processingTime;
      result.executionMetrics.totalLatency = totalLatency;
      result.requestId = requestId;

      if (result.success) {
        this.performanceMetrics.successfulRequests++;
      }

      this.updatePerformanceMetrics(result);
      
      logger.info(`[LLM Bridge] Request ${requestId} completed in ${totalLatency.toFixed(2)}ms`);
      
      return result;

    } catch (error) {
      logger.error(`[LLM Bridge] Request ${requestId} failed:`, error);
      
      return {
        success: false,
        response: 'Failed to process request',
        orchestratorUsed: 'server',
        modelUsed: 'none',
        executionMetrics: {
          totalLatency: performance.now() - startTime,
          routingTime: 0,
          processingTime: 0,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      };
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Determines which orchestrator to use based on request characteristics
   */
  private async determineOrchestrator(request: LLMBridgeRequest): Promise<{
    orchestrator: 'server' | 'client' | 'hybrid' | 'mcp';
    reasoning: string;
    confidence: number;
  }> {
    // Force server orchestrator for specific model requests
    if (request.options?.model === 'server-orchestrator') {
      return {
        orchestrator: 'server',
        reasoning: 'Explicitly requested server orchestrator',
        confidence: 1.0,
      };
    }

    // Force client orchestrator for specific models
    if (request.options?.model && ['gemma270m', 'legal-bert'].includes(request.options.model)) {
      return {
        orchestrator: 'client',
        reasoning: `Client-side model requested: ${request.options.model}`,
        confidence: 1.0,
      };
    }

    // Check if MCP multi-core is available and optimal
    const mcpMetrics = mcpMultiCore.getPerformanceMetrics();
    const mcpAvailable = mcpMetrics.onlineCores > 0;
    
    // Prefer MCP for parallel processing or high-load scenarios
    if (mcpAvailable && (
      request.options?.priority === 'high' ||
      request.type === 'document_processing' ||
      (request.type === 'embedding' && request.content.length > 1000) ||
      mcpMetrics.totalLoad < (mcpMetrics.totalCapacity * 0.7) // MCP not overloaded
    )) {
      return {
        orchestrator: 'mcp',
        reasoning: `MCP multi-core optimal: ${mcpMetrics.onlineCores} cores available, load: ${mcpMetrics.totalLoad}/${mcpMetrics.totalCapacity}`,
        confidence: 0.85,
      };
    }

    // Task-based routing
    switch (request.type) {
      case 'embedding':
        return {
          orchestrator: 'client',
          reasoning: 'Embedding tasks are faster on client-side ONNX',
          confidence: 0.9,
        };

      case 'workflow':
        return {
          orchestrator: 'server',
          reasoning: 'Complex workflows require server orchestrator with XState',
          confidence: 0.95,
        };

      case 'legal_analysis':
        // Complex legal analysis -> server, simple questions -> client
        const isComplex = request.content.length > 500 || 
                         request.context?.documentType === 'contract' ||
                         request.content.includes('precedent') ||
                         request.content.includes('statute');
        
        return {
          orchestrator: isComplex ? 'server' : 'client',
          reasoning: `Legal analysis complexity: ${isComplex ? 'high' : 'low'}`,
          confidence: 0.8,
        };

      case 'search':
        return {
          orchestrator: 'server',
          reasoning: 'Search requires pgvector and Neo4j integration',
          confidence: 0.9,
        };

      case 'document_processing':
        return {
          orchestrator: 'server',
          reasoning: 'Document processing needs full pipeline with caching',
          confidence: 0.85,
        };

      case 'chat':
      default:
        // Latency-based routing for chat
        if (request.options?.priority === 'realtime' && request.options?.maxLatency && request.options.maxLatency < 200) {
          return {
            orchestrator: 'client',
            reasoning: 'Realtime chat requires low latency',
            confidence: 0.7,
          };
        } else {
          return {
            orchestrator: 'server',
            reasoning: 'Default to server for comprehensive chat capabilities',
            confidence: 0.6,
          };
        }
    }
  }

  /**
   * Execute request using server-side enhanced orchestrator
   */
  private async executeServerOrchestrator(
    request: LLMBridgeRequest,
    routing: any
  ): Promise<LLMBridgeResponse> {
    try {
      const result = await enhancedOrchestrator.process(request.content, {
        userId: request.context?.userId || 'anonymous',
        sessionId: request.context?.sessionId,
        caseId: request.context?.caseId,
        documentType: request.context?.documentType,
        legalDomain: request.context?.legalDomain,
        temperature: request.options?.temperature || 0.3,
        maxTokens: request.options?.maxTokens || 1024,
        useGPU: request.options?.useGPU || true,
        enableStreaming: request.options?.enableStreaming || false,
      });

      return {
        success: true,
        response: result.summary || result.detailed_discussion || result.response || 'No response generated',
        orchestratorUsed: 'server',
        modelUsed: 'gemma3-legal:latest',
        executionMetrics: {
          totalLatency: 0, // Will be set by caller
          routingTime: 0,  // Will be set by caller
          processingTime: 0, // Will be set by caller
          gpuAccelerated: true,
          cacheHitRate: result.metadata?.cacheHit ? 1.0 : 0.0,
        },
        confidence: result.confidence_score || 0.8,
        citations: result.sources_cited || [],
        followupSuggestions: result.recommendations || [],
        requestId: request.id,
      };
    } catch (error) {
      throw new Error(`Server orchestrator failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute request using client-side unified orchestrator
   */
  private async executeClientOrchestrator(
    request: LLMBridgeRequest,
    routing: any
  ): Promise<LLMBridgeResponse> {
    try {
      const clientRequest: ClientLLMRequest = {
        id: request.id,
        prompt: request.content,
        task: this.mapTaskToClientTask(request.type),
        priority: request.options?.priority || 'normal',
        context: {
          userId: request.context?.userId || 'anonymous',
          sessionId: request.context?.sessionId || 'default',
          legalDomain: request.context?.legalDomain,
          documentType: request.context?.documentType,
          previousContext: request.context?.previousContext,
        },
        modelPreferences: {
          preferredModel: request.options?.model === 'auto' ? 'auto' : request.options?.model as any,
          maxLatency: request.options?.maxLatency,
          qualityThreshold: 0.8,
          enableRLTraining: false,
          enableContextSwitching: true,
        },
        resourceLimits: {
          maxGPUMemoryMB: 4096,
          maxDDRRAMCacheMB: 8192,
          allowModelSwitching: true,
          enableParallelInference: true,
        },
      };

      const result: InferenceResult = await unifiedClientLLMOrchestrator.executeInference(clientRequest);

      return {
        success: result.success,
        response: result.response,
        orchestratorUsed: 'client',
        modelUsed: result.modelUsed,
        executionMetrics: {
          totalLatency: result.executionMetrics.totalLatency,
          routingTime: 0,
          processingTime: result.executionMetrics.totalLatency,
          cacheHitRate: result.executionMetrics.cacheHitRate,
          memoryUsed: result.executionMetrics.memoryUsed,
          gpuAccelerated: result.modelUsed.includes('gpu'),
        },
        confidence: result.executionMetrics.qualityScore,
        requestId: request.id,
      };
    } catch (error) {
      throw new Error(`Client orchestrator failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute request using MCP multi-core orchestrator
   */
  private async executeMCPOrchestrator(
    request: LLMBridgeRequest,
    routing: any
  ): Promise<LLMBridgeResponse> {
    try {
      const mcpTask: MCPTask = {
        id: `mcp_${request.id}`,
        type: this.mapTaskTypeToMCP(request.type),
        priority: this.mapPriorityToMCP(request.options?.priority || 'normal'),
        payload: {
          content: request.content,
          context: request.context,
          options: {
            model: request.options?.model || 'auto',
            temperature: request.options?.temperature || 0.3,
            maxTokens: request.options?.maxTokens || 1024,
            useGPU: request.options?.useGPU !== false,
          },
          metadata: request.metadata,
        },
      };

      const mcpResponse = await mcpMultiCore.submitTask(mcpTask);

      if (!mcpResponse.success) {
        throw new Error(mcpResponse.error || 'MCP processing failed');
      }

      return {
        success: true,
        response: mcpResponse.result?.response || mcpResponse.result?.content || JSON.stringify(mcpResponse.result),
        orchestratorUsed: 'mcp',
        modelUsed: mcpResponse.metadata?.model || 'mcp-worker',
        executionMetrics: {
          totalLatency: mcpResponse.processingTime,
          routingTime: 0,
          processingTime: mcpResponse.processingTime,
          cacheHitRate: mcpResponse.metadata?.cacheHit ? 1.0 : 0.0,
          gpuAccelerated: mcpResponse.metadata?.gpuAccelerated || false,
        },
        confidence: 0.8, // Default confidence for MCP tasks
        requestId: request.id,
      };
    } catch (error) {
      throw new Error(`MCP orchestrator failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute request using hybrid approach (both orchestrators)
   */
  private async executeHybridOrchestrator(
    request: LLMBridgeRequest,
    routing: any
  ): Promise<LLMBridgeResponse> {
    try {
      // Start both orchestrators in parallel
      const [serverResult, clientResult] = await Promise.allSettled([
        this.executeServerOrchestrator(request, routing),
        this.executeClientOrchestrator(request, routing),
      ]);

      // Choose best result based on confidence and success
      let bestResult: LLMBridgeResponse;
      
      if (serverResult.status === 'fulfilled' && clientResult.status === 'fulfilled') {
        const serverConfidence = serverResult.value.confidence || 0;
        const clientConfidence = clientResult.value.confidence || 0;
        
        bestResult = serverConfidence > clientConfidence ? serverResult.value : clientResult.value;
        bestResult.orchestratorUsed = 'hybrid';
      } else if (serverResult.status === 'fulfilled') {
        bestResult = serverResult.value;
        bestResult.orchestratorUsed = 'hybrid';
      } else if (clientResult.status === 'fulfilled') {
        bestResult = clientResult.value;
        bestResult.orchestratorUsed = 'hybrid';
      } else {
        throw new Error('Both orchestrators failed');
      }

      return bestResult;
    } catch (error) {
      throw new Error(`Hybrid orchestrator failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper methods
   */
  private mapTaskToClientTask(bridgeTask: string): 'chat' | 'legal_analysis' | 'context_switch' | 'embedding' | 'rl_training' {
    switch (bridgeTask) {
      case 'legal_analysis': return 'legal_analysis';
      case 'embedding': return 'embedding';
      case 'document_processing': return 'legal_analysis';
      case 'search': return 'context_switch';
      case 'workflow': return 'legal_analysis';
      case 'chat':
      default:
        return 'chat';
    }
  }

  private mapTaskTypeToMCP(bridgeTask: string): 'embedding' | 'generation' | 'analysis' | 'search' | 'workflow' {
    switch (bridgeTask) {
      case 'embedding': return 'embedding';
      case 'legal_analysis': return 'analysis';
      case 'document_processing': return 'analysis';
      case 'search': return 'search';
      case 'workflow': return 'workflow';
      case 'chat':
      default:
        return 'generation';
    }
  }

  private mapPriorityToMCP(bridgePriority: string): 'low' | 'normal' | 'high' | 'critical' {
    switch (bridgePriority) {
      case 'low': return 'low';
      case 'normal': return 'normal';
      case 'high': return 'high';
      case 'realtime': return 'critical';
      default: return 'normal';
    }
  }

  private generateRequestId(): string {
    return `bridge_${Date.now()}_${++this.requestCounter}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private updatePerformanceMetrics(result: LLMBridgeResponse) {
    // Update running averages
    const currentAvg = this.performanceMetrics.averageLatency;
    const newLatency = result.executionMetrics.totalLatency;
    this.performanceMetrics.averageLatency = 
      (currentAvg * (this.performanceMetrics.totalRequests - 1) + newLatency) / this.performanceMetrics.totalRequests;

    // Update cache hit rate if available
    if (result.executionMetrics.cacheHitRate !== undefined) {
      const currentCacheRate = this.performanceMetrics.cacheHitRate;
      this.performanceMetrics.cacheHitRate = 
        (currentCacheRate * (this.performanceMetrics.totalRequests - 1) + result.executionMetrics.cacheHitRate) / this.performanceMetrics.totalRequests;
    }
  }

  private async checkServerOrchestrator(): Promise<boolean> {
    try {
      const health = await enhancedOrchestrator.health();
      logger.info('[LLM Bridge] Server orchestrator health:', health.status);
      return health.status === 'healthy';
    } catch (error) {
      logger.warn('[LLM Bridge] Server orchestrator not available:', error);
      return false;
    }
  }

  private async checkClientOrchestrator(): Promise<boolean> {
    try {
      const status = await unifiedClientLLMOrchestrator.getStatus();
      logger.info('[LLM Bridge] Client orchestrator models loaded:', status.modelsLoaded);
      return status.modelsLoaded > 0;
    } catch (error) {
      logger.warn('[LLM Bridge] Client orchestrator not available:', error);
      return false;
    }
  }

  /**
   * Public API methods
   */
  async getStatus(): Promise<{
    bridge: {
      status: 'healthy' | 'degraded' | 'offline';
      activeRequests: number;
      totalRequests: number;
      successRate: number;
      averageLatency: number;
    };
    serverOrchestrator: any;
    clientOrchestrator: any;
  }> {
    const [serverHealth, clientStatus] = await Promise.allSettled([
      this.checkServerOrchestrator(),
      this.checkClientOrchestrator(),
    ]);

    const serverHealthy = serverHealth.status === 'fulfilled' && serverHealth.value;
    const clientHealthy = clientStatus.status === 'fulfilled' && clientStatus.value;

    let bridgeStatus: 'healthy' | 'degraded' | 'offline';
    if (serverHealthy && clientHealthy) {
      bridgeStatus = 'healthy';
    } else if (serverHealthy || clientHealthy) {
      bridgeStatus = 'degraded';
    } else {
      bridgeStatus = 'offline';
    }

    return {
      bridge: {
        status: bridgeStatus,
        activeRequests: this.activeRequests.size,
        totalRequests: this.performanceMetrics.totalRequests,
        successRate: this.performanceMetrics.totalRequests > 0 
          ? this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests 
          : 0,
        averageLatency: this.performanceMetrics.averageLatency,
      },
      serverOrchestrator: serverHealthy ? await enhancedOrchestrator.health() : { status: 'offline' },
      clientOrchestrator: clientHealthy ? await unifiedClientLLMOrchestrator.getStatus() : { status: 'offline' },
    };
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  getActiveRequests() {
    return Array.from(this.activeRequests.values());
  }
}

// Export singleton instance
export const llmOrchestratorBridge = new LLMOrchestratorBridge();
export default llmOrchestratorBridge;