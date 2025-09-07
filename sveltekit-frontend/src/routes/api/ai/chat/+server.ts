// Streaming proxy: forwards POST body to the GPU server and streams the response back
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const DEFAULT_BACKEND = 'http://localhost:8097/inference';

export const POST: RequestHandler = async ({ request, fetch, url }) => {
  const backend =
    env.GPU_INFERENCE_URL ||
    env.GPU_HTTP_URL ||
    env.INFERENCE_URL ||
    env.GO_GPU_SERVER_URL ||
    DEFAULT_BACKEND;

  // Optional dev override via query ?backend=...
  const override = url.searchParams.get('backend');
  const target = override || backend;

  const headers = new Headers(request.headers);
  // Avoid forwarding hop-by-hop/host headers
  headers.delete('host');
  headers.delete('content-length');

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: 'POST',
      headers,
      body: request.body,
      // @ts-expect-error Node fetch streaming hint (ignored in browsers)
      duplex: 'half',
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Upstream unreachable', detail: e?.message || String(e) }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' },
      }
    );
  }

  // Forward status and stream body
  const respHeaders = new Headers(upstream.headers);
  respHeaders.set('Cache-Control', 'no-cache');
  if (!respHeaders.get('Content-Type')) {
    respHeaders.set('Content-Type', 'application/json; charset=utf-8');
  }
  respHeaders.delete('Content-Length');
  respHeaders.set('X-Proxy-Backend', target);

  // If upstream errored with no body, return text/json accordingly
  if (!upstream.ok && !upstream.body) {
    const text = await upstream.text().catch(() => '');
    const ct = respHeaders.get('Content-Type') || '';
    if (!ct.includes('application/json')) {
      respHeaders.set('Content-Type', 'text/plain; charset=utf-8');
    }
    return new Response(text, { status: upstream.status, headers: respHeaders });
  }

  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
};
