import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Require authentication to access dashboard
  if (!locals.user || !locals.session) {
    throw redirect(303, '/login');
  }

  return {
    user: locals.user,
    session: locals.session,
  };
};
