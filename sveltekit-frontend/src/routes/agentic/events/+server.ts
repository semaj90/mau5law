/** * Agentic Events Server-Sent Events (SSE) Endpoint
 *
 * Provides real-time streaming of agentic error fixer events
 * from Redis Pub/Sub to browser clients using SSE.
 *
 * Usage from client:
 * ```typescript
 * const eventSource = new EventSource('/agentic/events');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Agentic event:', data);
 * };
 * ```
 */

import { redis, ensureRedisReady } from '$lib/server/redis-client';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Ensure Redis is ready
    await ensureRedisReady();

    // Create SSE response
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const initialData = {
          type: 'connection',
          message: 'Connected to agentic events stream',
          timestamp: new Date().toISOString()
        };
        controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`);

        // Subscribe to agentic events channel
        const subscriber = redis.duplicate();
        subscriber.subscribe('agentic:events', (err) => {
          if (err) {
            console.error('Redis subscribe error:', err);
            controller.error(err);
            return;
          }
        });

        subscriber.on('message', (channel, message) => {
          try {
            if (channel === 'agentic:events') {
              const eventData = JSON.parse(message);
              controller.enqueue(`data: ${JSON.stringify(eventData)}\n\n`);
            }
          } catch (parseError) {
            console.error('Failed to parse agentic event:', parseError);
          }
        });

        // Handle client disconnect
        const cleanup = () => {
          subscriber.unsubscribe();
          subscriber.quit();
          controller.close();
        };

        // Store cleanup function for later use
        (controller as any).cleanup = cleanup;
      },
      cancel() {
        // Cleanup on cancel
        if ((this as any).cleanup) {
          (this as any).cleanup();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (err) {
    console.error('Agentic events endpoint error:', err);
    throw error(500, 'Failed to establish events stream');
  }
};