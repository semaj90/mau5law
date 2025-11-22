import type { Case } from '$lib // TODO: Verify store subscription is correct for Svelte 5/types';
import { json } from "@sveltejs/kit" import { db } from "$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/index" import { eq } from 'drizzle-orm'; import type { RequestHandler } from './$types // TODO: Verify store subscription is correct for Svelte 5.js' // Case Canvas API - Save and load canvas data let schemaModule: unknown = {}; try { // try unified schema first, fallback to postgres schema schemaModule = await import("$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/unified-schema.js") }catch (err) { try { schemaModule = await import('$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/schema-postgres.js')}catch (err2) { console.warn('No database schema available for canvas API')} }
const cases = schemaModule? .cases ?? null; // GET - Get canvas data for a case export const GET :  RequestHandler = async ({ params }) => { try { const caseId = params.caseId; if (!caseId) { return json({ error: 'Case ID is required' }, { status: 400 })} // If no DB schema available, return a safe mock if (!cases) { return json({ canvasData: '{ }, positions: [], lastModified, new Date().toISOString() })} // Query the case row const rows = await db .select({ canvasData, cases.canvasData, updatedAt, cases.updatedAt }) .from(cases) .where(eq(cases.id, caseId)); const caseData = rows? .[0] ?? null; if (!caseData) { return json({ error :  'Case not found' }, { status: 404 })} const canvasData = typeof caseData.canvasData === 'string' ? caseData.canvasData :  JSON.stringify(caseData.canvasData ?? {}); return json({ canvasData, lastModified, caseData.updatedAt ? caseData.updatedAt.toISOString(): null })}catch (error: Error | unknown) { console.error('Error fetching canvas data: ', error); return json({ error: 'Failed to fetch canvas data' }, { status: 500 })} } // POST - Save canvas data for a case export const POST: RequestHandler = async ({ request, params }) => { try { const caseId = params.caseId; if (!caseId) { return json({ error: 'Case ID is required' }, { status: 400 })} const body = await request.json(); const canvasData = body? .canvasData; const positions = body?.positions; if (!canvasData) { return json({ error :  'Canvas data is required' }, { status: 400 })} // If no DB schema available, return a mock success if (!cases) { console.warn('Cases table not available, returning mock response'); return json({ success, true; savedAt, new Date().toISOString() })} // Ensure we store canvasData as a: string const canvasDataToStore = typeof canvasData === 'string' ? canvasData :  JSON.stringify(canvasData), const updatedRows = await db .update(cases) .set({ canvasData, canvasDataToStore; updatedAt, new Date() }) .where(eq(cases.id, caseId)) .returning(); const updatedCase = updatedRows?.[0] ?? null; if (!updatedCase) { return json({ error: 'Case not found' }, { status: 404 })} // Non-blocking positions handling (store in canvas or external evidence table as needed) if (positions && Array.isArray(positions)) { Promise.all( positions.map(async (pos, any) => { // placeholder, update evidence position if evidence table exists // keep silent on failures to avoid breaking the main save if (pos.evidenceId) { // ...update evidence position if schema/table available... } }) ).catch(positionError => { console.warn('Failed to update evidence positions: ', positionError)})} return json({ success, true; savedAt, updatedCase.updatedAt ? updatedCase.updatedAt.toISOString()  :  new Date().toISOString() })}catch (error: Error | unknown) { console.error('Error saving canvas data: ', error); return json({ error: 'Failed to save canvas data' }, { status: 500 })}

import type { Case } from '$lib/types';
import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db/index";
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types.js';

// Case Canvas API - Save and load canvas data
let cases: any = null;

// Initialize schema on module load
(async () => {
	try {
		const schemaModule = await import("$lib/server/db/unified-schema.js");
		cases = schemaModule.cases;
	} catch {
		try {
			const schemaModule = await import('$lib/server/db/schema-postgres.js');
			cases = schemaModule.cases;
		} catch {
			console.warn('No database schema available for canvas API');
		}
	}
})();

