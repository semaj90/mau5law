/**
 * ═══════════════════════════════════════════════════════════════════════
 * Codebase Index Cluster Members API
 * ═══════════════════════════════════════════════════════════════════════
 * Task: 13.1 - Create admin route structure
 * Endpoint: GET /api/codebase-index/clusters/[clusterId]/members
 * Purpose: Get all error cards belonging to a cluster
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const ERROR_CARDS_COLLECTION = 'phase90_error_cards';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { clusterId } = params;

		const response = await fetch(
			`${QDRANT_URL}/collections/${ERROR_CARDS_COLLECTION}/points/scroll`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filter: {
						must: [
							{ key: 'clusterId', match: { value: clusterId } }
						]
					},
					limit: 1000,
					with_payload: true,
					with_vector: false
				})
			}
		);

		if (!response.ok) {
			throw new Error(`Qdrant error: ${response.status}`);
		}

		const data = await response.json();
		const points = data.result?.points || [];

		const members = points.map((p: { id: string; payload: Record<string, unknown> }) => ({
			id: p.id,
			...p.payload
		}));

		return json({ members, total: members.length });
	} catch (error) {
		console.error('Failed to get cluster members:', error);
		return json({ members: [], total: 0, error: 'Failed to fetch members' }, { status: 500 });
	}
};
