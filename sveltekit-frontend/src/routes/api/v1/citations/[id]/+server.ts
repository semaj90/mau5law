/*
 * Individual Citation API Routes
 * GET /api/v1/citations/[id] - Get specific citation
 * PUT /api/v1/citations/[id] - Update specific citation
 * DELETE /api/v1/citations/[id] - Delete specific citation
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import makeHttpErrorPayload from '$lib/server/api/makeHttpError';
import { db } from '$lib/server/db/connection';
import { citations } from '$lib/server/db/schemas/cases-schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// UUID validation schema
const UUIDSchema = z.string().uuid('Invalid citation ID format');

// Update citation schema
const UpdateCitationSchema = z.object({
  title: z.string().min(1).optional(),
  citation: z.string().min(1).optional(),
  citationType: z.enum(['case_law', 'statute', 'regulation', 'constitutional', 'secondary', 'other']).optional(),
  jurisdiction: z.string().optional(),
  court: z.string().optional(),
  year: z.number().int().min(1800).max(2030).optional(),
  volume: z.string().optional(),
  page: z.string().optional(),
  url: z.string().url().optional(),
  notes: z.string().optional(),
  relevance: z.enum(['high', 'medium', 'low']).optional(),
  verified: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

/*
 * GET /api/v1/citations/[id]
 * Get a specific citation by ID
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(
        401,
        makeHttpErrorPayload({ message: 'Authentication required', code: 'AUTH_REQUIRED' })
      );
    }

    // Validate citation ID
    const citationId = UUIDSchema.parse(params.id);

    // Get citation from database
    const [citation] = await db.select()
      .from(citations)
      .where(eq(citations.id, citationId))
      .limit(1);

    if (!citation) {
      return error(
        404,
        makeHttpErrorPayload({ message: 'Citation not found', code: 'CITATION_NOT_FOUND' })
      );
    }

    return json({
      success: true,
      data: {
        citation,
      },
      meta: {
        userId: locals.user.id,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (err: any) {
    console.error('Citation GET error:', err);

    if (err instanceof z.ZodError) {
      return error(
        400,
        makeHttpErrorPayload({
          message: 'Invalid citation ID',
          code: 'INVALID_ID',
          details: err.errors,
        })
      );
    }

    return error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to fetch citation',
        code: 'FETCH_FAILED',
        details: err.message,
      })
    );
  }
};

/*
 * PUT /api/v1/citations/[id]
 * Update a specific citation
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(
        401,
        makeHttpErrorPayload({ message: 'Authentication required', code: 'AUTH_REQUIRED' })
      );
    }

    // Validate citation ID
    const citationId = UUIDSchema.parse(params.id);

    // Parse request body
    const body = await request.json();
    const updateData = UpdateCitationSchema.parse(body);

    // Check if citation exists
    const [existingCitation] = await db.select()
      .from(citations)
      .where(eq(citations.id, citationId))
      .limit(1);

    if (!existingCitation) {
      return error(
        404,
        makeHttpErrorPayload({ message: 'Citation not found', code: 'CITATION_NOT_FOUND' })
      );
    }

    // Update citation
    const [updatedCitation] = await db.update(citations)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(citations.id, citationId))
      .returning();

    return json({
      success: true,
      data: {
        citation: updatedCitation,
        message: 'Citation updated successfully',
      },
      meta: {
        userId: locals.user.id,
        citationId,
        timestamp: new Date().toISOString(),
        action: 'citation_updated',
      },
    });

  } catch (err: any) {
    console.error('Citation PUT error:', err);

    if (err instanceof z.ZodError) {
      return error(
        400,
        makeHttpErrorPayload({
          message: 'Invalid citation data',
          code: 'INVALID_DATA',
          details: err.errors,
        })
      );
    }

    return error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to update citation',
        code: 'UPDATE_FAILED',
        details: err.message,
      })
    );
  }
};

/*
 * DELETE /api/v1/citations/[id]
 * Delete a specific citation
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(
        401,
        makeHttpErrorPayload({ message: 'Authentication required', code: 'AUTH_REQUIRED' })
      );
    }

    // Validate citation ID
    const citationId = UUIDSchema.parse(params.id);

    // Check if citation exists
    const [existingCitation] = await db.select()
      .from(citations)
      .where(eq(citations.id, citationId))
      .limit(1);

    if (!existingCitation) {
      return error(
        404,
        makeHttpErrorPayload({ message: 'Citation not found', code: 'CITATION_NOT_FOUND' })
      );
    }

    // Delete citation
    await db.delete(citations)
      .where(eq(citations.id, citationId));

    return json({
      success: true,
      data: {
        message: 'Citation deleted successfully',
        deletedCitation: {
          id: citationId,
          title: existingCitation.title,
        },
      },
      meta: {
        userId: locals.user.id,
        deletedCitationId: citationId,
        timestamp: new Date().toISOString(),
        action: 'citation_deleted',
      },
    });

  } catch (err: any) {
    console.error('Citation DELETE error:', err);

    if (err instanceof z.ZodError) {
      return error(
        400,
        makeHttpErrorPayload({
          message: 'Invalid citation ID',
          code: 'INVALID_ID',
          details: err.errors,
        })
      );
    }

    return error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to delete citation',
        code: 'DELETE_FAILED',
        details: err.message,
      })
    );
  }
};
