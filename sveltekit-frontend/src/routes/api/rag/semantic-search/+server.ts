import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SemanticSearchRequest {
	query: string;
	limit?: number;
	threshold?: number;
	filters?: {
		category?: string;
		jurisdiction?: string;
		parties?: string[];
		dateRange?: {
			start?: string;
			end?: string;
		};
	};
}

interface EmbeddingResponse {
	embedding: number[];
	model: string;
	modelType: string;
	dimensions: number;
	processingTime: number;
}

interface VectorSearchResult {
	id: string;
	title: string;
	document_type: string;
	distance: number;
	metadata: any;
	content?: string;
}

interface SemanticSearchResponse {
	success: boolean;
	query: string;
	results: VectorSearchResult[];
	embedding_time: number;
	search_time: number;
	total_time: number;
	total_results: number;
	semantic_scores?: {
		highest_relevance: number;
		lowest_relevance: number;
		average_relevance: number;
	};
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	const startTime = Date.now();

	try {
		const body: SemanticSearchRequest = await request.json();

		if (!body.query) {
			return json({
				success: false,
				error: 'Query is required'
			}, { status: 400 });
		}

		// Step 1: Generate embedding for the query
		const embeddingStart = Date.now();

		const embeddingResponse = await fetch('/api/embeddings/gemma?action=generate', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				text: body.query
			})
		});

		if (!embeddingResponse.ok) {
			throw new Error(`Embedding generation failed: ${embeddingResponse.status}`);
		}

		const embeddingData: EmbeddingResponse = await embeddingResponse.json();
		const embeddingTime = Date.now() - embeddingStart;

		// Step 2: Perform vector search
		const searchStart = Date.now();

		const searchPayload = {
			queryEmbedding: embeddingData.embedding,
			options: {
				limit: body.limit || 10,
				threshold: body.threshold || 1.0 // Cosine distance threshold
			}
		};

		const vectorResponse = await fetch('/api/pgvector/test?action=search', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(searchPayload)
		});

		if (!vectorResponse.ok) {
			throw new Error(`Vector search failed: ${vectorResponse.status}`);
		}

		const vectorData = await vectorResponse.json();
		const searchTime = Date.now() - searchStart;
		const totalTime = Date.now() - startTime;

		// Step 3: Apply additional filters if provided
		let results = vectorData.results || [];

		if (body.filters) {
			results = results.filter((result: VectorSearchResult) => {
				const metadata = result.metadata || {};

				// Filter by category
				if (body.filters?.category && metadata.category !== body.filters.category) {
					return false;
				}

				// Filter by jurisdiction
				if (body.filters?.jurisdiction && metadata.jurisdiction !== body.filters.jurisdiction) {
					return false;
				}

				// Filter by parties
				if (body.filters?.parties && Array.isArray(metadata.parties)) {
					const hasMatchingParty = body.filters.parties.some(party =>
						metadata.parties.includes(party)
					);
					if (!hasMatchingParty) return false;
				}

				// Filter by date range
				if (body.filters?.dateRange) {
					const effectiveDate = metadata.effectiveDate;
					if (effectiveDate) {
						if (body.filters.dateRange.start && effectiveDate < body.filters.dateRange.start) {
							return false;
						}
						if (body.filters.dateRange.end && effectiveDate > body.filters.dateRange.end) {
							return false;
						}
					}
				}

				return true;
			});
		}

		// Step 4: Calculate semantic scores
		const distances = results.map((r: VectorSearchResult) => r.distance);
		const semanticScores = distances.length > 0 ? {
			highest_relevance: Math.min(...distances), // Lower distance = higher relevance
			lowest_relevance: Math.max(...distances),
			average_relevance: distances.reduce((a, b) => a + b, 0) / distances.length
		} : undefined;

		// Step 5: Enhanced result formatting
		const enhancedResults = results.map((result: VectorSearchResult) => ({
			...result,
			semantic_score: (1 - result.distance), // Convert distance to similarity score
			relevance_level: result.distance < 0.3 ? 'high' :
							result.distance < 0.7 ? 'medium' : 'low',
			embedding_metadata: {
				model: embeddingData.model,
				dimensions: embeddingData.dimensions,
				query: body.query
			}
		}));

		const response: SemanticSearchResponse = {
			success: true,
			query: body.query,
			results: enhancedResults,
			embedding_time: embeddingTime,
			search_time: searchTime,
			total_time: totalTime,
			total_results: enhancedResults.length,
			semantic_scores: semanticScores
		};

		return json(response);

	} catch (error) {
		console.error('Semantic search error:', error);

		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			total_time: Date.now() - startTime
		}, { status: 500 });
	}
};