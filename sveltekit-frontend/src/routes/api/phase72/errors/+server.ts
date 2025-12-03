import { pool } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type Phase72ErrorRow = {
	id: string;
	file_path: string;
	line: number;
	col: number;
	code: string;
	severity: string;
	message: string;
	cycle: number;
	created_at: string;
};

type ErrorStats = {
	code: string;
	count: number;
	first_seen: string;
	last_seen: string;
};

export const GET: RequestHandler = async ({ url }) => {
	const route = url.searchParams.get('route');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500);

	if (!route) {
		return json({ errors: [], stats: [], total: 0 });
	}

	const client = await pool.connect();
	try {
		// Get errors for this route
		const { rows: errors } = await client.query<Phase72ErrorRow>(
			`
			SELECT
				id,
				file_path,
				line,
				col,
				code,
				severity,
				message,
				cycle,
				created_at
			FROM phase72_error
			WHERE file_path ILIKE $1
			ORDER BY created_at DESC
			LIMIT $2
		`,
			[`%${route}%`, limit]
		);

		// Get error statistics
		const { rows: stats } = await client.query<ErrorStats>(
			`
			SELECT
				code,
				COUNT(*)::int as count,
				MIN(created_at)::text as first_seen,
				MAX(created_at)::text as last_seen
			FROM phase72_error
			WHERE file_path ILIKE $1
			GROUP BY code
			ORDER BY count DESC
			LIMIT 10
		`,
			[`%${route}%`]
		);

		// Get total count
		const { rows: countRows } = await client.query<{ total: number }>(
			`SELECT COUNT(*)::int as total FROM phase72_error WHERE file_path ILIKE $1`,
			[`%${route}%`]
		);

		return json({
			errors,
			stats,
			total: countRows[0]?.total || 0
		});
	} catch (err) {
		console.error('Phase72 errors API error:', err);
		return json(
			{ errors: [], stats: [], total: 0, error: 'Database query failed' },
			{ status: 500 }
		);
	} finally {
		client.release();
	}
};
