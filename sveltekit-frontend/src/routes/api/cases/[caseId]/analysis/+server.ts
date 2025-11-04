import type { Case } from '$lib/types';
import { json } from '@sveltejs/kit';
import { caseActivities, cases } from '$lib/server/db/schema-postgres';
import db from '$lib/server/db/index'; // Changed to default import
import type { RequestHandler } from './$types.js';
import { QdrantClient } from '@qdrant/qdrant-js';
import { eq } from 'drizzle-orm';
import { getQdrantUrl, getOllamaUrl } from '$lib/server/utils/endpoints'; // Import centralized endpoint helpers

// Environment variables fallback is now handled by the helper functions
const QDRANT_URL = getQdrantUrl();
const NLP_SERVICE_URL = getOllamaUrl(); // Use Ollama URL for NLP service

const qdrantClient = new QdrantClient({ url: QDRANT_URL });

export const POST: RequestHandler = async ({ params, locals, request }) => {
    if (!locals.user) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { caseId } = params;
    if (!caseId) {
        return json({ error: 'Case ID is required' }, { status: 400 });
    }

    const { queryText } = await request.json();
    if (!queryText) {
        return json({ error: 'Query text is required' }, { status: 400 });
    }

    try {
        // Simplified analysis - just local LLM and basic context
        const currentCaseResults = await db
            .select()
            .from(cases)
            .where(eq(cases.id, caseId))
            .limit(1);

        if (!currentCaseResults.length) {
            return json({ error: 'Case not found' }, { status: 404 });
        }
        const currentCase = currentCaseResults[0];

        const recentActivities = await db
            .select()
            .from(caseActivities)
            .where(eq(caseActivities.caseId, caseId))
            .orderBy(caseActivities.createdAt)
            .limit(3);

        try {
            const embeddingResponse = await fetch(`${NLP_SERVICE_URL}/embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: queryText })
            });

            if (!embeddingResponse.ok) {
                throw new Error('Embedding service unavailable');
            }
            const queryEmbedding = (await embeddingResponse.json()).embedding;

            const qdrantSearchResults = await qdrantClient.search(
                'prosecutor_text_fragments',
                {
                    vector: queryEmbedding,
                    limit: 3,
                    filter: {
                        must: [{ key: 'caseId', match: { value: caseId } }]
                    },
                    with_payload: true
                }
            );

            const relevantFragments = qdrantSearchResults
                .map((hit: { payload?: { content?: string } }) => hit.payload?.content)
                .filter(Boolean) // Filter out undefined/null content
                .join('\n\n');

            const ragContext = `Case Title: ${currentCase.title}
Case Description: ${currentCase.description}
Recent Activities: ${recentActivities.map((a: { title: string }) => a.title).join(', ') || 'None'}
Relevant Fragments: ${relevantFragments || 'None'}`.trim();

            const prompt = `Analyze the following query in the context of a legal case. Provide a brief analysis.
CONTEXT:
---
${ragContext}
---
USER QUERY: "${queryText}"
BRIEF ANALYSIS:`.trim();

            const analysisResponse = await fetch(`${NLP_SERVICE_URL}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, max_tokens: 512 })
            });

            if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json();
                return json({ success: true, analysis: analysisData.response, source: 'Local LLM', context: ragContext });
            } else {
                throw new Error('Analysis service unavailable');
            }
        } catch (vectorError) {
            console.warn('Vector search failed, falling back to basic analysis: ', vectorError);
            // Fallback without vector search
            const basicContext = `Case Title: ${currentCase.title}
Case Description: ${currentCase.description}
Recent Activities: ${recentActivities.map((a: { title: string }) => a.title).join(', ') || 'None'}`.trim();

            return json({
                success: true,
                analysis: `Based on the case context, here's a basic analysis of your query: "${queryText}"\n\nThe case "${currentCase.title}" appears to be related to your query. Consider reviewing the case description and recent activities for more insights.`,
                source: 'Fallback Analysis',
                context: basicContext
            });
        }
    } catch (error: Error | unknown) {
        console.error('Error in analysis endpoint: ', error);
        return json({ error: `Failed to perform analysis` }, { status: 500 });
    }
};
