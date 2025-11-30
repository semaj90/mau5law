/**
 * Loader for Command Center Routes Page
 * Fetches all routes from the API
 */
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/api/routes/all');
  const data = await res.json();
  return {
    routes: data.routes,
    stats: data.stats
  };
};