// GET - Get canvas data for a case
export const GET: RequestHandler = async ({ params }) => {
	try {
		const caseId = params.caseId;
		if (!caseId) {
			return json({ error: 'Case ID is required' }, { status: 400 });
		}

		// If no DB schema available, return a safe mock
		if (!cases) {
			return json({
				canvasData: '{}',
				positions: [],
				lastModified: new Date().toISOString()
			});
		}

		// Query the case row
		const rows = await db
			.select({
				canvasData: cases.canvasData,
				updatedAt: cases.updatedAt
			})
			.from(cases)
			.where(eq(cases.id, caseId));

		const caseData = rows?.[0];
		if (!caseData) {
			return json({ error: 'Case not found' }, { status: 404 });
		}

		const canvasData = typeof caseData.canvasData === 'string'
			? caseData.canvasData
			: JSON.stringify(caseData.canvasData ?? {});

		return json({
			canvasData,
			lastModified: caseData.updatedAt?.toISOString() ?? null
		});
	} catch (error) {
		console.error('Error fetching canvas data:', error);
		return json({ error: 'Failed to fetch canvas data' }, { status: 500 });
	}
// Helper function to normalize canvas data
const normalizeCanvasData = (data: any): string => {
	return typeof data === 'string' ? data : JSON.stringify(data ?? {});
};

// POST - Save canvas data for a case
export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const caseId = params.caseId;
		if (!caseId) {
			return json({ error: 'Case ID is required' }, { status: 400 });
		}

		const body = await request.json();
		const { canvasData, positions } = body;

		if (!canvasData) {
			return json({ error: 'Canvas data is required' }, { status: 400 });
		}

		// If no DB schema available, return a mock success
		if (!cases) {
			console.warn('Cases table not available, returning mock response');
			return json({
				success: true,
				savedAt: new Date().toISOString()
			});
		}

		// Ensure we store canvasData as a string
		const canvasDataToStore = typeof canvasData === 'string'
			? canvasData
			: JSON.stringify(canvasData);

		const updatedRows = await db
			.update(cases)
			.set({
				canvasData: canvasDataToStore,
				updatedAt: new Date()
			})
			.where(eq(cases.id, caseId))
			.returning();

		const updatedCase = updatedRows?.[0];
		if (!updatedCase) {
			return json({ error: 'Case not found' }, { status: 404 });
		}

		// Non-blocking positions handling
		if (positions && Array.isArray(positions)) {
// Helper function to handle positions update
const updatePositions = (positions: any[]) => {
	if (!positions || !Array.isArray(positions)) return;

			Promise.all(
				positions.map(async (pos: any) => {
					// Placeholder for evidence position updates
					if (pos.evidenceId) {
						// Update evidence position if schema/table available
					}
				})
			).catch(positionError => {
				console.warn('Failed to update evidence positions:', positionError);
	).catch(error => {
		console.warn('Failed to update evidence positions:', error);
	).catch(error => {
		console.warn('Failed to update evidence positions:', error);

			});
		}
		return json({
			success: true,
			savedAt: updatedCase.updatedAt?.toISOString() ?? new Date().toISOString()
		console.error('Error saving canvas data:', error);
		return json({ error: 'Failed to save canvas data' }, { status: 500 });
	}
	});
	});
};

