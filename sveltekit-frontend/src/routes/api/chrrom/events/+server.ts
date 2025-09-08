import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { predictor, mapActionToCHRContext } from '$lib/server/chrrom/predictor';
import { generateCHRPatterns } from '$lib/server/chrrom/patterns';
import { broadcastPatterns } from '$lib/server/chrrom/bus';

interface EventBody { userId: string; action: string; topK?: number }

export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as EventBody;
  const userId = body.userId || 'anonymous';
  const action = body.action;
  const topK = Math.min(Math.max(body.topK ?? 2, 1), 5);

  predictor.record(userId, action);

  // Predict next likely actions from current
  const next = predictor.predictNext(action, topK);
  const patterns: any[] = [];
  for (const n of next) {
    const ctx = { userId, ...mapActionToCHRContext(n.action) };
    if (ctx.docId || ctx.query) {
      const ps = await generateCHRPatterns(ctx);
      patterns.push(...ps);
    }
  }
  if (patterns.length) broadcastPatterns(patterns);
  return json({ ok: true, predictions: next, pushed: patterns.length });
};
