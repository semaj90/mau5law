import { json, type RequestHandler, type RequestEvent } from '@sveltejs/kit';
import { authService, auth, lucia } from '$lib/server/auth';
import { isAuthError, formatErrorResponse } from '$lib/server/errors';
import { logStructuredError, captureAndFormat } from '$lib/server/logger';
import { dev } from '$app/environment';
import { getTypedLocals } from '$lib/types/locals-unify';

// Primary POST handler: invalidate session (via authService or lucia) and clear cookie
export const POST: RequestHandler = async ({ cookies, locals }: RequestEvent) => {
  try {
    // Narrow the locals typing as best-effort; avoid broad 'any' at top-level
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedLocals = getTypedLocals(locals as any);
    const sessionId = cookies.get('session_id') || typedLocals?.session?.id;

    if (sessionId) {
      // prefer authService when available
      try {
        if (authService?.invalidateSession) await authService.invalidateSession(sessionId);
      } catch (innerErr) {
        // fallback to lucia if available
        try {
          if (lucia?.deleteSession) await lucia.deleteSession(sessionId);
        } catch (e) {
          // swallow; we'll still clear cookie
          console.warn('session invalidation fallback failed', e);
        }
      }

      // clear cookie using auth helper if present
      try {
        const blank = auth?.createBlankSessionCookie
          ? auth.createBlankSessionCookie()
          : { name: 'session_id', value: '', attributes: { path: '/' } };
        cookies.set(blank.name, blank.value, { path: '/', ...(blank.attributes || {}) });
      } catch (e) {
        // best-effort
        cookies.set('session_id', '', { path: '/' });
      }
    }

    return json({ success: true, message: 'Logged out' }, { status: 200 });
  } catch (error) {
    await logStructuredError({
      source: 'api.auth.logout',
      level: 'error',
      event: 'logout_failed',
      message: 'Logout failed',
      error,
    });

    if (isAuthError(error)) {
      const err = formatErrorResponse(error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return json(err, { status: (error as any).status || 400 });
    }
    const err = await captureAndFormat(error);
    return json(err, { status: 500 });
  }
};

// Dev-only GET wrapper for convenience
export const GET = async (event: RequestEvent) => {
  if (!dev) return json({ error: 'GET not allowed in production' }, { status: 405 });
  // forward to POST handler; cast only the event param where required
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return POST(event as any);
};

export const OPTIONS = () =>
  new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': dev ? '*' : 'https://yourdomain.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
