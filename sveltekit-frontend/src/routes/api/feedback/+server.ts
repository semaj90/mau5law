/// <reference types="vite/client" />

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json();
    const goUrl = import.meta.env.GO_RAG_URL || 'http://localhost:8099/feedback';
    const resp = await fetch(goUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ ok: false, error: txt }), { status: 502 });
    }
    const body = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: true, result: body }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
};
