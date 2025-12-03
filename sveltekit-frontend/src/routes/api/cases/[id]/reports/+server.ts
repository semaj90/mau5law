import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { reports } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const caseReports = await db.query.reports.findMany({
      where: eq(reports.caseId, params.caseId),
      orderBy: (reports, { desc }) => [desc(reports.createdAt)]
    });

    return json(caseReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const report = await request.json();

    const [newReport] = await db.insert(reports)
      .values({
        ...report,
        caseId: params.caseId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return json(newReport);
  } catch (error) {
    console.error('Error creating report:', error);
    return json({ error: 'Failed to create report' }, { status: 500 });
  }
};
