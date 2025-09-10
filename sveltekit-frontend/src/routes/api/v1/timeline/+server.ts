/**
 * Timeline API Routes
 *
 * Endpoints:
 * GET    /api/v1/timeline - Get timeline events for a case
 * POST   /api/v1/timeline - Add timeline event
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

// Timeline schemas
const TimelineQuerySchema = z.object({
  caseId: z.string().uuid('Invalid case ID'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  eventType: z.enum(['case_created', 'evidence_added', 'evidence_analyzed', 'hearing_scheduled', 'document_filed', 'meeting_held', 'deadline_set', 'status_changed', 'note_added', 'assignment_changed', 'custom_event']).optional(),
  importance: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const CreateTimelineEventSchema = z.object({
  caseId: z.string().uuid('Invalid case ID'),
  eventType: z.enum(['case_created', 'evidence_added', 'evidence_analyzed', 'hearing_scheduled', 'document_filed', 'meeting_held', 'deadline_set', 'status_changed', 'note_added', 'assignment_changed', 'custom_event']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  eventDate: z.string().datetime(),
  importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  evidenceId: z.string().uuid().optional(),
  relatedEntityId: z.string().uuid().optional(),
  relatedEntityType: z.string().optional(),
  eventData: z.record(z.any()).default({})
});

/**
 * Timeline Service
 */
class TimelineService {
  constructor(private userId: string) {}

  async getTimelineEvents(query: z.infer<typeof TimelineQuerySchema>) {
    // For now, return sample timeline data
    // In production, this would query the case_timeline table

    const sampleEvents = [
      {
        id: crypto.randomUUID(),
        caseId: query.caseId,
        eventType: 'case_created',
        title: 'Case Opened',
        description: 'Legal case opened for investigation',
        eventDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        importance: 'high',
        automated: true,
        createdBy: this.userId
      },
      {
        id: crypto.randomUUID(),
        caseId: query.caseId,
        eventType: 'evidence_added',
        title: 'Evidence Collected',
        description: 'Initial evidence collected from crime scene',
        eventDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        importance: 'medium',
        automated: false,
        createdBy: this.userId
      },
      {
        id: crypto.randomUUID(),
        caseId: query.caseId,
        eventType: 'hearing_scheduled',
        title: 'Court Hearing Scheduled',
        description: 'Initial hearing scheduled for next month',
        eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        importance: 'critical',
        automated: false,
        createdBy: this.userId
      }
    ];

    // Apply filters
    let filteredEvents = sampleEvents;

    if (query.eventType) {
      filteredEvents = filteredEvents.filter(event => event.eventType === query.eventType);
    }

    if (query.importance) {
      filteredEvents = filteredEvents.filter(event => event.importance === query.importance);
    }

    // Sort by event date
    filteredEvents.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

    // Apply pagination
    const offset = (query.page - 1) * query.limit;
    const paginatedEvents = filteredEvents.slice(offset, offset + query.limit);

    return {
      data: paginatedEvents,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: filteredEvents.length,
        totalPages: Math.max(1, Math.ceil(filteredEvents.length / query.limit)),
        hasNext: query.page < Math.ceil(filteredEvents.length / query.limit),
        hasPrev: query.page > 1
      }
    };
  }

  async createTimelineEvent(data: z.infer<typeof CreateTimelineEventSchema>) {
    // In production, this would insert into case_timeline table
    const newEvent = {
      id: crypto.randomUUID(),
      ...data,
      automated: false,
      createdBy: this.userId,
      dateCreated: new Date().toISOString()
    };

    return newEvent;
  }
}

/**
 * GET /api/v1/timeline
 * Get timeline events for a case
 */
export const GET: RequestHandler = async ({ request, locals, url }) => {
  try {
    if (!locals.session || !locals.user) {
      return json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = TimelineQuerySchema.parse(queryParams);

    const timelineService = new TimelineService(locals.user.id);
    const result = await timelineService.getTimelineEvents(validatedQuery);

    // Response validation
    const TimelineItem = z.object({
      id: z.string(),
      caseId: z.string().uuid(),
      eventType: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      eventDate: z.string(),
      importance: z.string().optional(),
      automated: z.boolean().optional(),
      createdBy: z.string().optional(),
    }).passthrough();

    const TimelineListResponse = z.object({
      success: z.literal(true),
      data: z.array(TimelineItem),
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
        hasNext: z.boolean(),
        hasPrev: z.boolean(),
      }),
      meta: z.record(z.any()).optional(),
    }).passthrough();

    const payload = {
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        caseId: validatedQuery.caseId,
        userId: locals.user.id,
        timestamp: new Date().toISOString(),
      },
    };

    const validated = TimelineListResponse.safeParse(payload);
    if (!validated.success) {
      console.error('Timeline list response validation failed', validated.error);
      return error(500, { message: 'Invalid response shape' });
    }

    return json(payload);

  } catch (err: any) {
    console.error('Error fetching timeline:', err);

    if (err instanceof z.ZodError) {
      return json({ success: false, message: 'Invalid query parameters', details: err.errors }, { status: 400 });
    }

    return json({ success: false, message: 'Failed to fetch timeline', details: err.message }, { status: 500 });
  }
};

/**
 * POST /api/v1/timeline
 * Add timeline event
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.session || !locals.user) {
      return json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateTimelineEventSchema.parse(body);

    const timelineService = new TimelineService(locals.user.id);
    const newEvent = await timelineService.createTimelineEvent(validatedData);

    return json({
      success: true,
      data: newEvent,
      meta: {
        userId: locals.user.id,
        timestamp: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (err: any) {
    console.error('Error creating timeline event:', err);

    if (err instanceof z.ZodError) {
      return json({ success: false, message: 'Invalid event data', details: err.errors }, { status: 400 });
    }

    return json({ success: false, message: 'Failed to create timeline event', details: err.message }, { status: 500 });
  }
};
