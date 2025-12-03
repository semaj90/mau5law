import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const route = url.searchParams.get('route');
	if (!route) {
		return json({ error: 'Missing "route" query param' }, { status: 400 });
	}

	// TODO: replace with real Phase72 DB query
	return json({
		errorCount: 0,
		lastError: null
	});
};
