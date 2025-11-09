import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { env } from '$env/dynamic/private'; // Changed from static to dynamic private env, and imported 'env' object
import getCudaEmbedding from '$lib/server/services/cuda-embedding-service';
import ollamaService from '$lib/server/services/ollama-service'; // Changed to default import
import getUserId from '$lib/server/utils/auth';
import SimilarEvidenceSchema from '$lib/server/z-schemas/SimilarEvidenceSchema'; // Changed to default import
import SuggestionSchema from '$lib/server/z-schemas/SuggestionSchema'; // Changed to default import

/* * Evidence AI Analysis API Routes - Connects with Ollama and CUDA services
 * POST /api/v1/evidence/analyze - Analyze evidence with AI
 * POST /api/v1/evidence/similar - Find similar evidence u
        model: await ollamaService.getOptimalModel(), // Updated call
        userId: isTestMode ? 'test-user' : getUserId(locals as App.Locals) // Use App.Locals
      }
    });
  } catch (error: Error | unknown) {
    console.error('Evidence failed: ', error);
    if (error instanceof z.ZodError) {
      return json(
        { message: 'Invalid analysis request', details: error.errors }, // Fixed: added colon
        { status: 400 }
      );
    }
    const details = (error as Error)?.message ?? 'Unknown error';
    return json(
      { message: 'Analysis failed', details }, // Fixed: colon and removed extra parenthesis
      { status: 500 }
    );
  }
};

/*
 * POST /api/v1/evidence/similar
 * Find similar evidence using vector search
 */
export const _POST_similar: RequestHandler = async ({ request, locals }) => {
  try {
    const isTestMode = request.headers.get('x-test-mode') === 'true';
    if (!isTestMode && (!locals.session || !locals.user)) { // Use App.Locals directly
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { evidenceId, embedding, content, limit } = SimilarEvidenceSchema.parse(body);

    let queryEmbedding: number[] | null = embedding || null;

    // If no embedding provided, generate one from content
    if (!queryEmbedding && content) {
      queryEmbedding = await getCudaEmbedding(content);
    }

    if (!queryEmbedding) {
      return json({ message: 'No embedding or content provided for similarity search' }, { status: 400 });
    }

    // Call CUDA service for similarity search
    const response = await fetch(`${env.CUDA_SERVICE_URL}/search`, { // Changed to env.CUDA_SERVICE_URL
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_embedding: queryEmbedding,
        limit,
        exclude_id: evidenceId // Exclude the evidence itself from results
      })
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`CUDA similarity search failed: ${response.status} ${response.statusText} ${bodyText}`);
    }

    const result = await response.json();

    return json({
      success: true,
      data: {
        evidenceId,
        similar_results: result.results || [],
        processed_at: new Date().toISOString(),
        userId: isTestMode ? 'test-user' : getUserId(locals as App.Locals)
      }
    });

  } catch (error: Error | unknown) {
    console.error('Similar evidence search failed: ', error);
    if (error instanceof z.ZodError) {
      return json(
        { message: 'Invalid similarity search request', details: error.errors },
        { status: 400 }
      );
    }
    const details = (error as Error)?.message ?? 'Unknown error';
    return json(
      { message: 'Similarity search failed', details },
      { status: 500 }
    );
  }
};

/*
 * POST /api/v1/evidence/suggest
 * Get AI suggestions for evidence
 */
export const _POST_suggest: RequestHandler = async ({ request, locals }) => {
  try {
    const isTestMode = request.headers.get('x-test-mode') === 'true';
    if (!isTestMode && (!locals.session || !locals.user)) { // Use App.Locals directly
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { query, context, type } = SuggestionSchema.parse(body);

    const suggestionPrompt = `You are a legal AI assistant providing suggestions. Based on the following query and context, generate relevant legal suggestions.
QUERY: ${query}
CONTEXT: ${context || 'No additional context provided.'}
SUGGESTION TYPE: ${type}
REQUIRED: Provide your suggestions as a JSON array of strings, e.g., ["Suggestion 1", "Suggestion 2"].
Focus on actionable legal advice, relevant precedents, or strategic considerations.`;

    const aiResponse = await ollamaService.queryOllama(suggestionPrompt); // Updated call

    let suggestions: string[] = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(suggestions) || !suggestions.every(s => typeof s === 'string')) {
          throw new Error('AI response is not a valid string array');
        }
      } else {
        throw new Error('No JSON array found in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI suggestion JSON:', parseError);
      suggestions = [`AI suggestion parsing failed. Raw response: ${aiResponse.substring(0, 200)}...`];
    }

    return json({
      success: true,
      data: {
        query,
        type,
        suggestions,
        processed_at: new Date().toISOString(),
        model: await ollamaService.getOptimalModel(), // Updated call
        userId: isTestMode ? 'test-user' : getUserId(locals as App.Locals)
      }
    });

  } catch (error: Error | unknown) {
    console.error('AI suggestion failed: ', error);
    if (error instanceof z.ZodError) {
      return json(
        { message: 'Invalid suggestion request', details: error.errors },
        { status: 400 }
      );
    }
    const details = (error as Error)?.message ?? 'Unknown error';
    return json(
      { message: 'Suggestion failed', details },
      { status: 500 }
    );
  }
};



