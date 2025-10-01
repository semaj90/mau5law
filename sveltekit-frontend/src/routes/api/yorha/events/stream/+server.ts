import type { RequestHandler } from './$types.js';

const DEFAULT_INTERVAL = 3000;

// --- Specific type definitions ---
interface HelloData { message: string; }

interface SystemMetricsData {
  cpu: number;
  memMB: number;
  vectorQueriesPerMin: number;
  gpuQueueDepth: number;
  timestamp: number;
}

interface HelloEnvelope {
  type: 'sse_hello';
  data: HelloData;
  ts: string;
}

interface SystemMetricsEnvelope {
  type: 'system_metrics';
  data: SystemMetricsData;
  ts: string;
}

type StreamMetricEnvelope = HelloEnvelope | SystemMetricsEnvelope;

export const GET: RequestHandler = ({ url }) => {
  const intervalMs = Number(url.searchParams.get('interval') || DEFAULT_INTERVAL);

  let intervalId: ReturnType<typeof setInterval> | undefined;
  let keepAliveId: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (obj: StreamMetricEnvelope) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({ type: 'sse_hello', data: { message: 'YoRHa stream online' }, ts: new Date().toISOString() });

      intervalId = setInterval(
        () =>
          send({
            type: 'system_metrics',
            data: collectMetrics(),
            ts: new Date().toISOString(),
          }),
        Math.max(1000, intervalMs)
      );

      keepAliveId = setInterval(() => controller.enqueue(encoder.encode(': ping\n\n')), 25000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
      if (keepAliveId) clearInterval(keepAliveId);
      // lightweight log for debugging
      console.log('Client disconnected. SSE intervals cleared.');
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    },
  });
};

// helper function used above
function collectMetrics(): SystemMetricsData {
  return {
    cpu: 5 + Math.random() * 25,
    memMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    vectorQueriesPerMin: Math.floor(Math.random() * 20),
    gpuQueueDepth: Math.floor(Math.random() * 4),
    timestamp: Date.now(),
  };
}
    vectorQueriesPerMin: Math.floor(Math.random() * 20),
    gpuQueueDepth: Math.floor(Math.random() * 4),
    timestamp: Date.now(),
  };
}

export const GET: RequestHandler = ({ url }) => {
  const intervalMs = Number(url.searchParams.get('interval') || DEFAULT_INTERVAL);

  let interval: NodeJS.Timeout;
  let keepAlive: NodeJS.Timeout;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (obj: StreamMetricEnvelope) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({ type: 'sse_hello', data: { message: 'YoRHa stream online' }, ts: new Date().toISOString() });

      interval = setInterval(
        () => send({ type: 'system_metrics', data: collectMetrics(), ts: new Date().toISOString() }),
        Math.max(1000, intervalMs)
      );

      keepAlive = setInterval(() => controller.enqueue(encoder.encode(': ping\n\n')), 25000);
    },
    cancel() {
      // This is the crucial fix. This method is called automatically
      // by the runtime when the client disconnects.
      clearInterval(interval);
      clearInterval(keepAlive);
      console.log('Client disconnected. Stream resources cleaned up.');
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    },
  });
};
