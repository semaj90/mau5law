/**
 * Dynamic Route Generation System for SvelteKit
 * Generates routes programmatically based on configuration
 */

import type { RouteDefinition } from '$lib/data/routes-config';
import { allRoutes } from '$lib/data/routes-config';
import { error } from '@sveltejs/kit';
import path from "path";

export interface DynamicRouteConfig {
  pattern: string;
  template: string;
  component?: string;
  layout?: string;
  params?: Record<string, any>;
  preload?: boolean;
  ssr?: boolean;
  hydrate?: boolean;
}

export interface GeneratedRoute {
  id: string;
  path: string;
  component: string;
  layout?: string;
  params: Record<string, any>;
  metadata: {
    category: string;
    status: string;
    tags: string[];
    preload: boolean;
    ssr: boolean;
    hydrate: boolean;
  };
}

/**
 * Dynamic Route Generator Class
 */
export class DynamicRouteGenerator {
  private routes: Map<string, GeneratedRoute> = new Map();
  private patterns: Map<string, DynamicRouteConfig> = new Map();

  constructor() {
    this.initializeDefaultPatterns();
    this.generateRoutesFromConfig();
  }

  /**
   * Initialize default route patterns for common use cases
   */
  private initializeDefaultPatterns(): void {
    // Demo route pattern
    this.patterns.set('demo', {
      pattern: '/demo/:slug',
      template: 'demo',
      component: 'routes/demo/[slug]/+page.svelte',
      layout: 'routes/demo/+layout.svelte',
      preload: true,
      ssr: true,
      hydrate: true
    });

    // AI route pattern
    this.patterns.set('ai', {
      pattern: '/ai/:feature',
      template: 'ai-feature',
      component: 'routes/ai/[feature]/+page.svelte',
      layout: 'routes/ai/+layout.svelte',
      preload: true,
      ssr: false,
      hydrate: true
    });

    // Legal route pattern
    this.patterns.set('legal', {
      pattern: '/legal/:type/:id?',
      template: 'legal-resource',
      component: 'routes/legal/[type]/[[id]]/+page.svelte',
      layout: 'routes/legal/+layout.svelte',
      preload: true,
      ssr: true,
      hydrate: true
    });

    // Admin route pattern
    this.patterns.set('admin', {
      pattern: '/admin/:section',
      template: 'admin-section',
      component: 'routes/admin/[section]/+page.svelte',
      layout: 'routes/admin/+layout.svelte',
      preload: false,
      ssr: true,
      hydrate: true
    });

    // Dev tools pattern
    this.patterns.set('dev', {
      pattern: '/dev/:tool',
      template: 'dev-tool',
      component: 'routes/dev/[tool]/+page.svelte',
      layout: 'routes/dev/+layout.svelte',
      preload: false,
      ssr: false,
      hydrate: true
    });
  }

  /**
   * Generate routes from the existing routes configuration
   */
  private generateRoutesFromConfig(): void {
    for (const routeConfig of allRoutes) {
      const generatedRoute = this.createRouteFromConfig(routeConfig);
      this.routes.set(routeConfig.id, generatedRoute);
    }
  }

  /**
   * Create a generated route from route configuration
   */
  private createRouteFromConfig(routeConfig: RouteDefinition): GeneratedRoute {
    const pattern = this.findMatchingPattern(routeConfig);
    const config = pattern ? this.patterns.get(pattern) : null;

    return {
      id: routeConfig.id,
      path: routeConfig.route,
      component: config?.component || this.inferComponentPath(routeConfig),
      layout: config?.layout,
      params: this.extractParams(routeConfig.route),
      metadata: {
        category: routeConfig.category,
        status: routeConfig.status,
        tags: routeConfig.tags,
        preload: config?.preload ?? true,
        ssr: config?.ssr ?? true,
        hydrate: config?.hydrate ?? true
      }
    };
  }

  /**
   * Find matching pattern for a route
   */
  private findMatchingPattern(routeConfig: RouteDefinition): string | null {
    const path = routeConfig.route;
    
    if (path.startsWith('/demo/')) return 'demo';
    if (path.startsWith('/ai/') || routeConfig.category === 'ai') return 'ai';
    if (path.startsWith('/legal/') || routeConfig.category === 'legal') return 'legal';
    if (path.startsWith('/admin/') || routeConfig.category === 'admin') return 'admin';
    if (path.startsWith('/dev/') || routeConfig.category === 'dev') return 'dev';
    
    return null;
  }

  /**
   * Infer component path from route configuration
   */
  private inferComponentPath(routeConfig: RouteDefinition): string {
    let path = routeConfig.route;
    
    // Remove leading slash and convert to file path
    path = path.replace(/^\//, '');
    
    // Handle dynamic segments
    path = path.replace(/\[([^\]]+)\]/g, '[$1]');
    
    // Handle root route
    if (path === '') path = '+page.svelte';
    else path = `${path}/+page.svelte`;
    
    return `routes/${path}`;
  }

  /**
   * Extract parameters from route path
   */
  private extractParams(route: string): Record<string, any> {
    const params: Record<string, any> = {};
    const matches = route.match(/\[([^\]]+)\]/g);
    
    if (matches) {
      matches.forEach(match => {
        const paramName = match.slice(1, -1); // Remove brackets
        const isOptional = paramName.startsWith('...');
        const name = isOptional ? paramName.slice(3) : paramName;
        
        params[name] = {
          optional: isOptional,
          type: 'string'
        };
      });
    }
    
