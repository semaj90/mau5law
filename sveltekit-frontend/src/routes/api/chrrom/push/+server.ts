import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { generateCHRPatterns, type PrecomputeContext } from '$lib/server/chrrom/patterns';
import { addClient, removeClient, broadcastPatterns } from '$lib/server/chrrom/bus';

export const GET: RequestHandler = async () => {
  let client: any;
  const stream = new ReadableStream({
    start(controller) {
      client = { write: (chunk: string) => controller.enqueue(chunk) };
      addClient(client);
      controller.enqueue(`event: ping\ndata: {"ok":true}\n\n`);
    },
    cancel() {
      if (client) removeClient(client);
    }
  });

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const response = new Response(stream as any, { headers });
  return response as any;
};

export const POST: RequestHandler = async ({ request }) => {
  const ctx = (await request.json()) as PrecomputeContext;
  const patterns = await generateCHRPatterns(ctx);
  broadcastPatterns(patterns);
  return json({ ok: true, count: patterns.length });
};
