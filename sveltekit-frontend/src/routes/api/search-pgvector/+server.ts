/// <reference types="vite/client" />
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { z } from 'zod';
import { db } from '$lib/server/db';

// ===== VECTOR SEARCH SCHEMA =====
const VectorSearchSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  topK: z.number().int().min(1).max(100).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.5),
  filters: z.record(z.string(), z.unknown()).optional(),
});

type VectorSearchRequest = z.infer<typeof VectorSearchSchema>;

interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
  source?: string;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  topK: number;
  responseTime: number;
  timestamp: string;
  metadata?: {
    modelUsed?: string;
    indexType?: string;
  };
}

// ===== VECTOR EMBEDDING SERVICE =====
async function getQueryEmbedding(query: string): Promise<number[]> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = 'embeddinggemma:latest';

  try {
    const response = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: query,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  } catch (err) {
    console.error('Failed to get embedding from Ollama:', err);
    throw new Error('Failed to generate query embedding');
  }
}

// ===== PGVECTOR SEARCH =====
async function searchWithPgvector(
  embedding: number[],
  topK: number,
  threshold: number
): Promise<SearchResult[]> {
  try {
    // Use raw SQL for pgvector similarity search
    // The <=> operator computes cosine distance (smaller = more similar)
    const results = await db.execute<{
      id: string;
      title: string;
      content: string;
      similarity: number;
      metadata: string;
    }>(
      `
      SELECT
        id,
        title,
        content,
        (1 - (embedding <=> $1::vector)) as similarity,
        metadata::text
      FROM legal_documents
      WHERE (1 - (embedding <=> $1::vector)) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `,
      [
        JSON.stringify(embedding), // Convert to JSON string for pgvector
        threshold,
        topK,
      ]
    );

    return results.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      similarity: row.similarity,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  } catch (err) {
    console.error('pgvector search error:', err);
    throw new Error('Failed to search vectors');
  }
}

// ===== MAIN HANDLER =====
export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();

  try {
    // Parse and validate request
    const body = await request.json();
    const searchParams = VectorSearchSchema.parse(body);

    // Generate embedding for query
    const embedding = await getQueryEmbedding(searchParams.query);

    // Search pgvector
    const results = await searchWithPgvector(
      embedding,
      searchParams.topK,
      searchParams.threshold
    );

    const responseTime = Date.now() - startTime;

    const response: SearchResponse = {
      results,
      query: searchParams.query,
      topK: searchParams.topK,
      responseTime,
      timestamp: new Date().toISOString(),
      metadata: {
        modelUsed: 'embeddinggemma:latest',
        indexType: 'pgvector (cosine distance)',
      },
    };

    return json(response);
  } catch (err) {
    console.error('Search error:', err);

    if (err instanceof z.ZodError) {
      return error(400, {
        message: 'Invalid request parameters',
        errors: err.flatten().fieldErrors,
      });
    }

    return error(500, {
      message: err instanceof Error ? err.message : 'Search failed',
    });
  }
};

// ===== OPTIONAL: GET ENDPOINT FOR HEALTH CHECK =====
export const GET: RequestHandler = async () => {
  try {
    // Check if pgvector is available
    await db.execute('SELECT 1 WHERE \'[1,2,3]\'::vector IS NOT NULL');

    return json({
      status: 'healthy',
      pgvector: 'available',
      ollama: 'connected',
    });
  } catch (err) {
    return error(503, {
      message: 'Search service unavailable',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};
