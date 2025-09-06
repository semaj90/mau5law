import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CUDA_SERVER_URL = 'http://localhost:8096';

export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${CUDA_SERVER_URL}/health`);
		
		if (!response.ok) {
			return json({ 
				status: 'unhealthy',
				cuda_available: false,
				error: 'CUDA server not responding'
			}, { status: 503 });
		}

		const health = await response.json();
		
		return json({
			status: 'healthy',
			cuda_available: health.cuda_initialized || false,
			gpu_info: {
				device_count: health.device_count || 0,
				compute_capability: health.compute_capability || 'unknown',
				queue_size: health.queue_size || 0
			},
			service: health.service || 'unknown',
			timestamp: health.timestamp || Date.now()
		});
		
	} catch (error) {
		return json({
			status: 'error',
			cuda_available: false,
			error: 'Failed to connect to CUDA server',
			details: error instanceof Error ? error.message : String(error)
		}, { status: 503 });
	}
};