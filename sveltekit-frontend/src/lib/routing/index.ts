/**
 * Dynamic Routing System - Main Export
 * Complete routing solution for SvelteKit with dynamic generation
 */

import type { DynamicRouteConfig, GeneratedRoute } from './dynamic-route-generator.js';
import type { RouteDefinition } from '$lib/data/routes-config';
import { getAllDynamicRoutes } from './dynamic-route-generator.js';
import { registerDynamicRoute, getRoute } from './route-registry.js';
import path from "path";

// Core route generation
export {
  DynamicRouteGenerator,
  dynamicRouteGenerator,
  generateDynamicRoute,
  getDynamicRoute,
  getAllDynamicRoutes,
  getDynamicRoutesByCategory,
  removeDynamicRoute,
  hasDynamicRoute,
  createDynamicRouteHandler,
  type DynamicRouteConfig,
  type GeneratedRoute
} from './dynamic-route-generator';

// Route registry and management
export {
  RouteRegistry,
  routeRegistry,
  routes,
  dynamicRoutes,
  allRegisteredRoutes,
  currentRoute,
  favoriteRoutes,
  recentRoutes,
  routeStatistics,
  registerRoute,
  registerDynamicRoute,
  unregisterRoute,
  getRoute,
  searchRoutes,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  type RouteRegistryState,
  type RouteRegistryOptions
} from './route-registry';

// Route guards and protection
export {
  RouteGuards,
  routeGuards,
  createGuardedLoader,
  withGuards,
  createRouteGuardMiddleware,
  configureRouteGuards,
  getRouteGuardConfig,
  checkRoutePermission,
  checkMultipleRoutePermissions,
  type RouteGuardContext,
  type GuardResult,
  type RouteGuard,
  type RouteGuardConfig
} from './route-guards';

// Dynamic navigation
export {
  DynamicNavigation,
  dynamicNavigation,
  navigationState,
  currentPath,
  previousPath,
  breadcrumbs,
  canGoBack,
  canGoForward,
  isNavigating,
  navigationHistory,
  navigate,
  navigateToRoute,
  goBack,
  goForward,
  refresh,
  replace,
  addNavigationGuard,
  removeNavigationGuard,
  clearNavigationGuards,
  createRouteAwareNavigation,
  type NavigationState,
  type NavigationHistoryEntry,
  type BreadcrumbItem,
  type NavigationOptions,
  type NavigationGuard
} from './dynamic-navigation';

// Re-export route configuration types
export type {
  RouteDefinition
} from '$lib/data/routes-config';

/**
 * Main routing utilities and helpers
 */

/**
 * Initialize the complete routing system
 */
export async function initializeRouting(options: {
  enableGuards?: boolean;
  enableNavigation?: boolean;
  globalGuards?: string[];
  persistState?: boolean;
} = {}): Promise<void> {
  const {
    enableGuards = true,
    enableNavigation = true,
    globalGuards = ['maintenance'],
    persistState = true
  } = options;

  // Initialize route registry
  console.log('🚀 Initializing Dynamic Routing System...');
  
  // Initialize navigation if enabled
  if (enableNavigation) {
    console.log('📍 Navigation system enabled');
  }
  
  // Initialize guards if enabled
  if (enableGuards) {
    console.log('🛡️ Route guards enabled:', globalGuards);
  }
  
  console.log('✅ Dynamic Routing System initialized');
}

/**
 * Route builder utility for creating dynamic routes with type safety
 */
export class RouteBuilder {
  private config: Partial<DynamicRouteConfig> = {};
  private routeId: string = '';
  private routePath: string = '';

  constructor(id: string, path: string) {
    this.routeId = id;
    this.routePath = path;
  }

  /**
   * Set component path
   */
  component(path: string): RouteBuilder {
    this.config.component = path;
    return this;
  }

  /**
   * Set layout path
   */
  layout(path: string): RouteBuilder {
    this.config.layout = path;
    return this;
  }

  /**
   * Set preload option
   */
  preload(enabled: boolean = true): RouteBuilder {
    this.config.preload = enabled;
    return this;
  }

  /**
   * Set SSR option
   */
  ssr(enabled: boolean = true): RouteBuilder {
    this.config.ssr = enabled;
    return this;
  }

  /**
   * Set hydration option
   */
  hydrate(enabled: boolean = true): RouteBuilder {
    this.config.hydrate = enabled;
    return this;
  }

  /**
   * Set parameters
   */
  params(params: Record<string, any>): RouteBuilder {
    this.config.params = params;
    return this;
  }

  /**
   * Build and register the route
   */
  build(): GeneratedRoute {
    const route: GeneratedRoute = {
      id: this.routeId,
      path: this.routePath,
      component: this.config.component || 'default',
      params: this.config.params || {},
      metadata: {
        category: this.config.template || 'default',
        status: 'active',
        tags: [],
        preload: this.config.preload || false,
        ssr: this.config.ssr || true,
        hydrate: this.config.hydrate || true
      }
    };
    return registerDynamicRoute(this.routeId, this.routePath, this.config);
  }

