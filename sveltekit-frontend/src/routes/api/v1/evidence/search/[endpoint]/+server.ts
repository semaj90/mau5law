/*
 * Evidence Search API - Smart search with AI suggestions
 * POST /api/v1/evidence/search/similar - Find similar evidence using vector similarity
 * POST /api/v1/evidence/search/suggest - Get AI-powered search suggestions
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

// Configuration
const OLLAMA_BASE_URL = 'http://localhost:11434';
const LEGAL_MODEL = 'gemma3-legal:latest';
const EMBEDDING_MODEL = 'nomic-embed-text:latest'; // Available in our Ollama instance

// Request schemas
const SimilarSearchSchema = z.object({
  query: z.string().min(1),
  evidenceId: z.string().uuid().optional(),
  limit: z.number().min(1).max(20).default(5),
  threshold: z.number().min(0).max(1).default(0.7)
});

const SuggestionSchema = z.object({
  query: z.string().min(1),
  context: z.string().optional(),
  type: z.enum(['search', 'legal', 'case', 'precedent']).default('legal'),
  limit: z.number().min(1).max(10).default(5)
});

// Types
interface SearchSuggestion {
  text: string;
  type: 'case' | 'law' | 'evidence' | 'precedent';
  confidence: number;
  source: string;
  reasoning?: string;
}

interface SimilarEvidence {
  id: string;
  filename: string;
  similarity: number;
  summary: string;
  relevantLaws: string[];
  type: string;
}

// Ollama helpers
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

async function queryOllama(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LEGAL_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 512
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama query failed: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama query failed:', error);
    throw error;
  }
}

// Calculate cosine similarity between vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

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

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

/*
 * POST /api/v1/evidence/search/similar
 * Find similar evidence using vector similarity
 */
export const POST: RequestHandler = async ({ request, locals, url }) => {
  const endpoint = url.pathname.split('/').pop();

  if (endpoint === 'similar') {
    try {
      // Check authentication
      if (!locals.session || !locals.user) {
        return json({ message: 'Authentication required' }, { status: 401 });
      }

      const body = await request.json();
      const { query, evidenceId, limit, threshold } = SimilarSearchSchema.parse(body);

      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);

      // TODO: In production, this would query a vector database (pgvector)
      // For now, we'll simulate with mock similar evidence
      const mockSimilarEvidence: SimilarEvidence[] = [
        {
          id: 'evidence-001',
          filename: 'financial_records_2023.pdf',
          similarity: 0.87,
          summary: 'Financial records showing suspicious transactions',
          relevantLaws: ['Money Laundering Prevention Act', '18 USC 1956'],
          type: 'document'
        },
        {
          id: 'evidence-002',
          filename: 'witness_statement_john_doe.txt',
          similarity: 0.73,
          summary: 'Witness testimony corroborating financial irregularities',
          relevantLaws: ['Federal Rules of Evidence 801'],
          type: 'document'
        },
        {
          id: 'evidence-003',
          filename: 'bank_correspondence.pdf',
          similarity: 0.68,
          summary: 'Bank emails discussing account activity',
          relevantLaws: ['Bank Secrecy Act', '31 USC 5311'],
          type: 'document'
        }
      ].filter(item => item.similarity >= threshold)
       .slice(0, limit);

      return json({
        success: true,
        data: {
          query,
          results: mockSimilarEvidence,
          total: mockSimilarEvidence.length,
          threshold,
          embedding: queryEmbedding, // Return for client-side caching
          processedAt: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('Similar evidence search failed:', error);

      if (error instanceof z.ZodError) {
        return json({
          message: 'Invalid search request',
          details: error.errors
        }, { status: 400 });
      }

      return json({
        message: 'Similar evidence search failed',
        details: error.message
      }, { status: 500 });
    }
  }

  /*
   * POST /api/v1/evidence/search/suggest
   * Get AI-powered search suggestions
   */
  if (endpoint === 'suggest') {
    try {
      // Check authentication
      if (!locals.session || !locals.user) {
        return json({ message: 'Authentication required' }, { status: 401 });
      }

      const body = await request.json();
      const { query, context, type, limit } = SuggestionSchema.parse(body);

      // Generate AI suggestions based on query type
      const suggestionPrompt = `You are a legal research assistant. Based on the user's search query, provide helpful search suggestions.

Query: "${query}"
${context ? `Context: ${context}` : ''}
Suggestion Type: ${type}

Generate ${limit} intelligent search suggestions that would help find relevant legal evidence, cases, or precedents. Format as JSON:
[
  {
    "text": "suggested search term or phrase",
    "type": "case|law|evidence|precedent",
    "confidence": 0.85,
    "source": "why this suggestion is relevant",
    "reasoning": "brief explanation"
  }
]

Focus on legal terminology, case citations, statutory references, and evidence categories that would be most useful for legal research.`;

      const aiResponse = await queryOllama(suggestionPrompt);

      let suggestions: SearchSuggestion[];
      try {
        // Try to parse JSON response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (parseError) {
        // Fallback suggestions if AI response parsing fails
        suggestions = [
          {
            text: query + " legal precedent",
            type: 'precedent',
            confidence: 0.6,
            source: 'Automated suggestion',
            reasoning: 'Adding legal precedent context'
          },
          {
            text: query + " evidence analysis",
            type: 'evidence',
            confidence: 0.6,
            source: 'Automated suggestion',
            reasoning: 'Evidence-focused search'
          },
          {
            text: query + " case law",
            type: 'case',
            confidence: 0.6,
            source: 'Automated suggestion',
            reasoning: 'Case law research'
          }
        ];
      }

      return json({
        success: true,
        data: {
          query,
          suggestions: suggestions.slice(0, limit),
          type,
          generatedAt: new Date().toISOString(),
          model: LEGAL_MODEL
        }
      });

    } catch (error: any) {
      console.error('Search suggestions failed:', error);

      if (error instanceof z.ZodError) {
        return json({
          message: 'Invalid suggestion request',
          details: error.errors
        }, { status: 400 });
      }

      return json({
        message: 'Search suggestions failed',
        details: error.message
      }, { status: 500 });
    }
  }

  // Unknown endpoint
  return json({ message: 'Endpoint not found' }, { status: 404 });
};
