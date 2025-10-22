import type { Handle } from '@sveltejs/kit';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';
import { initBackends } from '$lib/server/init/backends';
// Avoid static import of lucia/sveltekit integration at top-level to prevent
// module resolution errors during Vite SSR/hot reload. We'll lazy-import when needed.

// Replace the earlier PgConnection/DrizzleDB definitions with properly typed aliases
type PostgresClient = ReturnType<typeof postgres>;
type PostgresOptions = Parameters<typeof postgres>[1];
type PgConnection = PostgresClient | null;
type DrizzleDB = ReturnType<typeof drizzle> | null;
let _pgConnection: PgConnection = null;
let _db: DrizzleDB = null;
let _redis: Redis | null = null;

function initPostgres() {
  if (_pgConnection) return _pgConnection;
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
  const database = process.env.POSTGRES_DB || 'legal_ai_db';
  const user = process.env.POSTGRES_USER || 'legal_admin';
  const password = process.env.POSTGRES_PASSWORD || '123456';
  const connStr = process.env.DATABASE_URL || `postgres://${user}:${password}@${host}:${port}/${database}`;

  // Use the proper inferred options type instead of casting to `unknown`
  _pgConnection = postgres(connStr, { max: 10 } as PostgresOptions);

  try {
    // Null-check the client and pass it directly to drizzle (no `any` cast)
    if (_pgConnection) {
      _db = drizzle(_pgConnection);
    } else {
      _db = null;
    }
  } catch (e: unknown) {
    // drizzle can be optional depending on environment; swallow and allow direct pg usage
    _db = null;
  }
  return _pgConnection;
}

function initRedis() {
  if (_redis) return _redis;
  try {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    _redis = new Redis({ host, port });
  } catch (_e) {
    // ignore redis init failures; let consumers handle null
    _redis = null;
  }
  return _redis;
}

// Initialize at module import so hooks can attach them quickly (best-effort)
initPostgres();
initRedis();
initBackends();

// App.Locals augmentation so we can attach typed locals without `any`
// module augmentation for SvelteKit's App namespace
export {};
declare global {
  interface AppLocals {
    db: DrizzleDB | null;
    pg: PgConnection;
    redis: Redis | null;
    user?: { id: string; email?: string; role?: string } | null;
    session?: { id: string; fresh?: boolean } | null;
  }
}

// Add module augmentation using ES2015 module syntax
declare module '@sveltejs/kit' {
  interface Locals extends AppLocals {}
}

// Minimal Lucia auth surface used by this file
type SessionShape = { id: string; fresh?: boolean };
interface CookieShape {
  name: string;
  value: string;
  attributes?: Record<string, unknown>;
}
interface LuciaAuth {
  sessionCookieName: string;
  validateSession(sessionId: string): Promise<{ session: SessionShape | null; user: DatabaseUser | null }>;
  createBlankSessionCookie(): CookieShape;
  createSessionCookie(sessionId: string): CookieShape;
}

// SvelteKit 2 compatible: Dynamic auth and route config imports with fallback
let lucia: LuciaAuth | null = null;
let authEnabled = false;
let legacyRouteMapping: Record<string, string> = {};

// RabbitMQ service initialization
let rabbitMQInitialized = false;
async function initializeRabbitMQ() {
  // Keep this function lazy and resilient. Do not allow RabbitMQ failures to
  // crash the Vite dev server; callers should handle the initialized=false case.
  if (rabbitMQInitialized) return { initialized: true };

  try {
    console.log('🐰 [hooks.server] Attempting lazy RabbitMQ initialization...');
    const { rabbitmqService } = await import('$lib/server/messaging/rabbitmq-service');
    // Only attempt connect if the service exposes a connect() function
    if (rabbitmqService && typeof rabbitmqService.connect === 'function') {
      await rabbitmqService.connect();
      rabbitMQInitialized = true;
      console.log('✅ [hooks.server] RabbitMQ connected successfully');
      return { initialized: true };
    }
    console.warn('📝 [hooks.server] RabbitMQ service module loaded but connect() not available');
    return { initialized: false };
  } catch (error) {
    console.warn('⚠️ [hooks.server] Lazy RabbitMQ initialization failed (ignored during dev):', error);
    return { initialized: false };
  }
}

