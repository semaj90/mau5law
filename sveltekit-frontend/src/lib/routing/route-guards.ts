/**
 * Route Guards for Dynamic Route Protection
 * Implements authentication, authorization, and validation guards
 */

import { redirect, error } from '@sveltejs/kit';
import type { Load, ServerLoad, ServerLoadEvent } from '@sveltejs/kit';
import type { RouteDefinition } from '$lib/data/routes-config';
import type { GeneratedRoute } from './dynamic-route-generator.js';
import { URL } from "url";

export interface RouteGuardContext {
  event: ServerLoadEvent;
  route: RouteDefinition | GeneratedRoute;
  params: Record<string, string>;
  user?: any;
  session?: string;
}

export interface GuardResult {
  allowed: boolean;
  redirect?: string;
  error?: {
    status: number;
    message: string;
  };
  data?: Record<string, any>;
}

export type RouteGuard = (context: RouteGuardContext) => Promise<GuardResult> | GuardResult;

/**
 * Built-in route guards
 */
export class RouteGuards {
  private guards: Map<string, RouteGuard> = new Map();

  constructor() {
    this.registerBuiltInGuards();
  }

  /**
   * Register built-in guards
   */
  private registerBuiltInGuards(): void {
    this.register('auth', this.authGuard);
    this.register('admin', this.adminGuard);
    this.register('dev', this.devGuard);
    this.register('feature', this.featureGuard);
    this.register('rate-limit', this.rateLimitGuard);
    this.register('maintenance', this.maintenanceGuard);
  }

  /**
   * Register a custom guard
   */
  public register(name: string, guard: RouteGuard): void {
    this.guards.set(name, guard);
  }

  /**
   * Get a guard by name
   */
  public get(name: string): RouteGuard | undefined {
    return this.guards.get(name);
  }

  /**
   * Execute guards for a route
   */
  public async executeGuards(
    guardNames: string[],
    context: RouteGuardContext
  ): Promise<GuardResult> {
    for (const guardName of guardNames) {
      const guard = this.guards.get(guardName);
      if (!guard) {
        console.warn(`Route guard '${guardName}' not found`);
        continue;
      }

      const result = await guard(context);
      if (!result.allowed) {
        return result;
      }

      // Merge guard data into context
      if (result.data) {
        context = { ...context, ...result.data };
      }
    }

    return { allowed: true };
  }

  /**
   * Authentication guard
   */
  private authGuard: RouteGuard = async (context) => {
    const { event } = context;
    const user = (event.locals as any).user;

    if (!user) {
      return {
        allowed: false,
        redirect: '/auth/login?redirectTo=' + encodeURIComponent(event.url.pathname)
      };
    }

    return {
      allowed: true,
      data: { user }
    };
  };

  /**
   * Admin role guard
   */
  private adminGuard: RouteGuard = async (context) => {
    const { event } = context;
    const user = (event.locals as any).user;

    if (!user) {
      return {
        allowed: false,
        redirect: '/auth/login?redirectTo=' + encodeURIComponent(event.url.pathname)
      };
    }

    if (user.role !== 'admin' && user.role !== 'superuser') {
      return {
        allowed: false,
        error: {
          status: 403,
          message: 'Admin access required'
        }
      };
    }

    return { allowed: true };
  };

  /**
   * Development environment guard
   */
  private devGuard: RouteGuard = async (context) => {
    const isDevelopment = import.meta.env.NODE_ENV === 'development';
    const isDevUser = (context.event.locals as any).user?.role === 'developer';

    if (!isDevelopment && !isDevUser) {
      return {
        allowed: false,
        error: {
          status: 404,
          message: 'Page not found'
        }
      };
    }

    return { allowed: true };
  };

  /**
   * Feature flag guard
   */
  private featureGuard: RouteGuard = async (context) => {
    const { route, params } = context;
    const featureName = params.feature || (route as any).metadata?.feature;

    if (!featureName) {
      return { allowed: true };
    }

    // Check if feature is enabled
    const featureFlags = (context.event.locals as any).featureFlags || {};
    const isEnabled = featureFlags[featureName];

    if (!isEnabled) {
      return {
        allowed: false,
        error: {
          status: 404,
          message: 'Feature not available'
        }
      };
    }

    return { allowed: true };
  };

  /**
   * Rate limiting guard
   */
  private rateLimitGuard: RouteGuard = async (context) => {
    const { event } = context;
    const clientIP = event.getClientAddress();
    const rateLimitKey = `rate_limit:${clientIP}:${event.url.pathname}`;

    // Simple in-memory rate limiting (use Redis in production)
    const requestCount = await this.getRateLimitCount(rateLimitKey);
    const limit = 60; // requests per minute
    const window = 60 * 1000; // 1 minute

    if (requestCount >= limit) {
      return {
        allowed: false,
        error: {
          status: 429,
          message: 'Too many requests'
        }
      };
    }

    await this.incrementRateLimit(rateLimitKey, window);
    return { allowed: true };
  };

  /**
   * Maintenance mode guard
   */
  private maintenanceGuard: RouteGuard = async (context) => {
    const isMaintenanceMode = import.meta.env.MAINTENANCE_MODE === 'true';
    const isMaintenancePage = context.route.id === 'maintenance';
    const isAdmin = (context.event.locals as any).user?.role === 'admin';

    if (isMaintenanceMode && !isMaintenancePage && !isAdmin) {
      return {
        allowed: false,
        redirect: '/maintenance'
      };
    }

    return { allowed: true };
  };

