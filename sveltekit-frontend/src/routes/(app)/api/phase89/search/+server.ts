import { QdrantClient } from '@qdrant/js-client-rest';
import { json } from '@sveltejs/kit';
import ollama from 'ollama';
import type { RequestHandler } from './$types';

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { query, top_k = 10, similarity = 'cosine' } = await request.json();

		if (!query || typeof query !== 'string') {
			return json({ success: false, error: 'Query is required' }, { status: 400 });
		}

		// Generate embedding for query using embeddinggemma:latest (768-dim)
		const embeddingResponse = await ollama.embeddings({
			model: 'embeddinggemma:latest',
			prompt: query
		});

		const queryVector = embeddingResponse.embedding;

		if (!queryVector || queryVector.length !== 768) {
			return json({
				success: false,
				error: `Invalid embedding dimension: ${queryVector?.length || 0}, expected 768`
			}, { status: 500 });
		}

		// Search across all Phase 89 collections
		const collections = [
			'phase89_error_chunks',
			'phase89_code_units',
			'phase89_error_clusters'
		];

		const searchPromises = collections.map(async (collection) => {
			try {
				const result = await qdrant.search(collection, {
					vector: queryVector,
					limit: top_k,
					with_payload: true,
					score_threshold: 0.5 // Only return results with >50% similarity
				});

				return result.map((hit: any) => ({
					id: hit.id,
					score: hit.score,
					collection,
					payload: hit.payload
				}));
			} catch (err) {
				console.warn(`Search failed for collection ${collection}:`, err);
				return [];
			}
		});

		const allResults = (await Promise.all(searchPromises)).flat();

		// Sort by cosine similarity score (descending)
		allResults.sort((a, b) => b.score - a.score);

		return json({
			success: true,
			query,
			embedding_model: 'embeddinggemma:latest',
			embedding_dim: 768,
			similarity_metric: similarity,
			total_results: allResults.length,
			results: allResults.slice(0, top_k)
		});
	} catch (error) {
		console.error('Vector search failed:', error);
		return json({ success: false, error: String(error) }, { status: 500 });
	}
};
