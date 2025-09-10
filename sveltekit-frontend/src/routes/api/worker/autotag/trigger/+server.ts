import type { RequestHandler } from './$types.js';

/*
 * PostgreSQL-First Worker Trigger API
 * Handles Redis events for auto-tagging and case processing
 */

import { json, error } from '@sveltejs/kit';

import { ensureError } from '$lib/utils/ensure-error';
import { redisService } from '$lib/server/redis-service';
import { z } from 'zod';
import { db } from '$lib/server/db/index';
import { cases } from '$lib/server/db/schema-postgres';
import { eq } from 'drizzle-orm';
import stream from 'stream';
import { EventEmitter } from 'events';

// Validation schema for worker trigger requests
const WorkerTriggerSchema = z.object({
  type: z.enum(['case_created', 'evidence_uploaded', 'document_processed', 'manual_trigger']),
  caseId: z.string().optional(),
  evidenceId: z.string().optional(),
  documentId: z.string().optional(),
  action: z.enum(['tag', 'process', 'mirror', 'analyze']).default('process'),
  metadata: z
    .object({
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      caseType: z.string().optional(),
      tags: z.array(z.string()).optional(),
      trigger: z.string().optional(),
      userId: z.string().optional(),
      timestamp: z.string().optional(),
    })
    .optional(),
  correlationId: z.string().optional(),
  retry: z.boolean().default(false),
});

type WorkerTriggerData = z.infer<typeof WorkerTriggerSchema>;