  /**
   * Build route configuration without registering
   */
  getConfig(): DynamicRouteConfig {
    return {
      pattern: this.routePath,
      template: 'dynamic',
      ...this.config
    };
  }
}

/**
 * Create a new route builder
 */
export function createRoute(id: string, path: string): RouteBuilder {
  return new RouteBuilder(id, path);
}

/**
 * Batch route registration utility
 */
export function registerRoutes(routes: Array<{
  id: string;
  path: string;
  config?: Partial<DynamicRouteConfig>;
}>): GeneratedRoute[] {
  return routes.map(route => {
    const config = route.config || {};
    return registerDynamicRoute(route.id, route.path, config);
  });
}

/**
 * Route pattern matching utility
 */
export function matchRoute(
  pattern: string,
  path: string
): { match: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  
  if (patternParts.length !== pathParts.length) {
    return { match: false, params: {} };
  }
  
  const params: Record<string, string> = {};
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    
    if (patternPart.startsWith('[') && patternPart.endsWith(']')) {
      // Dynamic segment
      const paramName = patternPart.slice(1, -1);
      const isOptional = paramName.startsWith('...');
      const name = isOptional ? paramName.slice(3) : paramName;
      
      params[name] = pathPart;
    } else if (patternPart !== pathPart) {
      // Static segment mismatch
      return { match: false, params: {} };
    }
  }
  
  return { match: true, params };
}

/**
 * Route URL generation utility
 */
export function generateRouteUrl(
  routeId: string,
  params: Record<string, string> = {},
  searchParams: Record<string, string> = {}
): string {
  const route = getRoute(routeId);
  if (!route) {
    throw new Error(`Route not found: ${routeId}`);
  }
  
  let path: string;
  if ('route' in route) {
    path = route.route;
  } else {
    path = route.path;
  }
  
  // Replace parameters
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`[${key}]`, value);
    path = path.replace(`[[${key}]]`, value || '');
    path = path.replace(`:${key}`, value);
  }
  
  // Add search parameters
  const searchParamsString = new URLSearchParams(searchParams).toString();
  if (searchParamsString) {
    path += `?${searchParamsString}`;
  }
  
  return path;
}

/**
 * Route validation utility
 */
export function validateRoute(route: GeneratedRoute | RouteDefinition): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check required fields
  if (!route.id) {
    errors.push('Route ID is required');
  }
  
  const path = 'route' in route ? route.route : route.path;
  if (!path) {
    errors.push('Route path is required');
  }
  
  // Check path format
  if (path && !path.startsWith('/')) {
    errors.push('Route path must start with /');
  }
  
  // Check component path for generated routes
  if ('component' in route && route.component && !route.component.endsWith('.svelte')) {
    errors.push('Component path should end with .svelte');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Route debugging utility
 */
export function debugRoutes(): {
  totalRoutes: number;
  staticRoutes: number;
  dynamicRoutes: number;
  routeList: Array<{
    id: string;
    path: string;
    type: 'static' | 'dynamic';
    category?: string;
    status?: string;
  }>;
} {
  const dynamicRoutes = getAllDynamicRoutes();
  const staticRoutesFromRegistry: Array<[string, RouteDefinition]> = [];
  
  const routeList = [
    ...staticRoutesFromRegistry.map(([id, route]) => ({
      id,
      path: route.route || '',
      type: 'static' as const,
      category: route.category,
      status: route.status
    })),
    ...dynamicRoutes.map(route => ({
      id: route.id,
      path: route.path,
      type: 'dynamic' as const,
      category: route.metadata?.category,
      status: route.metadata?.status
    }))
  ];
  
  return {
    totalRoutes: routeList.length,
    staticRoutes: staticRoutesFromRegistry.length,
    dynamicRoutes: dynamicRoutes.length,
    routeList
  };
}

/**
 * Export types and constants
 */
export const ROUTE_EVENTS = {
  ROUTE_REGISTERED: 'route:registered',
  ROUTE_UNREGISTERED: 'route:unregistered',
  NAVIGATION_START: 'navigation:start',
  NAVIGATION_END: 'navigation:end',
  GUARD_EXECUTED: 'guard:executed'
} as const;

export const ROUTE_CATEGORIES = {
  MAIN: 'main',
  DEMO: 'demo',
  ADMIN: 'admin',
  DEV: 'dev',
  AI: 'ai',
  LEGAL: 'legal',
  DYNAMIC: 'dynamic'
} as const;

export const ROUTE_STATUS = {
  ACTIVE: 'active',
  BETA: 'beta',
  EXPERIMENTAL: 'experimental',
  DEPRECATED: 'deprecated'
} as const;