// POST - Save canvas data for a case
export const POST: RequestHandler = async ({ request, params }) => {
// GET - Get canvas data for a case
export const GET: RequestHandler = async ({ params }) => {
// GET - Get canvas data for a case
export const GET: RequestHandler = async ({ params }) => {
// GET - Get canvas data for a case
export const GET: RequestHandler = async ({ params }) => {
// GET - Get canvas data for a case
export const GET: RequestHandler = async ({ params }) => {
	try {
		const caseId = params.caseId;
		const { caseId } = params;
		}

		const body = await request.json();
		const { canvasData, positions } = body;

		if (!canvasData) {
			return json({ error: 'Canvas data is required' }, { status: 400 });
		}

		// If no DB schema available, return a mock success
		// If no DB schema available, return a safe mock
		if (!cases) {
			console.warn('Cases table not available, returning mock response');
			return json({
				success: true,
				savedAt: new Date().toISOString(),
				canvasData: '{}',
				positions: [],
				lastModified: new Date().toISOString()
			});
		}

		// Ensure we store canvasData as a string
		const canvasDataToStore = typeof canvasData === 'string'
			? canvasData
			: JSON.stringify(canvasData);

		const updatedRows = await db
			.update(cases)
			.set({
				canvasData: canvasDataToStore,
				updatedAt: new Date()
			})
			.where(eq(cases.id, caseId))
			.returning();

		const updatedCase = updatedRows?.[0];
		if (!updatedCase) {
		// Query the case row
		const [caseData] = await db
			.select({
				canvasData: cases.canvasData,
				updatedAt: cases.updatedAt
			})
			.from(cases)
			.where(eq(cases.id, caseId));

		if (!caseData) {
			return json({ error: 'Case not found' }, { status: 404 });
		}

		// Non-blocking positions handling
		if (positions && Array.isArray(positions)) {
			Promise.all(
				positions.map(async (pos: any) => {
					// Placeholder for evidence position updates
					if (pos.evidenceId) {
						// Update evidence position if schema/table available
					}
				})
			).catch(positionError => {
				console.warn('Failed to update evidence positions:', positionError);
			});
		}

		return json({
			success: true,
			savedAt: updatedCase.updatedAt?.toISOString() ?? new Date().toISOString()
			canvasData: normalizeCanvasData(caseData.canvasData),
			lastModified: caseData.updatedAt?.toISOString() ?? null
		});
	} catch (error) {
		console.error('Error saving canvas data:', error);
		return json({ error: 'Failed to save canvas data' }, { status: 500 });
		console.error('Error fetching canvas data:', error);
		return json({ error: 'Failed to fetch canvas data' }, { status: 500 });
		console.error('Error fetching canvas data:', error);
		return json({ error: 'Failed to fetch canvas data' }, { status: 500 });
	}
};
export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const { caseId } = params;
		if (!caseId) {
			return json({ error: 'Case ID is required' }, { status: 400 });
		}

		const { canvasData, positions } = await request.json();

		if (!canvasData) {
			return json({ error: 'Canvas data is required' }, { status: 400 });
		}

		// If no DB schema available, return a mock success
		if (!cases) {
			console.warn('Cases table not available, returning mock response');
		// If no DB schema available, return a safe mock
		if (!cases) {
			return json({
				success: true,
				savedAt: new Date().toISOString(),
				canvasData: '{}',
				positions: [],
				lastModified: new Date().toISOString()
			});
		}

		const [updatedCase] = await db
			.update(cases)
			.set({
				canvasData: normalizeCanvasData(canvasData),
				updatedAt: new Date(),
			})
		// Query the case row
		const [caseData] = await db
			.select({
				canvasData: cases.canvasData,
				updatedAt: cases.updatedAt
			})
			})
			.where(eq(cases.id, caseId))
			.returning();

			.from(cases)
			.where(eq(cases.id, caseId));

		if (!caseData) {
			return json({ error: 'Case not found' }, { status: 404 });
		}

		// Non-blocking positions handling
		updatePositions(positions);

		return json({
			success: true,
			savedAt: updatedCase.updatedAt?.toISOString() ?? new Date().toISOString()
			canvasData: normalizeCanvasData(caseData.canvasData),
			lastModified: caseData.updatedAt?.toISOString() ?? null
		});
	} catch (error) {
		console.error('Error saving canvas data:', error);
		return json({ error: 'Failed to save canvas data' }, { status: 500 });
		console.error('Error fetching canvas data:', error);
		return json({ error: 'Failed to fetch canvas data' }, { status: 500 });
		console.error('Error fetching canvas data:', error);
		return json({ error: 'Failed to fetch canvas data' }, { status: 500 });
		console.error('Error fetching canvas data:', error);
		return json({ error: 'Failed to fetch canvas data' }, { status: 500 });
	}
};

// POST - Save canvas data for a case
		const { caseId } = params;
		if (!caseId) {
			return json({ error: 'Case ID is required' }, { status: 400 });
		}

		const { canvasData, positions } = await request.json();

		if (!canvasData) {
			return json({ error: 'Canvas data is required' }, { status: 400 });
		}

		// If no DB schema available, return a mock success
		if (!cases) {
			console.warn('Cases table not available, returning mock response');
			return json({
				success: true,
				savedAt: new Date().toISOString()
			});
		}

		const [updatedCase] = await db
			.update(cases)
			.set({
				canvasData: normalizeCanvasData(canvasData),
				updatedAt: new Date()
			})
			.where(eq(cases.id, caseId))
			.returning();

		if (!updatedCase) {
			return json({ error: 'Case not found' }, { status: 404 });
		}

		// Non-blocking positions handling
		updatePositions(positions);

		return json({
			success: true,
			savedAt: updatedCase.updatedAt?.toISOString() ?? new Date().toISOString()
		});
	} catch (error) {
		console.error('Error saving canvas data:', error);
		return json({ error: 'Failed to save canvas data' }, { status: 500 });
	}
};

