import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ChatHistoryService } from '$lib/server/chat/history-service';

export const GET: RequestHandler = async ({ url, locals }) => {
  const user = locals.user as any;
  if (!user?.id) return json({ error: 'Unauthorized' }, { status: 401 });
  const sessionId = url.searchParams.get('sessionId');
  if (sessionId) {
    const messages = await ChatHistoryService.getMessages(sessionId);
    return json({ sessionId, messages: messages.reverse() });
  }
  const sessions = await ChatHistoryService.getSessionsByUser(user.id);
  return json({ sessions });
};
