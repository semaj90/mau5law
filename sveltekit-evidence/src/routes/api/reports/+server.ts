/**
 * Reports API - Handles report creation and retrieval
 * POST /api/reports - Create new report
 * GET /api/reports?caseId=xxx - Get reports for case
 */
import { json } from "@sveltejs/kit";
import type { Report } from "$lib/types";

export async function POST({ request }: { request: Request }) {
  try {
    const data = await request.json();
    const { caseId, title, content, createdBy, type } = data;

    if (!caseId || !title || !content || !createdBy) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    const report: Report = {
      id: crypto.randomUUID(),
      caseId,
      title,
      content,
      createdAt: new Date(),
      createdBy,
      type: type || "investigation",
      status: "draft",
    };

    // TODO: Save to database
    // await db.insert(report).into('reports');

    return json(report);
  } catch (error) {
    console.error("Report creation error:", error);
    return json({ error: "Failed to create report" }, { status: 500 });
  }
}

export async function GET({ url }: { url: URL }) {
  const caseId = url.searchParams.get("caseId");

  if (!caseId) {
    return json({ error: "Case ID required" }, { status: 400 });
  }

  try {
    // TODO: Fetch from database
    // const reports = await db.select().from('reports').where('caseId', caseId);

    // Mock data for now
    const reports: Report[] = [];

    return json(reports);
  } catch (error) {
    console.error("Reports fetch error:", error);
    return json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
