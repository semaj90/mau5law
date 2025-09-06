import { URL } from "url";

import { reports } from "$lib/server/db/schema";

import { db } from "$lib/server/db/index";
import type { RequestHandler } from './$types';

// import { citationPoints
import { and, eq } from "drizzle-orm";
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    // TODO: Implement citationPoints table and proper querying
    // For now, return empty results to allow build to succeed
    const reportId = url.searchParams.get("reportId");
    const type = url.searchParams.get("type");
    const caseId = url.searchParams.get("caseId");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Return empty results structure for now
    return json({
      citationPoints: [],
      total: 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Error fetching citation points:", error);
    return json({ error: "Failed to fetch citation points" }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const data = await request.json();

    // Validate required fields
    if (!data.text || !data.source) {
      return json({ error: "Text and source are required" }, { status: 400 });
    }
    const citationData = {
      text: data.text,
      source: data.source,
      page: data.page || null,
      context: data.context || "",
      type: data.type || "statute",
      jurisdiction: data.jurisdiction || "",
      tags: data.tags || [],
      caseId: data.caseId || null,
      reportId: data.reportId || null,
      evidenceId: data.evidenceId || null,
      statuteId: data.statuteId || null,
      aiSummary: data.aiSummary || null,
      relevanceScore: data.relevanceScore || "0.0",
      metadata: data.metadata || {},
      isBookmarked: data.isBookmarked || false,
      createdBy: locals.user.id,
    };

    const [newCitation] = await db
      .insert(reports)
      .values({
        title: "Citation Point: " + data.text.substring(0, 50),
        content: JSON.stringify(citationData),
        reportType: "citation_point",
        createdBy: locals.user.id,
        caseId: data.caseId,
      })
      .returning();

    return json(newCitation, { status: 201 });
  } catch (error: any) {
    console.error("Error creating citation point:", error);
    return json({ error: "Failed to create citation point" }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const data = await request.json();

    if (!data.id) {
      return json({ error: "Citation point ID is required" }, { status: 400 });
    }
    // Check if citation point exists
    const existingCitation = await db
      .select()
      .from(reports)
      .where(
        and(eq(reports.id, data.id), eq(reports.reportType, "citation_point")),
      )
      .limit(1);

    if (!existingCitation.length) {
      return json({ error: "Citation point not found" }, { status: 404 });
    }
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    // Only update provided fields
    if (data.text !== undefined) updateData.text = data.text;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.page !== undefined) updateData.page = data.page;
    if (data.context !== undefined) updateData.context = data.context;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.jurisdiction !== undefined)
      updateData.jurisdiction = data.jurisdiction;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.isBookmarked !== undefined)
      updateData.isBookmarked = data.isBookmarked;

    const [updatedCitation] = await db
      .update(reports)
      .set({
        content: JSON.stringify(updateData),
        updatedAt: new Date(),
      })
      .where(eq(reports.id, data.id))
      .returning();

    return json(updatedCitation);
  } catch (error: any) {
    console.error("Error updating citation point:", error);
    return json({ error: "Failed to update citation point" }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const citationId = url.searchParams.get("id");
    if (!citationId) {
      return json({ error: "Citation point ID is required" }, { status: 400 });
    }
    // Check if citation point exists
    const existingCitation = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.id, citationId),
          eq(reports.reportType, "citation_point"),
        ),
      )
      .limit(1);

    if (!existingCitation.length) {
      return json({ error: "Citation point not found" }, { status: 404 });
    }
    // Delete the citation point
    await db.delete(reports).where(eq(reports.id, citationId));

    return json({ success: true });
  } catch (error: any) {
    console.error("Error deleting citation point:", error);
    return json({ error: "Failed to delete citation point" }, { status: 500 });
  }
};
