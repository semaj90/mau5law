
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  // Dev-only endpoint to inspect SSR locals (user/session). Safe to leave in repo
  // since it returns 403 outside development.
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not allowed', { status: 403 });
  }

  const payload = {
    user: (locals as any).user ?? null,
    session: (locals as any).session ?? null,
    requestId: (locals as any).requestId ?? null,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
