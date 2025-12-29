import { json } from '@sveltejs/kit';
import Redis from 'ioredis';
import type { RequestHandler } from './$types';

const redis = new Redis({ host: 'localhost', port: 6379, db: 0 });

export const GET: RequestHandler = async () => {
	try {
		// Fetch all cluster keys from Redis
		const keys = await redis.keys('phase89:cluster:*');

		const clusters = await Promise.all(
			keys.map(async (key) => {
				const data = await redis.get(key);
				if (!data) return null;

				const cluster = JSON.parse(data);
				const clusterId = key.split(':')[2];

				return {
					id: parseInt(clusterId),
					...cluster
				};
			})
		);

		return json({
			success: true,
			clusters: clusters.filter(Boolean).sort((a, b) => (b?.size || 0) - (a?.size || 0))
		});
	} catch (error) {
		console.error('Failed to fetch clusters:', error);
		return json({ success: false, error: String(error) }, { status: 500 });
	} finally {
		await redis.quit();
	}
};
