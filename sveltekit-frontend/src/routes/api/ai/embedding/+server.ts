/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: embedding
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


import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';
import { gemmaEmbeddingService } from '$lib/services/gemma-embedding.js';
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';

const originalPOSTHandler: RequestHandler = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    const { text, content, metadata } = await request.json();
    const inputText = text || content;
    
    if (!inputText || inputText.trim() === "") {
      return json({ 
        error: "Text or content is required",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Use the improved Gemma embedding service
    const result = await gemmaEmbeddingService.generateEmbedding(inputText, metadata);
    
    if (!result.success) {
      return json({ 
        error: result.error,
        model: result.model,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return json({ 
      embedding: result.embedding,
      metadata: result.metadata,
      model: result.model,
      processingTime: result.processingTime,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return json({ 
      error: `Failed to get embedding: ${error.message}`,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

const originalGETHandler: RequestHandler = async () => {
  try {
    const healthResult = await gemmaEmbeddingService.healthCheck();
    
    return json({
      service: "AI Embedding API",
      ...healthResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return json({
      service: "AI Embedding API", 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};


export const POST = redisOptimized.aiAnalysis(originalPOSTHandler);
export const GET = redisOptimized.aiAnalysis(originalGETHandler);