import type { RequestHandler } from '@sveltejs/kit';
import { cacheEventBus } from '$lib/server/cache/cache-events';

export const GET: RequestHandler = async () => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Initial hello and snapshot hook (placeholder)
      controller.enqueue(encoder.encode(`event: hello\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`));

      const onEvent = (evt: any) => {
        try {
          controller.enqueue(encoder.encode(`event: update\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
        } catch (e) {
          // Ignore write errors; stream may be closed
        }
      };

      cacheEventBus.on('cache-event', onEvent);

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        } catch {}
      }, 30000);

      // Teardown
      const abort = () => {
        clearInterval(keepalive);
        cacheEventBus.off('cache-event', onEvent);
        try { controller.close(); } catch {}
      };

      // @ts-ignore - not typed on ReadableStream controller
      controller.signal?.addEventListener?.('abort', abort);
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
