/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: unified
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

/*
 * Unified AI Service API Endpoint
 * Tests integration between WASM, LangChain, GPU, and PostgreSQL
 */

import { json } from '@sveltejs/kit';
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';
import type { RequestHandler } from './$types';

const originalPOSTHandler: RequestHandler = async ({ request }) => {
  try {
    const { query, mode = 'auto', useContext7 = false, maxResults = 10 } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return json({ error: 'Query is required and must be a string' }, { status: 400 });
    }

    // Dynamic import to avoid SSR issues
    const { unifiedAIService } = await import('$lib/ai/unified-ai-service.js');
    
    // Initialize service if needed
    if (!unifiedAIService.initialized) {
      await unifiedAIService.initialize();
    }
    
    // Process query
    const result = await unifiedAIService.query({
      query,
      mode: mode === 'auto' ? undefined : mode,
      useContext7,
      maxResults,
      threshold: 0.7,
      includeMetadata: true
    });
    
    return json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Unified AI API Error:', error);
    
    return json({
      success: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

const originalGETHandler: RequestHandler = async () => {
  try {
    // Dynamic import to avoid SSR issues  
    const { unifiedAIService } = await import('$lib/ai/unified-ai-service.js');
    
    const stats = await unifiedAIService.getStats();
    
    return json({
      success: true,
      stats,
      availableServices: {
        wasm: !!stats.wasm,
        langchain: !!stats.langchain,
        gpu: !!stats.gpu
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Unified AI Stats Error:', error);
    
    return json({
      success: false,
      error: error.message || 'Failed to get stats',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const POST = redisOptimized.aiAnalysis(originalPOSTHandler);
export const GET = redisOptimized.aiAnalysis(originalGETHandler);