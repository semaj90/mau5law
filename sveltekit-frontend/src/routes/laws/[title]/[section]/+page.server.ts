/**
 * Statute Detail Page Server
 * Loads statute and chunks for display
 */

import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { statutes, statuteChunks } from '$lib/server/db/schema-postgres';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  try {
    const { title, section } = params;

    // Find statute by title and section
    const statuteRecords = await db
      .select()
      .from(statutes)
      .where(
        and(
          eq(statutes.title, `${title} U.S.C. § ${section}`),
          eq(statutes.jurisdiction, 'US-Federal')
        )
      );

    if (statuteRecords.length === 0) {
      throw error(404, `Statute ${title} U.S.C. § ${section} not found`);
    }

    const statute = statuteRecords[0];

    // Get chunks for this statute
    const chunks = await db
      .select()
      .from(statuteChunks)
      .where(eq(statuteChunks.statuteId, statute.id));

    return {
      statute: {
        id: statute.id,
        title: statute.title,
        section: statute.section,
        content: statute.content,
        jurisdiction: statute.jurisdiction,
        category: statute.category,
        sourceUrl: statute.sourceUrl,
      },
      chunks: chunks.map((c) => ({
        id: c.id,
        index: c.chunkIndex,
        content: c.content,
      })),
    };
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    throw error(500, 'Failed to load statute');
  }
};
