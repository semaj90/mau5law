import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { caseTimeline } from '$lib/server/db/schema-charges';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { caseId } = params;

		const events = await db
			.select()
			.from(caseTimeline)
			.where(eq(caseTimeline.caseId, caseId))
			.orderBy((t) => t.createdAt);

		const formatted = events.map((event) => {
			const payload = event.payload as any;
			let description = '';

			switch (event.actionType) {
				case 'charge_added':
					description = `📎 Charge added: ${payload.statuteCode} — ${payload.statuteTitle}`;
					if (payload.bundlesSuggested > 0) {
						description += ` (${payload.bundlesSuggested} bundles suggested)`;
					}
					break;
				case 'charge_suggested':
					description = `🚔 Suggested: ${payload.statuteCode}`;
					break;
				case 'bundle_viewed':
					description = `👁️ Viewed bundle: ${payload.statuteCode}`;
					break;
				default:
					description = event.actionType;
			}

			return {
				...event,
				description,
				time: new Date(event.createdAt).toLocaleTimeString()
			};
		});

		return json({ events: formatted });
	} catch (error) {
		console.error('Error fetching timeline:', error);
		return json({ error: 'Failed to fetch timeline' }, { status: 500 });
	}
};
