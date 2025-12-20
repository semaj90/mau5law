/**
 * Phase 76: Knowledge Base Search API
 * Unified endpoint for RAG/KAG synthesis with LLM
 *
 * Features:
 * - Qdrant vector search (phase76_knowledge_base)
 * - Ollama embeddings (embeddinggemma:latest)
 * - Redis caching (optional)
 * - Inverse ranking with relevance scores
 * - LLM synthesis via ACE agent
 */

import { json, type RequestHandler } from '@sveltejs/kit';

interface SearchRequest {
	query: string;
	limit?: number;
	threshold?: number;
	synthesize?: boolean; // Use LLM for answer synthesis
	provider?: 'ollama' | 'gemini' | 'claude' | 'openai';
	useWebSearch?: boolean; // Enable Gemini web search grounding
}

interface KnowledgeResult {
	id: number;
	score: number;
	title: string;
	url: string;
	summary: string;
	entities: string;
	content?: string;
}

interface WebSource {
	title?: string;
	uri?: string;
}

interface SearchResponse {
	query: string;
	results: KnowledgeResult[];
	synthesized?: string; // LLM-generated answer
	webSources?: WebSource[]; // Gemini grounding sources
	searchUsed?: boolean; // Whether web search was used
	metadata: {
		totalResults: number;
		processingTime: number;
		cached: boolean;
		provider?: string;
	};
}

const CONFIG = {
	ollama: {
		url: 'http://localhost:11434',
		embeddingModel: 'embeddinggemma:latest',
		chatModel: 'gemma3-legal:latest'
	},
	qdrant: {
		url: 'http://localhost:6333',
		collection: 'phase76_knowledge_base',
		defaultLimit: 5,
		defaultThreshold: 0.5
	},
	redis: {
		enabled: false, // Enable when Redis is available
		ttl: 3600 // 1 hour cache
	}
};

/**
 * Generate embedding for query
 */
async function generateEmbedding(text: string): Promise<number[]> {
	const response = await fetch(`${CONFIG.ollama.url}/api/embeddings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: CONFIG.ollama.embeddingModel,
			prompt: text
		})
	});

	if (!response.ok) {
		throw new Error(`Embedding failed: ${response.statusText}`);
	}

	const data = await response.json();
	return data.embedding;
}

/**
 * Search Qdrant knowledge base
 */
async function searchKnowledgeBase(
	embedding: number[],
	limit: number,
	threshold: number
): Promise<KnowledgeResult[]> {
	const response = await fetch(
		`${CONFIG.qdrant.url}/collections/${CONFIG.qdrant.collection}/points/search`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				vector: embedding,
				limit,
				score_threshold: threshold,
				with_payload: true
			})
		}
	);

	if (!response.ok) {
		throw new Error(`Qdrant search failed: ${response.statusText}`);
	}

	const data = await response.json();

	return data.result.map((item: any) => ({
		id: item.id,
		score: item.score,
		title: item.payload.title,
		url: item.payload.url,
		summary: item.payload.summary,
		entities: item.payload.entities,
		contentLength: item.payload.contentLength,
		scrapedAt: item.payload.scrapedAt
	}));
}

/**
 * Synthesize answer using LLM (supports Ollama and Gemini with web search)
 */
async function synthesizeAnswer(
	query: string,
	results: KnowledgeResult[],
	provider: string = 'ollama',
	useWebSearch: boolean = false
): Promise<{ text: string; webSources?: WebSource[]; searchUsed?: boolean }> {
	// Build context from search results
	const context = results
		.map(
			(r, idx) => `
## Source ${idx + 1}: ${r.title} (${(r.score * 100).toFixed(1)}% relevance)
**URL**: ${r.url}
**Summary**: ${r.summary}
`
		)
		.join('\n');

	const prompt = `You are a helpful AI assistant with access to official documentation.

**User Question**: ${query}

**Available Documentation**:
${context}

Based on the documentation above, provide a comprehensive answer to the user's question.
Cite specific sources by referencing the URLs. Be concise but thorough.

**Answer**:`;

	// Use Gemini with web search grounding if provider is 'gemini' and useWebSearch is true
	if (provider === 'gemini' && useWebSearch) {
		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			throw new Error('GEMINI_API_KEY not set in environment');
		}

		// Dynamic import for Gemini
		const { GoogleGenerativeAI } = await import('@google/generative-ai');
		const genAI = new GoogleGenerativeAI(apiKey);

		const model = genAI.getGenerativeModel({
			model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
			tools: [{ googleSearch: {} }] // Enable Google Search grounding
		});

		const result = await model.generateContent({
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			generationConfig: {
				temperature: 0.3,
				maxOutputTokens: 2048
			}
		});

		const response = result.response;
		const text = response.text();

		// Extract search grounding metadata
		const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
		const groundingChunks = groundingMetadata?.groundingChunks;

		const webSources: WebSource[] = groundingChunks?.map((chunk: any) => ({
			title: chunk.web?.title,
			uri: chunk.web?.uri
		})) || [];

		return {
			text,
			webSources,
			searchUsed: !!groundingMetadata
		};
	}

	// Fall back to Ollama for other providers
	const response = await fetch(`${CONFIG.ollama.url}/api/generate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: CONFIG.ollama.chatModel,
			prompt,
			stream: false,
			options: {
				temperature: 0.3,
				num_predict: 1024
			}
		})
	});

	if (!response.ok) {
		throw new Error(`LLM synthesis failed: ${response.statusText}`);
	}

	const data = await response.json();
	return { text: data.response, searchUsed: false };
}

