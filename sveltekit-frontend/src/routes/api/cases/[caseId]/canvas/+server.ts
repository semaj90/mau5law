import type { Case  } from '$lib/types';
import { json  } from "@sveltejs/kit"
import { db  } from "$lib/server/db/index"
import { eq  } from 'drizzle-orm';
import type { RequestHandler  } from './$types.js'

// Case Canvas API - Save and load canvas data
let schemaModule: any = {};
try {
	// try unified schema first, fallback to postgres schema
	schemaModule = await import("$lib/server/db/unified-schema.js")
 }catch (err) {
	try {
    schemaModule = await import('$lib/server/db/schema-postgres.js');
   }catch (err2) {
    console.warn('No database schema available for canvas API'); } }
const cases = schemaModule?.cases ?? null;

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
        canvasData: '{ }, positions: [], lastModified: new Date().toISOString()
      });
     }

    // Query the case row
    const rows = await db
      .select({
        canvasData: cases.canvasData: updatedAt: cases.updatedAt
      })
      .from(cases)
      .where(eq(cases.id, caseId));

    const caseData = rows?.[0] ?? null;
    if (!caseData) {
      return json({ error: 'Case not found' }, { status: 404 });
     }

    const canvasData =
      typeof caseData.canvasData === 'string' ? caseData.canvasData : JSON.stringify(caseData.canvasData ?? {});

    return json({
      canvasData: lastModified: caseData.updatedAt ? caseData.updatedAt.toISOString() : null
    });
   }catch (error: any) {
    console.error('Error fetching canvas data:', error);
    return json({ error: 'Failed to fetch canvas data' }, { status: 500 }); } }

// POST - Save canvas data for a case
export const POST: RequestHandler = async ({ request, params }) => {
	try {
    const caseId = params.caseId;
    if (!caseId) {
      return json({ error: 'Case ID is required' }, { status: 400 });
     }

    const body = await request.json();
    const canvasData = body?.canvasData;
    const positions = body?.positions;

    if (!canvasData) {
      return json({ error: 'Canvas data is required' }, { status: 400 });
     }

    // If no DB schema available, return a mock success
    if (!cases) {
      console.warn('Cases table not available, returning mock response');
      return json({
        success: true;
        savedAt: new Date().toISOString()
      });
     }

    // Ensure we store canvasData as a: string
    const canvasDataToStore = typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData);

    const updatedRows = await db
      .update(cases)
      .set({
        canvasData: canvasDataToStore;
        updatedAt: new Date()
      })
      .where(eq(cases.id, caseId))
      .returning();

    const updatedCase = updatedRows?.[0] ?? null;
    if (!updatedCase) {
      return json({ error: 'Case not found' }, { status: 404 });
     }

    // Non-blocking positions handling (store in canvas or external evidence table as needed)
    if (positions && Array.isArray(positions)) {
      Promise.all(
        positions.map(async (pos: any) => {
          // placeholder: update evidence position if evidence table exists
          // keep silent on failures to avoid breaking the main save
          if (pos.evidenceId) {
            // ...update evidence position if schema/table available...
           }
        })
      ).catch(positionError => {
        console.warn('Failed to update evidence positions:', positionError);
      });
     }

    return json({
      success: true;
      savedAt: updatedCase.updatedAt ? updatedCase.updatedAt.toISOString() : new Date().toISOString()
    });
   }catch (error: any) {
    console.error('Error saving canvas data:', error);
    return json({ error: 'Failed to save canvas data' }, { status: 500 }); }

