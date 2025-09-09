import type { RequestHandler } from './$types';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { chatSessions, chatMessages } from '$lib/server/db/schema-unified';
import { eq, asc } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5433/legal_ai_db';
const sql = postgres(connectionString, { 
  host: 'localhost',
  port: 5433,
  database: 'legal_ai_db',
  username: 'legal_admin',
  password: '123456',
  max: 5 
});
const db = drizzle(sql);

export const GET: RequestHandler = async () => {
  try {
    const id = randomUUID();
    
    // Create new chat session with proper values
    await db.insert(chatSessions).values({ 
      id,
      title: 'GPU Assistant Session',
      context: {},
      metadata: { source: 'gpu-assistant' }
    });
    
    // Get any existing messages for this session (should be empty for new session)
    const messages = await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, id))
      .orderBy(asc(chatMessages.createdAt));
    
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
    
    // Create new chat session with proper values
    await db.insert(chatSessions).values({ 
      id,
      title: 'GPU Assistant Session',
      context: {},
      metadata: { source: 'gpu-assistant' }
    });
    
    // Get any existing messages for this session (should be empty for new session)
    const messages = await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, id))
      .orderBy(asc(chatMessages.createdAt));
    
    return json({ sessionId: id, messages });
  } catch (error) {
    console.error('Failed to create chat session:', error);
    // Fallback to non-persistent session if database fails
    return json({ sessionId: randomUUID(), messages: [] });
  }
};
