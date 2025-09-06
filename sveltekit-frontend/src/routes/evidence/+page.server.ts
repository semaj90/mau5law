
import { evidence } from "$lib/server/db/schema-unified";
import { error, fail } from "@sveltejs/kit";
import { helpers } from "$lib/server/db";
import { zod } from "sveltekit-superforms/adapters";
import { db } from "$lib/server/db/index";
import type { PageServerLoad } from './$types.js';
import { z } from "zod";
import { URL } from "url";

// Schema for validating evidence form data
const evidenceSchema = z.object({
  id: z.string().optional(),
  caseId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["document", "image", "video", "audio", "other"]),
  url: z.string().url("Must be a valid URL").optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export const load: PageServerLoad = async ({ url, locals }) => {
  const user = locals.user;
  if (!user) {
    throw error(401, "Authentication required");
  }

  try {
    // Get case ID from URL params or default to user's cases
    const caseId = url.searchParams.get("caseId");

    let evidenceData;
    if (caseId) {
      evidenceData = await db.select()
        .from(evidence)
        .where(helpers.and(
          helpers.eq(evidence.caseId, caseId) as any,
          helpers.eq(evidence.userId, user.id) as any
        ) as any);
    } else {
      evidenceData = await db.select()
        .from(evidence)
        .where(helpers.eq(evidence.userId, user.id) as any)
        .limit(50);
    }

    return {
      evidence: evidenceData,
      caseId,
      user
    };
  } catch (err: any) {
    console.error("Failed to load evidence:", err);
    throw error(500, "Failed to load evidence data");
  }
};