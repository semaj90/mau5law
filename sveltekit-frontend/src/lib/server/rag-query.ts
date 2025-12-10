/**
 * RAG Query Implementation for Phase 6.1
 *
 * This file implements real Qdrant-backed RAG for the Evidence Board.
 *
 * Usage:
 * 1. Copy this to: sveltekit-frontend/src/lib/server/rag-query.ts
 * 2. Run: npm install @qdrant/js-client-rest
 * 3. Verify QDRANT_URL in .env (default: http://localhost:6333)
 * 4. Test: curl -X POST http://localhost:5173/api/ai/yorha/context-chat \
 *      -H "Content-Type: application/json" \
 *      -d '{"message":"What are the key issues?","caseId":"case-123"}'
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { generateEmbedding } from './embedding-service';

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
});

const COLLECTION_NAME = 'phase72_evidence_embeddings';
const SEARCH_LIMIT = 10;
const SCORE_THRESHOLD = 0.5;

/**
 * RAG Query Response Shape
 */
export interface RagQueryResponse {
  contextText: string;
  citations: Array<{
    id: string;
    source: string;
    score: number;
  }>;
}

/**
 * Query Qdrant for evidence relevant to a question, optionally filtered by case
 *
 * @param opts.query - The question/search query
 * @param opts.caseId - Optional case ID to filter results
 * @returns Context text and citations
 */
export async function getContextFromRag(opts: {
  query: string;
  caseId?: string | null;
}): Promise<RagQueryResponse> {
  const { query, caseId } = opts;

  try {
    // 1. Generate embedding for the query
    console.log(`[RAG] Generating embedding for query: "${query.substring(0, 50)}..."`);
    const queryEmbedding = await generateEmbedding(query);
    console.log(`[RAG] Embedding generated (${queryEmbedding.length} dimensions)`);

    // 2. Build Qdrant filter if caseId provided
    const filter = caseId
      ? {
          must: [
            {
              field: 'payload.case_id',
              match: { value: caseId },
            },
          ],
        }
      : undefined;

    if (caseId) {
      console.log(`[RAG] Filtering by case_id: ${caseId}`);
    }

    // 3. Search Qdrant
    console.log(`[RAG] Searching Qdrant collection: ${COLLECTION_NAME}`);
    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: SEARCH_LIMIT,
      score_threshold: SCORE_THRESHOLD,
      filter,
    } as any);

    const results = (searchResults as any) || [];
    console.log(`[RAG] Found ${results.length} results`);

    // 4. Extract context and citations
    const citations: Array<{ id: string; source: string; score: number }> = [];
    const contextChunks: string[] = [];

    for (const result of results) {
      const payload = result.payload as Record<string, any>;
      const text = payload.text || payload.content || '';
      const evidenceId = payload.evidence_id || result.id;
      const fileName = payload.file_name || `Evidence ${evidenceId}`;
      const score = result.score || 0;

      if (text) {
        // Add to context
        contextChunks.push(text);

        // Add to citations
        citations.push({
          id: String(evidenceId),
          source: fileName,
          score,
        });

        console.log(`[RAG] Added citation: ${fileName} (score: ${score.toFixed(3)})`);
      }
    }

    // 5. Combine context chunks
    const contextText =
      contextChunks.length > 0
        ? contextChunks.join('\n\n---\n\n')
        : 'No relevant evidence found in the knowledge base.';

    console.log(
      `[RAG] Context assembled (${contextText.length} chars, ${citations.length} citations)`
    );

    return {
      contextText,
      citations,
    };
  } catch (err) {
    console.error('[RAG] Query failed:', err);

    // Return graceful fallback
    return {
      contextText: 'Unable to retrieve evidence context. Please try again or contact support.',
      citations: [],
    };
  }
}

/**
 * Health check: Verify Qdrant collection exists and is accessible
 */
export async function checkRagHealth(): Promise<{
  healthy: boolean;
  message: string;
  collectionInfo?: {
    name: string;
    pointsCount: number;
    vectorSize: number;
  };
}> {
  try {
    const collections = (await (qdrantClient as any).getCollections?.()) as any;
    const collectionsList = collections?.collections || [];
    const collection = collectionsList.find((c: any) => c.name === COLLECTION_NAME);

    if (!collection) {
      return {
        healthy: false,
        message: `Collection "${COLLECTION_NAME}" not found. Available: ${collectionsList.map((c: any) => c.name).join(', ') || 'none'}`,
      };
    }

    const collectionInfo = (await (qdrantClient as any).getCollection?.(COLLECTION_NAME)) as any;

    return {
      healthy: true,
      message: `Collection "${COLLECTION_NAME}" is healthy`,
      collectionInfo: {
        name: COLLECTION_NAME,
        pointsCount: collectionInfo.points_count || 0,
        vectorSize:
          typeof collectionInfo.config?.params?.vectors === 'object'
            ? (collectionInfo.config.params.vectors as any)?.size || 0
            : collectionInfo.config?.params?.vectors?.size || 0,
      },
    };
  } catch (err) {
    return {
      healthy: false,
      message: `Qdrant connection failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Debug: List recent points in collection (for testing)
 */
export async function debugListRecentPoints(limit: number = 5): Promise<any[]> {
  try {
    // Simplified debug - just return empty array for now
    console.log(`[RAG] Debug: Would list ${limit} points from ${COLLECTION_NAME}`);
    return [];
  } catch (err) {
    console.error('[RAG] Debug list failed:', err);
    return [];
  }
}
