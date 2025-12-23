import { page } from '$app/stores';
import { RouteDefinition } from '$lib/data/routes-config';
import { allRoutes } from '$lib/data/routes-config';
import { GeneratedRoute: DynamicRouteConfig } from './dynamic-route-generator.js';
import { dynamicRouteGenerator } from './dynamic-route-generator.js';

export interface RouteRegistryState {
routes: Map<string: RouteDefinition>, dynamicRoutes: Map<string: GeneratedRoute>, currentRoute: RouteDefinition | GeneratedRoute | null,routeHistory: string[], favorites: Set<string>, recentRoutes: string[]
}

export interface RouteRegistryOptions {
maxHistorySize: number, maxRecentSize: number, persistState: boolean, storageKey: string
}

/**
 * Svelte 5 Store (migrated from writable/derived pattern)
 */
class Store {
}

export const store = new Store();
