import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { vectors, document_chunks } from '$lib/server/db/schema-postgres';
import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

// Ollama embedding service
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text:latest',
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.embedding;
  } catch (err) {
    console.error('Embedding generation failed:', err);
    throw new Error('Failed to generate embedding');
  }
}

// Chunk text into manageable pieces
function chunkText(text: string, chunkSize: number = 600, overlap: number = 60): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.substring(start, end);
    chunks.push(chunk.trim());
    
    if (end >= text.length) break;
    start = end - overlap;
  }
  
  return chunks;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text, entityType, entityId, metadata } = await request.json();

    if (!text || !entityType || !entityId) {
      return error(400, 'Missing required fields: text, entityType, entityId');
    }

    // Chunk the text for better embedding quality
    const chunks = chunkText(text);
    const ingestedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding using local Ollama
      const embedding = await generateEmbedding(chunk);
      
      if (!embedding || embedding.length !== 768) {
        throw new Error(`Invalid embedding dimension - expected 768D from nomic-embed-text, got ${embedding?.length}`);
      }

      // Store document chunk
      const [chunkRecord] = await db.insert(document_chunks).values({
        evidence_id: entityType === 'evidence' ? entityId : null,
        chunk_text: chunk,
        embedding: JSON.stringify(embedding),
        chunk_sequence: i,
        chunk_metadata: metadata ? JSON.stringify(metadata) : null
      }).returning();

      // Store in unified vector table for cross-entity search
      await db.insert(vectors).values({
        entity_type: 'chunk',
        entity_id: chunkRecord.id,
        embedding: JSON.stringify(embedding)
      });

      ingestedChunks.push({
        id: chunkRecord.id,
        text: chunk.substring(0, 100) + '...',
        sequence: i,
        embeddingDimensions: embedding.length
      });
    }

    return json({
      success: true,
      message: `Successfully ingested ${chunks.length} chunks`,
      chunks: ingestedChunks,
      metadata: {
        totalChunks: chunks.length,
        entityType,
        entityId,
        embeddingModel: 'nomic-embed-text:latest',
        embeddingDimensions: 384
      }
    });

  } catch (err) {
    console.error('Embedding ingestion error:', err);
    return error(500, `Ingestion failed: ${err.message}`);
  }
};