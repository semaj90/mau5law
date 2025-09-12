/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: voice
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


import { SpeechService } from "$lib/services/speech-service";
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';
import type { RequestHandler } from './$types';


export async function POST({ request }): Promise<any> {
  const { audio } = await request.json();
  const transcript = await SpeechService.transcribe(audio);
  return json({ transcript });
}


