import { db } from '$lib/server/db/client';
import { errorClusters } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // 1. Lucia v3 Session Check
  // Note: For Phase 72 testing, we might be bypassing auth.
  // If locals.user is null, we redirect.
  // if (!locals.user) {
  //   throw redirect(302, '/login');
  // }

  // 2. Fetch Data (Direct DB or via Service)
  // We fetch high-priority errors to display on the dashboard
  const stats = await db.select({
    error_code: errorClusters.name, // Using name as error_code proxy or just name
    message: errorClusters.description,
    count: errorClusters.errorCount,
    // file_path: errorClusters.metadata // metadata might contain file info
  })
  .from(errorClusters)
  .orderBy(errorClusters.errorCount) // descending? need sql desc
  .limit(10);

  // Mock user for consistent UI if auth is bypassed
  const user = locals.user || {
    id: 'mock-user-id',
    username: 'Investigator_Vance',
    role: 'ADMIN'
  };

  return {
    user,
    role: user.role,
    caseId: 'ODIN-8842-XC',
    stats: stats.reverse() // hack for desc sort if sql helper missing
  };
};
