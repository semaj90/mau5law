import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GPU_RERANK_URL = process.env.GPU_RERANK_URL || 'http://localhost:5678';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate request
		if (!body.query_embedding || !Array.isArray(body.query_embedding)) {
			throw error(400, 'Missing or invalid query_embedding');
		}

		if (!body.candidate_ids || !Array.isArray(body.candidate_ids)) {
			throw error(400, 'Missing or invalid candidate_ids');
		}

		// Forward to GPU rerank service
		const response = await fetch(`${GPU_RERANK_URL}/rerank`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query_embedding: body.query_embedding,
				candidate_ids: body.candidate_ids,
				top_k: body.top_k || 10
			})
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw error(response.status, errorData.error || 'GPU rerank service error');
		}

		const result = await response.json();

		return json(result);
	} catch (err) {
		console.error('[Phase89 Rerank] Error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, err instanceof Error ? err.message : 'Rerank failed');
	}
};

export const GET: RequestHandler = async () => {
	try {
		// Health check - forward to GPU service
		const response = await fetch(`${GPU_RERANK_URL}/health`);

		if (!response.ok) {
			throw error(503, 'GPU rerank service unavailable');
		}

		const health = await response.json();

		return json({
			...health,
			endpoint: '/api/phase89/rerank',
			url: GPU_RERANK_URL
		});
	} catch (err) {
		console.error('[Phase89 Rerank Health] Error:', err);
		throw error(503, 'GPU rerank service unavailable');
	}
};
