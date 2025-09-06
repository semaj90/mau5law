import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CUDA_SERVER_URL = 'http://localhost:8096';

export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${CUDA_SERVER_URL}/cuda/stats`);
		
		if (!response.ok) {
			return json({ 
				error: 'CUDA stats unavailable',
				status: response.status 
			}, { status: response.status });
		}

		const stats = await response.json();
		
		return json({
			cuda_stats: stats,
			timestamp: Date.now(),
			source: 'cuda-ai-service'
		});
		
	} catch (error) {
		return json({
			error: 'Failed to retrieve CUDA stats',
			details: error instanceof Error ? error.message : String(error),
			timestamp: Date.now()
		}, { status: 500 });
	}
};