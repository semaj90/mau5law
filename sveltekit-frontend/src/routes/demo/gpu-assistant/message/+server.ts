import type { RequestHandler } from './$types';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { chatMessages } from '$lib/server/db/schema-unified';
import { eq } from 'drizzle-orm';

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

async function askOllama(prompt: string, model = 'gemma3-legal'): Promise<string> {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return data.response || '';
  } catch (e) {
    return 'AI service unavailable.';
  }
}

async function generateGemmaEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'nomic-embed-text', // Fallback to nomic if gemma embeddings not available
        prompt: text 
      })
    });
    if (!res.ok) throw new Error(`Embedding error ${res.status}`);
    const data = await res.json();
    return data.embedding || null;
  } catch (e) {
    console.warn('Embedding generation failed, storing without embedding:', e);
    return null;
  }
}

// Send a message and get AI response
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const sessionId: string = body.sessionId;
    const content: string = body.content;
    const model: string = body.model || 'gemma3-legal';

    if (!sessionId) return json({ error: 'sessionId required' }, { status: 400 });
    if (!content) return json({ error: 'content required' }, { status: 400 });

    // Ensure the session exists, create it if it doesn't
    const existingSession = await sql`
      SELECT id FROM chat_sessions WHERE id = ${sessionId}
    `;
    
    if (existingSession.length === 0) {
      // Create the session if it doesn't exist
      await sql`
        INSERT INTO chat_sessions (id, title, context, metadata) 
        VALUES (${sessionId}, 'GPU Assistant Session', '{}', '{"source": "gpu-assistant"}')
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Generate embedding for user message
    const userEmbedding = await generateGemmaEmbedding(content);
    
    // Insert user message with embedding
    const userMsg = { 
      id: randomUUID(), 
      sessionId, 
      role: 'user' as const, 
      content,
      metadata: { source: 'gpu-assistant', hasEmbedding: !!userEmbedding }
    };
    
    // Insert user message with proper vector embedding
    if (userEmbedding && userEmbedding.length > 0) {
      await sql`
        INSERT INTO chat_messages (id, session_id, role, content, embedding, metadata)
        VALUES (${userMsg.id}, ${sessionId}, ${userMsg.role}, ${content}, ${JSON.stringify(userEmbedding)}::vector, ${JSON.stringify(userMsg.metadata)})
      `;
    } else {
      await sql`
        INSERT INTO chat_messages (id, session_id, role, content, metadata)
        VALUES (${userMsg.id}, ${sessionId}, ${userMsg.role}, ${content}, ${JSON.stringify(userMsg.metadata)})
      `;
    }

    // Get AI response
    const reply = await askOllama(content, model);
    
    // Generate embedding for assistant response
    const assistantEmbedding = await generateGemmaEmbedding(reply);
    
    // Insert assistant message with embedding
    const asstMsg = { 
      id: randomUUID(), 
      sessionId, 
      role: 'assistant' as const, 
      content: reply,
      metadata: { source: 'gpu-assistant', model, hasEmbedding: !!assistantEmbedding }
    };
    
    // Insert assistant message with proper vector embedding
    if (assistantEmbedding && assistantEmbedding.length > 0) {
      await sql`
        INSERT INTO chat_messages (id, session_id, role, content, embedding, metadata)
        VALUES (${asstMsg.id}, ${sessionId}, ${asstMsg.role}, ${reply}, ${JSON.stringify(assistantEmbedding)}::vector, ${JSON.stringify(asstMsg.metadata)})
      `;
    } else {
      await sql`
        INSERT INTO chat_messages (id, session_id, role, content, metadata)
        VALUES (${asstMsg.id}, ${sessionId}, ${asstMsg.role}, ${reply}, ${JSON.stringify(asstMsg.metadata)})
      `;
    }

    return json({ 
      success: true,
      userMessage: userMsg,
      assistant: asstMsg 
    });
  } catch (error) {
    console.error('Failed to process chat message:', error);
    return json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
};

// Get messages for a session
export const GET: RequestHandler = async ({ url }) => {
  try {
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return json(
        { error: 'sessionId parameter is required' },
        { status: 400 }
      );
    }
    
    // Use raw SQL to avoid schema issues
    const messages = await sql`
      SELECT id, session_id, role, content, metadata, created_at
      FROM chat_messages 
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `;
    
    return json({ 
      success: true, 
      messages 
    });
    
  } catch (error) {
    console.error('Failed to get chat messages:', error);
    return json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
};
