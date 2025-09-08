import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { generateCHRPatterns, type PrecomputeContext } from '$lib/server/chrrom/patterns';

export const POST: RequestHandler = async ({ request, locals }) => {
  const ctx = (await request.json()) as PrecomputeContext;
  if (!ctx.userId && locals.user?.id) ctx.userId = locals.user.id;
  const patterns = await generateCHRPatterns(ctx);
  return json({ ok: true, patterns });
};
