import type { RequestHandler } from '@sveltejs/kit';

// Simple proxy endpoint to fetch current runtime metrics and top signatures
export const GET: RequestHandler = async () => {
  try {
    const [runtimeRes, sigRes] = await Promise.all([
      fetch('http://localhost:8098/metrics/runtime'),
      fetch('http://localhost:8098/metrics/signatures?limit=15')
    ]);
    const runtime = await runtimeRes.json();
    const signatures = await sigRes.json();
    return new Response(JSON.stringify({ runtime, signatures }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
