import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const info = {
    hasUser: !!locals.user,
    user: locals.user || null,
    requestId: (locals as any).requestId,
    serviceRoute: (locals as any).serviceRoute || null,
    hint: process.env.DEV_AUTH_AUTO === 'true' ? 'DEV_AUTH_AUTO enabled: auto session provisioning active.' : 'Enable DEV_AUTH_AUTO=true to auto-create a session.',
  };
  return new Response(JSON.stringify(info, null, 2), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
