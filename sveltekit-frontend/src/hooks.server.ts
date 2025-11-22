/**
 * SvelteKit Server Hooks
 * Handles request/response processing and middleware
 */

import type { Handle, HandleServerError } from '@sveltejs/kit';

/**
 * Main request handler
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  event.locals.requestId = requestId;

  // Add timing information
  const startTime = Date.now();

  // Resolve the request
  const response = await resolve(event);

  // Add timing headers
  const duration = Date.now() - startTime;
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Response-Time', `${duration}ms`);

  // Enable streaming for AI endpoints
  if (event.url.pathname.startsWith('/api/ai/')) {
    response.headers.set('Content-Type', 'application/x-ndjson');
    response.headers.set('Cache-Control', 'no-cache');
    response.headers.set('X-Accel-Buffering', 'no');
  }

  return response;
};

/**
 * Error handler
 */
export const handleError: HandleServerError = ({ error, event }) => {
  const errorId = crypto.randomUUID();

  console.error(`[${errorId}] Error in ${event.url.pathname}:`, error);

  return {
    message: 'An unexpected error occurred',
    code: errorId,
  };
};
