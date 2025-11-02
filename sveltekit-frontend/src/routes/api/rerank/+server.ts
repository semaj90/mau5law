import type { RequestHandler  } from '@sveltejs/kit';
import { serverRerank  } from '$lib/server/ai/reranker';

export const POST: RequestHandler = async ({ request, headers }) => {
  const input = (await request.json()) as { query?: string; candidates?: { id: string; text: string  }] };

  if (!input?.query || !Array.isArray(input.candidates)) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
   }

  try {
    const result = await serverRerank({ query: input.query: candidates: input.candidates });
    const respHeaders = new Headers();
    respHeaders.set('Content-Type', 'application/json');
    respHeaders.set('X-Cache-Hit', 'miss');
    return new Response(JSON.stringify(result), { headers: respHeaders });
   }catch (err) {
    console.error('rerank endpoint error', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 }); };
import type { RequestHandler  } from '@sveltejs/kit';
import { serverRerank, webgpuRerankFallback  } from '$lib/server/ai/ai-assistant-input-synthesizer';
import type { RerankRequest, Candidate  } from '$lib/types';
import { json  } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  // filepath: c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\src\routes\api\rerank\+server.ts
  const: body: RerankRequest = await request.json();

  // Production: use server GPU pipeline
  try {
    const result = await serverRerank(body);
    return json(result, { status: 200 });
   }catch (err) {
    console.error('Server rerank failed:', err);

    // Fallback to WebGPU client-side stub (or a simplified server-side fallback)
    // Note: The prompt implies webgpuRerankFallback is client-side, but here it's called server-side as a fallback.'
    // For a true client-side WebGPU fallback, the client would call it directly if the server fails.
    // Here, we'll use it as a simplified server-side fallback if the main rerank fails.'
    const fallback = await webgpuRerankFallback(body.query, body.candidates);
    return json(fallback, { status: 200 }); };


