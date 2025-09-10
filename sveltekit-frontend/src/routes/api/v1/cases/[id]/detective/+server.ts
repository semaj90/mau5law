/*
 * Detective Mode Toggle API Route
 * POST /api/v1/cases/[id]/detective - Toggle detective mode for case
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import makeHttpErrorPayload from '$lib/server/api/makeHttpError';
import { CasesCRUDService } from '$lib/server/services/user-scoped-crud';
import { z } from 'zod';

// UUID validation schema
const UUIDSchema = z.string().uuid('Invalid case ID format');

// Detective mode request schema
const DetectiveModeSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().optional(),
  aiAssisted: z.boolean().default(true),
});

/*
 * POST /api/v1/cases/[id]/detective
 * Toggle detective mode for a specific case
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(
        401,
        makeHttpErrorPayload({ message: 'Authentication required', code: 'AUTH_REQUIRED' })
      );
    }

    // Validate case ID
    const caseId = UUIDSchema.parse(params.id);

    // Parse request body
    const body = await request.json();
    const { enabled, reason, aiAssisted } = DetectiveModeSchema.parse(body);

    // Create service instance
    const casesService = new CasesCRUDService(locals.user.id);

    // Get current case to verify it exists and user has access
    const currentCase = await casesService.getById(caseId);
    if (!currentCase) {
      return error(
        404,
        makeHttpErrorPayload({ message: 'Case not found', code: 'CASE_NOT_FOUND' })
      );
    }

    // Update detective mode
    const updateData = {
      detectiveMode: enabled,
      metadata: {
        ...currentCase.metadata,
        detectiveMode: {
          enabled,
          toggledAt: new Date().toISOString(),
          toggledBy: locals.user.id,
          reason: reason || (enabled ? 'Detective mode activated' : 'Detective mode deactivated'),
          aiAssisted,
          previousState: currentCase.metadata?.detectiveMode || null,
        },
      },
    };

    await casesService.update(caseId, updateData);

    // Get updated case
    const updatedCase = await casesService.getById(caseId);

    // Log detective mode change for audit trail
    console.log(`Detective mode ${enabled ? 'activated' : 'deactivated'} for case ${caseId} by user ${locals.user.id}`);

    return json({
      success: true,
      data: {
        case: updatedCase,
        detectiveMode: {
          enabled,
          toggledAt: new Date().toISOString(),
          reason: reason || (enabled ? 'Detective mode activated' : 'Detective mode deactivated'),
          aiAssisted,
        },
      },
      meta: {
        userId: locals.user.id,
        caseId,
        timestamp: new Date().toISOString(),
        action: enabled ? 'detective_mode_activated' : 'detective_mode_deactivated',
      },
    });
  } catch (err: any) {
    console.error('Error toggling detective mode:', err);

    if (err instanceof z.ZodError) {
      return error(
        400,
        makeHttpErrorPayload({
          message: 'Invalid request data',
          code: 'INVALID_DATA',
          details: err.errors,
        })
      );
    }

    if (err.message.includes('not found') || err.message.includes('access denied')) {
      return error(
        404,
        makeHttpErrorPayload({ message: 'Case not found', code: 'CASE_NOT_FOUND' })
      );
    }

    return error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to toggle detective mode',
        code: 'DETECTIVE_MODE_FAILED',
        details: err.message,
      })
    );
  }
};
