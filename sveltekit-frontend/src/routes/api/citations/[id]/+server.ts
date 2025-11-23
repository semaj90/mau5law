/**
 * Citation Detail API
 * GET: Get citation detail
 * PUT: Update citation notes
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

    const citation = await citationService.getCitationDetail(params.id);
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
    console.error('Error getting citation:', error);
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
 * PUT: Update citation notes
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const user = await getUser(locals);
    if (!user) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const citation = await citationService.getCitationDetail(params.id);
    if (!citation) {
      return json({ success: false, error: 'Citation not found' }, { status: 404 });
    }

    // Verify ownership
    if (citation.user_id !== user.id) {
      return json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { notes } = body;

    const updatedCitation = await citationService.updateCitationNotes(params.id, notes || '');

    // Log audit event
    await auditService.logSummaryOperation(
      user.id,
      citation.case_id || 'unknown',
      'retrieve',
      { citation_id: params.id, action: 'update' },
      true
    );

    return json({
      success: true,
      citation: updatedCitation,
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

    const citation = await citationService.getCitationDetail(params.id);
    if (!citation) {
      return json({ success: false, error: 'Citation not found' }, { status: 404 });
    }

    // Verify ownership
    if (citation.user_id !== user.id) {
      return json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await citationService.deleteCitation(params.id, user.id);

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