/**
 * POST /api/knowledge/search
 * Search knowledge base with optional LLM synthesis
 */
export const POST: RequestHandler = async ({ request }) => {
	const startTime = performance.now();

	try {
		const body: SearchRequest = await request.json();
		const {
			query,
			limit = CONFIG.qdrant.defaultLimit,
			threshold = CONFIG.qdrant.defaultThreshold,
			synthesize = false,
			provider = 'ollama',
			useWebSearch = false
		} = body;

		if (!query || query.trim().length === 0) {
			return json(
				{ error: 'Query is required' },
				{ status: 400 }
			);
		}

		// 1. Generate embedding
		const embedding = await generateEmbedding(query);

		// 2. Search Qdrant
		const results = await searchKnowledgeBase(embedding, limit, threshold);

		// 3. Optional: Synthesize answer with LLM
		let synthesizedAnswer: string | undefined;
		let webSources: WebSource[] | undefined;
		let searchUsed: boolean | undefined;

		if (synthesize && results.length > 0) {
			const synthesisResult = await synthesizeAnswer(query, results, provider, useWebSearch);
			synthesizedAnswer = synthesisResult.text;
			webSources = synthesisResult.webSources;
			searchUsed = synthesisResult.searchUsed;
		}

		// 4. Build response
		const processingTime = performance.now() - startTime;

		const response: SearchResponse = {
			query,
			results,
			synthesized: synthesizedAnswer,
			webSources,
			searchUsed,
			metadata: {
				totalResults: results.length,
				processingTime: Math.round(processingTime),
				cached: false, // TODO: Redis integration
				provider: synthesize ? provider : undefined
			}
		};

		return json(response);
	} catch (error) {
		console.error('Knowledge search error:', error);
		return json(
			{
				error: 'Search failed',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * GET /api/knowledge/search?q=query&limit=5&synthesize=true
 * Query string version for simple requests
 */
export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q') || url.searchParams.get('query');
	const limit = parseInt(url.searchParams.get('limit') || '5');
	const threshold = parseFloat(url.searchParams.get('threshold') || '0.5');
	const synthesize = url.searchParams.get('synthesize') === 'true';
	const provider = (url.searchParams.get('provider') || 'ollama') as any;

	if (!query) {
		return json(
			{ error: 'Query parameter "q" is required' },
			{ status: 400 }
		);
	}

	// Reuse POST handler logic
	return POST({
		request: new Request(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query, limit, threshold, synthesize, provider })
		})
	} as any);
};