  /**
   * Get rate limit count (simplified implementation)
   */
  private async getRateLimitCount(key: string): Promise<number> {
    // In a real application, use Redis or another persistent store
    const stored = globalThis.rateLimitStore?.get(key);
    if (!stored || Date.now() > stored.expires) {
      return 0;
    }
    return stored.count;
  }

  /**
   * Increment rate limit (simplified implementation)
   */
  private async incrementRateLimit(key: string, windowMs: number): Promise<void> {
    // In a real application, use Redis or another persistent store
    globalThis.rateLimitStore = globalThis.rateLimitStore || new Map();
    const stored = globalThis.rateLimitStore.get(key);
    const expires = Date.now() + windowMs;

    if (!stored || Date.now() > stored.expires) {
      globalThis.rateLimitStore.set(key, { count: 1, expires });
    } else {
      globalThis.rateLimitStore.set(key, { count: stored.count + 1, expires: stored.expires });
    }
  }
}

// Export singleton instance
export const routeGuards = new RouteGuards();
;
/**
 * Create a guard-protected page loader
 */
export function createGuardedLoader(
  guards: string[],
  loader?: ServerLoad
): ServerLoad {
  return async (event: any) => {
    const route = event.route;
    const params = event.params;

    const context: RouteGuardContext = {
      event,
      route: route as any,
      params,
      user: (event.locals as any).user,
      session: (event.locals as any).session
    };

    // Execute guards
    const guardResult = await routeGuards.executeGuards(guards, context);

    if (!guardResult.allowed) {
      if (guardResult.redirect) {
        throw redirect(302, guardResult.redirect);
      }
      if (guardResult.error) {
        throw error(guardResult.error.status, guardResult.error.message);
      }
    }

    // Execute the original loader if provided
    if (loader) {
      const loaderResult = await loader(event);
      return {
        ...loaderResult,
        guardData: guardResult.data
      };
    }

    return {
      guardData: guardResult.data
    };
  };
}

/**
 * Route guard decorator for automatic protection
 */
export function withGuards(guards: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalLoader = descriptor.value;
    
    descriptor.value = createGuardedLoader(guards, originalLoader);
    
    return descriptor;
  };
}

/**
 * Middleware for SvelteKit hooks to apply global guards
 */
export function createRouteGuardMiddleware(globalGuards: string[] = []) {
  return async function (event: any, resolve: Function) {
    // Skip guard execution for API routes and static assets
    if (event.url.pathname.startsWith('/api/') || 
        event.url.pathname.startsWith('/_app/') ||
        event.url.pathname.includes('.')) {
      return resolve(event);
    }

    const route = event.route;
    const params = event.params;

    const context: RouteGuardContext = {
      event,
      route: route as any,
      params,
      user: (event.locals as any).user,
      session: (event.locals as any).session
    };

    // Execute global guards
    if (globalGuards.length > 0) {
      const guardResult = await routeGuards.executeGuards(globalGuards, context);

      if (!guardResult.allowed) {
        if (guardResult.redirect) {
          throw redirect(302, guardResult.redirect);
        }
        if (guardResult.error) {
          throw error(guardResult.error.status, guardResult.error.message);
        }
      }

      // Add guard data to event locals
      if (guardResult.data) {
        event.locals = { ...event.locals, ...guardResult.data };
      }
    }

    return resolve(event);
  };
}

/**
 * Route-specific guard configuration
 */
export interface RouteGuardConfig {
  guards: string[];
  skipGlobalGuards?: boolean;
  customGuards?: Record<string, RouteGuard>;
}

/**
 * Configure guards for a specific route
 */
export function configureRouteGuards(
  routeId: string,
  config: RouteGuardConfig
): void {
  // Register custom guards if provided
  if (config.customGuards) {
    for (const [name, guard] of Object.entries(config.customGuards)) {
      routeGuards.register(name, guard);
    }
  }

  // Store route guard configuration
  globalThis.routeGuardConfigs = globalThis.routeGuardConfigs || new Map();
  globalThis.routeGuardConfigs.set(routeId, config);
}

/**
 * Get guard configuration for a route
 */
export function getRouteGuardConfig(routeId: string): RouteGuardConfig | null {
  return globalThis.routeGuardConfigs?.get(routeId) || null;
}

/**
 * Helper function to check if user has permission for a route
 */
export async function checkRoutePermission(
  routeId: string,
  user: any,
  params: Record<string, string> = {}
): Promise<boolean> {
  const config = getRouteGuardConfig(routeId);
  if (!config) return true;

  const mockEvent = {
    locals: { user },
    params,
    url: { pathname: `/${routeId}` },
    route: { id: routeId }
  } as any;

  const context: RouteGuardContext = {
    event: mockEvent,
    route: { id: routeId } as any,
    params,
    user,
    session: user?.sessionId
  };

  const result = await routeGuards.executeGuards(config.guards, context);
  return result.allowed;
}

/**
 * Batch permission checking for multiple routes
 */
export async function checkMultipleRoutePermissions(
  routeIds: string[],
  user: any,
  params: Record<string, string> = {}
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  await Promise.all(
    routeIds.map(async (routeId) => {
      results[routeId] = await checkRoutePermission(routeId, user, params);
    })
  );
  
  return results;
}