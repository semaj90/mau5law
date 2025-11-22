/**
 * Citation Detail API
 * GET: Get citation detail
 * PUT: Update citation
 * DELETE: Delete citation
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth/lucia';
import { citationService } from '$lib/server/services/citation.service';
import { auditService } from '$lib/server/services/audit.service';

/**
 * GET: Get citation detail
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const user = await getUser(locals);
    if (!user) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const citation = await citationService.getCitationDetail(id);

    if (!citation) {
      return json({ success: false, error: 'Citation not found' }, { status: 404 });
    }

    // Verify ownership
    if (citation.user_id !== user.id) {
      return json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return json({
      success: true,
      citation,
    });
  } catch (error) {
    console.error('Error getting citation detail:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get citation',
      },
      { status: 500 }
    );
  }
};

/**
 * PUT: Update citation
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const user = await getUser(locals);
    if (!user) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { notes } = body;

    // Get existing citation to verify ownership
    const existing = await citationService.getCitationDetail(id);
    if (!existing) {
      return json({ success: false, error: 'Citation not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const updated = await citationService.updateCitationNotes(id, notes);

    // Log audit event
    await auditService.logSummaryOperation(
      user.id,
      existing.case_id || 'unknown',
      'retrieve',
      { citation_id: id, action: 'update' },
      true
    );

    return json({
      success: true,
      citation: updated,
    });
  } catch (error) {
    console.error('Error updating citation:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update citation',
      },
      { status: 500 }
    );
  }
};

/**
 * DELETE: Delete citation
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    const user = await getUser(locals);
    if (!user) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get existing citation to verify ownership
    const existing = await citationService.getCitationDetail(id);
    if (!existing) {
      return json({ success: false, error: 'Citation not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await citationService.deleteCitation(id, user.id);

    // Log audit event
    await auditService.logSummaryOperation(
      user.id,
      existing.case_id || 'unknown',
      'retrieve',
      { citation_id: id, action: 'delete' },
      true
    );

    return json({
      success: true,
      message: 'Citation deleted',
    });
  } catch (error) {
    console.error('Error deleting citation:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete citation',
      },
      { status: 500 }
    );
  }
};
