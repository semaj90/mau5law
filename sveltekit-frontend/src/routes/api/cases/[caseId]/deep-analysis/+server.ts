/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { json } from '@sveltejs/kit';
// Import DB module as a loose/any import so this route stays resilient to barrel export changes
import * as DBModule from '$lib/server/db/index';
import * as drizzle from 'drizzle-orm';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { RequestHandler } from './$types';
// Environment variables fallback
const env = process.env as Record<string, string | undefined>;
const QDRANT_URL = env.QDRANT_URL || 'http://localhost:6333';
const NLP_SERVICE_URL = env.LLM_SERVICE_URL || 'http://localhost:8000';
const OPENAI_API_KEY = env.OPENAI_API_KEY;
const GEMINI_API_KEY = env.GEMINI_API_KEY; // For future use
const CLAUDE_API_KEY = env.CLAUDE_API_KEY; // Anthropic
const qdrantClient = new QdrantClient({ url: QDRANT_URL });

// Resolve db and schema exports defensively (many barrels differ across dev setups)
const db: any = (DBModule as any).db ?? (DBModule as any).default ?? DBModule;
const caseActivities: any = (DBModule as any).caseActivities;
const cases: any = (DBModule as any).cases;
const evidence: any = (DBModule as any).evidence;

// Defensive eq shim if drizzle export shape differs in some environments
const eq: any = (drizzle as any).eq ?? ((a: any, b: any) => ({ type: 'eq', left: a, right: b }));

// --- ADDED TYPES (lightweight, only what we need) ---
type QdrantHitPayload = {
  content?: string;
  aiSummary?: string;
  [k: string]: unknown;
};
type QdrantSearchHit = {
  id?: string;
  payload?: QdrantHitPayload;
  score?: number;
};
type CaseActivityRow = { title?: string; [k: string]: unknown };
type EvidenceRow = { fileName?: string; title?: string; [k: string]: unknown };
type LLMResponse = { source: string; data: unknown; ok: boolean };

// small helper to centralize Ollama endpoint
function getOllamaEndpoint(): string {
  // prefer explicit env override; prefer docker service name 'ollama' with a fallback
  return process.env.OLLAMA_URL || 'http://ollama:11434';
}

// small helper to extract text from common LLM response shapes
function extractTextFromLLM(data: any): string | null {
  if (!data) return null;
  // OpenAI chat completions
  if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  // OpenAI completions/text
  if (Array.isArray(data?.choices) && typeof data.choices[0]?.text === 'string') {
    return data.choices[0].text;
  }
  // Anthropic Claude
  if (typeof data?.completion === 'string') return data.completion;
  // Gemini (Generative Language) - candidates or output may contain text
  if (Array.isArray(data?.candidates) && typeof data.candidates[0]?.content === 'string') {
    return data.candidates[0].content;
  }
  if (typeof data?.output === 'string') return data.output;
  // Ollama/local responses: common keys
  if (typeof data?.text === 'string') return data.text;
  if (typeof data?.response === 'string') return data.response;
  // try to stringify if it's a simple object with useful fields
  try {
    const firstText = Object.values(data).find(v => typeof v === 'string');
    if (typeof firstText === 'string') return firstText;
  } catch {
    /* noop */
  }
  return null;
}

