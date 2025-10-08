/**
 * Server-Sent Events (SSE) Endpoint for Real-Time Workflow Updates
 *
 * Provides real-time streaming of evidence processing workflow events
 * from Redis Pub/Sub to browser clients using SSE.
 *
 * Usage from client:
 * ```typescript
 * const eventSource = new EventSource(`/api/workflow-events/${sessionId}`);
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Workflow event:', data);
 * };
 * ```
 */

import { error } from '@sveltejs/kit';
import IORedis from 'ioredis';
import type { RequestHandler } from './$types';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * GET /api/workflow-events/[sessionId]
 *
 * Stream workflow events for a specific session via Server-Sent Events
 */
export const GET: RequestHandler = async ({ params, request }) => {
  const { sessionId } = params;

  if (!sessionId) {
    throw error(400, 'Session ID is required');
  }

  // Create Redis subscriber for this session
  const redis = new IORedis(REDIS_URL);
  const channel = `workflow:session:${sessionId}`;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      console.log(`[SSE] Client connected to session: ${sessionId}`);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'SSE_CONNECTED',
            sessionId,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      // Subscribe to Redis channel
      await redis.subscribe(channel);

      // Handle incoming messages from Redis
      redis.on('message', (ch: string, message: string) => {
        if (ch === channel) {
          try {
            // Parse and validate message
            const data = JSON.parse(message);

            console.log(`[SSE] Sending event to session ${sessionId}:`, data.type);

            // Send SSE event to client
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          } catch (err) {
            console.error(`[SSE] Error parsing message:`, err);
          }
        }
      });

      // Handle Redis errors
      redis.on('error', (err: Error) => {
        console.error(`[SSE] Redis error for session ${sessionId}:`, err);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'SSE_ERROR',
              error: 'Redis connection error',
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        );
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', async () => {
        console.log(`[SSE] Client disconnected from session: ${sessionId}`);

        await redis.unsubscribe(channel);
        await redis.quit();

        controller.close();
      });
    },

    cancel() {
      console.log(`[SSE] Stream cancelled for session: ${sessionId}`);
      redis.unsubscribe(channel);
      redis.quit();
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
};
