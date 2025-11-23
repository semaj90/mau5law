/**
 * SvelteKit Server Hooks
 * Handles request/response processing and middleware
 */

import type { Handle, HandleServerError } from '@sveltejs/kit';
import { lucia } from '$lib/server/lucia';

/**
 * Main request handler with Lucia v3 session validation
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  event.locals.requestId = requestId;

  // Add timing information
  const startTime = Date.now();

  // === LUCIA V3 SESSION VALIDATION ===
  const sessionId = event.cookies.get(lucia.sessionCookieName);
  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
  } else {
    try {
      const { session, user } = await lucia.validateSession(sessionId);
      if (session && session.fresh) {
        const sessionCookie = lucia.createSessionCookie(session.id);
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
          path: '/',
          ...sessionCookie.attributes,
        });
      }
      if (!session) {
        const blankSessionCookie = lucia.createBlankSessionCookie();
        event.cookies.set(blankSessionCookie.name, blankSessionCookie.value, {
          path: '/',
          ...blankSessionCookie.attributes,
        });
      }
      event.locals.session = session;
      event.locals.user = user;
    } catch (error) {
      console.error('[lucia] Session validation error:', error);
      event.locals.user = null;
      event.locals.session = null;
    }
  }

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
