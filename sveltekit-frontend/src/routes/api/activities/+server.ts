import { json } from "@sveltejs/kit";
import { caseActivities } from "$lib/server/db/schema-postgres";
import { db } from "$lib/server/db/index";
import { eq, sql, desc } from "drizzle-orm";
import { or as orExpr, like } from "drizzle-orm/expressions";
import type { RequestHandler } from './$types.js';
import { URL } from "url";


export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const caseId = url.searchParams.get("caseId");
    const activityType = url.searchParams.get("activityType");
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const assignedTo = url.searchParams.get("assignedTo");
    const search = url.searchParams.get("search") || "";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const sortBy = url.searchParams.get("sortBy") || "scheduledFor";
    const sortOrder = url.searchParams.get("sortOrder") || "asc";

    // Build filters
    const filters: any[] = [];

    // Add case filter
    if (caseId) {
      filters.push(eq(caseActivities.caseId, caseId));
    }
    // Add activity type filter
    if (activityType) {
      filters.push(eq(caseActivities.activityType, activityType));
    }
    // Add status filter
    if (status) {
      filters.push(eq(caseActivities.status, status));
    }
    // Add priority filter
    if (priority) {
      filters.push(eq(caseActivities.priority, priority));
    }
    // Add assigned user filter
    if (assignedTo) {
      filters.push(eq(caseActivities.assignedTo, assignedTo));
    }
    // Add search filter
    if (search) {
      filters.push(
        orExpr([
          like(caseActivities.title, `%${search}%`),
          like(caseActivities.description, `%${search}%`),
        ]),
      );
    }

    // Determine the column for sorting
    const orderColumn =
      sortBy === "title"
        ? caseActivities.title
        : sortBy === "activityType"
          ? caseActivities.activityType
          : sortBy === "status"
            ? caseActivities.status
            : sortBy === "priority"
              ? caseActivities.priority
              : sortBy === "scheduledFor"
                ? caseActivities.scheduledFor
                : sortBy === "completedAt"
                  ? caseActivities.completedAt
                  : caseActivities.createdAt; // Default to createdAt

    // Base select query
    const baseQuery = db.select().from(caseActivities);

    // Build the main query
    let finalQuery = baseQuery;
    if (filters.length > 0) {
      finalQuery = baseQuery.where(...filters);
    }

    const orderedQuery = finalQuery.orderBy(
      sortOrder === "asc" ? orderColumn : desc(orderColumn),
    );

    const activityResults = await orderedQuery.limit(limit).offset(offset);

    // Get total count for pagination
    const baseCountQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(caseActivities);

    let finalCountQuery = baseCountQuery;
    if (filters.length > 0) {
      finalCountQuery = baseCountQuery.where(...filters);
    }

    const totalCountResult = await finalCountQuery;
    const totalCount = totalCountResult[0]?.count ?? 0;

    return json({
      activities: activityResults,
      totalCount,
      hasMore: offset + limit < totalCount,
      pagination: {
        limit,
        offset,
        total: totalCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching activities:", error);
    return json({ error: "Failed to fetch activities" }, { status: 500 });
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
    if (!data.caseId || !data.title || !data.activityType) {
      return json(
        { error: "Case ID, title, and activity type are required" },
        { status: 400 },
      );
    }
    // Map frontend data to schema fields
    const activityData = {
      caseId: data.caseId,
      activityType: data.activityType,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      status: data.status || "pending",
      priority: data.priority || "medium",
      assignedTo: data.assignedTo || null,
      relatedEvidence: data.relatedEvidence || [],
      relatedCriminals: data.relatedCriminals || [],
      metadata: data.metadata || {},
      createdBy: locals.user.id,
    };

    const [newActivity] = await db
      .insert(caseActivities)
      .values(activityData)
      .returning();

    return json(newActivity, { status: 201 });
  } catch (error: any) {
    console.error("Error creating activity:", error);
    return json({ error: "Failed to create activity" }, { status: 500 });
  }
};
