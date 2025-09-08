import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  // Lucia put user into locals in hooks.server.ts
  return json({ user: locals.user || null });
};
