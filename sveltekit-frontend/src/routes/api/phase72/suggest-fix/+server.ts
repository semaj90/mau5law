import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type Body = {
	route: string;
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => ({}))) as Partial<Body>;
	if (!body.route) {
		return json({ error: 'Missing "route" in body' }, { status: 400 });
	}

	// TODO: call your LLM fixer / Ollama / Gemma here
	console.log('[phase72] suggest-fix for', body.route);

	return json({
		ok: true,
		route: body.route,
		message: 'Fix plan enqueued (stub).'
	});
};
