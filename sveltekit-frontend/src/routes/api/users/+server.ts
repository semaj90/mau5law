
import { users } from "$lib/server/db/schema-postgres";
import { json } from "@sveltejs/kit";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
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
    const role = url.searchParams.get("role") || "";
    const isActive = url.searchParams.get("isActive");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    // Build query with filters
    let query = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Exclude sensitive fields like hashedPassword
      })
      .from(users);

    const filters = [];

    // Add search filter
    if (search) {
      filters.push(
        or(
          like(users.name, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
          like(users.email, `%${search}%`),
        ),
      );
    }
    // Add role filter
    if (role) {
      filters.push(eq(users.role, role));
    }
    // Add active status filter
    if (isActive !== null) {
      filters.push(eq(users.isActive, isActive === "true"));
    }
    // Build query with filters
    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    // Add sorting
    const orderColumn =
      sortBy === "name"
        ? users.name
        : sortBy === "email"
          ? users.email
          : sortBy === "role"
            ? users.role
            : sortBy === "updatedAt"
              ? users.updatedAt
              : users.createdAt;

    const userResults = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(sortOrder === "asc" ? orderColumn : desc(orderColumn))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);
    const totalCount = totalCountResult[0]?.count || 0;

    return json({
      users: userResults,
      totalCount,
      hasMore: offset + limit < totalCount,
      pagination: {
        limit,
        offset,
        total: totalCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return json({ error: "Failed to fetch users" }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    // Check if user has admin privileges
    if (locals.user.role !== "admin" && locals.user.role !== "prosecutor") {
      return json({ error: "Insufficient permissions" }, { status: 403 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const data = await request.json();

    // Validate required fields
    if (!data.email || !data.password) {
      return json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }
    // Check if email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      return json({ error: "Email already exists" }, { status: 409 });
    }
    // Hash password (you should use proper password hashing)
    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Map frontend data to schema fields
    const userData = {
      email: data.email.trim().toLowerCase(),
      hashedPassword,
      name: data.name?.trim() || null,
      firstName: data.firstName?.trim() || null,
      lastName: data.lastName?.trim() || null,
      role: data.role || "prosecutor",
      isActive: data.isActive !== undefined ? data.isActive : true,
      avatarUrl: data.avatarUrl?.trim() || null,
    };

    const [newUser] = await db.insert(users).values(userData).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

    return json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return json({ error: "Failed to create user" }, { status: 500 });
  }
};
