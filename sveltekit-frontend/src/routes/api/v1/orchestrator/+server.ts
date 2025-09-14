import type { RequestHandler } from './$types.js.js';

// Unified Service Orchestrator API Endpoint
// Provides HTTP interface to the complete GPU/WASM integration system

import { json, error } from '@sveltejs/kit';
import { readBodyFast } from '$lib/server/utils/json-fast';
import { getOrchestrator, type SystemHealth } from '$lib/services/unified-service-orchestrator';
import { TaskPriority } from '$lib/services/unified-service-orchestrator';
import { URL } from 'url';

const orchestrator = getOrchestrator({
  enabledServices: ['wasmGPU', 'quicGateway', 'llamaOllama', 'nesGPUBridge'],
  performanceThresholds: {
    maxLatency: 2000,
    minThroughput: 5,
    maxCpuUsage: 85,
    maxMemoryUsage: 75,
  },
  retryConfiguration: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 100,
  },
  monitoring: {
    healthCheckInterval: 30000,
    metricsRetentionPeriod: 3600000,
    alertThresholds: {
      latency: 3000,
      errorRate: 10,
      throughput: 3,
    },
  },
});

// GET /api/v1/orchestrator - System health and status
export const GET: RequestHandler = async ({ url }) => {
  try {
    const endpoint = url.searchParams.get('endpoint') || 'health';

    switch (endpoint) {
      case 'health':
        const health = orchestrator.getSystemHealth();
        return json({
          success: true,
          data: health,
          timestamp: new Date().toISOString(),
        });

      case 'metrics':
        const metrics = orchestrator.getPerformanceMetrics();
        return json({
          success: true,
          data: {
            metrics,
            count: metrics.length,
            latestMetric: metrics[metrics.length - 1] || null,
          },
          timestamp: new Date().toISOString(),
        });

      case 'tasks':
        const activeTasks = orchestrator.getActiveTasks();
        const taskQueue = orchestrator.getTaskQueue();
        return json({
          success: true,
          data: {
            activeTasks,
            taskQueue,
            activeCount: activeTasks.length,
            queueCount: taskQueue.length,
          },
          timestamp: new Date().toISOString(),
        });

      default:
        throw error(400, `Unknown endpoint: ${endpoint}`);
    }
  } catch (err: any) {
    console.error('[Orchestrator API] GET error:', err);
    throw error(500, `Internal server error: ${err}`);
  }
};

