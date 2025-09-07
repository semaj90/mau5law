import type { RequestHandler } from './$types';
import { db, sql } from '$lib/server/db';
import { json, error } from '@sveltejs/kit';
import { generateEmbedding, searchSimilarChatsKeyword } from '$lib/server/services/vectorDBService';

// Use optimized embedding generation with caching
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const embedding = await generateEmbedding(query, true); // Use cache
  if (!embedding) {
    throw new Error('Failed to generate query embedding');
  }
  return embedding;
}

// Generate RAG response using Gemma3 legal model
async function generateRAGResponse(query: string, context: any[]): Promise<string> {
  try {
    const contextText = context.map(c => `${c.chunk_text}`).join('\n\n');
    
    const prompt = `Based on the following legal context, provide a comprehensive response to the query.

Context:
${contextText}

Query: ${query}

Response:`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'legal:latest',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama generation error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.response;
  } catch (err) {
    console.error('RAG response generation failed:', err);
    throw new Error('Failed to generate RAG response');
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { query, limit = 5, threshold = 0.7, includeRAGResponse = true } = await request.json();

    if (!query) {
      return error(400, 'Missing required field: query');
    }

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);
    
    if (!queryEmbedding || queryEmbedding.length !== 768) {
      throw new Error(`Invalid query embedding dimension: expected 768, got ${queryEmbedding?.length}`);
    }

    // Try chat embeddings first, then fallback to document chunks if available
    let similarChunks = [];
    
    // Search chat embeddings using optimized service
    try {
      const chatResults = await db.execute(
        sql`SELECT 
          content as chunk_text,
          role,
          conversation_id,
          metadata,
          1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) as similarity
        FROM chat_embeddings 
        WHERE 1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) > ${threshold}
        ORDER BY embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector
        LIMIT ${limit}`
      );
      
      similarChunks = chatResults.rows.map((row: any) => ({
        id: row.conversation_id,
        chunk_text: row.chunk_text,
        chunk_sequence: 1,
        evidence_id: null,
        embedding: null,
        similarity: parseFloat(row.similarity),
        role: row.role,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));
      
      console.log(`Found ${similarChunks.length} chat embeddings results`);
    } catch (chatError) {
      console.warn('Chat embeddings search failed, trying keyword fallback:', chatError);
      
      // Fallback to keyword search
      const keywordResults = await searchSimilarChatsKeyword(query, limit);
      similarChunks = keywordResults.map(result => ({
        id: result.conversationId,
        chunk_text: result.content,
        chunk_sequence: 1,
        evidence_id: null,
        embedding: null,
        similarity: result.similarity,
        role: result.role,
        metadata: result.metadata
      }));
      
      console.log(`Used keyword fallback, found ${similarChunks.length} results`);
    }

    let ragResponse = null;
    
    if (includeRAGResponse && similarChunks.length > 0) {
      ragResponse = await generateRAGResponse(query, similarChunks);
    }

    // Enhance results with conversation context
    const enhancedResults = similarChunks.map(chunk => ({
      ...chunk,
      similarity: Math.round(chunk.similarity * 1000) / 1000, // Round to 3 decimal places
      entityInfo: {
        type: 'chat_conversation',
        conversationId: chunk.id,
        role: chunk.role || 'unknown',
        source: 'chat_embeddings'
      }
    }));

    return json({
      success: true,
      query,
      results: enhancedResults,
      ragResponse,
      metadata: {
        resultCount: similarChunks.length,
        threshold,
        embeddingModel: 'nomic-embed-text',
        ragModel: includeRAGResponse ? 'legal:latest' : null,
        searchTime: Date.now()
      }
    });

  } catch (err) {
    console.error('Vector search error:', err);
    return error(500, `Search failed: ${err.message}`);
  }
};