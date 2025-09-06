import { json } from '@sveltejs/kit';

import { canvasStates } from "$lib/server/db/schema-postgres";
import { eq } from "drizzle-orm";
import { URL } from "url";
import type { RequestHandler } from './$types';


export const POST: RequestHandler = async ({ request }) => {
  try {
    const { caseId, canvasState, timestamp } = await request.json();

    if (!caseId || !canvasState) {
      return json(
        { error: "Case ID and canvas state are required" },
        { status: 400 },
      );
    }

    // Check if canvas state already exists for this case
    const existing = await db
      .select()
      .from(canvasStates)
      .where(eq(canvasStates.caseId, caseId))
      .limit(1);

    let result;

    if (existing.length > 0) {
      // Update existing canvas state
      [result] = await db
        .update(canvasStates)
        .set({
          canvasData: canvasState,
          updatedAt: new Date(),
          version: (existing[0].version || 1) + 1,
        })
        .where(eq(canvasStates.caseId, caseId))
        .returning();
    } else {
      // Create new canvas state
      [result] = await db
        .insert(canvasStates)
        .values({
          id: randomUUID(),
          caseId,
          name: `Canvas State ${new Date().toISOString()}`,
          canvasData: canvasState,
          version: 1,
          createdBy: null, // Set to actual user ID when available
        })
        .returning();
    }

    return json({
      success: true,
      canvasState: result,
      message: "Canvas state saved successfully",
    });
  } catch (error: any) {
    console.error("Canvas save error:", error);
    return json(
      {
        error: "Failed to save canvas state",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const caseId = url.searchParams.get("caseId");

    if (!caseId) {
      return json({ error: "Case ID is required" }, { status: 400 });
    }

    const canvasState = await db
      .select()
      .from(canvasStates)
      .where(eq(canvasStates.caseId, caseId))
      .limit(1);

    return json({
      canvasState: canvasState[0] || null,
    });
  } catch (error: any) {
    console.error("Canvas load error:", error);
    return json(
      {
        error: "Failed to load canvas state",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
