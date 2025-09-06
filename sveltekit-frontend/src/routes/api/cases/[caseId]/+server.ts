import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/index.js';
import { cases, evidence } from '$lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth.validate();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const caseId = params.caseId;
	if (!caseId) {
		throw error(400, 'Case ID is required');
	}

	try {
		const caseResult = await db
			.select()
			.from(cases)
			.where(eq(cases.id, caseId))
			.limit(1);

		if (caseResult.length === 0) {
			throw error(404, 'Case not found');
		}

		const caseData = caseResult[0];

		// Check if user has access
		if (caseData.userId !== session.user.userId) {
			throw error(403, 'Access denied');
		}

		return json({ success: true, case: caseData });
	} catch (err) {
		console.error('Error fetching case:', err);
		throw error(500, 'Failed to fetch case');
	}
};

export const PUT: RequestHandler = async ({ request, params, locals }) => {
	const session = await locals.auth.validate();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const caseId = params.caseId;
	const body = await request.json();
	const { title, description, status, priority, tags } = body;

	if (!title) {
		return json({ success: false, error: 'Title is required' }, { status: 400 });
	}

	try {
		const updateResult = await db
			.update(cases)
			.set({
				title,
				description,
				status,
				priority,
				tags,
				updatedAt: new Date()
			})
			.where(eq(cases.id, caseId))
			.returning();

		return json({ success: true, case: updateResult[0] });
	} catch (err) {
		console.error('Error updating case:', err);
		return json({ success: false, error: 'Failed to update case' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth.validate();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const caseId = params.caseId;

	try {
		await db.delete(evidence).where(eq(evidence.caseId, caseId));
		await db.delete(cases).where(eq(cases.id, caseId));
		return json({ success: true, message: 'Case deleted successfully' });
	} catch (err) {
		console.error('Error deleting case:', err);
		return json({ success: false, error: 'Failed to delete case' }, { status: 500 });
	}
};
