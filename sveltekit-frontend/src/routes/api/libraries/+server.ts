
import type { RequestHandler } from './$types.js';

/**
 * Library Sync API Endpoints - Step 6 & 7 Integration
 */


import { librarySyncService } from "$lib/services/library-sync-service";
import { URL } from "url";

// GET /api/libraries - Search libraries
export const GET: RequestHandler = async ({ url }) => {
  try {
    const query = url.searchParams.get("q") || "";
    const source = url.searchParams.get("source") as
      | "github"
      | "context7"
      | "npm"
      | undefined;

    const libraries = await librarySyncService.searchLibraries(query, source);

    return json({
      success: true,
      libraries,
      count: libraries.length,
    });
  } catch (error: any) {
    console.error("Failed to search libraries:", error);
    return json(
      {
        success: false,
        error: "Failed to search libraries",
      },
      { status: 500 }
    );
  }
};

// POST /api/libraries/sync - Trigger manual sync
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { source } = await request.json();

    if (source === "github") {
      await librarySyncService.syncGitHubLibraries();
    } else if (source === "context7") {
      await librarySyncService.syncContext7Libraries();
    } else if (source === "npm") {
      await librarySyncService.syncNpmLibraries();
    } else {
      await librarySyncService.syncAllLibraries();
    }

    return json({
      success: true,
      message: `Libraries synced successfully${source ? ` for ${source}` : ""}`,
    });
  } catch (error: any) {
    console.error("Failed to sync libraries:", error);
    return json(
      {
        success: false,
        error: "Failed to sync libraries",
      },
      { status: 500 }
    );
  }
};
