import { json } from '@sveltejs/kit';
import { enhancedSearchWithNeo4j } from '$lib/ai/custom-reranker';
import { mcpContext72GetLibraryDocs } from '$lib/mcp-context72-get-library-docs';
import type { RequestHandler } from './$types.js';

// --- Added types to avoid `any` ---
type MemoryRecord = { relatedId?: string };
type RerankResult = {
  id: string;
  intent?: string;
  content?: string;
  rerankScore?: number | string;
  finalScore?: number;
  // allow extra fields without using `any`
  [key: string]: unknown;
};

// Enhanced RAG endpoint with reranker, Neo4j, memory, and docs
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { query, userContext, neo4jContext, limit = 8 } = await request.json();

    // Run enhanced search with Neo4j context
    const reranked = (await enhancedSearchWithNeo4j(query, userContext, neo4jContext, limit * 2)) as RerankResult[];

    // Enrich with memory and docs for final scoring
    const memory = (await accessMemoryMCP(query, userContext)) as MemoryRecord[] | unknown;

    // treat docs as unknown and runtime-check to avoid `any`
    const docsRaw = (await mcpContext72GetLibraryDocs('svelte', 'runes')) as unknown;

    const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');

    // Final scoring pass
    const highScoreRecommendations = reranked
      .map(result => {
        // normalize rerankScore to a number and default to 0
        const baseScore = Number(result?.rerankScore ?? 0);
        let score = Number.isFinite(baseScore) ? baseScore : 0;

        // safe memory check
        if (Array.isArray(memory) && memory.some(m => m.relatedId === result?.id)) {
          score += 1;
        }

        // only use includes if docs is an array of strings
        if (isStringArray(docsRaw) && typeof result?.intent === 'string' && docsRaw.includes(result.intent)) {
          score += 1;
        }

        return { ...result, finalScore: score } as RerankResult & { finalScore: number };
      })
      .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))
      .slice(0, limit);

    // Compose RAG answer (stub: use top result)
    const answer = highScoreRecommendations[0]?.content ?? '[No answer found]';

    return json({
      answer,
      references: highScoreRecommendations.map(r => ({
        id: r.id,
        score: r.finalScore ?? 0,
      })),
      confidence: highScoreRecommendations[0]?.finalScore ?? 0,
      highScoreRecommendations,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message || 'Failed to run enhanced RAG' }, { status: 500 });
  }
};
