/**
 * Embedding Service
 * Generates embeddings using embeddinggemma:latest via Ollama
 * Integrates with Drizzle ORM for storing embeddings in workspace notes
 */

import { getOllamaEndpoint } from '../../utils/ollama-config';
import { db } from '../db/index';
import { workspaceNotes } from '../db/schema-postgres';
import { eq } from 'drizzle-orm';

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  prompt_eval_count?: number;
}

/**
 * Generate embedding for text using embeddinggemma:latest
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const endpoint = getOllamaEndpoint();

  if (!endpoint) {
    throw new Error('Ollama endpoint not configured. Set OLLAMA_ENDPOINT environment variable.');
  }

  try {
    const response = await fetch(`${endpoint}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'embeddinggemma:latest',
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as EmbeddingResponse;
    return data.embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(texts.map((text) => generateEmbedding(text)));
  return embeddings;
}

/**
 * Store embedding in workspace note
 */
export async function storeNoteEmbedding(noteId: string, embedding: number[]): Promise<void> {
  // Convert embedding array to JSON string for storage
  const embeddingJson = JSON.stringify(embedding);

  await db
    .update(workspaceNotes)
    .set({ embedding: embeddingJson })
    .where(eq(workspaceNotes.id, noteId));
}

/**
 * Generate and store embedding for a workspace note
 */
export async function generateAndStoreNoteEmbedding(
  noteId: string,
  content: string
): Promise<number[]> {
  const embedding = await generateEmbedding(content);
  await storeNoteEmbedding(noteId, embedding);
  return embedding;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Find similar notes in a workspace using embeddings
 */
export async function findSimilarNotes(
  workspaceId: string,
  queryEmbedding: number[],
  topK: number = 5,
  threshold: number = 0.5
): Promise<Array<{ id: string; content: string; similarity: number }>> {
  // Get all notes in workspace
  const notes = await db
    .select()
    .from(workspaceNotes)
    .where(eq(workspaceNotes.workspaceId, workspaceId));

  // Calculate similarity for each note
  const similarities = notes
    .map((note) => {
      if (!note.embedding) {
        return null;
      }

      try {
        const noteEmbedding = JSON.parse(note.embedding) as number[];
        const similarity = cosineSimilarity(queryEmbedding, noteEmbedding);

        return {
          id: note.id,
          content: note.content,
          similarity,
        };
      } catch {
        return null;
      }
    })
    .filter((item) => item !== null && item.similarity >= threshold)
    .sort((a, b) => (b?.similarity ?? 0) - (a?.similarity ?? 0))
    .slice(0, topK);

  return similarities.filter((item) => item !== null) as Array<{
    id: string;
    content: string;
    similarity: number;
  }>;
}

/**
 * Retrieve relevant context for RAG using embeddings
 * Searches notes, evidence metadata, and statute metadata
 */
export async function retrieveRAGContext(
  workspaceId: string,
  queryText: string,
  topK: number = 5
): Promise<string> {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(queryText);

    // Find similar notes
    const similarNotes = await findSimilarNotes(workspaceId, queryEmbedding, topK, 0.5);

    // Build context string
    const contextParts: string[] = [];

    if (similarNotes.length > 0) {
      contextParts.push('## Relevant Notes and Memos:');
      similarNotes.forEach((note) => {
        contextParts.push(
          `- (Similarity: ${(note.similarity * 100).toFixed(1)}%) ${note.content.substring(0, 200)}`
        );
      });
    }

    return contextParts.join('\n');
  } catch (error) {
    console.error('Failed to retrieve RAG context:', error);
    return '';
  }
}

/**
 * Batch process notes for embedding generation
 * Useful for initial indexing of workspace notes
 */
export async function indexWorkspaceNotes(workspaceId: string): Promise<number> {
  const notes = await db
    .select()
    .from(workspaceNotes)
    .where(eq(workspaceNotes.workspaceId, workspaceId));

  let indexed = 0;

  for (const note of notes) {
    if (!note.embedding) {
      try {
        await generateAndStoreNoteEmbedding(note.id, note.content);
        indexed++;
      } catch (error) {
        console.error(`Failed to index note ${note.id}:`, error);
      }
    }
  }

  return indexed;
}
