import cluster from "node:cluster";
import type { RequestHandler } from './$types';


/*
 * Cluster Status API Endpoint
 * Provides real-time cluster health and worker metrics
 */


export const GET: RequestHandler = async ({ url }) => {
  try {
    // If we're in a worker process, proxy to primary
    if (!cluster.isPrimary) {
      return json({
        error: 'Cluster status only available from primary process',
        worker: {
          pid: process.pid,
          memory: process.memoryUsage(),
          uptime: process.uptime()
        }
      }, { status: 503 });
    }

    // Get cluster manager instance (would be injected in real implementation)
    const clusterManager = globalThis.clusterManager;
    
    if (!clusterManager) {
      return json({
        error: 'Cluster manager not available',
        single_process: true,
        process: {
          pid: process.pid,
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          cpuUsage: process.cpuUsage()
        }
      });
    }

    // Collect cluster health data
    const health = await clusterManager.getHealth();
    const workers = await clusterManager.getWorkerMetrics();

    return json({
      health,
      workers,
      timestamp: Date.now(),
      cluster: {
        isPrimary: cluster.isPrimary,
        totalCpus: require('os').cpus().length,
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
      }
    });

  } catch (error: any) {
    console.error('Cluster status error:', error);
    
    return json({
      error: 'Failed to get cluster status',
      message: error instanceof Error ? error.message : 'Unknown error',
      fallback: {
        health: {
          totalWorkers: 1,
          healthyWorkers: 1,
          totalRequests: 0,
          averageResponseTime: 0,
          memoryUsage: { total: 0, average: 0, peak: 0 },
          cpuUsage: { total: 0, average: 0 },
          errors: { total: 0, rate: 0 }
        },
        workers: [{
          workerId: 1,
          pid: process.pid,
          status: 'online' as const,
          connections: 0,
          requestsHandled: 0,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          lastHealthCheck: Date.now(),
          errors: 0,
          uptime: process.uptime()
        }]
      }
    }, { status: 200 });
  }
};