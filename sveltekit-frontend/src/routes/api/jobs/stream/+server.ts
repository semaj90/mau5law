/**
 * Job Status SSE Stream API
 * 
 * Provides real-time job status updates via Server-Sent Events
 * Integrates with GlobalLokiStore for cross-worker state visibility
 */

import type { RequestHandler } from './$types';
import { globalLoki } from '$lib/stores/global-loki-store.js';
import { cacheService } from '$lib/api/services/cache-service.js';

export const GET: RequestHandler = async ({ url, request }) => {
  const jobIds = url.searchParams.get('jobIds')?.split(',') || [];
  const includeAll = url.searchParams.get('all') === 'true';
  
  // Initialize global loki if needed
  const redis = cacheService.getClient();
  if (redis) {
    await globalLoki.initRedis(redis);
  }

  const stream = new ReadableStream({
    start(controller) {
      let isAlive = true;
      const subscribers = new Map<string, () => void>();

      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connection',
        message: 'Connected to job status stream',
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Send current job statuses
      const sendCurrentStatuses = () => {
        try {
          if (includeAll) {
            // Send all jobs
            const allJobs = globalLoki.getAllJobs();
            controller.enqueue(`data: ${JSON.stringify({
              type: 'jobs_snapshot',
              jobs: allJobs,
              timestamp: new Date().toISOString()
            })}\n\n`);
          } else if (jobIds.length > 0) {
            // Send specific jobs
            const jobs = jobIds.map(id => globalLoki.getJob(id)).filter(Boolean);
            controller.enqueue(`data: ${JSON.stringify({
              type: 'jobs_snapshot', 
              jobs,
              timestamp: new Date().toISOString()
            })}\n\n`);
          }

          // Send stats
          const stats = globalLoki.getStats();
          controller.enqueue(`data: ${JSON.stringify({
            type: 'stats',
            stats,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch (error) {
          console.error('Error sending current statuses:', error);
        }
      };

      // Send initial statuses
      sendCurrentStatuses();

      // Set up periodic updates (every 2 seconds)
      const updateInterval = setInterval(() => {
        if (!isAlive) {
          clearInterval(updateInterval);
          return;
        }
        
        sendCurrentStatuses();
      }, 2000);

      // Set up heartbeat (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        if (!isAlive) {
          clearInterval(heartbeatInterval);
          return;
        }

        controller.enqueue(`data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isAlive = false;
        clearInterval(updateInterval);
        clearInterval(heartbeatInterval);
        
        // Clean up subscribers
        subscribers.forEach(unsubscribe => unsubscribe());
        subscribers.clear();
        
        try {
          controller.close();
        } catch (e) {
          // Controller might already be closed
        }
      });

      // Return cleanup function
      return () => {
        isAlive = false;
        clearInterval(updateInterval);
        clearInterval(heartbeatInterval);
        subscribers.forEach(unsubscribe => unsubscribe());
        subscribers.clear();
      };
    },

    cancel() {
      // Stream was cancelled
      console.log('Job status stream cancelled');
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
};
