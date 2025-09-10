import { json, error, type RequestHandler } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';
import { timelineEvents } from '$lib/server/db/schemas/cases-schema';
import { db } from '$lib/server/database/connection';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import makeHttpErrorPayload from '$lib/server/api/makeHttpError';

// Schema for updating timeline events
const UpdateTimelineEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  eventDate: z.string().datetime().optional(),
  eventType: z.enum(['witness', 'evidence', 'document', 'interview', 'court', 'investigation', 'other']).optional(),
  location: z.string().max(500).optional(),
  participants: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

/**
 * GET /api/v1/timeline/events/[eventId]
 * Retrieve a specific timeline event
 */
export const GET: RequestHandler = async ({ params, cookies }) => {
  try {
    const sessionId = cookies.get(lucia.sessionCookieName);
    if (!sessionId) {
      return error(401, makeHttpErrorPayload('Unauthorized', 'No active session'));
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) {
      return error(401, makeHttpErrorPayload('Unauthorized', 'Invalid session'));
    }

    const eventId = params.eventId;
    if (!eventId) {
      return error(400, makeHttpErrorPayload('Invalid Request', 'Event ID is required'));
    }

    // Get the timeline event
    const timelineEvent = await db
      .select()
      .from(timelineEvents)
      .where(and(
        eq(timelineEvents.id, eventId),
        eq(timelineEvents.userId, user.id)
      ))
      .limit(1);

    if (timelineEvent.length === 0) {
      return error(404, makeHttpErrorPayload('Not Found', 'Timeline event not found'));
    }

    return json({
      success: true,
      data: {
        event: timelineEvent[0]
      }
    });

  } catch (err: any) {
    console.error('Get timeline event error:', err);
    return error(500, makeHttpErrorPayload('Internal Server Error', 'Failed to retrieve timeline event'));
  }
};

/**
 * PUT /api/v1/timeline/events/[eventId]
 * Update a specific timeline event
 */
export const PUT: RequestHandler = async ({ params, cookies, request }) => {
  try {
    const sessionId = cookies.get(lucia.sessionCookieName);
    if (!sessionId) {
      return error(401, makeHttpErrorPayload('Unauthorized', 'No active session'));
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) {
      return error(401, makeHttpErrorPayload('Unauthorized', 'Invalid session'));
    }

    const eventId = params.eventId;
    if (!eventId) {
      return error(400, makeHttpErrorPayload('Invalid Request', 'Event ID is required'));
    }

    const body = await request.json();
    const validatedData = UpdateTimelineEventSchema.parse(body);

    // Check if the event exists and belongs to the user
    const existingEvent = await db
      .select()
      .from(timelineEvents)
      .where(and(
        eq(timelineEvents.id, eventId),
        eq(timelineEvents.userId, user.id)
      ))
      .limit(1);

    if (existingEvent.length === 0) {
      return error(404, makeHttpErrorPayload('Not Found', 'Timeline event not found'));
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    };

    // Convert eventDate string to Date if provided
    if (validatedData.eventDate) {
      updateData.eventDate = new Date(validatedData.eventDate);
    }

    // Update the timeline event
    const updatedEvent = await db
      .update(timelineEvents)
      .set(updateData)
      .where(and(
        eq(timelineEvents.id, eventId),
        eq(timelineEvents.userId, user.id)
      ))
      .returning();

    return json({
      success: true,
      message: 'Timeline event updated successfully',
      data: {
        event: updatedEvent[0]
      }
    });

  } catch (err: any) {
    console.error('Update timeline event error:', err);

    if (err instanceof z.ZodError) {
      return error(400, makeHttpErrorPayload('Validation Error', 'Invalid input data', err.errors));
    }

    return error(500, makeHttpErrorPayload('Internal Server Error', 'Failed to update timeline event'));
  }
};

/**
 * DELETE /api/v1/timeline/events/[eventId]
 * Delete a specific timeline event
 */
export const DELETE: RequestHandler = async ({ params, cookies }) => {
  try {
    const sessionId = cookies.get(lucia.sessionCookieName);
    if (!sessionId) {
      return error(401, makeHttpErrorPayload('Unauthorized', 'No active session'));
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) {
      return error(401, makeHttpErrorPayload('Unauthorized', 'Invalid session'));
    }

    const eventId = params.eventId;
    if (!eventId) {
      return error(400, makeHttpErrorPayload('Invalid Request', 'Event ID is required'));
    }

    // Check if the event exists and belongs to the user
    const existingEvent = await db
      .select()
      .from(timelineEvents)
      .where(and(
        eq(timelineEvents.id, eventId),
        eq(timelineEvents.userId, user.id)
      ))
      .limit(1);

    if (existingEvent.length === 0) {
      return error(404, makeHttpErrorPayload('Not Found', 'Timeline event not found'));
    }

    // Delete the timeline event
    await db
      .delete(timelineEvents)
      .where(and(
        eq(timelineEvents.id, eventId),
        eq(timelineEvents.userId, user.id)
      ));

    return json({
      success: true,
      message: 'Timeline event deleted successfully',
      data: {
        deletedEventId: eventId
      }
    });

  } catch (err: any) {
    console.error('Delete timeline event error:', err);
    return error(500, makeHttpErrorPayload('Internal Server Error', 'Failed to delete timeline event'));
  }
};
