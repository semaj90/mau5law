import type { Handle } from '@sveltejs/kit';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { Redis as RedisInstance } from 'ioredis';
import createRedisAdapter from '$lib/server/adapters/redis-adapter';
import type { RedisCacheService } from '$lib/types/external-services';
import { initBackends } from '$lib/server/init/backends';
import { ensureRedisReady, redis as sharedRedis } from '$lib/server/redis-client';

// Initialize service discovery on server startup
import { initializeServer } from '$lib/server/init';
(async () => {
  try {
    await initializeServer();
  } catch (error) {
    console.error('[hooks.server.ts] Failed to initialize services:', error);
    // Don't exit - allow server to continue with fallback configurations
  }
})();
// Avoid static import of lucia/sveltekit integration at top-level to prevent
// module resolution errors during Vite SSR/hot reload. We'll lazy-import when needed.

// Replace the earlier PgConnection/DrizzleDB definitions with properly typed aliases
type PostgresClient = ReturnType<typeof postgres>;
type PostgresOptions = Parameters<typeof postgres>[1];
type PgConnection = PostgresClient | null;
type DrizzleDB = ReturnType<typeof drizzle> | null;
let _pgConnection: PgConnection = null;
let _db: DrizzleDB = null;
let _redis: RedisInstance | null = null;
let $redisAdapter: RedisCacheService | null = null;

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
    _redis = sharedRedis;
    _redis.on('error', (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (!errMsg.includes('AUTH') && !errMsg.includes('NOAUTH')) {
        console.warn('[hooks.server] Redis error:', errMsg);
      }
    });

    void ensureRedisReady();

    try {
      $redisAdapter = createRedisAdapter(_redis);
    } catch (e) {
      $redisAdapter = null;
      console.warn('[hooks.server] Redis adapter creation failed:', e);
    }
  } catch (_e) {
    // ignore redis init failures; let consumers handle null
    _redis = null;
  }
  return _redis;
}

// Defer heavy initializations (Redis, backends) to the first request to avoid
// connection attempts during module import which can crash the Vite dev server
// when services like Redis are not available locally (ECONNREFUSED).
// Keep Postgres light-weight init but avoid forcing external network calls here.
initPostgres();

// Note: Do NOT call initRedis() or initBackends() at module import time.
// They will be invoked lazily inside ensureInitialized() to prevent dev-time failures.

// Remove the old `declare global { namespace App { ... } }` block and use module augmentation instead.
// Keep the file as a module so TypeScript applies the augmentation.
export {}; // keep the file as a module

declare module '@sveltejs/kit' {
  interface Locals {
    // Avoid re-declaring `db`, `user`, or `session` here because other files may declare them
    // with different modifiers. Only add properties that are safe to augment (don't conflict).
    pg?: PgConnection;
    redis?: RedisInstance | null;
    // If you need to add other non-conflicting keys, add them here.
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

      // Initialize Redis and other backends lazily to avoid dev-time failures
      try {
        // initRedis() will attach shared redis client but not force a blocking connect
        // Consumers should call ensureRedisReady() when they need a ready connection.
        initRedis();
      } catch (e) {
        console.warn('[hooks.server] initRedis() failed (ignored in dev):', e);
      }

      // initBackends may perform non-critical setup for optional services; run it lazily
      if (process.env.INIT_RABBITMQ_ON_START === 'true') {
        // This keeps the original lazy behaviour unless the env var is set.
        await initializeRabbitMQ();
      }
      try {
        // attempt to initialize other backends; non-fatal
        // initBackends is optional; call and ignore failures in dev
        if (typeof initBackends === 'function') {
          await initBackends();
        }
      } catch (e) {
        console.warn('[hooks.server] initBackends() failed (ignored in dev):', e);
      }

      initialized = true;
      console.log('✅ [hooks.server] Core systems initialized successfully');
    } catch (error) {
      console.error('❌ [hooks.server] CRITICAL: Initialization failed:', error);
      throw error; // Re-throw to see full stack trace
    }
  }
}

