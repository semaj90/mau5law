import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
  prosecutorCases as cases,
  prosecutorEvidence as evidence,
  prosecutorCasePersons as casePersons,
  prosecutorPersons as personsOfInterest,
  prosecutorReports as reports
} from '$lib/server/db/schema-prosecutor';
import { eq } from 'drizzle-orm';
import { generateReportWithGemma, type ReportTemplate } from '$lib/server/llm/gemmaReports';

type GenerateBody = {
  caseId: string;
  template: ReportTemplate;
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = (await request.json()) as Partial<GenerateBody>;
  const caseId = body.caseId;
  const template = body.template ?? 'charging_memo';

  if (!caseId) {
    return json({ error: 'caseId is required' }, { status: 400 });
  }

  // 1. Load case
  const [caseRow] = await db.select().from(cases).where(eq(cases.id, caseId));

  if (!caseRow) {
    return json({ error: 'Case not found' }, { status: 404 });
  }

  // 2. Load persons for this case
  const personRows = await db
    .select({
      fullName: personsOfInterest.fullName,
      role: personsOfInterest.role,
      riskLevel: personsOfInterest.riskLevel
    })
    .from(casePersons)
    .innerJoin(personsOfInterest, eq(casePersons.personId, personsOfInterest.id))
    .where(eq(casePersons.caseId, caseId));

  // 3. Load evidence for this case
  const evidenceRows = await db
    .select({
      title: evidence.title,
      kind: evidence.kind
    })
    .from(evidence)
    .where(eq(evidence.caseId, caseId));

  // 4. Call Gemma3
  let contentHtml: string;
  try {
    contentHtml = await generateReportWithGemma({
      caseTitle: caseRow.title,
      caseId,
      template,
      narrative: caseRow.narrative,
      who: caseRow.who,
      what: caseRow.what,
      when: caseRow.when,
      where: caseRow.where,
      why: caseRow.why,
      how: caseRow.how,
      persons: personRows,
      evidence: evidenceRows
    });
  } catch (err) {
    console.error('Gemma3 report generation failed', err);
    return json({ error: 'LLM generation failed' }, { status: 500 });
  }

  // 5. Insert report row
  const title =
    template === 'charging_memo'
      ? `Charging Memo — ${caseRow.title}`
      : `Intake Summary — ${caseRow.title}`;

  const [inserted] = await db
    .insert(reports)
    .values({
      caseId,
      title,
      type: template,
      contentHtml,
      rawModelOutput: contentHtml,
      createdByUserId: (locals as any).user?.id ?? null
    })
    .returning();

  return json(inserted, { status: 201 });
};
