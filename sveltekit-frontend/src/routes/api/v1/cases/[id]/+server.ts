/*
 * Individual Case API Routes with Lucia v3 Authentication
 * GET /api/v1/cases/[id] - Get specific case
 * PUT /api/v1/cases/[id] - Update specific case
 * DELETE /api/v1/cases/[id] - Delete specific case
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import { CasesCRUDService, UpdateCaseSchema, type UpdateCaseData } from '$lib/server/services/user-scoped-crud';
import { z } from 'zod';

// UUID validation schema
const UUIDSchema = z.string().uuid('Invalid case ID format');

/*
 * GET /api/v1/cases/[id]
 * Get a specific case by ID
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(401, {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Validate case ID
    const caseId = UUIDSchema.parse(params.id);

    // Create service instance
    const casesService = new CasesCRUDService(locals.user.id);

    // Get case
    const caseData = await casesService.getById(caseId);

    return json({
      success: true,
      data: caseData,
      meta: {
        userId: locals.user.id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Error fetching case:', err);

    if (err instanceof z.ZodError) {
      return error(400, {
        message: 'Invalid case ID',
        code: 'INVALID_ID',
        details: err.errors,
      });
    }

    if (err.message.includes('not found') || err.message.includes('access denied')) {
      return error(404, {
        message: 'Case not found',
        code: 'CASE_NOT_FOUND',
      });
    }

    return error(500, {
      message: 'Failed to fetch case',
      code: 'FETCH_FAILED',
      details: err.message,
    });
  }
};

/*
 * PUT /api/v1/cases/[id]
 * Update a specific case
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(401, {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Validate case ID
    const caseId = UUIDSchema.parse(params.id);

    // Parse request body
    const body = await request.json();
    const validatedData = UpdateCaseSchema.parse({
      id: caseId,
      ...body,
    }) as UpdateCaseData;

    // Create service instance
    const casesService = new CasesCRUDService(locals.user.id);

    // Update case
    await casesService.update(validatedData);

    // Get updated case details
    const updatedCase = await casesService.getById(caseId);

    return json({
      success: true,
      data: updatedCase,
      meta: {
        userId: locals.user.id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Error updating case:', err);

    if (err instanceof z.ZodError) {
      return error(400, {
        message: 'Invalid case data',
        code: 'INVALID_DATA',
        details: err.errors,
      });
    }

    if (err.message.includes('not found') || err.message.includes('access denied')) {
      return error(404, {
        message: 'Case not found',
        code: 'CASE_NOT_FOUND',
      });
    }

    return error(500, {
      message: 'Failed to update case',
      code: 'UPDATE_FAILED',
      details: err.message,
    });
  }
};

/*
 * DELETE /api/v1/cases/[id]
 * Delete a specific case
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(401, {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Validate case ID
    const caseId = UUIDSchema.parse(params.id);

    // Create service instance
    const casesService = new CasesCRUDService(locals.user.id);

    // Delete case
    await casesService.delete(caseId);

    return json({
      success: true,
      message: 'Case deleted successfully',
      meta: {
        deletedCaseId: caseId,
        userId: locals.user.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err: any) {
    console.error('Error deleting case:', err);

    if (err instanceof z.ZodError) {
      return error(400, {
        message: 'Invalid case ID',
        code: 'INVALID_ID',
        details: err.errors
      });
    }

    if (err.message.includes('not found') || err.message.includes('access denied')) {
      return error(404, {
        message: 'Case not found',
        code: 'CASE_NOT_FOUND',
      });
    }

    return error(500, {
      message: 'Failed to delete case',
      code: 'DELETE_FAILED',
      details: err.message
    });
  }
};