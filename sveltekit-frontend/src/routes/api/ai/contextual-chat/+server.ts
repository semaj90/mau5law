import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { invokeContextualChain } from '$lib/server/ai/contextual-gpu-chain';

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const input = typeof body?.input === 'string' ? body.input : undefined;
  if (!input?.trim()) {
    throw error(400, 'input is required');
  }

  const userId = (body?.userId as string | undefined) ?? locals.user?.id;
  const response = await invokeContextualChain(input, userId);
  return json({ response });
};

