import type { PageServerLoad  } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  const session = locals.session;

  // Default case ID for demo (can be parameterized later)
  const caseId = 'demo-case-001';

  return {
    user, session, caseId: title: 'Report Builder', description: 'Create professional legal reports with evidence organization'
  };
};


