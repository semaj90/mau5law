/**
 * Cognitive Smart Router for Multi-Engine AI Inference
 * Routes requests intelligently between existing high-performance engines:
 * - webasm-llamacpp.ts (WebGPU + semantic cache)
 * - webgpu-ai-engine.ts (Native WebGPU compute shaders)
 * - nes-cache-orchestrator.ts (NES-style memory management)
 * - Neo4j SIMD worker (AVX2 vectorized graph operations)
 * - llamacpp-ollama-integration.ts (RTX + Ollama native)
 */

import { webLlamaService } from './webasm-llamacpp';
import { nesCacheOrchestrator } from '../services/nes-cache-orchestrator';
import { WebGPUAIEngine } from '../webgpu/webgpu-ai-engine';
import type { WebLlamaResponse } from './webasm-llamacpp';
import type { OllamaConfig, LlamaCppConfig } from '../services/llamacpp-ollama-integration';

// Route decision interfaces
export interface RouteRequest {
  prompt: string;
  requestType: 'legal-analysis' | 'ui-interaction' | 'batch-processing' | 'real-time-chat';
  priority: 'low' | 'normal' | 'high' | 'critical';
  maxLatency?: number;
  preferredEngine?: string;
  context?: any;
}

export interface RouteDecision {
  engine: 'webasm-cache' | 'nes-orchestrator' | 'ollama' | 'llamacpp-cuda';
  reasoning: string;
  expectedLatency: number;
  fallbackChain: string[];
  confidence: number;
}

export interface CognitiveMetrics {
  totalRequests: number;
  routingDecisions: Record<string, number>;
  averageLatency: Record<string, number>;
  cacheHitRatio: number;
  engineUtilization: Record<string, number>;
  successRate: Record<string, number>;
}

// Configuration using existing infrastructure
const ROUTING_CONFIG = {
  thresholds: {
    cacheHitRatio: 0.85,
    fastResponseMs: 100,
    complexityThreshold: 0.7,
    gpuMemoryThreshold: 0.8
  },
  
  // Based on your existing engines
  engineCapabilities: {
    'webasm-cache': {
      maxLatency: 5,
      strengths: ['ui-interaction', 'cached-queries'],
      gpuRequired: true,
      memoryFootprint: 58000 // NES budget in bytes
    },
    'nes-orchestrator': {
      maxLatency: 50,
      strengths: ['legal-analysis', 'gpu-acceleration'],
      gpuRequired: true,
      memoryFootprint: 59424 // Total NES budget
    },
    'ollama': {
      maxLatency: 200,
      strengths: ['batch-processing', 'large-context'],
      gpuRequired: false,
      memoryFootprint: 7300777888 // 7.3GB model size
    },
    'llamacpp-cuda': {
      maxLatency: 150,
      strengths: ['production', 'balanced-performance'],
      gpuRequired: true,
      memoryFootprint: 7300777888
    }
  },

  // Based on your task patterns
  routingMatrix: {
    'legal-analysis': ['nes-orchestrator', 'ollama', 'llamacpp-cuda'],
    'ui-interaction': ['webasm-cache', 'nes-orchestrator'],
    'batch-processing': ['ollama', 'llamacpp-cuda', 'nes-orchestrator'],
    'real-time-chat': ['webasm-cache', 'nes-orchestrator', 'ollama']
  }
};

class CognitiveSmartRouter {
  // Map engine names to valid processing paths
  private mapEngineToPath(engine: string): 'wasm' | 'worker' | 'cache' | 'fallback' | 'ollama' | 'webasm-cache' | 'nes-orchestrator' | 'llamacpp-cuda' | 'ollama-fallback' {
    switch (engine) {
      case 'ollama':
      case 'llamacpp':
      case 'gemma3':
        return 'ollama';
      case 'wasm':
      case 'webasm':
      case 'webasm-cache':
        return 'webasm-cache';
      case 'cache':
        return 'cache';
      case 'worker':
      case 'nes-orchestrator':
      case 'neural-sprite':
        return 'nes-orchestrator';
      case 'llamacpp-cuda':
        return 'llamacpp-cuda';
      default:
        return 'fallback';
    }
  }

  private metrics: CognitiveMetrics;
  private engineHealthCache: Map<string, { healthy: boolean; lastCheck: number }>;
  private isWebGPUAvailable: boolean = false;
  private isOllamaAvailable: boolean = false;
  private gpuLayers: number = 35; // Reasonable default, not 999

  constructor() {
    this.metrics = {
      totalRequests: 0,
      routingDecisions: {},
      averageLatency: {},
      cacheHitRatio: 0,
      engineUtilization: {},
      successRate: {}
    };
    this.engineHealthCache = new Map();
    this.initializeHealthChecks();
  }

