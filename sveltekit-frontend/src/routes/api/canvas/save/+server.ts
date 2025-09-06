import { json } from "@sveltejs/kit";
import { loki } from "$lib/stores/lokiStore";
import type { RequestHandler } from './$types';


export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { canvasState, reportId } = await request.json();

    if (!canvasState || !reportId) {
      return json(
        { error: "Canvas state and report ID are required" },
        { status: 400 },
      );
    }
    // Validate canvas state structure
    if (!canvasState.id || !canvasState.data) {
      return json({ error: "Invalid canvas state format" }, { status: 400 });
    }
    // Add metadata
    const enhancedCanvasState = {
      ...canvasState,
      reportId,
      updatedAt: new Date().toISOString(),
      updatedBy: locals.user?.id || "anonymous",
    };

    // Save to Loki.js (in production this would save to PostgreSQL)
    await loki.saveCanvasState(enhancedCanvasState);

    return json({
      success: true,
      canvasState: enhancedCanvasState,
    });
  } catch (error: any) {
    console.error("Canvas save error:", error);
    return json({ error: "Failed to save canvas state" }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const canvasId = url.searchParams.get("id");
    const reportId = url.searchParams.get("reportId");

    if (!canvasId && !reportId) {
      return json(
        { error: "Canvas ID or Report ID is required" },
        { status: 400 },
      );
    }
    let canvasState;

    if (canvasId) {
      canvasState = await loki.getCanvasState(canvasId);
    } else if (reportId) {
      // Get the latest canvas state for a report
      const allStates = await loki.getAllCanvasStates();
      const reportStates = allStates
        .filter((state: any) => state.reportId === reportId)
        .sort(
          (a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      canvasState = reportStates[0] || null;
    }
    if (!canvasState) {
      return json({ error: "Canvas state not found" }, { status: 404 });
    }
    return json({ canvasState });
  } catch (error: any) {
    console.error("Canvas load error:", error);
    return json({ error: "Failed to load canvas state" }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  try {
    const { canvasId } = await request.json();

    if (!canvasId) {
      return json({ error: "Canvas ID is required" }, { status: 400 });
    }
    const canvasState = await loki.getCanvasState(canvasId);
    if (!canvasState) {
      return json({ error: "Canvas state not found" }, { status: 404 });
    }
    // Check permissions (basic check - in production would be more sophisticated)
    if (
      canvasState.updatedBy !== locals.user?.id &&
      locals.user?.role !== "admin"
    ) {
      return json({ error: "Insufficient permissions" }, { status: 403 });
    }
    await loki.deleteCanvasState(canvasId);

    return json({ success: true });
  } catch (error: any) {
    console.error("Canvas delete error:", error);
    return json({ error: "Failed to delete canvas state" }, { status: 500 });
  }
};
