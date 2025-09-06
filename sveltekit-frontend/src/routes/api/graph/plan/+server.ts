import type { RequestHandler } from '@sveltejs/kit';
import { getPlanner } from '$lib/services/neo4j-planner-singleton';

// POST /api/graph/plan
// Body: { startNodeId: string, goal?: { targetType?: string; jurisdiction?: string; practiceArea?: string; minImportance?: number; maxDepth?: number }, iterations?: number }
// Returns planning result with best path & metrics.
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { startNodeId, goal = {}, iterations } = body || {};
    if (!startNodeId || typeof startNodeId !== 'string') {
      return new Response(JSON.stringify({ error: 'startNodeId required'}), { status: 400 });
    }

    const planner = await getPlanner({ mctsIterations: iterations ?? 400 });
    const result = await planner.planOptimalPath(startNodeId, goal);

    return new Response(JSON.stringify({
      ok: true,
      startNodeId,
      bestPath: result.bestPath.map(n => ({ id: n.id, type: n.type, title: n.properties.title, importance: n.properties.importance })),
      value: result.pathValue,
      explored: result.exploredNodes,
      ms: result.computationTime,
      legalAnalysis: result.legalAnalysis,
      visualizations: result.visualizations,
      metrics: planner.getMetrics()
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'planning failed' }), { status: 500 });
  }
};
