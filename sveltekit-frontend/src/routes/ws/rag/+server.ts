/** * SvelteKit WebSocket handler (optional) * Note: This requires an adapter that supports WebSockets (e.g., node-adapter) * Alternatively, proxy to Go backend via vite.config.ts proxy */

import type { RequestHandler } from './$types // TODO: Verify store subscription is correct for Svelte 5';

export const GET: RequestHandler = async ({ request }) => {
  // If using SvelteKit's WebSocket support (requires compatible adapter)
  // For now, we'll proxy via Vite config or handle in Go backend
  return new Response('WebSocket endpoint - use /ws/rag via WebSocket protocol', {
    status: 426,
    headers: { 'Upgrade': 'Required' }
  });
};