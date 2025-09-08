// SIMD-accelerated streaming proxy: forwards POST body to GPU server with enhanced performance
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { readBodyFast } from '$lib/server/simd-body-parser.js';
import { dev } from '$app/environment';

const DEFAULT_BACKEND = 'http://localhost:8200/inference';

export const POST: RequestHandler = async (event) => {
  const { request, fetch, url } = event;
  const startTime = performance.now();
  
  const backend =
    env.GPU_INFERENCE_URL ||
    env.GPU_HTTP_URL ||
    env.INFERENCE_URL ||
    env.GO_GPU_SERVER_URL ||
    DEFAULT_BACKEND;

  // Optional dev override via query ?backend=...
  const override = url.searchParams.get('backend');
  const target = override || backend;

  // 🚀 SIMD-accelerated body parsing for hot endpoint optimization
  const simdEnabled = process.env.USE_SIMDJSON_NODE === '1';
  let requestBody: string | ReadableStream<Uint8Array> | null = null;
  let parseTime = 0;
  
  if (simdEnabled) {
    try {
      // Use SIMD parsing to validate/optimize the request
      const parseStart = performance.now();
      const parsedBody = await readBodyFast(event);
      parseTime = performance.now() - parseStart;
      
      if (parsedBody) {
        requestBody = JSON.stringify(parsedBody);
        if (dev) {
          console.log(`🚀 SIMD parsed chat request in ${parseTime.toFixed(2)}ms`);
        }
      } else {
        requestBody = request.body;
      }
    } catch (error) {
      // Fallback to standard streaming
      requestBody = request.body;
      if (dev) {
        console.log('⚠️ SIMD parsing failed, using streaming fallback');
      }
    }
  } else {
    requestBody = request.body;
  }

  const headers = new Headers(request.headers);
  // Avoid forwarding hop-by-hop/host headers
  headers.delete('host');
  headers.delete('content-length');
  
  // Add performance headers
  if (simdEnabled) {
    headers.set('X-SIMD-Accelerated', 'true');
    headers.set('X-Parse-Time', parseTime.toString());
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: 'POST',
      headers,
      body: requestBody,
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
  
  // Add SIMD performance metrics to response
  if (simdEnabled) {
    const totalTime = performance.now() - startTime;
    respHeaders.set('X-SIMD-Enabled', 'true');
    respHeaders.set('X-Total-Time', totalTime.toString());
    respHeaders.set('X-Parse-Time', parseTime.toString());
    
    if (dev) {
      console.log(`🚀 SIMD chat proxy total time: ${totalTime.toFixed(2)}ms (parse: ${parseTime.toFixed(2)}ms)`);
    }
  }

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
