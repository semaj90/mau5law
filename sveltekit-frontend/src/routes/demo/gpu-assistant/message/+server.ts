import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { dbPool } from '$lib/server/database-pool-service';
import { embeddingCache } from '$lib/server/embedding-cache-service';
import { chatMessages } from '$lib/server/db/schema-unified';
import { eq } from 'drizzle-orm';

// Using enhanced database pool service
// No need for manual connection setup

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

async function generateGemmaEmbedding(text: string, model: string = 'nomic-embed-text'): Promise<number[] | null> {
  try {
    // Check cache first
    const cached = await embeddingCache.getEmbedding(text, model);
    if (cached) {
      console.log('📋 Using cached embedding');
      return cached;
    }

    // Generate new embedding
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model,
        prompt: text 
      })
    });
    if (!res.ok) throw new Error(`Embedding error ${res.status}`);
    const data = await res.json();
    
    const embedding = data.embedding || null;
    if (embedding) {
      // Cache the result
      await embeddingCache.cacheEmbedding(text, embedding, model);
      console.log('💾 Cached new embedding');
    }
    
    return embedding;
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

    // Get database connection with pooling
    const db = await dbPool.getDrizzle('gpu-assistant');
    
    // Ensure the session exists using cached query
    const sessionCheckQuery = 'SELECT id FROM chat_sessions WHERE id = $1';
    const existingSession = await dbPool.queryCached(
      sessionCheckQuery, 
      [sessionId], 
      'gpu-assistant',
      60 // Cache for 1 minute
    );
    
    if (existingSession.length === 0) {
      // Create the session if it doesn't exist
      const insertQuery = `
        INSERT INTO chat_sessions (id, title, context, metadata) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
      `;
      await dbPool.queryCached(
        insertQuery,
        [sessionId, 'GPU Assistant Session', '{}', '{"source": "gpu-assistant"}'],
        'gpu-assistant',
        1 // Short cache for insert operations
      );
      
      // Invalidate session cache after insert
      await embeddingCache.invalidate(sessionId, 'sessions');
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
    
    // Insert user message with proper vector embedding using pooled connection
    const insertUserQuery = userEmbedding && userEmbedding.length > 0 ?
      'INSERT INTO chat_messages (id, session_id, role, content, embedding, metadata) VALUES ($1, $2, $3, $4, $5::vector, $6)' :
      'INSERT INTO chat_messages (id, session_id, role, content, metadata) VALUES ($1, $2, $3, $4, $5)';
      
    const userParams = userEmbedding && userEmbedding.length > 0 ?
      [userMsg.id, sessionId, userMsg.role, content, JSON.stringify(userEmbedding), JSON.stringify(userMsg.metadata)] :
      [userMsg.id, sessionId, userMsg.role, content, JSON.stringify(userMsg.metadata)];
      
    await dbPool.queryCached(insertUserQuery, userParams, 'gpu-assistant', 1);

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
    
    // Insert assistant message with proper vector embedding using pooled connection
    const insertAssistantQuery = assistantEmbedding && assistantEmbedding.length > 0 ?
      'INSERT INTO chat_messages (id, session_id, role, content, embedding, metadata) VALUES ($1, $2, $3, $4, $5::vector, $6)' :
      'INSERT INTO chat_messages (id, session_id, role, content, metadata) VALUES ($1, $2, $3, $4, $5)';
      
    const assistantParams = assistantEmbedding && assistantEmbedding.length > 0 ?
      [asstMsg.id, sessionId, asstMsg.role, reply, JSON.stringify(assistantEmbedding), JSON.stringify(asstMsg.metadata)] :
      [asstMsg.id, sessionId, asstMsg.role, reply, JSON.stringify(asstMsg.metadata)];
      
    await dbPool.queryCached(insertAssistantQuery, assistantParams, 'gpu-assistant', 1);
    
    // Invalidate session cache after new messages
    await embeddingCache.invalidate(sessionId, 'sessions');

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
    
    // Use cached query for message retrieval
    const messagesQuery = `
      SELECT id, session_id, role, content, metadata, created_at
      FROM chat_messages 
      WHERE session_id = $1
      ORDER BY created_at ASC
    `;
    const messages = await dbPool.queryCached(
      messagesQuery, 
      [sessionId], 
      'gpu-assistant',
      30 // Cache messages for 30 seconds
    );
    
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
