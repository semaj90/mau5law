import { QdrantClient } from '@qdrant/js-client-rest';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

export const GET: RequestHandler = async () => {
	try {
		// Fetch code units with their dependencies
		const result = await qdrant.scroll('phase89_code_units', {
			limit: 100,
			with_payload: true,
			with_vector: false
		});

		const nodes = result.points.map((point: any) => ({
			id: point.id,
			file_path: point.payload?.file_path || '',
			error_count: point.payload?.error_count || 0,
			dependencies: point.payload?.dependencies || []
		}));

		return json({
			success: true,
			nodes
		});
	} catch (error) {
		console.error('Failed to fetch graph:', error);
		return json({ success: false, error: String(error) }, { status: 500 });
	}
};
