
import { canvasStates, cases, evidence } from '$lib/server/db/schema-postgres';
import { helpers } from '$lib/server/db';
import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { URL } from "url";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(302, "/login");
  }
  const user = locals.user;

  // Get report ID from query params
  const reportId = url.searchParams.get("reportId");

  let canvasState = null;
  let reportData = null;
  let evidenceData: any[] = [];

  if (reportId) {
    // Load existing canvas state
    const [canvasStateResult] = await db
      .select()
      .from(canvasStates)
  .where(helpers.eq(canvasStates.caseId, reportId as string) as any)
      .limit(1);

    if (canvasStateResult) {
      canvasState = canvasStateResult.canvasData;
    }
    // Load associated evidence
    evidenceData = await db
      .select()
      .from(evidence)
  .where(helpers.eq(evidence.caseId, reportId as string) as any);

    // Load report/case data
    const [caseResult] = await db
      .select()
      .from(cases)
  .where(helpers.eq(cases.id, reportId as string) as any)
      .limit(1);

    reportData = caseResult;
  }
  return {
    user,
    reportId,
    canvasState,
    reportData,
    evidence: evidenceData,
  };
};
