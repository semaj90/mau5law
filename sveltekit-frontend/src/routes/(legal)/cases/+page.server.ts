import { dev } from '$app/environment';

/**
 * Server-side data loader for legal cases page
 * Supports DEV_BYPASS_AUTH for testing without authentication
 */
export const load = (async ({ locals, fetch }) => {
  // Development bypass for testing
  const devBypass = dev && (process.env.DEV_BYPASS_AUTH === 'true' || import.meta.env.DEV_BYPASS_AUTH === 'true');

  let user = locals.user;
  let session = locals.session;

  // Create development fallback user if no auth detected
  if (devBypass && !user) {
    console.warn('🔓 DEV_BYPASS_AUTH: Creating stub user for development testing');
    user = {
      id: 'dev-user-001',
      email: 'dev@localhost',
      name: 'Development Tester',
      role: 'prosecutor'
    } as any;

    session = {
      id: 'dev-session-001',
      userId: 'dev-user-001',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    } as any;
  }

  // Attempt to fetch cases (will use DEV_BYPASS_AUTH in API as well)
  let cases: any[] = [];
  let error: string | null = null;

  try {
    const response = await fetch('/api/cases');

    if (response.ok) {
      const data = await response.json();
      cases = data.data?.cases || [];
    } else if (response.status === 401 && devBypass) {
      // Auth error in dev mode - still allow page to load
      console.warn('🔓 DEV_BYPASS_AUTH: API returned 401, but continuing in dev mode');
      error = 'Authentication required (bypassed in dev mode)';
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Failed to load cases' }));
      error = errorData.error || errorData.message || 'Failed to load cases';
    }
  } catch (err) {
    console.error('Failed to load cases:', err);
    error = err instanceof Error ? err.message : 'Error loading cases';
  }

  return {
    user,
    session,
    cases,
    error,
    devMode: dev,
    devBypassActive: devBypass
  };
}) satisfies import('./$types').PageServerLoad;
