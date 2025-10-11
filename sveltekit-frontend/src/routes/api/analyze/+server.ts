import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createHash } from 'node:crypto';

const LANGEXTRACT_URL = process.env.LANGEXTRACT_URL || 'http://localhost:8081/analyze';

async function jsExtract(message: string) {
  const words = message
    .toLowerCase()
    .split(/\s+/)
    // Replace punctuation using a Unicode-aware negative character class to avoid unnecessary escapes
    .map(w => w.replace(/[^\p{L}\p{N}\s]+/gu, ''))
    .filter(Boolean);
  const counts: Record<string, number> = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;
  return counts;
}

type AnalysisRequest = {
  text?: string;
  documentId?: string;
  evidenceId?: string;
  caseId?: string;
  documentType?: 'evidence' | 'case_file' | 'legal_document' | 'ocr_scan';
  analysisType?: 'classification' | 'extraction' | 'reasoning' | 'compliance' | 'chain_of_custody';
  useThinkingStyle?: boolean;
  contextDocuments?: string[];
  userId?: string;
  // support simple langextract fields
  message?: string;
  user_id?: string;
  mode?: 'langextract' | 'analysis';
};

function buildEnhancedAnalysisPrompt(
  documentText: string,
  analysisType: string,
  documentType: string,
  useThinkingStyle: boolean,
  contextualInfo: string,
  _documentMetadata: Record<string, unknown>
): string {
  const basePrompt = `Analyze this ${documentType} document for ${analysisType}.
Document Text:
${documentText}
${contextualInfo ? `Context: ${contextualInfo}` : ''}
Provide a structured analysis focusing on:
1. Key findings
2. Legal relevance
3. Compliance issues (if any)
4. Recommendations
Format: JSON with clear sections for each point.`;
  if (useThinkingStyle) {
    return `<thinking>
Let me analyze this ${documentType} for ${analysisType} purposes.
First, I'll examine the content structure and identify key elements...
Then I'll assess legal implications and compliance requirements...
Finally, I'll provide actionable recommendations...
</thinking>
${basePrompt}`;
  }
  return basePrompt;
}

/**
 * Single POST handler that:
 * - If body contains a simple "message" (and not analysis-specific fields) -> perform langextract (Go service with JS fallback)
 * - Otherwise -> perform richer analysis (Ollama) and return structured JSON
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = (await request.json()) as AnalysisRequest;

    // Heuristic: if caller explicitly requests langextract mode or provides a plain message and no analysis fields
    const wantsLangExtract =
      body.mode === 'langextract' ||
      (!!body.message && !body.text && !body.analysisType && !body.evidenceId && !body.caseId);

    if (wantsLangExtract) {
      const userId = body.user_id ?? body.userId ?? 'anonymous';
      const message = body.message ?? '';
      // Try Go service first
      try {
        const resp = await fetch(LANGEXTRACT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, message }),
        });
        if (resp.ok) {
          const data = await resp.json();
          return json(data, { status: 200 });
        }
        // fallthrough to JS fallback if service returns non-ok
        console.warn('langextract service returned non-ok status, falling back to JS extraction', resp.status);
      } catch (err) {
        console.warn('langextract service not available, using JS fallback', String(err));
      }
      const data = await jsExtract(message);
      return json(data, { status: 200 });
    }

    // Analysis flow
    const startTime = Date.now();
    if (!body.text && !body.evidenceId && !body.caseId) {
      return json({ error: 'Missing required field: text, evidenceId, or caseId' }, { status: 400 });
    }
    const documentText = body.text ?? '';
    const _documentMetadata: Record<string, unknown> = {}; // placeholder, kept to satisfy prompt builder signature
    const contextualInfo = '';
    const modelName = body.useThinkingStyle ? 'gemma3-legal:latest' : 'gemma3-legal:latest';
    const prompt = buildEnhancedAnalysisPrompt(
      documentText,
      body.analysisType ?? 'classification',
      body.documentType ?? 'legal_document',
      !!body.useThinkingStyle,
      contextualInfo,
      _documentMetadata
    );

    let aiContent = '';
    try {
      const resp = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt,
          stream: false,
          options: {
            temperature: 0.2,
            top_p: 0.9,
            num_ctx: 4096,
          },
        }),
      });
      if (!resp.ok) {
        console.warn(`Ollama API returned ${resp.status}: ${resp.statusText}`);
        aiContent = 'AI analysis unavailable (service error)';
      } else {
        const data = await resp.json();
        aiContent = (data && (data.response ?? data.result)) || 'No analysis returned';
      }
    } catch (fetchError) {
      console.warn('Could not connect to Ollama:', String(fetchError));
      aiContent = 'AI analysis unavailable (connection error)';
    }

    const requestId = createHash('sha256')
      .update(`${Date.now()}-${JSON.stringify(body)}`)
      .digest('hex')
      .slice(0, 8);

    const result = {
      requestId,
      analysis: aiContent,
      metadata: {
        documentType: body.documentType ?? 'legal_document',
        analysisType: body.analysisType ?? 'classification',
        useThinkingStyle: !!body.useThinkingStyle,
        textLength: documentText.length,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        model: modelName,
      },
    };
    return json(result);
  } catch (error: unknown) {
    console.error('Analysis endpoint error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: 'Internal server error', details: message }, { status: 500 });
  }
};
