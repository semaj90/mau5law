// RAG query abstraction - retrieves context from Qdrant + PostgreSQL
import { embedText } from '$lib/server/ollama-service';
import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'phase72_evidence_embeddings';

let qdrantClient: QdrantClient | null = null;

function getQdrantClient(): QdrantClient {
	if (!qdrantClient) {
		qdrantClient = new QdrantClient({ url: QDRANT_URL });
	}
	return qdrantClient;
}

export async function getContextFromRag(opts: {
	caseId?: string;
	query: string;
	extraEvidenceKeys?: string[];
}): Promise<{ evidenceText: string }> {
	try {
		const client = getQdrantClient();

		// Generate embedding for the query
		const queryEmbedding = await embedText(opts.query);

		// Search Qdrant for similar vectors
		const searchResults = await client.search(COLLECTION_NAME, {
			vector: queryEmbedding,
			limit: 5,
			with_payload: true,
			score_threshold: 0.7
		});

		// Extract evidence text from results
		let evidenceText = '';
		for (const result of searchResults) {
			if (result.payload && typeof result.payload === 'object' && 'content' in result.payload) {
				evidenceText += result.payload.content + '\n\n';
			}
		}

		// If no results from Qdrant, return a fallback
		if (!evidenceText.trim()) {
			evidenceText = `[No relevant evidence found in vector database for query: "${opts.query}"]`;
		}

		console.log(`[RAG Query] Retrieved ${searchResults.length} chunks for query: "${opts.query}"`);

		return { evidenceText: evidenceText.trim() };
	} catch (error) {
		console.error('[RAG Query] Error:', error);
		// Fallback to stub response
		return {
			evidenceText: `[RAG context for case ${opts.caseId ?? 'unknown'}]\nQuery: ${opts.query}\nRetrieved evidence chunks would appear here...`
		};
	}
}
