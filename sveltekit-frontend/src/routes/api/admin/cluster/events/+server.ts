import { EventEmitter } from "events";
import type { RequestHandler } from './$types';


/*
 * Cluster Events API Endpoint (Server-Sent Events)
 * Provides real-time cluster health and worker metrics via SSE
 */

export interface Worker {
  id: string;
  status: string;
  metrics: any;
}

export const GET: RequestHandler = async ({ request }) => {
  // Check if client accepts text/event-stream
  const acceptHeader = request.headers.get('accept');
  if (!acceptHeader?.includes('text/event-stream')) {
    return new Response('SSE endpoint - use Accept: text/event-stream', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Only available from primary process
  if (!cluster.isPrimary) {
    return new Response('data: {"error": "SSE only available from primary process"}\n\n', {
      status: 503,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log('📡 SSE client connected to cluster monitoring');

      // Send initial connection event
      sendSSEEvent(controller, 'connected', {
        timestamp: Date.now(),
        message: 'Connected to cluster monitoring'
      });

      // Get cluster manager instance
      const clusterManager = globalThis.clusterManager;
      
      if (!clusterManager) {
        sendSSEEvent(controller, 'error', {
          error: 'Cluster manager not available',
          fallback: true
        });
        
        // Send fallback single-process data every 5 seconds
        const fallbackInterval = setInterval(() => {
          try {
            sendSSEEvent(controller, 'health', {
              totalWorkers: 1,
              healthyWorkers: 1,
              totalRequests: 0,
              averageResponseTime: Math.random() * 50 + 25,
              memoryUsage: {
                total: process.memoryUsage().heapUsed,
                average: process.memoryUsage().heapUsed,
                peak: process.memoryUsage().heapTotal
              },
              cpuUsage: {
                total: 0,
                average: 0
              },
              errors: { total: 0, rate: 0 }
            });

            sendSSEEvent(controller, 'workers', [{
              workerId: 1,
              pid: process.pid,
              status: 'online',
              connections: 0,
              requestsHandled: Math.floor(Math.random() * 1000),
              memoryUsage: process.memoryUsage(),
              cpuUsage: process.cpuUsage(),
              lastHealthCheck: Date.now(),
              errors: 0,
              uptime: process.uptime()
            }]);

          } catch (error: any) {
            console.error('SSE fallback error:', error);
          }
        }, 5000);

        // Store interval for cleanup
        globalThis.sseCleanupTasks = globalThis.sseCleanupTasks || [];
        globalThis.sseCleanupTasks.push(() => clearInterval(fallbackInterval));

        return;
      }

      // Send initial data
      try {
        const health = clusterManager.getHealth();
        const workers = clusterManager.getWorkerMetrics();
        
        sendSSEEvent(controller, 'health', health);
        sendSSEEvent(controller, 'workers', workers);
      } catch (error: any) {
        console.error('SSE initial data error:', error);
        sendSSEEvent(controller, 'error', {
          error: 'Failed to get initial cluster data'
        });
      }

      // Setup periodic updates
      const updateInterval = setInterval(() => {
        try {
          if (!clusterManager) return;

          const health = clusterManager.getHealth();
          const workers = clusterManager.getWorkerMetrics();
          
          sendSSEEvent(controller, 'health', health);
          sendSSEEvent(controller, 'workers', workers);

          // Send heartbeat
          sendSSEEvent(controller, 'heartbeat', {
            timestamp: Date.now(),
            uptime: process.uptime()
          });

        } catch (error: any) {
          console.error('SSE update error:', error);
          sendSSEEvent(controller, 'error', {
            error: 'Failed to update cluster data',
            timestamp: Date.now()
          });
        }
      }, 5000); // Update every 5 seconds

      // Setup cluster event listeners
      const clusterEventHandlers = setupClusterEventListeners(controller);

      // Store cleanup tasks
      globalThis.sseCleanupTasks = globalThis.sseCleanupTasks || [];
      globalThis.sseCleanupTasks.push(() => {
        clearInterval(updateInterval);
        clusterEventHandlers.cleanup();
        console.log('📡 SSE client disconnected from cluster monitoring');
      });
    },

    cancel() {
      // Cleanup when client disconnects
      if (globalThis.sseCleanupTasks) {
        globalThis.sseCleanupTasks.forEach((cleanup: any) => cleanup());
        globalThis.sseCleanupTasks = [];
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Accept, Cache-Control',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    }
  });
};

/*
 * Send Server-Sent Event
 */
function sendSSEEvent(
  controller: ReadableStreamDefaultController, 
  type: string, 
  data: any
): void {
  try {
    const event = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(event));
  } catch (error: any) {
    console.error('Failed to send SSE event:', error);
  }
}

/*
 * Setup cluster event listeners for real-time updates
 */
function setupClusterEventListeners(controller: ReadableStreamDefaultController) {
  const handlers: { [key: string]: (...args: any[]) => void } = {};

  // Worker online event
  handlers.online = (worker: Worker) => {
    sendSSEEvent(controller, 'worker_online', {
      workerId: worker.id,
      pid: worker.process.pid,
      timestamp: Date.now()
    });
  };

  // Worker disconnect event
  handlers.disconnect = (worker: Worker) => {
    sendSSEEvent(controller, 'worker_disconnect', {
      workerId: worker.id,
      pid: worker.process.pid,
      timestamp: Date.now()
    });
  };

  // Worker exit event
  handlers.exit = (worker: Worker, code: number, signal: string) => {
    sendSSEEvent(controller, 'worker_exit', {
      workerId: worker.id,
      pid: worker.process.pid,
      code,
      signal,
      timestamp: Date.now()
    });
  };

  // Worker fork event
  handlers.fork = (worker: Worker) => {
    sendSSEEvent(controller, 'worker_fork', {
      workerId: worker.id,
      pid: worker.process.pid,
      timestamp: Date.now()
    });
  };

  // Register all handlers
  Object.entries(handlers).forEach(([event, handler]) => {
    cluster.on(event as any, handler);
  });

  // Setup process monitoring
  const processMonitor = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    sendSSEEvent(controller, 'process_stats', {
      pid: process.pid,
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  }, 10000); // Every 10 seconds

  // Custom cluster events (if cluster manager supports them)
  const clusterManager = globalThis.clusterManager;
  if (clusterManager && typeof clusterManager.on === 'function') {
    const customHandlers = {
      'worker-health-critical': (data: any) => {
        sendSSEEvent(controller, 'worker_health_critical', data);
      },
      'scaling-started': (data: any) => {
        sendSSEEvent(controller, 'scaling_started', data);
      },
      'scaling-completed': (data: any) => {
        sendSSEEvent(controller, 'scaling_completed', data);
      },
      'restart-started': (data: any) => {
        sendSSEEvent(controller, 'restart_started', data);
      },
      'restart-completed': (data: any) => {
        sendSSEEvent(controller, 'restart_completed', data);
      }
    };

    Object.entries(customHandlers).forEach(([event, handler]) => {
      clusterManager.on(event, handler);
    });
  }

  // Return cleanup function
  return {
    cleanup: () => {
      // Remove cluster event listeners
      Object.entries(handlers).forEach(([event, handler]) => {
        cluster.removeListener(event as any, handler);
      });

      // Clear process monitor
      clearInterval(processMonitor);

      // Remove custom event listeners
      if (clusterManager && typeof clusterManager.removeAllListeners === 'function') {
        clusterManager.removeAllListeners();
      }
    }
  };
}