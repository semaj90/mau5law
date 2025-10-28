import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

// This file provides a compatibility shim so both /api/cases/[id] and
// /api/cases/[caseId] continue to work. It proxies requests to the
// canonical `[caseId]` handlers so we don't duplicate logic and avoid
// route conflicts.

async function proxyToCanonical(event: Parameters<RequestHandler>[0]): Promise<Response> {
  const { params, request, fetch } = event as unknown as {
    params: Record<string, string>;
    request: Request;
    fetch: typeof globalThis.fetch;
  };
  const id = params.id;
  if (!id) throw error(400, 'Missing id');

  const url = new URL(`/api/cases/${encodeURIComponent(id)}`, request.url).toString();

  // Forward headers (except host) and method/body
  const headers = new Headers();
  request.headers.forEach((v, k) => {
    if (k.toLowerCase() !== 'host') headers.set(k, v);
  });

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  // Use the server's fetch so requests stay internal and fast
  const res = await fetch(url, init as RequestInit);
  return res;
}

export const GET: RequestHandler = async event => {
  const res = await proxyToCanonical(event);
  const data = await res.json().catch(() => null);
  return json(data, { status: res.status });
};

export const DELETE: RequestHandler = async event => {
  const res = await proxyToCanonical(event);
  const data = await res.json().catch(() => ({ success: res.ok }));
  return json(data, { status: res.status });
};

export const POST: RequestHandler = async event => {
  const res = await proxyToCanonical(event);
  const data = await res.json().catch(() => null);
  return json(data, { status: res.status });
};

