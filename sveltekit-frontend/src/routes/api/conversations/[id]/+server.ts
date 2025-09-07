/*
 * Single Conversation API - GET conversation with messages
 */

import type { RequestHandler } from './$types';
import { conversationService } from '$lib/server/services/conversation-service';
import { getRequestId, apiSuccess, apiError, withErrorHandling } from '$lib/server/api/standard-response';

// GET /api/conversations/[id] - Get conversation with messages
export const GET: RequestHandler = withErrorHandling(async (event) => {
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
    const conversationData = await conversationService.getConversationWithMessages(conversationId);

    if (!conversationData) {
      return apiError(
        'Conversation not found',
        404,
        'NOT_FOUND',
        undefined,
        requestId
      );
    }

    // Convert messages to ChatMessage format
    const chatMessages = conversationService.convertTochatMessages(conversationData.messages);

    return apiSuccess(
      {
        conversation: conversationData.conversation,
        messages: chatMessages
      },
      'Conversation retrieved successfully',
      requestId
    );
  } catch (err: any) {
    return apiError(
      'Failed to retrieve conversation',
      500,
      'DATABASE_ERROR',
      err,
      requestId
    );
  }
});

// PATCH /api/conversations/[id] - Update conversation (title, archive, etc.)
export const PATCH: RequestHandler = withErrorHandling(async (event) => {
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
    const { title, archive } = body;

    if (title) {
      await conversationService.updateConversationTitle(conversationId, title);
    }

    if (archive) {
      await conversationService.archiveConversation(conversationId);
    }

    return apiSuccess(
      { updated: true },
      'Conversation updated successfully',
      requestId
    );
  } catch (err: any) {
    return apiError(
      'Failed to update conversation',
      500,
      'DATABASE_ERROR',
      err,
      requestId
    );
  }
});