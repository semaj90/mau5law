import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CUDA_SERVER_URL = 'http://localhost:8096';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		
		// Forward request to CUDA server with enhanced error handling
		const response = await fetch(`${CUDA_SERVER_URL}/cuda/compute`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			return json(
				{ 
					error: 'CUDA server error', 
					details: errorText,
					status: response.status 
				}, 
				{ status: response.status }
			);
		}

		const data = await response.json();
		return json(data);
		
	} catch (error) {
		console.error('CUDA compute API error:', error);
		return json(
			{ 
				error: 'Failed to connect to CUDA server',
				details: error instanceof Error ? error.message : String(error)
			}, 
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async () => {
	try {
		// Health check for CUDA server
		const response = await fetch(`${CUDA_SERVER_URL}/health`);
		
		if (!response.ok) {
			return json({ error: 'CUDA server unavailable' }, { status: 503 });
		}

		const health = await response.json();
		return json({
			status: 'connected',
			cuda_server: health,
			endpoint: `${CUDA_SERVER_URL}/cuda/compute`
		});
		
	} catch (error) {
		return json(
			{ 
				status: 'disconnected',
				error: 'CUDA server unreachable',
				details: error instanceof Error ? error.message : String(error)
			}, 
			{ status: 503 }
		);
	}
};