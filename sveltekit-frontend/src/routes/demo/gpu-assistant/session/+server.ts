import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { dbPool } from '$lib/server/database-pool-service';
import { embeddingCache } from '$lib/server/embedding-cache-service';
import { chatSessions, chatMessages } from '$lib/server/db/schema-unified';
import { eq, asc } from 'drizzle-orm';

// Using enhanced database pool service
// No need for manual connection setup

export const GET: RequestHandler = async () => {
  try {
    const id = randomUUID();
    
    // Get database connection with pooling
    const db = await dbPool.getDrizzle('gpu-assistant');
    
    // Create new chat session with cached query
    const insertQuery = `
      INSERT INTO chat_sessions (id, title, context, metadata) 
      VALUES ($1, $2, $3, $4)
    `;
    await dbPool.queryCached(
      insertQuery,
      [id, 'GPU Assistant Session', '{}', '{"source": "gpu-assistant"}'],
      'gpu-assistant',
      1 // Short cache for insert operations
    );
    
    // Get any existing messages for this session (should be empty for new session)
    const messagesQuery = `
      SELECT id, session_id, role, content, metadata, created_at
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `;
    const messages = await dbPool.queryCached(
      messagesQuery,
      [id],
      'gpu-assistant',
      30 // Cache messages for 30 seconds
    );
    
    // Cache session data
    await embeddingCache.cacheSession(id, {
      title: 'GPU Assistant Session',
      context: {},
      metadata: { source: 'gpu-assistant' },
      created: Date.now()
    });
    
    return json({ sessionId: id, messages });
  } catch (error) {
    console.error('Failed to create chat session:', error);
    // Fallback to non-persistent session if database fails
    return json({ sessionId: randomUUID(), messages: [] });
  }
};

export const POST: RequestHandler = async () => {
  try {
    const id = randomUUID();
    
    // Get database connection with pooling
    const db = await dbPool.getDrizzle('gpu-assistant');
    
    // Create new chat session with cached query
    const insertQuery = `
      INSERT INTO chat_sessions (id, title, context, metadata) 
      VALUES ($1, $2, $3, $4)
    `;
    await dbPool.queryCached(
      insertQuery,
      [id, 'GPU Assistant Session', '{}', '{"source": "gpu-assistant"}'],
      'gpu-assistant',
      1 // Short cache for insert operations
    );
    
    // Get any existing messages for this session (should be empty for new session)
    const messagesQuery = `
      SELECT id, session_id, role, content, metadata, created_at
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `;
    const messages = await dbPool.queryCached(
      messagesQuery,
      [id],
      'gpu-assistant',
      30 // Cache messages for 30 seconds
    );
    
    // Cache session data
    await embeddingCache.cacheSession(id, {
      title: 'GPU Assistant Session',
      context: {},
      metadata: { source: 'gpu-assistant' },
      created: Date.now()
    });
    
    return json({ sessionId: id, messages });
  } catch (error) {
    console.error('Failed to create chat session:', error);
    // Fallback to non-persistent session if database fails
    return json({ sessionId: randomUUID(), messages: [] });
  }
};
