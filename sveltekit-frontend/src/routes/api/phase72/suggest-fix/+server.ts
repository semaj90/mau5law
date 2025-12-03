import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const PLANNER_URL =
	process.env.PHASE78_PLANNER_URL ?? 'http://127.0.0.1:8010/phase78/suggest-fix';

type SuggestFixBody = {
	route: string;
	code: string;
	message: string;
	file_path: string;
	line: number;
	col: number;
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as SuggestFixBody;

		// Try to call planner service
		try {
			const res = await fetch(PLANNER_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(5000)
			});

			if (res.ok) {
				const data = await res.json();
				return json(data);
			}
		} catch (plannerErr) {
			console.warn('Planner unavailable, using fallback:', plannerErr);
		}

		// Fallback: generate basic suggestion from error code
		const suggestion = generateFallbackSuggestion(body);
		return json(suggestion);
	} catch (err) {
		console.error('suggest-fix error:', err);
		return json(
			{
				plan: 'Error analysis unavailable',
				suggestions: [],
				related_routes: []
			},
			{ status: 502 }
		);
	}
};

function generateFallbackSuggestion(body: SuggestFixBody) {
	const suggestions: string[] = [];

	// Common TypeScript errors
	if (body.code === 'TS2304') {
		suggestions.push(`Import the missing symbol: import { ${extractSymbol(body.message)} } from '...'`);
	} else if (body.code === 'TS2339') {
		suggestions.push('Check that the property exists on the type');
		suggestions.push('Add the property to the interface or type definition');
	} else if (body.code === 'TS2345') {
		suggestions.push('Check the argument types match the function signature');
	} else if (body.code === 'SVELTEKIT_SERVER_IMPORT') {
		suggestions.push('Move server-only code to +page.server.ts or +server.ts');
		suggestions.push('Use form actions or API endpoints to call server functions');
	}

	// Generic fallback
	if (suggestions.length === 0) {
		suggestions.push(`Review the error: ${body.message}`);
		suggestions.push('Check the file at the specified location');
	}

	return {
		plan: suggestions.join('\n\n'),
		suggestions,
		related_routes: [body.route],
		code: body.code,
		severity: 'error'
	};
}

function extractSymbol(message: string): string {
	const match = message.match(/Cannot find name '(\w+)'/);
	return match ? match[1] : 'Symbol';
}
