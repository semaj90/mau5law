import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tensorrtService } from '$lib/server/tensorrt-service';
import { db } from '$lib/server/db';
import { legal_queries, legal_documents, embeddings } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { prompt, context, max_tokens = 256, temperature = 0.3, use_vector_search = true } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return json({
        success: false,
        error: 'Prompt is required and must be a string'
      }, { status: 400 });
    }

    // Store the query in PostgreSQL
    const [query] = await db.insert(legal_queries).values({
      prompt,
      context: context || null,
      timestamp: new Date(),
      status: 'processing',
      user_ip: request.headers.get('x-forwarded-for') || 'unknown'
    }).returning();

    console.log(`🔍 Processing legal query ${query.id}: "${prompt.substring(0, 50)}..."`);

    try {
      // Perform vector similarity search if enabled
      let similar_documents = [];
      if (use_vector_search) {
        try {
          // Generate embedding for the prompt (simplified - in production use proper embedding model)
          const prompt_embedding = await generateEmbedding(prompt);

          // Find similar legal documents using pgvector
          similar_documents = await db.execute(sql`
            SELECT id, title, content, document_type,
                   (embedding <-> ${prompt_embedding}) as distance
            FROM legal_documents
            WHERE embedding IS NOT NULL
            ORDER BY embedding <-> ${prompt_embedding}
            LIMIT 5
          `);

          console.log(`📚 Found ${similar_documents.length} similar documents`);
        } catch (vector_error) {
          console.warn('Vector search failed:', vector_error);
          // Continue without vector search
        }
      }

      // Enhance context with similar documents
      let enhanced_context = context || '';
      if (similar_documents.length > 0) {
        const doc_summaries = similar_documents
          .map((doc: any) => `${doc.document_type}: ${doc.title} - ${doc.content.substring(0, 200)}...`)
          .join('\n\n');
        enhanced_context += enhanced_context ? '\n\nRelated Documents:\n' + doc_summaries : doc_summaries;
      }

      // Run TensorRT inference (with PyTorch fallback)
      const inference_start = Date.now();
      const result = await tensorrtService.infer({
        prompt,
        context: enhanced_context,
        max_tokens,
        temperature
      });
      const inference_time = Date.now() - inference_start;

      // Update the query with results
      await db.update(legal_queries)
        .set({
          response: result.text,
          tokens_used: result.tokens,
          inference_time: result.inference_time,
          model_used: result.model_used,
          status: 'completed',
          similar_docs_count: similar_documents.length
        })
        .where(eq(legal_queries.id, query.id));

      // Store embedding for future similarity searches
      try {
        const query_embedding = await generateEmbedding(prompt);
        await db.insert(embeddings).values({
          query_id: query.id,
          embedding: query_embedding,
          created_at: new Date()
        });
      } catch (embedding_error) {
        console.warn('Failed to store embedding:', embedding_error);
        // Non-critical error, continue
      }

      console.log(`✅ Query ${query.id} completed in ${inference_time}ms using ${result.model_used}`);

      return json({
        success: true,
        result: {
          query_id: query.id,
          response: result.text,
          model_used: result.model_used,
          tokens: result.tokens,
          inference_time: result.inference_time,
          total_time: inference_time,
          similar_documents_found: similar_documents.length,
          enhanced_with_context: enhanced_context.length > (context?.length || 0)
        }
      });

    } catch (inference_error) {
      console.error('Inference error:', inference_error);

      // Update query with error status
      await db.update(legal_queries)
        .set({
          status: 'failed',
          error_message: String(inference_error)
        })
        .where(eq(legal_queries.id, query.id));

      return json({
        success: false,
        error: 'Legal AI inference failed',
        query_id: query.id
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Legal AI API error:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    // Build query
    let query = db.select({
      id: legal_queries.id,
      prompt: legal_queries.prompt,
      response: legal_queries.response,
      status: legal_queries.status,
      model_used: legal_queries.model_used,
      tokens_used: legal_queries.tokens_used,
      inference_time: legal_queries.inference_time,
      timestamp: legal_queries.timestamp,
      similar_docs_count: legal_queries.similar_docs_count
    }).from(legal_queries);

    if (status) {
      query = query.where(eq(legal_queries.status, status));
    }

    const queries = await query
      .orderBy(desc(legal_queries.timestamp))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCount = await db.select({ count: sql`count(*)` }).from(legal_queries);

    return json({
      success: true,
      queries,
      pagination: {
        limit,
        offset,
        total: Number(totalCount[0].count)
      }
    });

  } catch (error) {
    console.error('Failed to fetch queries:', error);
    return json({
      success: false,
      error: 'Failed to fetch queries'
    }, { status: 500 });
  }
};

// Helper function to generate embeddings
async function generateEmbedding(text: string): Promise<number[]> {
  // In production, this would use a proper embedding model (like Gemma embeddings)
  // For now, create a simple hash-based embedding matching existing 512-dimensional schema
  const hash = Array.from(text).reduce((hash, char) => {
    const charCode = char.charCodeAt(0);
    hash = ((hash << 5) - hash) + charCode;
    return hash & hash; // Convert to 32-bit integer
  }, 0);

  // Create a 512-dimensional embedding (matching existing schema)
  const embedding = new Array(512).fill(0).map((_, i) => {
    const seed = hash + i * 1234567;
    return Math.sin(seed) * Math.cos(seed * 2) * 0.5;
  });

  return embedding;
}

// Vector search endpoint
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { query_text, limit = 5 } = await request.json();

    if (!query_text) {
      return json({
        success: false,
        error: 'Query text is required'
      }, { status: 400 });
    }

    // Generate embedding for search query
    const query_embedding = await generateEmbedding(query_text);

    // Perform similarity search
    const similar_documents = await db.execute(sql`
      SELECT
        id,
        title,
        content,
        document_type,
        metadata,
        (embedding <-> ${query_embedding}) as similarity_score
      FROM legal_documents
      WHERE embedding IS NOT NULL
      ORDER BY embedding <-> ${query_embedding}
      LIMIT ${limit}
    `);

    return json({
      success: true,
      query: query_text,
      results: similar_documents,
      count: similar_documents.length
    });

  } catch (error) {
    console.error('Vector search error:', error);
    return json({
      success: false,
      error: 'Vector search failed'
    }, { status: 500 });
  }
};