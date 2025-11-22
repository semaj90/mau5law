/**
 * Citations API
 * GET: List citations
 * POST: Save citation
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth/lucia';
import { citationService } from '$lib/server/services/citation.service';
import { auditService } from '$lib/server/services/audit.service';

/**
 * GET: List citations
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const user = await getUser(locals);
    if (!user) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const caseId = url.searchParams.get('case_id');

    let citations;
    if (caseId) {
      citations = await citationService.getCitationsByCase(caseId);
    } else {
      citations = await citationService.getCitationsByUser(user.id, limit, offset);
    }

    const stats = await citationService.getCitationStats(user.id);

    return json({
      success: true,
      citations,
      stats,
      count: citations.length,
    });
  } catch (error) {
    console.error('Error listing citations:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list citations',
      },
      { status: 500 }
    );
  }
};

/**
 * POST: Save citation
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await getUser(locals);
    if (!user) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      statute_code,
      statute_title,
      jurisdiction,
      severity,
      year,
      highlighted_text,
      notes,
      case_id,
      source_type,
    } = body;

    if (!statute_code) {
      return json({ success: false, error: 'statute_code is required' }, { status: 400 });
    }

    const citation = await citationService.saveCitation(user.id, {
      statute_code,
      statute_title,
      jurisdiction,
      severity,
      year,
      highlighted_text,
      notes,
      case_id,
      source_type: source_type || 'manual',
    });

    // Log audit event
    await auditService.logSummaryOperation(
      user.id,
      case_id || 'unknown',
      'retrieve',
      { citation_id: citation.id, source_type: citation.source_type },
      true
    );

    return json({
      success: true,
      citation,
    });
  } catch (error) {
    console.error('Error saving citation:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save citation',
      },
      { status: 500 }
    );
  }
};
