// Central re-export for SvelteKit server types to keep imports consistent across the codebase.
// Use: import type { RequestHandler } from '$lib/types/server';
import type { RequestHandler as SKRequestHandler } from '@sveltejs/kit';
export type { SKRequestHandler as RequestHandler };
