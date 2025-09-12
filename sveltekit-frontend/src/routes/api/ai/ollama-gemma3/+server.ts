/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: ollama-gemma3
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
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';
import type { RequestHandler } from './$types';


const originalPOSTHandler: RequestHandler = async ({ request }) => {
  try {
    const { prompt } = await request.json();
    if (!prompt || prompt.trim() === "") {
      return json({ error: "Prompt is required" }, { status: 400 });
    }
    // Call Ollama API for Gemma3 model
    const ollamaRes = await fetch("http://localhost:11436/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gemma3-legal:latest", prompt }),
    });

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text();
      return json(
        { error: "Ollama error", details: errorText },
        { status: 500 },
      );
    }
    const data = await ollamaRes.json();
    return json({ response: data.response, model: "gemma3-legal:latest" });
  } catch (error: any) {
    console.error("Ollama Gemma3 error:", error);
    return json({ error: "Failed to call Ollama Gemma3" }, { status: 500 });
  }
};


export const POST = redisOptimized.aiAnalysis(originalPOSTHandler);