    return params;
  }

  /**
   * Register a new route pattern
   */
  public registerPattern(name: string, config: DynamicRouteConfig): void {
    this.patterns.set(name, config);
  }

  /**
   * Generate a new route dynamically
   */
  public generateRoute(
    id: string,
    path: string,
    options: Partial<DynamicRouteConfig> = {}
  ): GeneratedRoute {
    const config: DynamicRouteConfig = {
      pattern: path,
      template: 'dynamic',
      component: options.component || this.inferComponentFromPath(path),
      layout: options.layout,
      preload: options.preload ?? true,
      ssr: options.ssr ?? true,
      hydrate: options.hydrate ?? true,
      ...options
    };

    const route: GeneratedRoute = {
      id,
      path,
      component: config.component!,
      layout: config.layout,
      params: this.extractParams(path),
      metadata: {
        category: 'dynamic',
        status: 'active',
        tags: ['dynamic'],
        preload: config.preload!,
        ssr: config.ssr!,
        hydrate: config.hydrate!
      }
    };

    this.routes.set(id, route);
    return route;
  }

  /**
   * Infer component path from route path
   */
  private inferComponentFromPath(path: string): string {
    return `routes${path}/+page.svelte`;
  }

  /**
   * Get all generated routes
   */
  public getAllRoutes(): GeneratedRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get route by ID
   */
  public getRoute(id: string): GeneratedRoute | undefined {
    return this.routes.get(id);
  }

  /**
   * Get routes by category
   */
  public getRoutesByCategory(category: string): GeneratedRoute[] {
    return this.getAllRoutes().filter(route => route.metadata.category === category);
  }

  /**
   * Get routes by status
   */
  public getRoutesByStatus(status: string): GeneratedRoute[] {
    return this.getAllRoutes().filter(route => route.metadata.status === status);
  }

  /**
   * Check if route exists
   */
  public hasRoute(id: string): boolean {
    return this.routes.has(id);
  }

  /**
   * Remove route
   */
  public removeRoute(id: string): boolean {
    return this.routes.delete(id);
  }

  /**
   * Get route manifest for SvelteKit
   */
  public getRouteManifest(): Record<string, any> {
    const manifest: Record<string, any> = {};
    
    for (const route of this.getAllRoutes()) {
      manifest[route.path] = {
        id: route.id,
        component: route.component,
        layout: route.layout,
        params: route.params,
        metadata: route.metadata
      };
    }
    
    return manifest;
  }

  /**
   * Generate route loader for dynamic imports
   */
  public generateRouteLoader(route: GeneratedRoute): string {
    const componentPath = route.component.replace('routes/', '../routes/');
    const layoutPath = route.layout ? route.layout.replace('routes/', '../routes/') : null;
    
    let loader = `// Auto-generated route loader for ${route.id}\n`;
    loader += `export const component = () => import('${componentPath}');\n`;
    
    if (layoutPath) {
      loader += `export const layout = () => import('${layoutPath}');\n`;
    }
    
    loader += `export const metadata = ${JSON.stringify(route.metadata, null, 2)};\n`;
    loader += `export const params = ${JSON.stringify(route.params, null, 2)};\n`;
    
    return loader;
  }

  /**
   * Generate TypeScript definitions for routes
   */
  public generateRouteTypes(): string {
    let types = '// Auto-generated route types\n\n';
    
    types += 'export interface RouteParams {\n';
    for (const route of this.getAllRoutes()) {
      if (Object.keys(route.params).length > 0) {
        types += `  '${route.path}': {\n`;
        for (const [paramName, paramConfig] of Object.entries(route.params)) {
          const optional = (paramConfig as any).optional ? '?' : '';
          const type = (paramConfig as any).type || 'string';
          types += `    ${paramName}${optional}: ${type};\n`;
        }
        types += '  };\n';
      }
    }
    types += '}\n\n';
    
    types += 'export type RouteId = \n';
    const routeIds = this.getAllRoutes().map(r => `  | '${r.id}'`);
    types += routeIds.join('\n');
    types += ';\n\n';
    
    types += 'export type RoutePath = \n';
    const routePaths = this.getAllRoutes().map(r => `  | '${r.path}'`);
    types += routePaths.join('\n');
    types += ';\n';
    
    return types;
  }
}

// Export singleton instance
export const dynamicRouteGenerator = new DynamicRouteGenerator();
;
// Export helper functions
export function generateDynamicRoute(
  id: string,
  path: string,
  options?: Partial<DynamicRouteConfig>
): GeneratedRoute {
  return dynamicRouteGenerator.generateRoute(id, path, options);
}

export function getDynamicRoute(id: string): GeneratedRoute | undefined {
  return dynamicRouteGenerator.getRoute(id);
}

export function getAllDynamicRoutes(): GeneratedRoute[] {
  return dynamicRouteGenerator.getAllRoutes();
}

export function getDynamicRoutesByCategory(category: string): GeneratedRoute[] {
  return dynamicRouteGenerator.getRoutesByCategory(category);
}

export function removeDynamicRoute(id: string): boolean {
  return dynamicRouteGenerator.removeRoute(id);
}

export function hasDynamicRoute(id: string): boolean {
  return dynamicRouteGenerator.hasRoute(id);
}

/**
 * Route middleware for handling dynamic routes
 */
export function createDynamicRouteHandler(route: GeneratedRoute) {
  return async (event: any) => {
    const { params } = event;
    
    // Validate required parameters
    for (const [paramName, paramConfig] of Object.entries(route.params)) {
      const isOptional = (paramConfig as any).optional;
      if (!isOptional && !params[paramName]) {
        throw error(404, `Missing required parameter: ${paramName}`);
      }
    }
    
    // Return route data
    return {
      route: route,
      params: params,
      metadata: route.metadata
    };
  };
}