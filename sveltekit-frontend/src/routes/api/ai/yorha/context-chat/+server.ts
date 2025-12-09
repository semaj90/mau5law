import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';
import { extractKeywords } from '$lib/server/keyword-extractor';
import { contextualChat } from '$lib/server/llm/contextual-chat';
import { v4 as uuidv4 } from 'uuid';

interface ContextChatRequest {
  caseId?: string;
  message: string;
  evidenceIds?: string[];
  documentType?: string;
}

interface ContextChatResponse {
  turnId: string;
  answer: string;
  keywords?: string[];
  keyPhrases?: string[];
  suggestions?: Array<{
    query: string;
    reason: string;
    score: number;
  }>;
  didYouMean?: Array<{
    query: string;
    reason: string;
    score: number;
  }>;
  citations?: Array<{
    evidence_id: string;
    chunk_id: string;
  }>;
  latencyMs: number;
}

/**
 * POST /api/ai/yorha/context-chat
 * Contextual AI chat with RAG/KAG context and evidence attachment
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  const startTime = Date.now();

  try {
    // Get user session
    const session = locals.session as any;
    const isDevBypass = process.env.DEV_BYPASS_AUTH === 'true';
    if (!isDevBypass && !session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = isDevBypass ? 'dev-user-001' : session.user.id;

    let body: ContextChatRequest;
    try {
      body = (await request.json()) as ContextChatRequest;
    } catch (err) {
      console.error('❌ Invalid JSON in request body:', err);
      return json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { caseId, message, evidenceIds = [] } = body;

    if (!message?.trim()) {
      return json({ error: 'Message is required' }, { status: 400 });
    }

    console.log(`🤖 YoRHa Context Chat: "${message.substring(0, 50)}..."`);

    // 0. Extract keywords from message
    let keywords: string[] = [];
    let keyPhrases: string[] = [];
    try {
      const keywordResult = await extractKeywords(message, body.documentType);
      keywords = keywordResult.keywords;
      keyPhrases = keywordResult.keyPhrases;
      console.log(`🔍 Extracted keywords: ${keywords.join(', ')}`);
    } catch (err) {
      console.warn('⚠️ Keyword extraction failed:', err);
    }

    // 1. Use local contextual chat (simplified for now)
    let contextData: any;

    try {
      // Use local contextualChat function directly
      const localResult = await contextualChat({
        caseId,
        userMessage: message,
        keywords,
        keyPhrases,
      });

      contextData = {
        answer: localResult.content,
        did_you_mean: {
          query_embedding_source: 'local-llm',
          suggestions: localResult.suggestions?.map(s => ({ query: s, score: 0.8 })) || []
        },
        citations: [],
        latency_ms: Date.now() - startTime,
        rag_context: {
          collection: 'local-collection',
          top_k: 8,
          results: []
        },
        kag_context: {
          facts: []
        },
        keywords: localResult.keywords || keywords,
        keyPhrases: localResult.keyPhrases || keyPhrases
      };

      console.log('✅ Local LLM chat successful');
    } catch (err) {
      console.error('❌ Local LLM chat failed:', err);
      return json({ error: 'Failed to generate response' }, { status: 500 });
    }
    const { answer, did_you_mean, citations, latency_ms } = contextData;

    // 2. Save chat turn to database
    const turnId = uuidv4();
    const llmOutput = {
      model: 'gemma3-legal:latest',
      answer,
      citations: citations ?? [],
      tools_used: ['rag_retrieve', 'kag_lookup'],
      latency_ms: latency_ms ?? 0,
    };

    const ragContext = contextData.rag_context ?? {
      collection: 'phase_rag_evidence',
      top_k: 8,
      results: [],
    };

    const kagContext = contextData.kag_context ?? {
      facts: [],
    };

    const didYouMeanData = did_you_mean ?? {
      query_embedding_source: 'embeddinggemma:latest',
      suggestions: [],
    };

    // Insert chat turn using raw SQL
    try {
      await sql`
        INSERT INTO chat_turns (id, case_id, user_id, message, llm_output, rag_context, kag_context, did_you_mean, extracted_keywords, key_phrases, suggestions)
        VALUES (${turnId}, ${caseId || null}, ${userId}, ${message}, ${JSON.stringify(llmOutput)}, ${JSON.stringify(ragContext)}, ${JSON.stringify(kagContext)}, ${JSON.stringify(didYouMeanData)}, ${JSON.stringify(keywords)}, ${JSON.stringify(keyPhrases)}, ${JSON.stringify(didYouMeanData.suggestions || [])})
      `;
    } catch (err) {
      console.warn('⚠️ Failed to save chat turn:', err);
      // Continue anyway - don't fail the response
    }

    // 3. Link evidence to chat turn
    if (evidenceIds.length > 0) {
      for (const evidenceId of evidenceIds) {
        try {
          await sql`
            INSERT INTO chat_turn_evidence (chat_turn_id, evidence_id, role)
            VALUES (${turnId}, ${evidenceId}, 'uploaded')
          `;
        } catch (err) {
          console.warn(`⚠️ Failed to link evidence ${evidenceId}:`, err);
        }
      }
    }

    // Link retrieved evidence from RAG
    if (ragContext.results && Array.isArray(ragContext.results)) {
      for (const result of ragContext.results) {
        if (result.evidence_id) {
          try {
            await sql`
              INSERT INTO chat_turn_evidence (chat_turn_id, evidence_id, object_uri, role)
              VALUES (${turnId}, ${result.evidence_id}, ${'qdrant://phase_rag_evidence/' + result.chunk_id}, 'retrieved')
            `;
          } catch (err) {
            console.warn(`⚠️ Failed to link retrieved evidence:`, err);
          }
        }
      }
    }

    // 4. Record analytics
    const responseLatency = Date.now() - startTime;
    try {
      await sql`
        INSERT INTO chat_analytics (chat_turn_id, user_id, case_id, query_embedding_source, response_latency_ms, rag_results_count, kag_facts_count, suggestions_count)
        VALUES (${turnId}, ${userId}, ${caseId || null}, 'embeddinggemma:latest', ${responseLatency}, ${ragContext.results?.length ?? 0}, ${kagContext.facts?.length ?? 0}, ${didYouMeanData.suggestions?.length ?? 0})
      `;
    } catch (err) {
      console.warn('⚠️ Failed to record analytics:', err);
    }

    console.log(`✅ Chat turn saved: ${turnId} (${responseLatency}ms)`);

    // 5. Generate suggestions based on keywords
    const suggestions = generateSuggestions(keywords, keyPhrases, message);

    // 6. Return response
    const response: ContextChatResponse = {
      turnId,
      answer,
      keywords,
      keyPhrases,
      suggestions,
      didYouMean: didYouMeanData.suggestions,
      citations,
      latencyMs: responseLatency,
    };

    return json(response);
  } catch (err) {
    console.error('❌ Context chat error:', err);
    return json(
      {
        error: err instanceof Error ? err.message : 'Context chat failed',
      },
      { status: 500 }
    );
  }
};

/**
 * Generate follow-up suggestions based on extracted keywords
 */
