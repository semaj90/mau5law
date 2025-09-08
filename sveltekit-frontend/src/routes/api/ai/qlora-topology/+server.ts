import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UnifiedCacheEnhancedOrchestrator } from '$lib/ai/unified-cache-enhanced-orchestrator.js';

interface QLoRATopologyRequest {
  query: string;
  context?: string;
  topologyType?: 'legal' | 'general' | 'technical';
  accuracyTarget?: number;
  useCache?: boolean;
  trainingMode?: boolean;
}

interface QLoRATopologyResponse {
  prediction: any;
  accuracy: number;
  topology: any;
  cacheHit: boolean;
  processingTime: number;
  metrics: {
    hmmPredictionScore: number;
    somClusterAccuracy: number;
    webgpuOptimizationGain: number;
    cacheEfficiency: number;
  };
  learningData?: {
    dataFlywheelSamples: number;
    modelUpdateApplied: boolean;
    accuracyImprovement: number;
  };
}

let orchestrator: UnifiedCacheEnhancedOrchestrator | null = null;

async function getOrchestrator(): Promise<UnifiedCacheEnhancedOrchestrator> {
  if (!orchestrator) {
    orchestrator = new UnifiedCacheEnhancedOrchestrator();
    await orchestrator.initialize();
    console.log('[QLoRA API] Unified orchestrator initialized');
  }
  return orchestrator;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: QLoRATopologyRequest = await request.json();
    const { 
      query, 
      context = '', 
      topologyType = 'general',
      accuracyTarget = 90,
      useCache = true,
      trainingMode = false
    } = body;

    if (!query) {
      return json({ error: 'Query is required' }, { status: 400 });
    }

    const startTime = Date.now();
    const orch = await getOrchestrator();

    // Process with unified intelligence
    const result = await orch.processWithUnifiedIntelligence({
      query,
      context,
      type: topologyType,
      options: {
        useCache,
        accuracyTarget,
        enableLearning: trainingMode,
        webgpuAcceleration: true,
        realTimeOptimization: true
      }
    });

    const processingTime = Date.now() - startTime;

    // Get current system metrics
    const metrics = await orch.getSystemMetrics();
    const cacheStats = await orch.getCacheStatistics();

    const response: QLoRATopologyResponse = {
      prediction: result.prediction,
      accuracy: result.accuracy,
      topology: result.topology,
      cacheHit: result.cacheHit,
      processingTime,
      metrics: {
        hmmPredictionScore: metrics.hmmAccuracy,
        somClusterAccuracy: metrics.somClusterScore,
        webgpuOptimizationGain: metrics.webgpuSpeedup,
        cacheEfficiency: cacheStats.hitRate
      }
    };

    // Add learning data if in training mode
    if (trainingMode && result.learningApplied) {
      response.learningData = {
        dataFlywheelSamples: result.trainingExamples?.length || 0,
        modelUpdateApplied: result.modelUpdated || false,
        accuracyImprovement: result.accuracyGain || 0
      };
    }

    console.log(`[QLoRA API] Processed query in ${processingTime}ms with ${result.accuracy}% accuracy`);
    
    return json(response);

  } catch (error: any) {
    console.error('[QLoRA API] Error processing request:', error);
    
    return json({ 
      error: 'Failed to process QLoRA topology prediction',
      details: error.message
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const orch = await getOrchestrator();
    const metrics = await orch.getSystemMetrics();
    const cacheStats = await orch.getCacheStatistics();

    return json({
      status: 'healthy',
      systemMetrics: metrics,
      cacheStatistics: cacheStats,
      components: {
        qloraPredictor: metrics.predictorStatus,
        searchEngine: metrics.searchEngineStatus,
        cacheOrchestrator: cacheStats.status,
        webgpuAcceleration: metrics.webgpuEnabled
      },
      performance: {
        averageAccuracy: metrics.averageAccuracy,
        averageProcessingTime: metrics.averageProcessingTime,
        cacheHitRate: cacheStats.hitRate,
        systemLoad: metrics.systemLoad
      }
    });

  } catch (error: any) {
    console.error('[QLoRA API] Health check failed:', error);
    
    return json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
};