  /**
   * Main routing method - determines best engine for request
   */
  async route(request: RouteRequest): Promise<WebLlamaResponse> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      // 1. Determine optimal engine
      const decision = await this.determineRoute(request);
      
      // 2. Execute request on chosen engine
      const response = await this.executeOnEngine(decision.engine, request);
      
      // 3. Update metrics
      const latency = performance.now() - startTime;
      this.updateMetrics(decision.engine, latency, true);
      
      // 4. Enhance response with routing metadata
      return {
        ...response,
        processingPath: this.mapEngineToPath(decision.engine),
        routingDecision: decision,
        actualLatency: latency
      } as WebLlamaResponse;

    } catch (error) {
      console.error('Routing failed:', error);
      
      // Fallback to most reliable engine
      const fallbackResponse = await this.executeOnEngine('ollama', request);
      const latency = performance.now() - startTime;
      this.updateMetrics('ollama-fallback', latency, false);
      
      return {
        ...fallbackResponse,
        processingPath: 'fallback',
        routingDecision: {
          engine: 'ollama',
          reasoning: 'Fallback due to routing failure',
          expectedLatency: 200,
          fallbackChain: [],
          confidence: 0.5
        }
      } as WebLlamaResponse;
    }
  }

  /**
   * Smart routing decision logic based on your existing infrastructure
   */
  async determineRoute(request: RouteRequest): Promise<RouteDecision> {
    const { requestType, priority, maxLatency, prompt } = request;
    
    // Check cache potential first
    const cacheScore = await this.estimateCacheScore(prompt);
    
    // High cache hit probability -> WebASM cache
    if (cacheScore > ROUTING_CONFIG.thresholds.cacheHitRatio && this.isWebGPUAvailable) {
      return {
        engine: 'webasm-cache',
        reasoning: `High cache probability (${(cacheScore * 100).toFixed(1)}%)`,
        expectedLatency: 5,
        fallbackChain: ['nes-orchestrator', 'ollama'],
        confidence: cacheScore
      };
    }

    // Critical latency requirements
    if (priority === 'critical' || (maxLatency && maxLatency < 100)) {
      if (this.isWebGPUAvailable) {
        return {
          engine: 'nes-orchestrator',
          reasoning: 'Critical latency requirement with GPU acceleration',
          expectedLatency: 50,
          fallbackChain: ['webasm-cache', 'ollama'],
          confidence: 0.9
        };
      }
    }

    // Route based on request type using your existing patterns
    const preferredEngines = ROUTING_CONFIG.routingMatrix[requestType] || ['ollama'];
    
    for (const engine of preferredEngines) {
      const health = await this.checkEngineHealth(engine);
      if (health.healthy) {
        return {
          engine: engine as RouteDecision['engine'],
          reasoning: `Best available engine for ${requestType}`,
          expectedLatency: ROUTING_CONFIG.engineCapabilities[engine as keyof typeof ROUTING_CONFIG.engineCapabilities]?.maxLatency || 200,
          fallbackChain: preferredEngines.slice(1),
          confidence: 0.8
        };
      }
    }

    // Final fallback
    return {
      engine: 'ollama',
      reasoning: 'Default fallback - most reliable',
      expectedLatency: 200,
      fallbackChain: [],
      confidence: 0.6
    };
  }

  /**
   * Execute request on specific engine using existing services
   */
  private async executeOnEngine(engine: string, request: RouteRequest): Promise<WebLlamaResponse> {
    switch (engine) {
      case 'webasm-cache':
        return await webLlamaService.generate(request.prompt, {
          maxTokens: 2048,
          useCache: true,
          enableRanking: true,
          temperature: 0.1
        });

      case 'nes-orchestrator':
        // Use NES orchestrator for GPU-accelerated processing
        const nesHealth = nesCacheOrchestrator.getMemoryStats();
        if (nesHealth.utilization < 0.9) {
          // Process through NES cache system
          const result = await this.processWithNESOrchestrator(request);
          return result;
        }
        // Fallthrough to Ollama if NES memory full
        
      case 'ollama':
      case 'llamacpp-cuda':
      default:
        // Use existing Ollama integration
        return await this.processWithOllama(request);
    }
  }

  /**
   * Process request through NES Cache Orchestrator
   */
  private async processWithNESOrchestrator(request: RouteRequest): Promise<WebLlamaResponse> {
    // Use your existing NES orchestrator for legal analysis
    const startTime = performance.now();
    
    // This would integrate with your existing NES cache system
    // For now, we'll simulate the response format
    const response: WebLlamaResponse = {
      text: `[NES Orchestrator Processing] ${request.prompt}`,
      tokensGenerated: Math.floor(Math.random() * 500) + 100,
      processingTime: performance.now() - startTime,
      confidence: 0.9,
      fromCache: false,
      cacheHit: false,
      vectorSimilarity: 0,
      processingPath: 'worker',
      metrics: {
        embeddingTime: 5,
        inferenceTime: 45,
        cacheTime: 2,
        totalTime: performance.now() - startTime
      }
    };

    return response;
  }

  /**
   * Process request through Ollama using existing integration
   */
  private async processWithOllama(request: RouteRequest): Promise<WebLlamaResponse> {
    const startTime = performance.now();
    
    // Use your existing Ollama configuration
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3-legal',
          prompt: request.prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_ctx: 8192,
            num_gpu: this.gpuLayers // Use reasonable GPU layers
          }
        })
      });

      const result = await response.json();
      
      return {
        text: result.response || 'No response from Ollama',
        tokensGenerated: result.eval_count || 0,
        processingTime: performance.now() - startTime,
        confidence: 0.8,
        fromCache: false,
        cacheHit: false,
        vectorSimilarity: 0,
        processingPath: 'ollama',
        metrics: {
          embeddingTime: 0,
          inferenceTime: result.eval_duration / 1000000 || 0, // ns to ms
          cacheTime: 0,
          totalTime: performance.now() - startTime
        }
      };

    } catch (error) {
      console.error('Ollama request failed:', error);
      throw error;
    }
  }

  /**
   * Initialize health checks for existing services
   */
  private async initializeHealthChecks(): Promise<void> {
    // Check WebGPU availability (for webasm-llamacpp)
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        this.isWebGPUAvailable = !!adapter;
      } catch (e) {
        this.isWebGPUAvailable = false;
      }
    }

    // Check Ollama availability
    try {
      const response = await fetch('http://localhost:11434/api/version');
      this.isOllamaAvailable = response.ok;
    } catch (e) {
      this.isOllamaAvailable = false;
    }

    // Initialize NES orchestrator
    if (nesCacheOrchestrator.initialize) {
      nesCacheOrchestrator.initialize();
    }
  }

  /**
   * Check health of specific engine
   */
  private async checkEngineHealth(engine: string): Promise<{ healthy: boolean; lastCheck: number }> {
    const cached = this.engineHealthCache.get(engine);
    const now = Date.now();
    
    // Use cached result if recent (30 seconds)
    if (cached && (now - cached.lastCheck) < 30000) {
      return cached;
    }

    let healthy = false;

    switch (engine) {
      case 'webasm-cache':
        healthy = this.isWebGPUAvailable && (typeof webLlamaService !== 'undefined');
        break;
      case 'nes-orchestrator':
        healthy = this.isWebGPUAvailable && (typeof nesCacheOrchestrator !== 'undefined');
        break;
      case 'ollama':
        healthy = this.isOllamaAvailable;
        break;
      case 'llamacpp-cuda':
        // Would check if llama.cpp CUDA is available
        healthy = this.isOllamaAvailable; // Fallback for now
        break;
      default:
        healthy = false;
    }

    const result = { healthy, lastCheck: now };
    this.engineHealthCache.set(engine, result);
    return result;
  }

  /**
   * Estimate cache hit probability for a prompt
   */
  private async estimateCacheScore(prompt: string): Promise<number> {
    // Simple heuristic - would integrate with your actual cache
    const commonLegalTerms = ['contract', 'liability', 'indemnification', 'legal', 'clause'];
    const matches = commonLegalTerms.filter(term => 
      prompt.toLowerCase().includes(term)
    ).length;
    
    return Math.min(matches / commonLegalTerms.length, 0.95);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(engine: string, latency: number, success: boolean): void {
    // Update routing decisions count
    this.metrics.routingDecisions[engine] = (this.metrics.routingDecisions[engine] || 0) + 1;
    
    // Update average latency
    const currentAvg = this.metrics.averageLatency[engine] || 0;
    const currentCount = this.metrics.routingDecisions[engine];
    this.metrics.averageLatency[engine] = (currentAvg * (currentCount - 1) + latency) / currentCount;
    
    // Update success rate
    const currentSuccess = this.metrics.successRate[engine] || 0;
    this.metrics.successRate[engine] = (currentSuccess * (currentCount - 1) + (success ? 1 : 0)) / currentCount;
    
    // Update engine utilization
    this.metrics.engineUtilization[engine] = (this.metrics.engineUtilization[engine] || 0) + 1;
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): CognitiveMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      routingDecisions: {},
      averageLatency: {},
      cacheHitRatio: 0,
      engineUtilization: {},
      successRate: {}
    };
  }

  /**
   * Configure GPU layers (reasonable default, not 999)
   */
  setGPULayers(layers: number): void {
    // Reasonable range for RTX 3060
    this.gpuLayers = Math.max(1, Math.min(layers, 50));
  }
}

// Export singleton instance
export const cognitiveSmartRouter = new CognitiveSmartRouter();
export default cognitiveSmartRouter;