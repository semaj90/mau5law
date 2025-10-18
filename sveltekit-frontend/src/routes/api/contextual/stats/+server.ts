/**
 * Session Statistics API Endpoint
 *
 * Get analytics for conversation session
 */

import { json } from '@sveltejs/kit';
import { contextualUnderstanding } from '$lib/server/ai/contextual-understanding-service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const sessionId = url.searchParams.get('sessionId');
    const userId = url.searchParams.get('userId');

    if (!sessionId || !userId) {
      return json(
        { error: 'Missing required parameters: sessionId, userId' },
        { status: 400 }
      );
    }

    const stats = await contextualUnderstanding.getSessionStats(sessionId, userId);

    return json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get session stats error:', error);

    return json(
      {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
};
