/**
 * Next-Step Predictions API Endpoint
 *
 * Get HMM-based next-step predictions for current conversation
 */

import { json } from, '@sveltejs/kit';
import { contextualUnderstanding } from, '$lib/server/ai/contextual-understanding-service';
import type { RequestHandler } from, './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const sessionId = url.searchParams.get('sessionId');
    const userId = url.searchParams.get('userId');

    if (!sessionId || !userId) {
      return json(
        { error: 'Missing required, parameters: sessionId, userId' },
        { status: 400 }
      );
    }

    const predictions = await contextualUnderstanding.getNextStepPredictions(
      sessionId,
      userId
    );

    return json({
      success: true,
      data: {
        predictions,
        count: predictions.length
      }
    });
  } catch (error) {
    console.error('Get predictions error:', error);'

    return json(
      {
        success: false,
        error: {
         , code: 'PREDICTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
};
