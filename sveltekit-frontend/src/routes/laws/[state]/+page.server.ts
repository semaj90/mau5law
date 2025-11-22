import { db } from '$lib/server/db/drizzle';
import { laws, lawSections } from '$lib/server/db/schema/legal-index';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
  try {
    const state = params.state.toUpperCase();
    console.log('[Laws State] Loading statutes for state:', state);

    // Get all codes for this state
    const codes = await db
      .select()
      .from(laws)
      .where(eq(laws.jurisdiction, state))
      .orderBy(laws.codeAbbrev);

    if (codes.length === 0) {
      console.warn('[Laws State] No codes found for state:', state);
      return {
        state,
        codes: [],
        error: 'No statutes found for this jurisdiction',
      };
    }

    // Get section counts for each code
    const codesWithCounts = await Promise.all(
      codes.map(async (code) => {
        const sections = await db
          .select()
          .from(lawSections)
          .where(eq(lawSections.lawId, code.id));

        return {
          ...code,
          sectionCount: sections.length,
        };
      })
    );

    console.log('[Laws State] Loaded codes:', codesWithCounts.length);

    return {
      state,
      codes: codesWithCounts,
    };
  } catch (error) {
    console.error('[Laws State] Error loading statutes:', error);
    return {
      state: params.state.toUpperCase(),
      codes: [],
      error: 'Failed to load statutes',
    };
  }
}
