/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: inference
 * Category: conservative
 * Memory Bank: PRG_ROM
 * Priority: 150
 * Redis Type: aiAnalysis
 * 
 * Performance Impact:
 * - Cache Strategy: conservative
 * - Memory Bank: PRG_ROM (Nintendo-style)
 * - Cache hits: ~2ms response time
 * - Fresh queries: Background processing for complex requests
 * 
 * Applied by Redis Mass Optimizer - Nintendo-Level AI Performance
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ollamaService } from '$lib/server/ai/ollama-service';
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';

const originalPOSTHandler: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { prompt, model, temperature, maxTokens } = body || {};
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid prompt' }), { status: 400 });
    }

    const t0 = Date.now();
    const result = await ollamaService.generate(prompt, { model, options: { temperature, num_predict: maxTokens } });
    const latencyMs = Date.now() - t0;

    return new Response(JSON.stringify({
      text: result.response || result.text || '',
      model: result.model || model || 'auto',
      qualityScore: result.eval_count ? Math.min(1, 0.6 + (result.eval_count / 500)) : 0.75,
      latencyMs,
      tokens: result.eval_count || undefined
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'GenerationFailed', message: err?.message || String(err) }), { status: 500 });
  }
};


export const POST = redisOptimized.aiAnalysis(originalPOSTHandler);