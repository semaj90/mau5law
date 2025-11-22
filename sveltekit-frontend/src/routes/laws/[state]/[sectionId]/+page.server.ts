import { db } from '$lib/server/db/drizzle';
import { lawSections } from '$lib/server/db/schema/legal-index';
import { eq } from 'drizzle-orm';
import { searchCases } from '$lib/client/search-client';

export async function load({ params }) {
  try {
    const sectionId = params.sectionId;
    console.log('[Statute Detail] Loading statute:', sectionId);

    // Get statute section
    const section = await db
      .select()
      .from(lawSections)
      .where(eq(lawSections.id, sectionId))
      .then((results) => results[0]);

    if (!section) {
      console.warn('[Statute Detail] Statute not found:', sectionId);
      return {
        error: 'Statute not found',
      };
    }

    // Search for related cases
    let relatedCases = [];
    try {
      const caseResults = await searchCases({
        query: section.fullCitation,
        limit: 5,
      });
      relatedCases = caseResults.chunks || [];
    } catch (error) {
      console.warn('[Statute Detail] Error searching related cases:', error);
    }

    console.log('[Statute Detail] Loaded statute with', relatedCases.length, 'related cases');

    return {
      section,
      relatedCases,
    };
  } catch (error) {
    console.error('[Statute Detail] Error loading statute:', error);
    return {
      error: 'Failed to load statute',
    };
  }
}
