/**
 * Contextual State API Endpoint
 *
 * Get/update conversation state with HMM predictions
 */

import { json } from '@sveltejs/kit';
import { contextualUnderstanding } from '$lib/server/ai/contextual-understanding-service';
import type { RequestHandler } from './$types';

/**
 * GET: Retrieve contextual state
 */
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

    const state = await contextualUnderstanding.getContextualState(sessionId, userId);

    return json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error('Get contextual state error:', error);

    return json(
      {
        success: false,
        error: {
         , code: 'STATE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
};

/**
 * POST: Update contextual state
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      sessionId,
      userId,
      userMessage,
      agentResponse,
      intent,
      entities = [],
      embedding
    } = body;

    if (!sessionId || !userId || !userMessage || !agentResponse || !intent) {
      return json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updatedState = await contextualUnderstanding.updateContextualState(
      sessionId,
      userId,
      userMessage,
      agentResponse,
      intent,
      entities,
      embedding
    );

    return json({
      success: true,
      data: updatedState
    });
  } catch (error) {
    console.error('Update contextual state error:', error);

    return json(
      {
        success: false,
        error: {
         , code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
};

/**
 * DELETE: Clear contextual state
 */
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return json(
        { error: 'Missing required, parameter: sessionId' },
        { status: 400 }
      );
    }

    await contextualUnderstanding.clearContextualState(sessionId);

    return json({
      success: true,
      message: 'Contextual state cleared'
    });
  } catch (error) {
    console.error('Clear contextual state error:', error);

    return json(
      {
        success: false,
        error: {
         , code: 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
};
