/**
 * Server-Side Authentication Utilities
 *
 * Provides shared helpers for authentication, user resolution,
 * and development bypass functionality across API endpoints.
 */

import { dev } from '$app/environment';

/**
 * Typed environment access for import.meta.env
 */
export type MetaEnv = {
  REDIS_URL?: string;
  DEV_BYPASS_AUTH?: string;
  [key: string]: string | undefined;
};

/**
 * Get typed access to import.meta.env
 */
export function getMetaEnv(): MetaEnv {
  return (import.meta as unknown as { env: MetaEnv }).env;
}

/**
 * Development stub user returned when DEV_BYPASS_AUTH is enabled
 */
export const DEV_STUB_USER = {
  id: '1',
  email: 'dev@local',
  name: 'Developer',
} as const;

/**
 * Check if development authentication bypass is enabled
 */
export function isDevBypassEnabled(): boolean {
  const metaEnv = getMetaEnv();
  return (
    dev &&
    (process.env.DEV_BYPASS_AUTH === 'true' ||
      (metaEnv.DEV_BYPASS_AUTH !== undefined && metaEnv.DEV_BYPASS_AUTH === 'true'))
  );
}

/**
 * Resolve user from locals with optional development bypass
 *
 * @param locals - SvelteKit locals object containing user session
 * @returns User object if authenticated, stub user if dev bypass enabled, or null
 *
 * @example
 * ```typescript
 * const user = resolveUser(locals);
 * if (!user) {
 *   throw error(401, 'Unauthorized');
 * }
 * console.log('User ID:', user.id);
 * ```
 */
export function resolveUser(locals: App.Locals): App.Locals['user'] | typeof DEV_STUB_USER | null {
  // Return authenticated user if present
  if (locals?.user) {
    return locals.user;
  }

  // In development with bypass enabled, return stub user
  if (isDevBypassEnabled()) {
    console.warn('⚠️ DEV_BYPASS_AUTH active — returning development stub user');
    return DEV_STUB_USER;
  }

  // No user found
  return null;
}

/**
 * Require authenticated user or throw error
 *
 * @param locals - SvelteKit locals object
 * @param errorMessage - Custom error message (optional)
 * @returns User object (guaranteed non-null)
 * @throws Error if user not authenticated
 *
 * @example
 * ```typescript
 * const user = requireUser(locals);
 * // user is guaranteed to be non-null here
 * ```
 */
export function requireUser(
  locals: App.Locals,
  errorMessage = 'User authentication required'
): NonNullable<App.Locals['user']> | typeof DEV_STUB_USER {
  const user = resolveUser(locals);

  if (!user) {
    throw new Error(errorMessage);
  }

  return user;
}

/**
 * Get user ID safely with dev bypass support
 *
 * @param locals - SvelteKit locals object
 * @returns User ID or null if not authenticated
 */
export function getUserId(locals: App.Locals): string | null {
  const user = resolveUser(locals);
  return user?.id ?? null;
}

/**
 * Check if user is authenticated (including dev bypass)
 */
export function isAuthenticated(locals: App.Locals): boolean {
  return resolveUser(locals) !== null;
}
