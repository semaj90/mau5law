/**
 * Citation Search API
 * GET: Search citations
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth/lucia';
import { citationService } from '$lib/server/services/citation.service';

/**
 * GET: Search citations
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const user = await getUser(locals);
    if (!user) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const query = url.searchParams.get('q') || '';
    const jurisdiction = url.searchParams.get('jurisdiction');
    const severity = url.searchParams.get('severity');
    const caseId = url.searchParams.get('case_id');
    const sourceType = url.searchParams.get('source_type');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!query) {
      return json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const citations = await citationService.searchCitations(user.id, query, {
      jurisdiction: jurisdiction || undefined,
      severity: severity || undefined,
      case_id: caseId || undefined,
      source_type: sourceType || undefined,
      limit,
      offset,
    });

    return json({
      success: true,
      citations,
      count: citations.length,
    });
  } catch (error) {
    console.error('Error searching citations:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search citations',
      },
      { status: 500 }
    );
  }
};
