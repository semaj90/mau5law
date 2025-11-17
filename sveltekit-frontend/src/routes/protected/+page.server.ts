import { requireAuth } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/server/auth';
import { error } from '@sveltejs/kit';

export async function load(event): Promise<any> {
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
