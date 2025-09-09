/*
 * Evidence AI Analysis API Routes - Connects with Ollama and CUDA services
 * POST /api/v1/evidence/analyze - Analyze evidence with AI
 * POST /api/v1/evidence/similar - Find similar evidence using vector search
 * POST /api/v1/evidence/suggest - Get AI suggestions for evidence
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

// Configuration for running services
const OLLAMA_BASE_URL = 'http://localhost:11434';
const CUDA_SERVICE_URL = 'http://localhost:8096';
const LEGAL_MODEL = 'gemma3-legal:latest';

// Request schemas
const AnalyzeEvidenceSchema = z.object({
  evidenceId: z.string().uuid(),
  filename: z.string(),
  content: z.string().optional(),
  type: z.enum(['document', 'image', 'video', 'audio', 'other'])
});

const SimilarEvidenceSchema = z.object({
  evidenceId: z.string().uuid(),
  embedding: z.array(z.number()).optional(),
  content: z.string().optional(),
  limit: z.number().min(1).max(20).default(5)
});

const SuggestionSchema = z.object({
  query: z.string(),
  context: z.string().optional(),
  type: z.enum(['search', 'legal', 'case', 'precedent']).default('legal')
});

// Types
interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface AIAnalysisResult {
  summary: string;
  confidence: number;
  relevantLaws: string[];
  suggestedTags: string[];
  prosecutionScore: number;
  legalRelevance: string;
  keyFindings: string[];
  recommendations: string[];
}

// Ollama client helper
async function queryOllama(prompt: string, model: string = LEGAL_MODEL): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent legal analysis
          top_p: 0.9,
          num_predict: 1024,
          num_ctx: 4096
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} - ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama query failed:', error);
    throw new Error(`AI service unavailable: ${error}`);
  }
}

// CUDA service helper for embeddings and similarity
async function getCudaEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(`${CUDA_SERVICE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: `embedding_${Date.now()}`,
        type: 'text_embedding',
        content: text,
        max_length: 512
      })
    });

    if (!response.ok) {
      console.warn('CUDA service unavailable for embeddings');
      return null;
    }

    const result = await response.json();
    return result.embedding || null;
  } catch (error) {
    console.warn('CUDA embedding failed:', error);
    return null;
  }
}

/*
 * POST /api/v1/evidence/analyze
 * Analyze evidence with AI using the legal model
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { evidenceId, filename, content, type } = AnalyzeEvidenceSchema.parse(body);

    // Prepare legal analysis prompt
    const analysisPrompt = `You are a legal AI assistant analyzing evidence for a legal case. Analyze the following evidence and provide a structured response:

EVIDENCE DETAILS:
- Filename: ${filename}
- Type: ${type}
- Content: ${content ? content.substring(0, 2000) + (content.length > 2000 ? '...' : '') : 'No text content available'}

ANALYSIS REQUIRED:
Provide your analysis in this exact JSON format:
{
  "summary": "Brief 2-3 sentence summary of the evidence",
  "confidence": 0.85,
  "relevantLaws": ["Specific statutes or legal areas this evidence relates to"],
  "suggestedTags": ["relevant", "keywords", "for", "categorization"],
  "prosecutionScore": 0.75,
  "legalRelevance": "High/Medium/Low - brief explanation",
  "keyFindings": ["Important finding 1", "Important finding 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Focus on legal relevance, admissibility concerns, and strategic value for prosecution or defense.`;

    // Query Ollama for AI analysis
    const aiResponse = await queryOllama(analysisPrompt);

    // Parse AI response
    let analysisResult: AIAnalysisResult;
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      // Fallback analysis if JSON parsing fails
      analysisResult = {
        summary: aiResponse.substring(0, 300) + '...',
        confidence: 0.5,
        relevantLaws: ['Analysis pending - manual review required'],
        suggestedTags: ['needs-review', 'ai-analysis-partial'],
        prosecutionScore: 0.5,
        legalRelevance: 'Unknown - requires manual analysis',
        keyFindings: ['AI analysis incomplete'],
        recommendations: ['Manual legal review recommended']
      };
    }

    // Generate embedding for similarity search if content available
    let embedding: number[] | null = null;
    if (content) {
      embedding = await getCudaEmbedding(content);
    }

    return json({
      success: true,
      data: {
        evidenceId,
        analysis: analysisResult,
        embedding,
        processedAt: new Date().toISOString(),
        model: LEGAL_MODEL,
        userId: locals.user.id
      }
    });

  } catch (error: any) {
    console.error('Evidence analysis failed:', error);

    if (error instanceof z.ZodError) {
      return json({
        message: 'Invalid analysis request',
        details: error.errors
      }, { status: 400 });
    }

    return json({
      message: 'Analysis failed',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
};
