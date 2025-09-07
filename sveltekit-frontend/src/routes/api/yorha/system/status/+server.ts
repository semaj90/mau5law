import { getContext7MulticoreService } from '$lib/services/context7-multicore.js';
import type { RequestHandler } from './$types';


let startTime = Date.now();
let requestCount = 0;

export interface YoRHaSystemStatus {
  database: { connected: boolean; latency: number; activeConnections: number; queryCount: number };
  backend: { healthy: boolean; uptime: number; activeServices: number; cpuUsage: number; memoryUsage: number };
  frontend: { renderFPS: number; componentCount: number; activeComponents: number; webGPUEnabled: boolean };
  multicore?: {
    totalWorkers: number;
    healthyWorkers: number;
    busyWorkers: number;
    queueSize: number;
    activeTasks: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
  };
  timestamp: string;
  systemLoad: number;
  gpuUtilization: number;
  networkLatency: number;
}

function collectStatus(): YoRHaSystemStatus {
  const mem = process.memoryUsage();
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  const cpuApprox = 5 + Math.random() * 20; // placeholder approximation

  // Try to get Context7 multicore service status
  let multicoreStatus = null;
  try {
    const multicoreService = getContext7MulticoreService({
      workerCount: 4,
      enableLegalBert: true,
      enableGoLlama: true,
      maxConcurrentTasks: 20,
    });
    const systemStatus = multicoreService.getSystemStatus();

    multicoreStatus = {
      totalWorkers: systemStatus.workers.length,
      healthyWorkers: systemStatus.workers.filter((w) => w.status === 'healthy').length,
      busyWorkers: systemStatus.workers.filter((w) => w.status === 'busy').length,
      queueSize: systemStatus.queue.size,
      activeTasks: systemStatus.queue.activeTasks,
      totalTasks: systemStatus.metrics.totalTasks,
      completedTasks: systemStatus.metrics.completedTasks,
      failedTasks: systemStatus.metrics.failedTasks,
    };
  } catch (error: any) {
    // Multicore service not available
    console.warn('Context7 multicore service not available:', error.message);
  }

  return {
    database: {
      connected: true,
      latency: Math.floor(Math.random() * 50) + 10,
      activeConnections: Math.floor(Math.random() * 20) + 5,
      queryCount: Math.floor(Math.random() * 1000) + 500,
    },
    backend: {
      healthy: true,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      activeServices: multicoreStatus?.healthyWorkers || 5,
      cpuUsage: Number(cpuApprox.toFixed(2)),
      memoryUsage: rssMB,
    },
    frontend: {
      renderFPS: Math.floor(Math.random() * 10) + 55,
      componentCount: 778,
      activeComponents: Math.floor(Math.random() * 50) + 150,
      webGPUEnabled: true,
    },
    ...(multicoreStatus ? { multicore: multicoreStatus } : {}),
    timestamp: new Date().toISOString(),
    systemLoad: Math.floor(Math.random() * 30) + 45,
    gpuUtilization: Math.floor(Math.random() * 20) + 78,
    networkLatency: Math.floor(Math.random() * 30) + 23,
  };
}

export const GET: RequestHandler = async () => {
  requestCount++;
  const status = collectStatus();
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};
