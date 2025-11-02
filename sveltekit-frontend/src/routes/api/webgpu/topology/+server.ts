/**
 * WebGPU QLoRA Topology Prediction API
 * SvelteKit 2 API endpoint for legal AI topology optimization
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { qloraTopologyPredictor } from '$lib/ai/qlora-topology-predictor';
import { webgpuRAGService } from '$lib/webgpu/webgpu-rag-service';
import type { LegalDocument } from '$lib/memory/nes-memory-architecture';
import type { UserBehaviorPattern } from '$lib/ai/qlora-topology-predictor';
export const POST: RequestHandler = async ({ request }) => {
  try {
    // parse JSON safely and avoid `any`
    const body = await request.json().catch(() => ({}) as Record<string, unknown>);
    const b = body as Record<string, unknown>;
    const _rawDocType = typeof b['documentType'] === 'string' ? (b['documentType'] as string) : undefined;
    const allowedDocTypes = new Set(['evidence', 'contract', 'brief', 'citation', 'precedent']);
    const documentType =
      _rawDocType && allowedDocTypes.has(_rawDocType) ? (_rawDocType as LegalDocument['type']) : 'contract';
    const complexity = typeof b['complexity'] === 'number' ? (b['complexity'] as number) : 0.7;

    // Create mock legal document
    const document: LegalDocument = {
      id: `doc_${Date.now()}`,
      type: documentType,
      priority: Math.max(0, Math.min(255, Math.floor((complexity || 0.5) * 255))),
      size: 1024 * 1024, // default 1MB
      confidenceLevel: Math.max(0, Math.min(1, complexity || 0.7)),
      riskLevel: complexity > 0.8 ? 'high' : complexity > 0.5 ? 'medium' : 'low',
      lastAccessed: Date.now(),
      compressed: true,
      metadata:
        typeof b['metadata'] === 'object' && b['metadata'] !== null ? (b['metadata'] as Record<string, unknown>) : {}
    };

    // Parse optional inputs from request body with safe defaults
    const userPattern =
      typeof b['userPattern'] === 'object' && b['userPattern'] !== null
        ? (b['userPattern'] as Partial<UserBehaviorPattern>)
        : {};

    const performanceRequirements =
      typeof b['performanceRequirements'] === 'object' && b['performanceRequirements'] !== null
        ? (b['performanceRequirements'] as Record<string, unknown>)
        : {};

    const query =
      typeof b['query'] === 'string'
        ? (b['query'] as string)
        : typeof b['prompt'] === 'string'
          ? (b['prompt'] as string)
          : 'topology optimization';

    // Conditional fallback for user analytics when there's no active user session
    const userAnalytics =
      typeof b['user'] === 'object' &&
      b['user'] !== null &&
      typeof (b['user'] as Record<string, unknown>)['analytics'] === 'object'
        ? ((b['user'] as Record<string, unknown>)['analytics'] as Record<string, unknown>)
        : { sessions: 0, lastActive: null, engagementScore: 0 };

    // Create user behavior pattern (use satisfies to enforce exact keys & avoid stale interface collisions)
    const behavior = {
      sessionType: userPattern.sessionType || 'analysis',
      focusIntensity: userPattern.focusIntensity ?? 0.7,
      documentFlow:
        Array.isArray(userPattern.documentFlow) && userPattern.documentFlow.length > 0
          ? userPattern.documentFlow
          : [documentType || 'contract'],
      interactionVelocity: userPattern.interactionVelocity ?? 0.5,
      qualityExpectation: userPattern.qualityExpectation ?? 0.8,
      timeConstraints: userPattern.timeConstraints ?? 0.6
    } satisfies UserBehaviorPattern;

    // Performance requirements
    // Coerce performance requirements into typed numeric values with safe defaults
    const perfRaw = performanceRequirements as Record<string, unknown>;
    const perfReqs = {
      maxLatency:
        typeof perfRaw.maxLatency === 'number'
          ? perfRaw.maxLatency
          : typeof perfRaw.maxLatency === 'string'
            ? Number(perfRaw.maxLatency) || 1000
            : 1000,
      minAccuracy:
        typeof perfRaw.minAccuracy === 'number'
          ? perfRaw.minAccuracy
          : typeof perfRaw.minAccuracy === 'string'
            ? Number(perfRaw.minAccuracy) || 0.85
            : 0.85,
      memoryBudget:
        typeof perfRaw.memoryBudget === 'number'
          ? perfRaw.memoryBudget
          : typeof perfRaw.memoryBudget === 'string'
            ? Number(perfRaw.memoryBudget) || 512
            : 512
    };
    // Get topology prediction from QLoRA predictor with HMM
    const topologyPrediction = await qloraTopologyPredictor.predictOptimalTopology(document, behavior, perfReqs);
    // Initialize WebGPU service if available
    const webgpuInit = await webgpuRAGService.initializeWebGPU();
    // Process query with WebGPU acceleration
    const webgpuResult = await webgpuRAGService.processQuery(query || 'topology optimization', {
      useGPU: true,
      topologyConfig: topologyPrediction.predictedConfig
    });
    // Get HMM accuracy metrics
    const hmmMetrics = qloraTopologyPredictor.getAccuracyMetrics();
    return json({
      success: true,
      prediction: topologyPrediction,
      webgpu: {
        initialized: webgpuInit,
        result: webgpuResult
      },
      hmm: {
        accuracy: hmmMetrics.overallAccuracy,
        confidence: hmmMetrics.modelConfidence,
        totalPredictions: hmmMetrics.totalPredictions,
        cacheHitRate: hmmMetrics.cacheHitRate
      },
      userAnalytics,
      document: {
       , id: document.id,
        type: document.type,
        complexity: document.confidenceLevel
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ WebGPU Topology Prediction Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};
export const GET: RequestHandler = async () => {
  try {
    // Health check for WebGPU + QLoRA topology system
    const hmmMetrics = qloraTopologyPredictor.getAccuracyMetrics();
    const webgpuInit = await webgpuRAGService.initializeWebGPU();
    return json({
      status: 'operational',
      services: {
        qloraTopology: 'ready',
        hmmPredictor: 'ready',
        webgpuRag: webgpuInit.adapter ? 'ready' : 'fallback` },
      metrics: {
       , hmmAccuracy: hmmMetrics.overallAccuracy,
        hmmConfidence: hmmMetrics.modelConfidence,
        totalPredictions: hmmMetrics.totalPredictions,
        cacheHitRate: hmmMetrics.cacheHitRate
      },
      webgpu: webgpuInit,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ WebGPU Topology Health Check Error:', error);
    return json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};
