import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { webgpuPolyfill } from '$lib/webgpu/webgpu-polyfill';

export interface VectorSimilarityRequest {
  vector1: number[];
  vector2: number[];
  mode?: 'webgpu' | 'webgl' | 'cpu' | 'auto';
  returnDiagnostics?: boolean;
}

export interface VectorSimilarityResponse {
  similarity: number;
  mode: 'webgpu' | 'webgl' | 'cpu';
  executionTimeMs: number;
  diagnostics?: {
    webgpuAvailable: boolean;
    webglAvailable: boolean;
    vectorLength: number;
    performanceStats?: any;
  };
  error?: string;
}

// GET endpoint for WebGPU capabilities info
export const GET: RequestHandler = async () => {
  try {
    const capabilities = {
      endpoint: '/api/webgpu/vector-similarity',
      description: 'Compute vector similarity using WebGPU, WebGL, or CPU fallback',
      webgpuSupported: typeof navigator !== 'undefined' && 'gpu' in navigator,
      methods: ['POST'],
      requestFormat: {
        vector1: 'number[] - First vector',
        vector2: 'number[] - Second vector (must be same length as vector1)',
        mode: 'string (optional) - "webgpu", "webgl", "cpu", or "auto" (default)',
        returnDiagnostics: 'boolean (optional) - Include performance diagnostics'
      },
      responseFormat: {
        similarity: 'number - Cosine similarity score (-1 to 1)',
        mode: 'string - Actual computation mode used',
        executionTimeMs: 'number - Execution time in milliseconds',
        diagnostics: 'object (optional) - Performance and capability info'
      },
      notes: [
        'Vectors must be the same length',
        'WebGPU provides fastest computation for large vectors (>256 dimensions)',
        'Automatically falls back to WebGL then CPU if WebGPU unavailable',
        'Returns cosine similarity: 1 = identical, 0 = perpendicular, -1 = opposite'
      ]
    };

    return json(capabilities);
  } catch (error: any) {
    return json({ error: 'Failed to get capabilities' }, { status: 500 });
  }
};

// POST endpoint for vector similarity computation
export const POST: RequestHandler = async ({ request }) => {
  const startTime = performance.now();
  
  try {
    const body: VectorSimilarityRequest = await request.json();
    
    // Validate input
    if (!Array.isArray(body.vector1) || !Array.isArray(body.vector2)) {
      return json({
        error: 'Both vector1 and vector2 must be arrays of numbers'
      } as VectorSimilarityResponse, { status: 400 });
    }

    if (body.vector1.length !== body.vector2.length) {
      return json({
        error: `Vector length mismatch: vector1 has ${body.vector1.length} dimensions, vector2 has ${body.vector2.length} dimensions`
      } as VectorSimilarityResponse, { status: 400 });
    }

    if (body.vector1.length === 0) {
      return json({
        error: 'Vectors cannot be empty'
      } as VectorSimilarityResponse, { status: 400 });
    }

    // Validate that all elements are numbers
    const isValidVector = (vec: any[]): vec is number[] => {
      return vec.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    };

    if (!isValidVector(body.vector1) || !isValidVector(body.vector2)) {
      return json({
        error: 'All vector elements must be finite numbers'
      } as VectorSimilarityResponse, { status: 400 });
    }

    const mode = body.mode || 'auto';
    let similarity: number;
    let actualMode: 'webgpu' | 'webgl' | 'cpu';
    let initResult = false;

    try {
      // Initialize WebGPU polyfill if not already done
      initResult = await webgpuPolyfill.initialize();
      
      if (mode === 'webgpu' || mode === 'auto') {
        // Try WebGPU first
        try {
          similarity = await webgpuPolyfill.computeSimilarity(body.vector1, body.vector2);
          actualMode = 'webgpu';
        } catch (webgpuError) {
          if (mode === 'webgpu') {
            throw webgpuError; // Explicit WebGPU mode should fail if WebGPU fails
          }
          // Fall back for auto mode
          similarity = (webgpuPolyfill as any).computeSimilarityCPU(body.vector1, body.vector2);
          actualMode = 'cpu';
        }
      } else if (mode === 'webgl') {
        try {
          similarity = await (webgpuPolyfill as any).computeSimilarityWebGL(body.vector1, body.vector2);
          actualMode = 'webgl';
        } catch (webglError) {
          // Fall back to CPU for WebGL mode
          similarity = (webgpuPolyfill as any).computeSimilarityCPU(body.vector1, body.vector2);
          actualMode = 'cpu';
        }
      } else {
        // CPU mode
        similarity = (webgpuPolyfill as any).computeSimilarityCPU(body.vector1, body.vector2);
        actualMode = 'cpu';
      }

    } catch (error: any) {
      // Ultimate fallback to CPU
      console.warn('Vector similarity computation failed, falling back to CPU:', error);
      similarity = (webgpuPolyfill as any).computeSimilarityCPU(body.vector1, body.vector2);
      actualMode = 'cpu';
    }

    const executionTime = performance.now() - startTime;

    const response: VectorSimilarityResponse = {
      similarity,
      mode: actualMode,
      executionTimeMs: executionTime
    };

    // Add diagnostics if requested
    if (body.returnDiagnostics) {
      const stats = webgpuPolyfill.getPerformanceStats();
      response.diagnostics = {
        webgpuAvailable: initResult && stats.isWebGPUAvailable,
        webglAvailable: stats.hasWebGLFallback,
        vectorLength: body.vector1.length,
        performanceStats: {
          operationsCompleted: stats.operationsCompleted,
          averageProcessingTime: stats.averageProcessingTime,
          webgpuPercentage: stats.webgpuPercentage,
          webglPercentage: stats.webglPercentage
        }
      };
    }

    return json(response);

  } catch (error: any) {
    const executionTime = performance.now() - startTime;
    
    return json({
      similarity: 0,
      mode: 'cpu' as const,
      executionTimeMs: executionTime,
      error: `Vector similarity computation failed: ${error.message || error}`
    } as VectorSimilarityResponse, { status: 500 });
  }
};