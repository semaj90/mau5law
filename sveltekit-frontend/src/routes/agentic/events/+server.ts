import type { RequestHandler } from './$types // TODO: Verify store subscription is correct for Svelte 5';
import { eventBus } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/event-bus';

export const GET: RequestHandler = ({ request }) => {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      const unsubscribe = eventBus.subscribe((event) => send(event));
      send({ type: 'agentic_heartbeat', message: 'connected' });

      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', timestamp: Date.now() });
      }, 25000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
};

export const prerender = false;