// --- Replace the generic DatabaseUser.role:string with a narrow union and add a runtime guard ---
type Role = 'user' | 'admin' | 'lead_prosecutor' | 'prosecutor' | 'paralegal' | 'investigator' | 'analyst' | 'viewer';

interface DatabaseUser {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  role: Role;
  isActive?: boolean;
  avatarUrl?: string | null;
}

const VALID_ROLES: Set<string> = new Set([
  'user',
  'admin',
  'lead_prosecutor',
  'prosecutor',
  'paralegal',
  'investigator',
  'analyst',
  'viewer',
]);

function normalizeRole(raw: unknown): Role {
  if (typeof raw === 'string' && VALID_ROLES.has(raw)) {
    return raw as Role;
  }
  // fallback to a safe default if the upstream value is unexpected
  return 'viewer';
}

// REPLACEMENT: corrected handler (replaces the broken/duplicated tail of the file)
export const handle: Handle = async ({ event, resolve }) => {
  // Ensure all systems are initialized
  try {
    await ensureInitialized();
  } catch (initError) {
    console.error('❌ [hooks.server] FATAL: Cannot initialize hooks:', initError);
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  // Dev bypass helper: populate locals.user when DEV_BYPASS_AUTH=true
  try {
    if (process.env.DEV_BYPASS_AUTH === 'true') {
      event.locals.user = {
        id: 'dev-user-1',
        email: 'dev@local.test',
        role: 'admin',
      };
      event.locals.session = { id: 'dev-session-1', fresh: true };
      return resolve(event);
    }
  } catch (e) {
    console.warn('⚠️ [hooks.server] Dev bypass check failed:', e);
    // continue to normal flow
  }

  const url = event.url;
  const pathname = url.pathname;

  // Handle legacy route redirects
  if (legacyRouteMapping[pathname]) {
    const newRoute = legacyRouteMapping[pathname];
    const searchParams = url.searchParams.toString();
    const redirectUrl = searchParams ? `${newRoute}?${searchParams}` : newRoute;
    return new Response(null, {
      status: 301,
      headers: { location: redirectUrl },
    });
  }

  // Attach db/redis singletons to event.locals (typed via App.Locals)
  event.locals.db = _db;
  event.locals.pg = _pgConnection;
  event.locals.redis = _redis;

  // Production-ready auth handling with comprehensive error recovery
  try {
    if (!authEnabled || !lucia) {
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

    // Validate session
    let session: SessionShape | null = null;
    let user: DatabaseUser | null = null;
    try {
      const result = await lucia.validateSession(sessionId);
      session = result.session;
      user = result.user as DatabaseUser;
    } catch (validationError) {
      console.warn('⚠️ Session validation failed:', validationError);
      // Clear invalid session cookie
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

    // Refresh fresh session cookie if required
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

    // If session missing, clear cookie
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

    // Attach user to locals when present
    if (user) {
      const localUser: DatabaseUser = {
        id: String(user.id),
        email: user.email ? String(user.email) : undefined,
        role: normalizeRole((user as { role?: unknown }).role),
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        isActive: typeof user.isActive === 'boolean' ? user.isActive : true,
        avatarUrl: user.avatarUrl ?? null,
      };

      event.locals.user = localUser;
      event.locals.session = session ?? null;

      if (process.env.NODE_ENV !== 'production') {
        try {
          console.debug('[hooks.server] Authenticated user attached to locals:', {
            id: localUser.id,
            email: localUser.email,
            role: localUser.role,
          });
        } catch (_) {
          // swallow debug errors
        }
      }

      return resolve(event);
    } else {
      // No user found: ensure locals are null
      event.locals.user = null;
      event.locals.session = null;
      return resolve(event);
    }
  } catch (authError) {
    console.error('❌ [hooks.server] Auth handling failed:', authError);
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }
};