/*
 * POST /api/worker/autotag/trigger
 * Triggers PostgreSQL-first auto-tagging worker
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const body = await request.json();

    // Validate request data
    const triggerData = WorkerTriggerSchema.parse(body);

    // Generate correlation ID if not provided
    if (!triggerData.correlationId) {
      triggerData.correlationId = `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Add timestamp if not provided
    if (!triggerData.metadata?.timestamp) {
      triggerData.metadata = {
        ...triggerData.metadata,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate case exists if caseId provided
    if (triggerData.caseId) {
      const caseExists = await db
        .select({ id: cases.id })
        .from(cases)
        .where(eq(cases.id, triggerData.caseId))
        .limit(1);

      if (caseExists.length === 0) {
        return error(404, `Case not found: ${triggerData.caseId}`);
      }
    }

    // Ensure Redis connection (defensive cast to avoid ambient mismatches)
    await (redisService as any).initialize();

    // Create Redis stream event
    const eventData = {
      id: triggerData.correlationId,
      type: triggerData.type,
      action: triggerData.action,
      caseId: triggerData.caseId || '',
      evidenceId: triggerData.evidenceId || '',
      documentId: triggerData.documentId || '',
      metadata: JSON.stringify(triggerData.metadata || {}),
      retry: triggerData.retry ? '1' : '0',
      timestamp: Date.now().toString(),
    };

    // Add to Redis stream for worker consumption
    const streamName = 'autotag:requests';
    const streamId = await redisService.xAdd(streamName, '*', eventData);

    console.log(`🚀 Worker trigger sent to Redis stream: ${streamName}:${streamId}`, {
      type: triggerData.type,
      action: triggerData.action,
      caseId: triggerData.caseId,
      correlationId: triggerData.correlationId,
    });

    // Optional: Send to PostgreSQL notification as well
    if (triggerData.type === 'case_created' && triggerData.caseId) {
      try {
        // Send PostgreSQL NOTIFY for real-time processing
        await db.execute(`
          NOTIFY case_created, '${JSON.stringify({
            case_id: triggerData.caseId,
            priority: triggerData.metadata?.priority || 'medium',
            case_type: triggerData.metadata?.caseType || 'civil',
            trigger: triggerData.metadata?.trigger || 'api',
            correlation_id: triggerData.correlationId,
            timestamp: new Date().toISOString(),
          })}'
        `);
        console.log(`📡 PostgreSQL NOTIFY sent for case: ${triggerData.caseId}`);
      } catch (pgError) {
        console.warn('⚠️ PostgreSQL NOTIFY failed:', pgError);
        // Don't fail the request if PG notification fails
      }
    }

    return json({
      success: true,
      data: {
        streamId,
        correlationId: triggerData.correlationId,
        triggerType: triggerData.type,
        action: triggerData.action,
        caseId: triggerData.caseId,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        worker: 'postgresql-first-autotag',
        version: '2.0',
      },
    });
  } catch (validationError) {
    console.error('❌ Worker trigger validation failed:', validationError);

    if (validationError instanceof z.ZodError) {
      return error(
        400,
        `Invalid trigger data: ${validationError.errors[0]?.message || 'Validation failed'}`
      );
    }

    return error(
      500,
      `Worker trigger failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`
    );
  }
};

/*
 * GET /api/worker/autotag/trigger
 * Get worker trigger status and recent events
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    // Ensure Redis connection
    await redisService.initialize();
    const streamName = 'autotag:requests';

    // Get stream info
    const streamInfo = await (redisService as any).xInfoStream(streamName).catch(() => null);

    // Get recent events (last 10)
    const recentEvents = await (redisService as any)
      .xRevRange(streamName, '+', '-', { COUNT: 10 })
      .catch(() => []);

    // Parse events
    const events = (recentEvents as any[]).map((event: any) => ({
      id: event.id,
      timestamp: new Date(parseInt(event.message.timestamp)).toISOString(),
      type: event.message.type,
      action: event.message.action,
      caseId: event.message.caseId || null,
      evidenceId: event.message.evidenceId || null,
      documentId: event.message.documentId || null,
      metadata: JSON.parse(event.message.metadata || '{}'),
      retry: event.message.retry === '1',
    }));

    return json({
      success: true,
      data: {
        streamInfo: streamInfo
          ? {
              length: streamInfo.length,
              firstEntry: streamInfo['first-entry'],
              lastEntry: streamInfo['last-entry'],
            }
          : null,
        recentEvents: events,
        workerStatus: 'active', // TODO: Implement actual worker health check
        lastProcessed: events.length > 0 ? events[0].timestamp : null,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        worker: 'postgresql-first-autotag',
        version: '2.0',
      },
    });
  } catch (error: any) {
    console.error('❌ Worker status check failed:', error);

    return json(
      {
        success: false,
        error: {
          message: 'Worker status check failed',
          code: 'WORKER_STATUS_ERROR',
        },
      },
      { status: 500 }
    );
  }
};

/*
 * DELETE /api/worker/autotag/trigger
 * Clear worker event stream (admin operation)
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
  try {
    // TODO: Add proper admin authentication check
    // if (!locals.user || locals.user.role !== 'admin') {
    //   return error(403, ensureError({ message: 'Admin access required' }));
    // }

    // Ensure Redis connection
    await redisService.initialize();
    const streamName = 'autotag:requests';

    // Get current stream info
    const streamInfo = await redisService.xInfoStream(streamName).catch(() => null);
    // xInfoStream can return various structures; ensure numeric fallback
    const deletedCount = Array.isArray(streamInfo)
      ? streamInfo.length
      : typeof streamInfo === 'object' &&
          streamInfo !== null &&
          'length' in (streamInfo as any) &&
          typeof (streamInfo as any).length === 'number'
        ? (streamInfo as any).length
        : 0;

    // Delete the entire stream
    await redisService.del(streamName);

    console.log(`🗑️ Worker event stream cleared: ${deletedCount} events deleted`);

    return json({
      success: true,
      data: {
        deletedEvents: deletedCount,
        streamName,
        clearedAt: new Date().toISOString(),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        operation: 'stream-clear',
        version: '2.0',
      },
    });
  } catch (error: any) {
    console.error('❌ Worker stream clear failed:', error);

    return error(500, 'Worker stream clear failed');
  }
};