export const POST: RequestHandler = async ({ params, locals, request }) => {
  if (!locals.user) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { caseId } = params;
  if (!caseId) {
    return json({ error: 'Case ID is required' }, { status: 400 });
  }
  const { queryText, enableMultiLLM, complexityLevel = 3 } = await request.json();
  if (!queryText) {
    return json({ error: 'Query text is required' }, { status: 400 });
  }
  try {
    // --- RAG: RETRIEVAL ---
    const currentCaseResults = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!currentCaseResults.length) {
      return json({ error: 'Case not found' }, { status: 404 });
    }
    const currentCase = currentCaseResults[0];

    // cast DB rows to narrow shapes we use
    const recentActivities = (await db
      .select()
      .from(caseActivities)
      .where(eq(caseActivities.caseId, caseId))
      .orderBy(caseActivities.createdAt)
      .limit(5)) as CaseActivityRow[];

    const recentEvidence = (await db
      .select()
      .from(evidence)
      .where(eq(evidence.caseId, caseId))
      .orderBy(evidence.uploadedAt)
      .limit(10)) as EvidenceRow[];

    // --- EMBEDDING (resilient: NLP service then fallback to Ollama embed) ---
    let queryEmbedding: number[] | undefined;
    try {
      const embeddingResponse = await fetch(`${NLP_SERVICE_URL}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: queryText }),
      });
      if (embeddingResponse.ok) {
        queryEmbedding = (await embeddingResponse.json()).embedding;
      }
    } catch (e) {
      // swallow and try ollama below
    }
    if (!queryEmbedding) {
      try {
        const ollamaEmbed = await fetch(`${getOllamaEndpoint()}/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: queryText, model: 'embeddinggemma' }),
        });
        if (!ollamaEmbed.ok) throw new Error('Ollama embed failed');
        queryEmbedding = (await ollamaEmbed.json()).embedding;
      } catch (e) {
        throw new Error('Failed to get embedding from configured NLP service or Ollama');
      }
    }

    // Retrieve from two Qdrant collections in parallel
    const rawSearchPromises = [
      qdrantClient.search('prosecutor_text_fragments', {
        vector: queryEmbedding,
        limit: 3,
        filter: { must: [{ key: 'caseId', match: { value: caseId } }] },
        with_payload: true,
      }),
      qdrantClient.search('prosecutor_evidence', {
        vector: queryEmbedding,
        limit: 3,
        filter: { must: [{ key: 'caseId', match: { value: caseId } }] },
        with_payload: true,
      }),
    ];
    const [qdrantFragmentResults, qdrantEvidenceResults] = (await Promise.allSettled(rawSearchPromises)) as [
      PromiseSettledResult<QdrantSearchHit[]>,
      PromiseSettledResult<QdrantSearchHit[]>,
    ];

    const relevantFragments =
      qdrantFragmentResults.status === 'fulfilled' && Array.isArray(qdrantFragmentResults.value)
        ? qdrantFragmentResults.value
            .map(hit => hit?.payload?.content ?? '')
            .filter(Boolean)
            .join('\n\n')
        : '';

    const relevantEvidenceSummaries =
      qdrantEvidenceResults.status === 'fulfilled' && Array.isArray(qdrantEvidenceResults.value)
        ? qdrantEvidenceResults.value
            .map(hit => hit?.payload?.aiSummary ?? '')
            .filter(Boolean)
            .join('\n\n')
        : '';

    // --- RAG: AUGMENTATION ---
    const ragContext = `
            Case Title: ${currentCase.title}
            Case Description: ${currentCase.description}
            Recent Activities: ${
              recentActivities
                .map(a => a.title ?? '')
                .filter(Boolean)
                .join(', ') || 'None'
            }
            Recent Evidence: ${
              recentEvidence
                .map(e => e.fileName ?? e.title ?? '')
                .filter(Boolean)
                .join(', ') || 'None'
            }
            Relevant Case Fragments: ${relevantFragments || 'None'}
            Relevant Evidence Summaries: ${relevantEvidenceSummaries || 'None'}
        `.trim();
    const basePrompt = `
            Analyze the following query in the context of a legal case. Provide actionable insights and recommendations.
            CONTEXT:
            ---
            ${ragContext}
            ---
            USER QUERY: "${queryText}"
            ANALYSIS:
        `.trim();
    // Define a GBNF grammar to force the local LLM to return a specific JSON structure.
    // This grammar defines an object with a "summary" (string) and "recommendations" (array of strings).
    const jsonGrammar = String.raw`
root   ::= object
object ::= "{" ws ( string ":" ws value ("," ws string ":" ws value)* )? "}"
array  ::= "[" ws ( value ("," ws value)* )? "]"
value  ::= object | array | string | number | "true" | "false" | "null"
string ::= "\"" (
  [^"\\] |
  "\\" (["\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F])
)* "\""
number ::= ("-")? ([0-9] | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [-+]? [0-9]+)?
ws ::= ([ \t\n]*)
`.trim();
    // --- MULTI-LLM INFERENCE (OpenAI, Gemini, Claude, local Ollama) ---
    const promises: Promise<LLMResponse>[] = [];

    // Local Ollama / firm AI (always include; uses getOllamaEndpoint())
    promises.push(
      fetch(`${getOllamaEndpoint()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3-legal:latest',
          prompt: basePrompt + '\n\nReturn JSON with "summary" and "recommendations".',
          max_tokens: 2024,
          grammar: jsonGrammar,
        }),
      }).then(async res => {
        const data = await res.json().catch(() => ({}));
        return { source: 'ollama', data, ok: res.ok };
      })
    );

    // OpenAI (if enabled)
    if (enableMultiLLM && OPENAI_API_KEY) {
      promises.push(
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: basePrompt }],
            max_tokens: 512,
          }),
        }).then(async res => {
          const data = await res.json().catch(() => ({}));
          return { source: 'openai', data, ok: res.ok };
        })
      );
    }

    // Google Gemini (Generative Language API) - defensive call if key present
    if (enableMultiLLM && GEMINI_API_KEY) {
      promises.push(
        fetch('https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GEMINI_API_KEY}`,
          },
          body: JSON.stringify({
            prompt: { text: basePrompt },
            maxOutputTokens: 512,
          }),
        }).then(async res => {
          const data = await res.json().catch(() => ({}));
          return { source: 'gemini', data, ok: res.ok };
        })
      );
    }

    // Anthropic Claude
    if (enableMultiLLM && CLAUDE_API_KEY) {
      promises.push(
        fetch('https://api.anthropic.com/v1/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
          },
          body: JSON.stringify({
            model: 'claude-2',
            prompt: basePrompt,
            max_tokens_to_sample: 512,
          }),
        }).then(async res => {
          const data = await res.json().catch(() => ({}));
          return { source: 'claude', data, ok: res.ok };
        })
      );
    }

    const settledResults = (await Promise.allSettled(promises)) as PromiseSettledResult<LLMResponse>[];

    // --- SYNTHESIS & RESPONSE (handle each source with extractTextFromLLM) ---
    const analysisResults: { [key: string]: unknown } = {};

    settledResults.forEach(result => {
      if (result.status === 'fulfilled') {
        const value = result.value;
        if (value.ok) {
          const text = extractTextFromLLM(value.data);
          analysisResults[value.source] = {
            output: text ?? value.data,
            source: value.source + (text ? ' (extracted text)' : ' (raw)'),
          };
        } else {
          const detail = (value.data as { detail?: unknown })?.detail;
          analysisResults[value.source] = { error: typeof detail === 'string' ? detail : 'API Error' };
        }
      } else {
        // network / fetch failure
        console.error('Fetch failed for a model:', result.reason);
      }
    });

    return json({ success: true, analysisResults });
  } catch (error: unknown) {
    console.error('Error in deep analysis endpoint:', error);
    return json({ error: 'Failed to perform deep analysis' }, { status: 500 });
  }
};
