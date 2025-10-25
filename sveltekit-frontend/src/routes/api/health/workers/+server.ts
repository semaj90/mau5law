/**
 * Worker Health Check API
 * Monitors status of background workers: OCR, Embedding, Legal Analysis
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import redis, { createRedisConnection } from '$lib/server/redis';
import amqp from 'amqplib';

interface WorkerStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  healthy: boolean;
  lastHeartbeat?: string;
  queueDepth?: number;
  processedJobs?: number;
  uptime?: number;
  // allow either structured details or plain message strings
  details?: Record<string, unknown> | string;
}

export const GET: RequestHandler = async ({ url }) => {
  const workerType = url.searchParams.get('type'); // ocr, embedding, autotag, all

  try {
    const workers: WorkerStatus[] = [];

    // Check OCR Worker
    if (!workerType || workerType === 'all' || workerType === 'ocr') {
      const ocrStatus = await checkOCRWorker();
      workers.push(ocrStatus);
    }

    // Check Embedding Worker (RabbitMQ-based)
    if (!workerType || workerType === 'all' || workerType === 'embedding') {
      const embeddingStatus = await checkEmbeddingWorker();
      workers.push(embeddingStatus);
    }

    // Check Autotag Worker
    if (!workerType || workerType === 'all' || workerType === 'autotag') {
      const autotagStatus = await checkAutotagWorker();
      workers.push(autotagStatus);
    }

    const allHealthy = workers.every(w => w.healthy);
    const overallStatus = allHealthy ? 'online' : workers.some(w => w.healthy) ? 'degraded' : 'offline';

    return json({
      success: true,
      status: overallStatus,
      workers,
      timestamp: new Date().toISOString(),
      summary: {
        total: workers.length,
        online: workers.filter(w => w.status === 'online').length,
        offline: workers.filter(w => w.status === 'offline').length,
        degraded: workers.filter(w => w.status === 'degraded').length,
      },
    });
  } catch (error) {
    console.error('[Worker Health] Check failed:', error);
    return json(
      {
        success: false,
        error: 'Worker health check failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

/**
 * Check OCR Worker health via Redis heartbeat
 */
async function checkOCRWorker(): Promise<WorkerStatus> {
  try {
    // Check Redis for OCR worker heartbeat
    const heartbeat = await redis.get('worker:ocr:heartbeat');
    const stats = await redis.get('worker:ocr:stats');

    if (!heartbeat) {
      return {
        name: 'OCR Worker',
        status: 'offline',
        healthy: false,
        details: 'No heartbeat found in Redis',
      };
    }

    const lastHeartbeat = new Date(heartbeat);
    const timeSinceHeartbeat = Date.now() - lastHeartbeat.getTime();
    const isHealthy = timeSinceHeartbeat < 60000; // 60 seconds threshold

    const parsedStats = stats ? JSON.parse(stats) : {};

    return {
      name: 'OCR Worker',
      status: isHealthy ? 'online' : 'degraded',
      healthy: isHealthy,
      lastHeartbeat: heartbeat,
      processedJobs: parsedStats.processedJobs || 0,
      uptime: parsedStats.uptime || 0,
      details: {
        timeSinceHeartbeat: `${Math.floor(timeSinceHeartbeat / 1000)}s`,
        gpuEnabled: parsedStats.gpuEnabled || false,
        workerPoolSize: parsedStats.workerPoolSize || 4,
      },
    };
  } catch (error) {
    console.error('[OCR Worker Health] Check failed:', error);
    return {
      name: 'OCR Worker',
      status: 'offline',
      healthy: false,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check RabbitMQ Embedding Worker health
 */
async function checkEmbeddingWorker(): Promise<WorkerStatus> {
  try {
    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

    // Check RabbitMQ queue depth
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    const queues = ['legal_ai.document.embedding', 'legal_ai.case.embedding'];
    let totalQueueDepth = 0;

    for (const queueName of queues) {
      try {
        const queueInfo = await channel.checkQueue(queueName);
        totalQueueDepth += queueInfo.messageCount;
      } catch (error) {
        // Queue doesn't exist yet
      }
    }

    await channel.close();
    await connection.close();

    // Check Redis for embedding worker heartbeat
    const heartbeat = await redis.get('worker:embedding:heartbeat');
    const stats = await redis.get('worker:embedding:stats');

    if (!heartbeat) {
      return {
        name: 'Embedding Worker',
        status: 'offline',
        healthy: false,
        queueDepth: totalQueueDepth,
        details: 'No heartbeat found - worker may not be running',
      };
    }

    const lastHeartbeat = new Date(heartbeat);
    const timeSinceHeartbeat = Date.now() - lastHeartbeat.getTime();
    const isHealthy = timeSinceHeartbeat < 60000;

    const parsedStats = stats ? JSON.parse(stats) : {};

    return {
      name: 'Embedding Worker',
      status: isHealthy ? 'online' : 'degraded',
      healthy: isHealthy,
      lastHeartbeat: heartbeat,
      queueDepth: totalQueueDepth,
      processedJobs: parsedStats.processedJobs || 0,
      uptime: parsedStats.uptime || 0,
      details: {
        timeSinceHeartbeat: `${Math.floor(timeSinceHeartbeat / 1000)}s`,
        ollamaModel: 'embeddinggemma:latest',
        queuedJobs: totalQueueDepth,
        failedJobs: parsedStats.failedJobs || 0,
      },
    };
  } catch (error) {
    console.error('[Embedding Worker Health] Check failed:', error);
    return {
      name: 'Embedding Worker',
      status: 'offline',
      healthy: false,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check Autotag Worker health
 */
async function checkAutotagWorker(): Promise<WorkerStatus> {
  let autotagRedisClient;
  try {
    // Use a dedicated connection for this check
    autotagRedisClient = createRedisConnection();

    // Check Redis for autotag worker heartbeat
    const heartbeat = await autotagRedisClient.get('worker:autotag:heartbeat');
    const stats = await autotagRedisClient.get('worker:autotag:stats');

    if (!heartbeat) {
      return {
        name: 'Autotag Worker',
        status: 'offline',
        healthy: false,
        details: 'Worker is optional - not critical',
      };
    }

    const lastHeartbeat = new Date(heartbeat);
    const timeSinceHeartbeat = Date.now() - lastHeartbeat.getTime();
    const isHealthy = timeSinceHeartbeat < 60000;

    const parsedStats = stats ? JSON.parse(stats) : {};

    return {
      name: 'Autotag Worker',
      status: isHealthy ? 'online' : 'degraded',
      healthy: isHealthy,
      lastHeartbeat: heartbeat,
      processedJobs: parsedStats.processedJobs || 0,
      uptime: parsedStats.uptime || 0,
      details: {
        timeSinceHeartbeat: `${Math.floor(timeSinceHeartbeat / 1000)}s`,
        gemma3Legal: parsedStats.aiPowered || false,
      },
    };
  } catch (error) {
    console.error('[Autotag Worker Health] Check failed:', error);
    return {
      name: 'Autotag Worker',
      status: 'offline',
      healthy: false,
      details: 'Optional worker - ' + (error instanceof Error ? error.message : String(error)),
    };
  } finally {
    if (autotagRedisClient) {
      try {
        await autotagRedisClient.quit();
      } catch (quitError) {
        console.error('[Autotag Worker Health] Error quitting Redis client:', quitError);
      }
    }
  }
}