// Load auth system with comprehensive error handling
async function initializeAuth() {
  if (authEnabled) return { lucia, enabled: true };

  try {
    console.log('[hooks.server] Loading auth module...');
    const authModule = await import('$lib/server/auth');
    // Access the auth export (Lucia instance) from the module
    const maybeAuthModule = authModule as unknown;
    if (maybeAuthModule && typeof maybeAuthModule === 'object' && maybeAuthModule !== null) {
      // Look for 'auth' export which is the Lucia instance
      const candidate = (maybeAuthModule as { auth?: unknown }).auth;
      if (candidate && typeof candidate === 'object' && candidate !== null) {
        lucia = candidate as LuciaAuth;
      } else {
        lucia = null;
      }
    } else {
      lucia = null;
    }
    authEnabled = true;
    console.log('[hooks.server] Auth module loaded successfully');
    return { lucia, enabled: true };
  } catch (error) {
    // Try to log the error via structured logger, but don't let logging failure break auth fallback
    try {
      const { logStructuredError } = await import('$lib/server/logger');
      await logStructuredError({
        source: 'hooks.server',
        level: 'error',
        event: 'auth_load_failed',
        message: 'Auth module failed to load',
        error: error instanceof Error ? error.message : String(error),
      });
    } catch (logErr: unknown) {
      console.error('[hooks.server] Failed to log error to logger:', logErr);
    }

    console.error('❌ [hooks.server] Auth module failed to load:', error);
    console.warn('[hooks.server] Auth unavailable, continuing without authentication');
    return { lucia: null, enabled: false };
  }
}

// Load legacy route mappings
async function loadRouteConfig() {
  try {
    console.log('🔍 [hooks.server] Attempting to load route config...');
    const routeConfig = await import('$lib/data/route-groups-config');
    const maybeRC = routeConfig as unknown;

    // Narrow unknown -> object and check for property existence without using `any`
    if (maybeRC && typeof maybeRC === 'object' && 'legacyRouteMapping' in maybeRC) {
      const mapping = (maybeRC as { legacyRouteMapping?: unknown }).legacyRouteMapping;
      if (mapping && typeof mapping === 'object') {
        // Coerce all keys/values to strings to safely satisfy Record<string, string>
        const entries = Object.entries(mapping as Record<PropertyKey, unknown>).map(([k, v]) => [String(k), String(v)]);
        legacyRouteMapping = Object.fromEntries(entries) as Record<string, string>;
      } else {
        legacyRouteMapping = {};
      }
    } else {
      legacyRouteMapping = {};
    }
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
    console.log('🚀 [hooks.server] Starting initialization (auth + routes) ...');
    try {
      // Initialize auth and route config eagerly. RabbitMQ is expensive and
      // may not be present during local dev; initialize it lazily on demand.
      await Promise.all([initializeAuth(), loadRouteConfig()]);

      // Optionally initialize RabbitMQ at startup when explicitly requested
      if (process.env.INIT_RABBITMQ_ON_START === 'true') {
        // This keeps the original lazy behaviour unless the env var is set.
        await initializeRabbitMQ();
      }

      initialized = true;
      console.log('✅ [hooks.server] Core systems initialized successfully');
    } catch (error) {
      console.error('❌ [hooks.server] CRITICAL: Initialization failed:', error);
      throw error; // Re-throw to see full stack trace
    }
  }
}

interface DatabaseUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  isActive?: boolean;
  avatarUrl?: string | null;
  name?: string | null;
}

const handle: Handle = async ({ event, resolve }) => {
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

  // Dev bypass helper: populate locals.user when DEV_BYPASS_AUTH=true
  try {
    if (process.env.DEV_BYPASS_AUTH === 'true') {
      // lightweight dev stub user - must match shape used by app
      event.locals.user = {
        id: 'dev-user-1',
        email: 'dev@local.test',
        role: 'admin',
      };
      event.locals.session = { id: 'dev-session-1', fresh: true };
      return resolve(event);
    }
  } catch (e) {
    // ignore dev bypass errors and continue to normal flow
    console.warn('⚠️ [hooks.server] Dev bypass check failed:', e);
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

  // Attach db/redis singletons to event.locals for server endpoints (typed via App.Locals)
  event.locals.db = _db;
  event.locals.pg = _pgConnection;
  event.locals.redis = _redis;

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
    let session: SessionShape | null = null;
    let user: DatabaseUser | null = null;

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
            (user.role as
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
    try {
      const { logStructuredError } = await import('$lib/server/logger');
      await logStructuredError({
        source: 'hooks.server',
        level: 'error',
        event: 'auth_system_error',
        message: 'Auth system error, proceeding without authentication',
        error: authError instanceof Error ? authError.message : String(authError),
      });
    } catch (logErr: unknown) {
      console.error('[hooks.server] Failed to log auth error to logger:', logErr);
    }
    // Global auth error fallback - allow request to proceed
    console.error('❌ Auth system error, proceeding without authentication:', authError);
    event.locals.user = null;
    event.locals.session = null;
  }

  return resolve(event);
};

export { _db as db, _pgConnection as pgConnection, _redis as redis, handle };
