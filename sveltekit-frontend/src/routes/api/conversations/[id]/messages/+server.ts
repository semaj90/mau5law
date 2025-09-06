/**
 * Conversation Messages API - POST new messages to conversation
 */

import type { RequestHandler } from './$types';
import { conversationService } from '$lib/server/services/conversation-service';
import { getRequestId, apiSuccess, apiError, withErrorHandling } from '$lib/server/api/standard-response';

// POST /api/conversations/[id]/messages - Add message to conversation
export const POST: RequestHandler = withErrorHandling(async (event) => {
  const requestId = getRequestId(event);
  const conversationId = event.params.id;

  if (!conversationId) {
    return apiError(
      'Conversation ID is required',
      400,
      'INVALID_INPUT',
      undefined,
      requestId
    );
  }

  try {
    const body = await event.request.json();
    const { 
      role, 
      content, 
      model, 
      tokenCount, 
      processingTime, 
      confidence, 
      vectorSearchResults,
      metadata 
    } = body;

    if (!role || !content) {
      return apiError(
        'Missing required fields: role, content',
        400,
        'INVALID_INPUT',
        undefined,
        requestId
      );
    }

    if (role !== 'user' && role !== 'assistant') {
      return apiError(
        'Role must be either "user" or "assistant"',
        400,
        'INVALID_INPUT',
        undefined,
        requestId
      );
    }

    const message = await conversationService.addMessage({
      conversationId,
      role,
      content,
      model,
      tokenCount,
      processingTime,
      confidence,
      vectorSearchResults,
      metadata
    });

    return apiSuccess(
      { message },
      'Message added successfully',
      requestId
    );
  } catch (err: any) {
    return apiError(
      'Failed to add message',
      500,
      'DATABASE_ERROR',
      err,
      requestId
    );
  }
});