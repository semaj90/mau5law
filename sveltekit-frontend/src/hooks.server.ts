import type { Handle } from '@sveltejs/kit';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';
import { handleHooks } from '@lucia-auth/sveltekit';
import { auth } from '$lib/server/auth';

// Lazy singletons initialized at module load so endpoints can reuse them
type PgConnection = ReturnType<typeof postgres> | null;
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
  // postgres() returns a client factory; cast via unknown to avoid blanket `any`
  _pgConnection = postgres(connStr, { max: 10 } as unknown) as unknown as PgConnection;
  try {
    // drizzle accepts the postgres connection; keep the value typed as unknown and
    // only assign if drizzle returns a truthy object. This avoids using `any`.
    const maybeDb = drizzle(_pgConnection as unknown as any);
    _db = maybeDb ?? null;
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
  // Provide typed alias for SvelteKit; some projects prefer App.Locals - keep both minimal
  namespace App {
    interface Locals extends AppLocals {}
  }
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
  if (rabbitMQInitialized) return { initialized: true };

  try {
    console.log('🐰 [hooks.server] Initializing RabbitMQ connection...');
    const { rabbitmqService } = await import('$lib/server/messaging/rabbitmq-service');
    await rabbitmqService.connect();
    rabbitMQInitialized = true;
    console.log('✅ [hooks.server] RabbitMQ connected successfully');
    return { initialized: true };
  } catch (error) {
    console.error('⚠️  [hooks.server] RabbitMQ failed to initialize:', error);
    console.warn('📝 [hooks.server] RabbitMQ will auto-connect on first use');
    return { initialized: false };
  }
}

// Load auth system with comprehensive error handling
async function initializeAuth() {
  if (authEnabled) return { lucia, enabled: true };

  try {
    console.log('[hooks.server] Loading auth module...');
    const authModule = await import('$lib/server/auth');
    // authModule may be ESM; narrow unknown via basic checks instead of `any`
    const maybeAuthModule = authModule as unknown;
    if (maybeAuthModule && typeof (maybeAuthModule as any).lucia === 'object') {
      lucia = (maybeAuthModule as any).lucia as unknown as LuciaAuth;
    } else {
      lucia = null;
    }
    authEnabled = true;
    console.log('[hooks.server] Auth module loaded');
    return { lucia, enabled: true };
  } catch (error) {
    // Try to log the error to Redis, but don't let logging failure break auth fallback
    try {
      const { logErrorToRedis } = await import('$lib/server/logging/redis-logger');
      await logErrorToRedis({
        source: 'hooks.server',
        level: 'error',
        event: 'auth_load_failed',
        message: 'Auth module failed to load',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    } catch (logErr: unknown) {
      console.error('[hooks.server] Failed to log error to Redis:', logErr);
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
    if (maybeRC && typeof (maybeRC as any).legacyRouteMapping === 'object') {
      legacyRouteMapping = (maybeRC as any).legacyRouteMapping as Record<string, string>;
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
    console.log('🚀 [hooks.server] Starting initialization...');
    try {
      await Promise.all([initializeAuth(), loadRouteConfig(), initializeRabbitMQ()]);
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
    // Global auth error fallback - allow request to proceed
    console.error('❌ Auth system error, proceeding without authentication:', authError);
    event.locals.user = null;
    event.locals.session = null;
  }

  return resolve(event);
};

export { _db as db, _pgConnection as pgConnection, _redis as redis, handle };