function generateSuggestions(
  keywords: string[],
  keyPhrases: string[],
  originalMessage: string
): Array<{
  query: string;
  reason: string;
  score: number;
}> {
  const suggestions: Array<{
    query: string;
    reason: string;
    score: number;
  }> = [];

  // Suggestion 1: Explore related keywords
  if (keywords.length > 0) {
    const topKeyword = keywords[0];
    suggestions.push({
      query: `What are the implications of "${topKeyword}" in this case?`,
      reason: `Explore the key term "${topKeyword}" further`,
      score: 0.9,
    });
  }

  // Suggestion 2: Expand on key phrases
  if (keyPhrases.length > 0) {
    const topPhrase = keyPhrases[0];
    suggestions.push({
      query: `Can you elaborate on "${topPhrase}"?`,
      reason: `Dive deeper into the key phrase`,
      score: 0.85,
    });
  }

  // Suggestion 3: Related legal concepts
  if (keywords.length > 1) {
    const relatedKeywords = keywords.slice(0, 2).join(' and ');
    suggestions.push({
      query: `How do ${relatedKeywords} interact in this context?`,
      reason: `Explore relationships between key terms`,
      score: 0.8,
    });
  }

  // Suggestion 4: Evidence-related follow-up
  if (originalMessage.toLowerCase().includes('evidence')) {
    suggestions.push({
      query: 'What other evidence supports this conclusion?',
      reason: 'Find corroborating evidence',
      score: 0.75,
    });
  }

  // Suggestion 5: Timeline or chronology
  if (originalMessage.toLowerCase().includes('date') || originalMessage.toLowerCase().includes('when')) {
    suggestions.push({
      query: 'Can you provide a timeline of events?',
      reason: 'Establish chronological order',
      score: 0.75,
    });
  }

  return suggestions.slice(0, 3); // Return top 3 suggestions
}