// POST /api/v1/orchestrator - Execute orchestrated operations
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { operation, data, options = {} } = await readBodyFast(request);

    if (!operation || !data) {
      throw error(400, 'Missing required fields: operation, data');
    }

    // Parse priority
    const priority = options.priority
      ? TaskPriority[options.priority.toUpperCase() as keyof typeof TaskPriority]
      : TaskPriority.NORMAL;

    let result;
    const startTime = Date.now();

    switch (operation) {
      case 'processDocument':
        if (typeof (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).document !== 'string') {
          throw error(400, 'Document must be a string');
        }

        result = await orchestrator.processLegalDocument((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).document, {
          ...options,
          priority,
          analysisType: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).analysisType || 'comprehensive',
          maxTokens: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).maxTokens || 2048,
          temperature: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).temperature || 0.7,
        });
        break;

      case 'performInference':
        if (!Array.isArray((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).input)) {
          throw error(400, 'Input must be an array');
        }

        const inputArray = new Float32Array((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).input);
        result = await orchestrator.performNeuralInference(inputArray, {
          ...options,
          priority,
          modelType: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).modelType || 'transformer',
          precision: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).precision || 'fp32',
        });
        break;

      case 'processCanvas':
        if (!(data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).canvasState || !(data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).canvasState.width || !(data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).canvasState.height) {
          throw error(400, 'Invalid canvas state');
        }

        // Convert array back to Uint8ClampedArray if needed
        const canvasData = Array.isArray((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).canvasState.data)
          ? new Uint8ClampedArray((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).canvasState.data)
          : (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).canvasState.data;

        result = await orchestrator.processCanvasState(
          {
            width: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).canvasState.width,
            height: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).canvasState.height,
            data: canvasData,
            format: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).canvasState.format || 'RGBA',
          },
          {
            ...options,
            priority,
            targetBitDepth: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).targetBitDepth || 24,
            optimization: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).optimization || 'balanced',
          }
        );
        break;

      case 'executeGPU':
        if (!(data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).operation) {
          throw error(400, 'GPU operation not specified');
        }

        result = await orchestrator.executeGPUComputation((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).operation, (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).params || {}, {
          ...options,
          priority,
          precision: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).precision || 'fp32',
          timeout: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).timeout || 15000,
        });
        break;

      case 'matmul':
        if (!Array.isArray((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).a) || !Array.isArray((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).b)) {
          throw error(400, 'Matrix multiplication requires arrays a and b');
        }

        result = await orchestrator.executeGPUComputation(
          'matmul',
          {
            a: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).a,
            b: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).b,
            m: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).m || Math.sqrt((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).a.length),
            n: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).n || Math.sqrt((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).b.length),
            k: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).k || Math.sqrt((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).a.length),
          },
          { ...options, priority }
        );
        break;

      case 'attention':
        if (!Array.isArray((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).query) || !Array.isArray((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).key) || !Array.isArray((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).value)) {
          throw error(400, 'Attention requires query, key, and value arrays');
        }

        result = await orchestrator.executeGPUComputation(
          'attention',
          {
            query: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).query,
            key: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).key,
            value: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).value,
            seq_len: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).seq_len || Math.sqrt((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).query.length),
            dim: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).dim || Math.sqrt((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).query.length),
          },
          { ...options, priority }
        );
        break;

      case 'conv2d':
        if (!Array.isArray((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).input) || !Array.isArray((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).kernel)) {
          throw error(400, 'Convolution requires input and kernel arrays');
        }

        result = await orchestrator.executeGPUComputation(
          'conv2d',
          {
            input: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).input,
            kernel: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).kernel,
            width: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).width || Math.sqrt((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).input.length),
            height: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).height || Math.sqrt((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).input.length),
            kernel_size: (data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).kernel_size || Math.sqrt((data as { document?: any; analysisType?: any; maxTokens?: any; temperature?: any; input?: any; modelType?: any; precision?: any; canvasState?: any; targetBitDepth?: any; optimization?: any; operation?: any; params?: any; timeout?: any; a?: any; b?: any; m?: any; n?: any; k?: any; query?: any; key?: any; value?: any; seq_len?: any; dim?: any; kernel?: any; width?: any; height?: any; kernel_size?: any }).kernel.length),
          },
          { ...options, priority }
        );
        break;

      default:
        throw error(400, `Unknown operation: ${operation}`);
    }

    const totalTime = Date.now() - startTime;

    return json({
      success: true,
      data: result,
      operation,
      totalProcessingTime: totalTime,
      timestamp: new Date().toISOString(),
      metadata: {
        operation,
        priority: TaskPriority[priority],
        servicesUsed: (result as { servicesUsed?: any; fallbacksTriggered?: any; performance?: any }).servicesUsed,
        fallbacksTriggered: (result as { servicesUsed?: any; fallbacksTriggered?: any; performance?: any }).fallbacksTriggered,
        performance: (result as { servicesUsed?: any; fallbacksTriggered?: any; performance?: any }).performance,
      },
    });
  } catch (err: any) {
    console.error('[Orchestrator API] POST error:', err);

    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }

    return json(
      {
        success: false,
        error: String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};

// PUT /api/v1/orchestrator - Update orchestrator configuration
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { config } = await request.json();

    if (!config) {
      throw error(400, 'Configuration object required');
    }

    // Note: In a full implementation, we'd need to reinitialize the orchestrator
    // with new configuration. For now, we'll just return the current health.
    const health = orchestrator.getSystemHealth();

    return json({
      success: true,
      message: 'Configuration update acknowledged',
      data: {
        health,
        requestedConfig: config,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Orchestrator API] PUT error:', err);
    throw error(500, `Configuration update failed: ${err}`);
  }
};

// DELETE /api/v1/orchestrator - Shutdown orchestrator (for maintenance)
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const confirm = url.searchParams.get('confirm');

    if (confirm !== 'true') {
      throw error(400, 'Must confirm shutdown with ?confirm=true');
    }

    // In a production environment, you'd want proper authentication here
    await orchestrator.shutdown();

    return json({
      success: true,
      message: 'Orchestrator shutdown initiated',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Orchestrator API] DELETE error:', err);
    throw error(500, `Shutdown failed: ${err}`);
  }
};