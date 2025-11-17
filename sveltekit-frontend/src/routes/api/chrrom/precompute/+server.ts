import type { RequestHandler } from './$types // TODO: Verify store subscription is correct for Svelte 5.js';
import { json } from '@sveltejs/kit';
import { generateCHRPatterns, type PrecomputeContext } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/chrrom/patterns';
import { getUserId } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/auth/utils';
export const POST: RequestHandler = async ({ request, locals }) => {
  const ctx = (await request.json()) as PrecomputeContext;
  if (!ctx.userId && getUserId(locals)) ctx.userId = getUserId(locals);
  const patterns = await generateCHRPatterns(ctx);
  return json({ ok: true, patterns });
};
