import type { RequestHandler } from '@sveltejs/kit';
import { jobStore, jobMachine } from '$lib/workers/job-state';

export const GET: RequestHandler = async ({ request }) => {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(payload));
      };

  (jobStore as any).listJobs?.().then((items: any) => send({ type: 'snapshot', items })).catch(() => {});

      const onUpdate = (rec: any) => send({ type: 'update', item: rec });
      const onRemove = (id: string) => send({ type: 'remove', id });

      jobStore.on('update', onUpdate);
      jobStore.on('remove', onRemove as any);

      request.signal.addEventListener('abort', () => {
        jobStore.off('update', onUpdate);
        jobStore.off('remove', onRemove as any);
        controller.close();
      });
    }
  });

  return new Response(stream, { headers });
};
