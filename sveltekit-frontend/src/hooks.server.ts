// src/hooks.server.ts - SvelteKit 2 hooks with production-ready error handling
import type { Handle } from '@sveltejs/kit';

// SvelteKit 2 compatible: Dynamic auth and route config imports with fallback
let lucia: any = null;
let authEnabled = false;
let legacyRouteMapping: Record<string, string> = {};

// Load auth system with comprehensive error handling
async function initializeAuth() {
  if (authEnabled) return { lucia, enabled: true };

  try {
    console.log('🔍 [hooks.server] Attempting to load auth module...');
    const authModule = await import('$lib/server/auth');
    lucia = authModule.lucia;
    authEnabled = true;
    console.log('✅ [hooks.server] Lucia auth initialized');
    return { lucia, enabled: true };
  } catch (error) {
    console.error('❌ [hooks.server] Auth module failed to load:', error);
    console.warn('⚠️ [hooks.server] Auth unavailable, continuing without authentication');
    return { lucia: null, enabled: false };
  }
}

// Load legacy route mappings
async function loadRouteConfig() {
  try {
    console.log('🔍 [hooks.server] Attempting to load route config...');
    const routeConfig = await import('$lib/data/route-groups-config');
    legacyRouteMapping = routeConfig.legacyRouteMapping || {};
    console.log('✅ [hooks.server] Route mappings loaded');
  } catch (error) {
    console.error('❌ [hooks.server] Route config failed to load:', error);
    console.warn('⚠️ [hooks.server] Route config unavailable');
    legacyRouteMapping = {};
  }
}

// Initialize on first request
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    console.log('🚀 [hooks.server] Starting initialization...');
    try {
      await Promise.all([initializeAuth(), loadRouteConfig()]);
      initialized = true;
      console.log('✅ [hooks.server] All systems initialized successfully');
    } catch (error) {
      console.error('❌ [hooks.server] CRITICAL: Initialization failed:', error);
      throw error; // Re-throw to see full stack trace
    }
  }
}

interface DatabaseUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  name: string | null;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Ensure all systems are initialized
  try {
    await ensureInitialized();
  } catch (initError) {
    console.error('❌ [hooks.server] FATAL: Cannot initialize hooks:', initError);
    // Allow request to proceed even if initialization fails
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const url = event.url;
  const pathname = url.pathname;

  // Handle legacy route redirects (SvelteKit 2 compatible)
  if (legacyRouteMapping[pathname]) {
    const newRoute = legacyRouteMapping[pathname];
    console.log(`🔄 Redirecting: ${pathname} → ${newRoute}`);

    const searchParams = url.searchParams.toString();
    const redirectUrl = searchParams ? `${newRoute}?${searchParams}` : newRoute;

    return new Response(null, {
      status: 301,
      headers: { location: redirectUrl },
    });
  }

  // Production-ready auth handling with comprehensive error recovery
  try {
    if (!authEnabled || !lucia) {
      // No auth available - set defaults and continue
      event.locals.user = null;
      event.locals.session = null;
      return resolve(event);
    }

    const sessionId = event.cookies.get(lucia.sessionCookieName);

    if (!sessionId) {
      event.locals.user = null;
      event.locals.session = null;
      return resolve(event);
    }

    // Validate session with nested error handling
    let session = null;
    let user = null;

    try {
      const result = await lucia.validateSession(sessionId);
      session = result.session;
      user = result.user;
    } catch (validationError) {
      console.warn('⚠️ Session validation failed:', validationError);

      // Clear invalid session
      try {
        const sessionCookie = lucia.createBlankSessionCookie();
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
          path: '/',
          ...sessionCookie.attributes,
        });
      } catch (cookieError) {
        console.error('❌ Failed to clear session cookie:', cookieError);
      }

      event.locals.user = null;
      event.locals.session = null;
      return resolve(event);
    }

    // Update fresh session cookie
    if (session?.fresh) {
      try {
        const sessionCookie = lucia.createSessionCookie(session.id);
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
          path: '/',
          ...sessionCookie.attributes,
        });
      } catch (cookieError) {
        console.warn('⚠️ Failed to set fresh session cookie:', cookieError);
      }
    }

    // Clear expired session
    if (!session) {
      try {
        const sessionCookie = lucia.createBlankSessionCookie();
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
          path: '/',
          ...sessionCookie.attributes,
        });
      } catch (cookieError) {
        console.warn('⚠️ Failed to clear expired session:', cookieError);
      }
    }

    // Set user and session in locals
    event.locals.user = user
      ? {
          id: user.id,
          email: user.email,
          role:
            ((user as DatabaseUser).role as
              | 'admin'
              | 'lead_prosecutor'
              | 'prosecutor'
              | 'paralegal'
              | 'investigator'
              | 'analyst'
              | 'viewer'
              | 'user') || 'user',
        }
      : null;
    event.locals.session = session;
  } catch (authError) {
    // Global auth error fallback - allow request to proceed
    console.error('❌ Auth system error, proceeding without authentication:', authError);
    event.locals.user = null;
    event.locals.session = null;
  }

  return resolve(event);
};
