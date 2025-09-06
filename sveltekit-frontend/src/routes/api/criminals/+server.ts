import { json } from "@sveltejs/kit";
import { criminals } from "$lib/server/db/schema-postgres";
import { db } from "$lib/server/db/index";
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
    const search = url.searchParams.get("search") || "";
    const threatLevel = url.searchParams.get("threatLevel") || "";
    const status = url.searchParams.get("status") || "";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const sortBy = url.searchParams.get("sortBy") || "updatedAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    // Build query with filters
    let query = db.select().from(criminals);
    const filters = [];

    // Add search filter
    if (search) {
      filters.push(
        or(
          like(criminals.firstName, `%${search}%`),
          like(criminals.lastName, `%${search}%`),
          like(criminals.middleName, `%${search}%`),
          like(criminals.socialSecurityNumber, `%${search}%`),
          like(criminals.driversLicense, `%${search}%`),
        ),
      );
    }
    // Add threat level filter
    if (threatLevel) {
      filters.push(eq(criminals.threatLevel, threatLevel));
    }
    // Add status filter
    if (status) {
      filters.push(eq(criminals.status, status));
    }
    // Apply filters
    let finalQuery = db
      .select()
      .from(criminals)
      .where(filters.length > 0 ? and(...filters) : undefined);

    // Add sorting
    const orderColumn =
      sortBy === "firstName"
        ? criminals.firstName
        : sortBy === "lastName"
          ? criminals.lastName
          : sortBy === "threatLevel"
            ? criminals.threatLevel
            : sortBy === "status"
              ? criminals.status
              : criminals.createdAt; // Default to createdAt

    finalQuery = finalQuery.orderBy(
      sortOrder === "asc" ? orderColumn : desc(orderColumn),
    ) as any;

    // Add pagination
    finalQuery = finalQuery.limit(limit).offset(offset) as any;

    const criminalResults = await finalQuery;

    // Get total count for pagination
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(criminals);
    if (filters.length > 0) {
      countQuery = countQuery.where(and(...filters)) as any;
    }
    const totalCountResult = await countQuery;
    const totalCount = totalCountResult[0]?.count || 0;

    return json({
      criminals: criminalResults,
      totalCount,
      hasMore: offset + limit < totalCount,
      pagination: {
        limit,
        offset,
        total: totalCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching criminals:", error);
    return json({ error: "Failed to fetch criminals" }, { status: 500 });
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
    if (!data.firstName || !data.lastName) {
      return json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }
    // Map frontend data to schema fields
    const criminalData = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      middleName: data.middleName?.trim() || null,
      aliases: data.aliases || [],
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      placeOfBirth: data.placeOfBirth?.trim() || null,
      address: data.address?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      socialSecurityNumber: data.socialSecurityNumber?.trim() || null,
      driversLicense: data.driversLicense?.trim() || null,
      height: data.height ? Number(data.height) : null,
      weight: data.weight ? Number(data.weight) : null,
      eyeColor: data.eyeColor?.trim() || null,
      hairColor: data.hairColor?.trim() || null,
      distinguishingMarks: data.distinguishingMarks?.trim() || null,
      photoUrl: data.photoUrl?.trim() || null,
      fingerprints: data.fingerprints || {},
      threatLevel: data.threatLevel || "low",
      status: data.status || "active",
      notes: data.notes?.trim() || null,
      aiSummary: data.aiSummary?.trim() || null,
      aiTags: data.aiTags || [],
      createdBy: locals.user.id,
    };

    const [newCriminal] = await db
      .insert(criminals)
      .values(criminalData)
      .returning();

    return json(newCriminal, { status: 201 });
  } catch (error: any) {
    console.error("Error creating criminal record:", error);
    return json({ error: "Failed to create criminal record" }, { status: 500 });
  }
};
