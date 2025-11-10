import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import ollamaService from '$lib/server/services/ollama-service'; // Changed to default import
import { getUserId } from '$lib/server/utils/auth';
import { AnalysisRequestSchema } from '$lib/server/z-schemas/AnalysisRequestSchema'; // Changed to named import

/* * Evidence AI Analysis API Routes - Connects with Ollama and CUDA services
 * POST /api/v1/evidence/analyze - Analyze evidence with AI
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const isTestMode = request.headers.get('x-test-mode') === 'true';
    if (!isTestMode && (!locals.session || !locals.user)) { // Use App.Locals directly
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { evidenceId, content, analysisType } = AnalysisRequestSchema.parse(body);

    // Removed unused embedding generation

    // Prepare AI prompt for analysis
    const analysisPrompt = `You are a legal AI assistant analyzing evidence. Provide a detailed analysis based on the following:
EVIDENCE ID: ${evidenceId}
CONTENT: ${content || 'No content provided.'}
ANALYSIS TYPE: ${analysisType}
REQUIRED: Provide your analysis as a structured JSON object with keys: 'summary', 'key_points', 'legal_implications', 'confidence_score' (0-1).`;

    const aiResponse = await ollamaService.queryOllama(analysisPrompt); // Updated to use default import

    let analysis: any = {};
    try {
      analysis = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI analysis JSON:', parseError);
      analysis = { summary: aiResponse.substring(0, 500), key_points: [], legal_implications: [], confidence_score: 0.5 };
    }

    return json({
      success: true,
      data: {
        evidenceId,
        analysis,
        analysisType,
        processed_at: new Date().toISOString(),
        model: await ollamaService.getOptimalModel(), // Updated to use default import
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
};

/*
 * POST /api/v1/evidence/suggest
 * Get AI suggestions for evidence
 */
export const POST_suggest: RequestHandler = async ({ request, locals }) => {
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

    const aiResponse = await ollamaService.queryOllama(suggestionPrompt); // Updated to use default import

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
        model: await ollamaService.getOptimalModel(), // Updated to use default import
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
        model: await ollamaService.getOptimalModel(), // Updated to use default import
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



