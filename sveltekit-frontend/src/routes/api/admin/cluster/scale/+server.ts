import cluster from "node:cluster";
import type { RequestHandler } from './$types';


/**
 * Cluster Scaling API Endpoint
 * Handles dynamic scaling of worker processes
 */


export const POST: RequestHandler = async ({ request }) => {
  try {
    // Verify we're in primary process
    if (!cluster.isPrimary) {
      return json({
        error: 'Cluster scaling only available from primary process'
      }, { status: 403 });
    }

    // Parse request body
    const { workers } = await request.json();
    
    // Validate input
    if (!Number.isInteger(workers) || workers < 1 || workers > 16) {
      return json({
        error: 'Invalid worker count. Must be between 1 and 16.'
      }, { status: 400 });
    }

    // Get cluster manager instance
    const clusterManager = globalThis.clusterManager;
    
    if (!clusterManager) {
      return json({
        error: 'Cluster manager not available'
      }, { status: 503 });
    }

    // Get current state
    const currentWorkers = clusterManager.getWorkerMetrics().length;
    
    if (workers === currentWorkers) {
      return json({
        message: 'No scaling needed',
        currentWorkers,
        targetWorkers: workers
      });
    }

    // Perform scaling operation
    console.log(`📊 Scaling cluster from ${currentWorkers} to ${workers} workers`);
    
    await clusterManager.scaleCluster(workers);
    
    // Log scaling action for audit
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: 'cluster_scale',
      previousWorkers: currentWorkers,
      newWorkers: workers,
      initiator: 'admin_api'
    };
    
    console.log('📝 Scaling audit log:', auditLog);

    return json({
      success: true,
      message: `Scaling cluster from ${currentWorkers} to ${workers} workers`,
      previousWorkers: currentWorkers,
      targetWorkers: workers,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('Cluster scaling error:', error);
    
    return json({
      error: 'Failed to scale cluster',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    // Get current scaling configuration
    const clusterManager = globalThis.clusterManager;
    
    if (!clusterManager) {
      return json({
        error: 'Cluster manager not available'
      }, { status: 503 });
    }

    const workers = clusterManager.getWorkerMetrics();
    const health = clusterManager.getHealth();

    return json({
      currentWorkers: workers.length,
      healthyWorkers: health.healthyWorkers,
      maxWorkers: 16,
      minWorkers: 1,
      scalingPolicy: {
        autoScale: false, // Would be configurable
        cpuThreshold: 80,
        memoryThreshold: 85,
        scaleUpCooldown: 300000, // 5 minutes
        scaleDownCooldown: 600000 // 10 minutes
      },
      workers: workers.map((w: any) => ({
        id: w.workerId,
        status: w.status,
        memoryUsage: w.memoryUsage.heapUsed,
        connections: w.connections
      }))
    });

  } catch (error: any) {
    console.error('Cluster scaling info error:', error);
    
    return json({
      error: 'Failed to get scaling information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};