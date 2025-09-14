
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => json({ success: true, cuda: { available: false, version: null } });
export const prerender = false;