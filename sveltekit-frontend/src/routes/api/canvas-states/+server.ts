
import { canvasLayouts } from "$lib/server/db/schema-canvas";
import type { RequestEvent } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db/index";
import type { RequestHandler } from './$types.js';
import { URL } from "url";


export async function GET({ url, locals }: RequestEvent): Promise<any> {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const caseId = url.searchParams.get("caseId");
    const canvasId = url.searchParams.get("id");
    const search = url.searchParams.get("search") || "";
    const isTemplate = url.searchParams.get("isTemplate");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const sortBy = url.searchParams.get("sortBy") || "updatedAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    if (canvasId) {
      // Get specific canvas state
      const [canvasState] = await db
        .select()
        .from(canvasLayouts)
        .where(eq(canvasLayouts.id, canvasId))
        .limit(1);

      if (!canvasState) {
        return json({ error: "Canvas state not found" }, { status: 404 });
      }
      return json(canvasState);
    } else {
      // Build filters
      const filters: any[] = [];

      // Add case filter
      if (caseId) {
        filters.push(eq(canvasLayouts.caseId, caseId));
      }
      // Add search filter
      if (search) {
        filters.push(like(canvasLayouts.name, `%${search}%`));
      }
      // Add template filter
      if (isTemplate !== null) {
        filters.push(eq(canvasLayouts.isDefault, isTemplate === "true"));
      }

      // Determine the column for sorting
      const orderColumn =
        sortBy === "name"
          ? canvasLayouts.name
          : sortBy === "createdAt"
            ? canvasLayouts.createdAt
            : canvasLayouts.updatedAt; // Default to updatedAt

      // Build the main query properly to avoid TypeScript issues
      const canvasStateList = await db
        .select()
        .from(canvasLayouts)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(sortOrder === "asc" ? orderColumn : desc(orderColumn))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(canvasLayouts)
        .where(filters.length > 0 ? and(...filters) : undefined);
      const totalCount = totalCountResult[0]?.count || 0;

      return json({
        canvasStates: canvasStateList,
        totalCount,
        hasMore: offset + limit < totalCount,
        pagination: {
          limit,
          offset,
          total: totalCount,
        },
      });
    }
  } catch (error: any) {
    console.error("Error fetching canvas states:", error);
    return json({ error: "Failed to fetch canvas states" }, { status: 500 });
  }
}
export async function POST({ request, locals }: RequestEvent): Promise<any> {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.layoutData) {
      return json(
        { error: "Name and layout data are required" },
        { status: 400 },
      );
    }
    const canvasStateData = {
      caseId: data.caseId || null,
      name: data.name.trim(),
      layoutData: data.layoutData,
      description: data.description || null,
      isDefault: data.isDefault || false,
      createdBy: locals.user.id,
    };

    const [newCanvasState] = await db
      .insert(canvasLayouts)
      .values(canvasStateData)
      .returning();

    return json(newCanvasState, { status: 201 });
  } catch (error: any) {
    console.error("Error creating canvas state:", error);
    return json({ error: "Failed to create canvas state" }, { status: 500 });
  }
}
export async function PUT({ request, locals }: RequestEvent): Promise<any> {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const data = await request.json();

    if (!data.id) {
      return json({ error: "Canvas state ID is required" }, { status: 400 });
    }
    // Check if canvas state exists
    const existingCanvasState = await db
      .select()
      .from(canvasLayouts)
      .where(eq(canvasLayouts.id, data.id))
      .limit(1);

    if (!existingCanvasState.length) {
      return json({ error: "Canvas state not found" }, { status: 404 });
    }
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Only update provided fields
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.layoutData !== undefined) updateData.layoutData = data.layoutData;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const [updatedCanvasState] = await db
      .update(canvasLayouts)
      .set(updateData)
      .where(eq(canvasLayouts.id, data.id))
      .returning();

    return json(updatedCanvasState);
  } catch (error: any) {
    console.error("Error updating canvas state:", error);
    return json({ error: "Failed to update canvas state" }, { status: 500 });
  }
}
export async function DELETE({ url, locals }: RequestEvent): Promise<any> {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const canvasId = url.searchParams.get("id");
    if (!canvasId) {
      return json({ error: "Canvas state ID is required" }, { status: 400 });
    }
    // Check if canvas state exists
    const existingCanvasState = await db
      .select()
      .from(canvasLayouts)
      .where(eq(canvasLayouts.id, canvasId))
      .limit(1);

    if (!existingCanvasState.length) {
      return json({ error: "Canvas state not found" }, { status: 404 });
    }
    // Delete the canvas state
    const [deletedCanvasState] = await db
      .delete(canvasLayouts)
      .where(eq(canvasLayouts.id, canvasId))
      .returning();

    return json({ success: true, deletedCanvasState });
  } catch (error: any) {
    console.error("Error deleting canvas state:", error);
    return json({ error: "Failed to delete canvas state" }, { status: 500 });
  }
}
// PATCH endpoint for partial updates
export async function PATCH({ request, url, locals }: RequestEvent): Promise<any> {
  try {
    if (!locals.user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }
    const canvasId = url.searchParams.get("id");
    if (!canvasId) {
      return json({ error: "Canvas state ID is required" }, { status: 400 });
    }
    const data = await request.json();

    // Check if canvas state exists
    const existingCanvasState = await db
      .select()
      .from(canvasLayouts)
      .where(eq(canvasLayouts.id, canvasId))
      .limit(1);

    if (!existingCanvasState.length) {
      return json({ error: "Canvas state not found" }, { status: 404 });
    }
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Handle specific patch operations
    if (data.operation === "setAsDefault") {
      // First, unset all other default canvases for this case
      if (existingCanvasState[0].caseId) {
        await db
          .update(canvasLayouts)
          .set({ isDefault: false })
          .where(eq(canvasLayouts.caseId, existingCanvasState[0].caseId));
      }
      updateData.isDefault = true;
    } else if (data.operation === "updateData") {
      updateData.layoutData = data.layoutData;
    } else {
      // Regular field updates
      Object.keys(data).forEach((key) => {
        if (key !== "operation") {
          updateData[key] = data[key];
        }
      });
    }
    const [updatedCanvasState] = await db
      .update(canvasLayouts)
      .set(updateData)
      .where(eq(canvasLayouts.id, canvasId))
      .returning();

    return json(updatedCanvasState);
  } catch (error: any) {
    console.error("Error patching canvas state:", error);
    return json({ error: "Failed to update canvas state" }, { status: 500 });
  }
}
