/**
 * ═══════════════════════════════════════════════════════════════════════
 * Codebase Index Cluster Detail API
 * ═══════════════════════════════════════════════════════════════════════
 * Task: 13.1 - Create admin route structure
 * Endpoint: GET /api/codebase-index/clusters/[clusterId]
 * Purpose: Get single cluster details
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const CLUSTER_COLLECTION = 'phase90_error_clusters';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { clusterId } = params;

		const response = await fetch(
			`${QDRANT_URL}/collections/${CLUSTER_COLLECTION}/points/${clusterId}`,
			{
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			}
		);

		if (!response.ok) {
			if (response.status === 404) {
				return json({ error: 'Cluster not found' }, { status: 404 });
			}
			throw new Error(`Qdrant error: ${response.status}`);
		}

		const data = await response.json();
		const point = data.result;

		if (!point) {
			return json({ error: 'Cluster not found' }, { status: 404 });
		}

		return json({
			id: point.id,
			...point.payload
		});
	} catch (error) {
		console.error('Failed to get cluster:', error);
		return json({ error: 'Failed to fetch cluster' }, { status: 500 });
	}
};
