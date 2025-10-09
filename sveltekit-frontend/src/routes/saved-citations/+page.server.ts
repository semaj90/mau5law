import type { PageServerLoad } from './$types.js';
import { getSavedCitationsForUser } from '$lib/server/services/savedCitationsService';

import { getUserId } from '$lib/server/auth/utils';
type Citation = {
  id: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
  category: string;
  isFavorite: boolean;
  notes?: string;
  savedAt: string; // ISO string for safe serialization
  contextData?: Record<string, string>;
};

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    return {
      savedCitations: [] as Citation[],
      user: null,
    };
  }
  try {
    // try DB-backed fetch
    const citations = await getSavedCitationsForUser(String(getUserId(locals)));
    // if DB returns nothing, fall back to lightweight mock (keeps API stable)
    const savedCitations =
      citations && citations.length > 0
        ? citations
        : ([
            {
              id: '1',
              title: 'Fourth Amendment Search and Seizure',
              content:
                'The right of the people to be secure in their persons, houses, papers, and effects, against unreasonable searches and seizures, shall not be violated...',
              source: 'U.S. Constitution, Amendment IV',
              tags: ['constitutional-law', 'search-seizure', 'evidence'],
              category: 'constitutional',
              isFavorite: true,
              notes: 'Key precedent for evidence admissibility',
              savedAt: new Date('2024-01-15').toISOString(),
              contextData: { reportId: 'report-123', caseId: 'case-456' },
            },
            {
              id: '2',
              title: 'Miranda Rights Requirement',
              content:
                'You have the right to remain silent. Anything you say can and will be used against you in a court of law...',
              source: 'Miranda v. Arizona, 384 U.S. 436 (1966)',
              tags: ['miranda', 'interrogation', 'rights'],
              category: 'case-law',
              isFavorite: false,
              notes: 'Must be read before custodial interrogation',
              savedAt: new Date('2024-01-10').toISOString(),
              contextData: { reportId: 'report-124', caseId: 'case-456' },
            },
          ] as Citation[]);
    return {
      savedCitations,
      user: locals.user,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error loading saved citations:', message);
    return {
      savedCitations: [] as Citation[],
      user: locals.user,
      error: 'Failed to load saved citations',
    };
  }
};
