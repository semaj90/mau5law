/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: history
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

import { aiHistory } from "$lib/db/schema/aiHistory";
import { json } from "@sveltejs/kit";
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';
import type { RequestHandler } from './$types';


const originalPOSTHandler: RequestHandler = async ({ request, locals }) => {
  try {
    const { prompt, response, embedding } = await request.json();
    const userId = locals.user?.id || "anonymous";
    await db.insert(aiHistory).values({ prompt, response, embedding, userId });
    return json({ success: true });
  } catch (error: any) {
    return json({ error: "Failed to save AI history" }, { status: 500 });
  }
};

const originalGETHandler: RequestHandler = async ({ url, locals }) => {
  try {
    const userId = locals.user?.id || "anonymous";
    const history = await db
      .select()
      .from(aiHistory)
      .where(eq(aiHistory.userId, userId));
    return json({ history });
  } catch (error: any) {
    return json({ error: "Failed to fetch AI history" }, { status: 500 });
  }
};


export const POST = redisOptimized.aiAnalysis(originalPOSTHandler);
export const GET = redisOptimized.aiAnalysis(originalGETHandler);