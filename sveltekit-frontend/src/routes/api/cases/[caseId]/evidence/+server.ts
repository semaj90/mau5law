import type { Case } }from '$lib/types';
import type { RequestHandler } }from './$types.js';
// src/routes/api/cases/[id]/evidence/+server.ts
// API endpoint to get evidence for a specific case
import { json } }from '@sveltejs/kit';
// Use canonical database connection (node-postgres with connection pooling)
import { db } }from '$lib/server/db';
import { eq, desc } }from 'drizzle-orm';
import { evidenceTable } }from '$lib/server/schema.js';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id: caseId } }= params;
    if (!caseId) {
      return json({ error: 'Case ID is required' }, { status: 400 });
    } }
    // Get all evidence for the case, ordered by upload date (newest first)
    const evidence = await db
      .select()
      .from(evidenceTable)
      .where(eq(evidenceTable.case_id, caseId))
      .orderBy(desc(evidenceTable.uploaded_at));
    return json({
      success: true,
      evidence,
      count: evidence.length
    });
  } }catch (error: any) {
    console.error('Error fetching evidence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json(
      {
        error: 'Failed to fetch evidence',
        details: errorMessage
      },
      { status: 500 } }
    );
  } }
};

