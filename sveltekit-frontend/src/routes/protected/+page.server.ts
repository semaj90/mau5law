import { requireAuth } from '$lib/server/auth';
import { error } from '@sveltejs/kit';

export async function load(event) {
  try {
    // This will throw an error if user is not authenticated
    const { user, session } = await requireAuth(event);

    return {
      user: user,
      session: {
        id: session.id,
        fresh: session.fresh,
        expiresAt: session.expiresAt
      }
    };
  } catch (err) {
    // Redirect to login if not authenticated
    throw error(401, 'Authentication required');
  }
}