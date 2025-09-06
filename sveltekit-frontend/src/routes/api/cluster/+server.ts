/// <reference types="vite/client" />
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';

// Avoid types/env modules that may not resolve in static analysis; use process.env at runtime

const DEFAULT_CLUSTER_URL = "http://localhost:8090";

export const GET: RequestHandler = (async () => {
  const baseUrl = import.meta.env.CLUSTER_BASE_URL || DEFAULT_CLUSTER_URL;
  try {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();
    return json({ ok: true, upstream: baseUrl, health: data }, { status: 200 });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ ok: false, upstream: baseUrl, error: msg }, { status: 502 });
  }
});

export const POST: RequestHandler = (async ({ request }) => {
  const baseUrl = import.meta.env.CLUSTER_BASE_URL || DEFAULT_CLUSTER_URL;
  try {
    const body = await request.json();
    const res = await fetch(`${baseUrl}/cluster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return json(data, { status: res.status });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg, upstream: baseUrl }, { status: 502 });
  }
});
