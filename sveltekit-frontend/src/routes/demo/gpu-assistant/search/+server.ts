import type { RequestHandler } from './$types';
import postgres from 'postgres';
import { json } from '@sveltejs/kit';

const connectionString = process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5433/legal_ai_db';
const sql = postgres(connectionString, { 
  host: 'localhost',
  port: 5433,
  database: 'legal_ai_db',
  username: 'legal_admin',
  password: '123456',
  max: 5 
});

async function generateGemmaEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'nomic-embed-text',
        prompt: text 
      })
    });
    if (!res.ok) throw new Error(`Embedding error ${res.status}`);
    const data = await res.json();
    return data.embedding || null;
  } catch (e) {
    console.warn('Embedding generation failed:', e);
    return null;
  }
}

// Semantic search for similar messages
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { query, sessionId, limit = 10, similarityThreshold = 0.3 } = await request.json();
    
    if (!query) {
      return json({ error: 'Query is required' }, { status: 400 });
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateGemmaEmbedding(query);
    
    if (!queryEmbedding || queryEmbedding.length === 0) {
      return json({ 
        error: 'Could not generate embedding for query' 
      }, { status: 500 });
    }

    // Perform semantic search using cosine similarity
    let searchResults;
    
    if (sessionId) {
      // Search within a specific session
      searchResults = await sql`
        SELECT 
          id, session_id, role, content, metadata, created_at,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM chat_messages 
        WHERE session_id = ${sessionId}
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${similarityThreshold}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;
    } else {
      // Search across all sessions
      searchResults = await sql`
        SELECT 
          id, session_id, role, content, metadata, created_at,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM chat_messages 
        WHERE embedding IS NOT NULL
          AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${similarityThreshold}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;
    }

    return json({
      success: true,
      query,
      results: searchResults,
      count: searchResults.length,
      queryEmbedding: queryEmbedding.length // Don't return full embedding for security
    });

  } catch (error) {
    console.error('Semantic search failed:', error);
    return json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
};

// Get similar messages to a specific message
export const GET: RequestHandler = async ({ url }) => {
  try {
    const messageId = url.searchParams.get('messageId');
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const similarityThreshold = parseFloat(url.searchParams.get('threshold') || '0.3');
    
    if (!messageId) {
      return json({ error: 'messageId parameter is required' }, { status: 400 });
    }

    // Get the embedding of the reference message
    const referenceMessage = await sql`
      SELECT embedding, content FROM chat_messages WHERE id = ${messageId} AND embedding IS NOT NULL
    `;

    if (referenceMessage.length === 0) {
      return json({ error: 'Message not found or has no embedding' }, { status: 404 });
    }

    // Find similar messages
    const similarMessages = await sql`
      SELECT 
        id, session_id, role, content, metadata, created_at,
        1 - (embedding <=> ${referenceMessage[0].embedding}) as similarity
      FROM chat_messages 
      WHERE id != ${messageId}
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${referenceMessage[0].embedding}) > ${similarityThreshold}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return json({
      success: true,
      referenceMessage: {
        id: messageId,
        content: referenceMessage[0].content
      },
      similarMessages,
      count: similarMessages.length
    });

  } catch (error) {
    console.error('Similar messages search failed:', error);
    return json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
};