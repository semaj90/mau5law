import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/database';
import { aiHistory } from '$lib/db/schema/aiHistory';
import { gpuInferenceSessions } from '$lib/db/schema/gpuInferenceDemo';
import { helpers } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { sessionName, userId, engineUsed } = await request.json();

    // Create a session marker in aiHistory table
    const [session] = await db.insert(aiHistory).values({
      userId: userId || 'anonymous',
      prompt: `SESSION_START: ${sessionName || 'GPU Demo Session'}`,
      response: `Session created with engine: ${engineUsed || 'auto'}`,
      embedding: JSON.stringify({
        sessionName,
        engineUsed,
        userAgent: request.headers.get('user-agent'),
        created: new Date().toISOString()
      })
    }).returning();

    return json({
      id: session.id,
      sessionName,
      userId: session.userId,
      engineUsed: engineUsed || 'auto',
      createdAt: session.createdAt
    });

  } catch (error) {
    console.error('❌ Failed to create session:', error);
    return json({ error: 'Failed to create session' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const sessionId = url.searchParams.get('id');

    if (sessionId) {
      // Get specific session from aiHistory
      const [session] = await db
        .select()
        .from(aiHistory)
  .where((helpers.eq as any)(aiHistory.id, sessionId))
        .limit(1);

      if (!session) {
        return json({ error: 'Session not found' }, { status: 404 });
      }

      return json({
        id: session.id,
        sessionName: session.prompt.replace('SESSION_START: ', ''),
        userId: session.userId,
        createdAt: session.createdAt,
        response: session.response
      });
    } else {
      // Get recent sessions (those marked as SESSION_START)
      const sessions = await db
        .select()
        .from(aiHistory)
  .where((helpers.eq as any)(aiHistory.prompt, 'SESSION_START'))
        .orderBy(aiHistory.createdAt)
        .limit(50);

      return json(sessions.map(s => ({
        id: s.id,
        sessionName: s.prompt.replace('SESSION_START: ', ''),
        userId: s.userId,
        createdAt: s.createdAt
      })));
    }

  } catch (error) {
    console.error('❌ Failed to get session:', error);
    return json({ error: 'Failed to get session' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const { sessionId, ...updates } = await request.json();

    if (!sessionId) {
      return json({ error: 'Session ID required' }, { status: 400 });
    }

    const [session] = await db
      .update(gpuInferenceSessions)
      .set({
        ...updates,
        updatedAt: new Date()
      })
  .where((helpers.eq as any)(gpuInferenceSessions.id, sessionId))
      .returning();

    if (!session) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    return json(session);

  } catch (error) {
    console.error('❌ Failed to update session:', error);
    return json({ error: 'Failed to update session' }, { status: 500 });
  }
};