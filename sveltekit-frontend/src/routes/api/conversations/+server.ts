/**
 * Conversations API - GET and POST endpoints
 * Handles conversation creation and retrieval
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { conversationService } from '$lib/server/services/conversation-service';
import { getRequestId, apiSuccess, apiError, withErrorHandling } from '$lib/server/api/standard-response';

// GET /api/conversations - Get user conversations
export const GET: RequestHandler = withErrorHandling(async (event) => {
  const requestId = getRequestId(event);
  
  // TODO: Get user ID from session/auth
  // For now, using a mock user ID - this would come from authentication
  const userId = event.url.searchParams.get('userId') || 'mock-user-id';
  const limit = parseInt(event.url.searchParams.get('limit') || '50');

  try {
    const conversations = await conversationService.getUserConversations(userId, limit);
    
    return apiSuccess(
      { conversations }, 
      `Retrieved ${conversations.length} conversations`, 
      requestId
    );
  } catch (err: any) {
    return apiError(
      'Failed to retrieve conversations',
      500,
      'DATABASE_ERROR',
      err,
      requestId
    );
  }
});

// POST /api/conversations - Create new conversation
export const POST: RequestHandler = withErrorHandling(async (event) => {
  const requestId = getRequestId(event);
  
  try {
    const body = await event.request.json();
    const { title, caseId, userId, context } = body;

    if (!title || !userId) {
      return apiError(
        'Missing required fields: title, userId',
        400,
        'INVALID_INPUT',
        undefined,
        requestId
      );
    }

    const conversation = await conversationService.createConversation({
      userId,
      title,
      caseId,
      context
    });

    return apiSuccess(
      { conversation },
      'Conversation created successfully',
      requestId
    );
  } catch (err: any) {
    return apiError(
      'Failed to create conversation',
      500,
      'DATABASE_ERROR',
      err,
      requestId
    );
  }
});