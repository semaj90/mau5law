/**
 * Dynamic Navigation System
 * Manages navigation state and provides programmatic navigation utilities
 */

import { writable, derived, get, type Writable, type Readable } from 'svelte/store';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { browser } from '$app/environment';
import type { RouteDefinition } from '$lib/data/routes-config';
import type { GeneratedRoute } from './dynamic-route-generator.js';
import { routeRegistry } from './route-registry.js';
// Remove unused Node.js imports - not needed for this implementation

export interface NavigationState {
  currentPath: string;
  previousPath: string | null;
  navigationHistory: NavigationHistoryEntry[];
  breadcrumbs: BreadcrumbItem[];
  canGoBack: boolean;
  canGoForward: boolean;
  isNavigating: boolean;
}

export interface NavigationHistoryEntry {
  path: string;
  timestamp: number;
  routeId?: string;
  params?: Record<string, string>;
  state?: any;
}

export interface BreadcrumbItem {
  label: string;
  path: string;
  routeId?: string;
  isActive: boolean;
}

export interface NavigationOptions {
  replaceState?: boolean;
  keepHistory?: boolean;
  state?: any;
  invalidateAll?: boolean;
  noScroll?: boolean;
  preserveParams?: boolean;
  guardBypass?: boolean;
}

export interface NavigationGuard {
  name: string;
  condition: (to: string, from: string) => boolean | Promise<boolean>;
  action?: 'prevent' | 'redirect' | 'confirm';
  redirectTo?: string;
  message?: string;
}

export class DynamicNavigation {
  private state: Writable<NavigationState> = writable({
    currentPath: '/',
    previousPath: null,
    navigationHistory: [],
    breadcrumbs: [],
    canGoBack: false,
    canGoForward: false,
    isNavigating: false,
  });

  private guards: Map<string, NavigationGuard> = new Map();
  private maxHistorySize = 100;
  private historyIndex = -1;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize navigation system
   */
  private initialize(): void {
    if (browser) {
      // Subscribe to page changes
      page.subscribe(($page) => {
        this.updateCurrentPath($page.url.pathname, $page.params, $page.route.id ?? undefined);
      });

      // Handle browser back/forward
      window.addEventListener('popstate', this.handlePopState.bind(this));

      // Handle beforeunload for unsaved changes
      window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }
  }

  /**
   * Get navigation state
   */
  public getState(): Readable<NavigationState> {
    return this.state;
  }

  /**
   * Navigate to a path
   */
  public async navigate(path: string, options: NavigationOptions = {}): Promise<void> {
    const currentState = get(this.state);

    // Check navigation guards
    const guardResult = await this.checkNavigationGuards(path, currentState.currentPath);
    if (!guardResult.allowed) {
      if (guardResult.redirectTo) {
        path = guardResult.redirectTo;
      } else {
        return; // Navigation prevented
      }
    }

    // Set navigating state
    this.state.update((state) => ({ ...state, isNavigating: true }));

    try {
      // Perform navigation
      await goto(path, {
        replaceState: options.replaceState,
        keepFocus: options.noScroll,
        invalidateAll: options.invalidateAll,
        noScroll: options.noScroll,
      });

      // Update history if not replacing state
      if (!options.replaceState && options.keepHistory !== false) {
        this.addToHistory(path, options.state);
      }
    } catch (error: any) {
      console.error('Navigation failed:', error);
      throw error;
    } finally {
      this.state.update((state) => ({ ...state, isNavigating: false }));
    }
  }

  /**
   * Navigate to a route by ID
   */
  public async navigateToRoute(
    routeId: string,
    params: Record<string, string> = {},
    options: NavigationOptions = {}
  ): Promise<void> {
    const route = routeRegistry.getRoute(routeId);
    if (!route) {
      throw new Error(`Route not found: ${routeId}`);
    }

    let path: string;
    if ('route' in route) {
      path = this.buildPath(route.route, params);
    } else {
      path = this.buildPath(route.path, params);
    }

    await this.navigate(path, options);
  }

  /**
   * Go back in history
   */
  public async goBack(): Promise<void> {
    const currentState = get(this.state);
    if (!currentState.canGoBack) return;

    if (this.historyIndex > 0) {
      this.historyIndex--;
      const entry = currentState.navigationHistory[this.historyIndex];
      await this.navigate(entry.path, { replaceState: true, keepHistory: false });
    } else if (browser && window.history.length > 1) {
      window.history.back();
    }
  }

  /**
   * Go forward in history
   */
  public async goForward(): Promise<void> {
    const currentState = get(this.state);
    if (!currentState.canGoForward) return;

    if (this.historyIndex < currentState.navigationHistory.length - 1) {
      this.historyIndex++;
      const entry = currentState.navigationHistory[this.historyIndex];
      await this.navigate(entry.path, { replaceState: true, keepHistory: false });
    } else if (browser) {
      window.history.forward();
    }
  }

  /**
   * Refresh current page
   */
  public async refresh(invalidateAll = true): Promise<void> {
    const currentState = get(this.state);
    await this.navigate(currentState.currentPath, {
      replaceState: true,
      invalidateAll,
      keepHistory: false,
    });
  }

  /**
   * Replace current URL without navigation
   */
  public async replace(path: string, state?: any): Promise<void> {
    await this.navigate(path, { replaceState: true, state });
  }

  /**
   * Add navigation guard
   */
  public addGuard(guard: NavigationGuard): void {
    this.guards.set(guard.name, guard);
  }

  /**
   * Remove navigation guard
   */
  public removeGuard(name: string): boolean {
    return this.guards.delete(name);
  }

  /**
   * Clear all navigation guards
   */
  public clearGuards(): void {
    this.guards.clear();
  }

  /**
   * Check if navigation is allowed
   */
  private async checkNavigationGuards(
    to: string,
    from: string
  ): Promise<{ allowed: boolean; redirectTo?: string }> {
    for (const guard of this.guards.values()) {
      const allowed = await guard.condition(to, from);

      if (!allowed) {
        if (guard.action === 'redirect' && guard.redirectTo) {
          return { allowed: true, redirectTo: guard.redirectTo };
        }

        if (guard.action === 'confirm' && guard.message) {
          const confirmed = browser ? confirm(guard.message) : false;
          if (!confirmed) {
            return { allowed: false };
          }
        } else {
          return { allowed: false };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Update current path and navigation state
   */
  private updateCurrentPath(
    path: string,
    params: Record<string, string> = {},
    routeId?: string
  ): void {
    this.state.update((state) => {
      const breadcrumbs = this.generateBreadcrumbs(path, routeId);

      return {
        ...state,
        previousPath: state.currentPath,
        currentPath: path,
        breadcrumbs,
        canGoBack: this.historyIndex > 0 || state.navigationHistory.length > 1,
        canGoForward: this.historyIndex < state.navigationHistory.length - 1,
      };
    });
  }

  /**
   * Add entry to navigation history
   */
  private addToHistory(path: string, state?: any, routeId?: string): void {
    this.state.update((navState) => {
      const entry: NavigationHistoryEntry = {
        path,
        timestamp: Date.now(),
        routeId,
        state,
      };

      const newHistory = [...navState.navigationHistory];

      // Remove entries after current index if we're not at the end
      if (this.historyIndex < newHistory.length - 1) {
        newHistory.splice(this.historyIndex + 1);
      }

      newHistory.push(entry);

      // Limit history size
      if (newHistory.length > this.maxHistorySize) {
        newHistory.shift();
        this.historyIndex = Math.max(0, this.historyIndex - 1);
      } else {
        this.historyIndex = newHistory.length - 1;
      }

      return {
        ...navState,
        navigationHistory: newHistory,
        canGoBack: this.historyIndex > 0,
        canGoForward: false,
      };
    });
  }

  /**
   * Generate breadcrumbs for current path
   */
  private generateBreadcrumbs(path: string, routeId?: string): BreadcrumbItem[] {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add home breadcrumb
    breadcrumbs.push({
      label: 'Home',
      path: '/',
      isActive: path === '/',
    });

    // Build breadcrumbs from path segments
    let currentPath = '';
    for (let i = 0; i < segments.length; i++) {
      currentPath += `/${segments[i]}`;
      const isActive = i === segments.length - 1;

      // Try to find route info for better labels
      const route = routeRegistry.getRoute(routeId || '');
      let label = segments[i];

      if (route && 'label' in route) {
        label = route.label;
      } else {
        // Capitalize and format segment
        label = segments[i]
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }

      breadcrumbs.push({
        label,
        path: currentPath,
        routeId: isActive ? routeId : undefined,
        isActive,
      });
    }

    return breadcrumbs;
  }

  /**
   * Build path with parameters
   */
  private buildPath(template: string, params: Record<string, string>): string {
    let path = template;

    // Replace route parameters
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`[${key}]`, value);
      path = path.replace(`[[${key}]]`, value || '');
      path = path.replace(`:${key}`, value);
    }

    // Clean up any remaining optional parameters
    path = path.replace(/\/\[\[[^\]]+\]\]/g, '');

    return path;
  }

  /**
   * Handle browser popstate event
   */
  private handlePopState(event: PopStateEvent): void {
    const currentState = get(this.state);
    this.updateCurrentPath(window.location.pathname);
  }

  /**
   * Handle beforeunload event
   */
  private handleBeforeUnload(event: BeforeUnloadEvent): string | void {
    // Check if there are any guards that might prevent navigation
    for (const guard of this.guards.values()) {
      if (guard.action === 'confirm' && guard.message) {
        event.preventDefault();
        event.returnValue = guard.message;
        return guard.message;
      }
    }
  }

  /**
   * Get navigation history
   */
  public getHistory(): NavigationHistoryEntry[] {
    return get(this.state).navigationHistory;
  }

  /**
   * Clear navigation history
   */
  public clearHistory(): void {
    this.state.update((state) => ({
      ...state,
      navigationHistory: [],
      canGoBack: false,
      canGoForward: false,
    }));
    this.historyIndex = -1;
  }

  /**
   * Get current breadcrumbs
   */
  public getBreadcrumbs(): BreadcrumbItem[] {
    return get(this.state).breadcrumbs;
  }

  /**
   * Check if currently navigating
   */
  public isNavigating(): boolean {
    return get(this.state).isNavigating;
  }

  /**
   * Get current path
   */
  public getCurrentPath(): string {
    return get(this.state).currentPath;
  }

  /**
   * Get previous path
   */
  public getPreviousPath(): string | null {
    return get(this.state).previousPath;
  }
}

// Export singleton instance
export const dynamicNavigation = new DynamicNavigation();
// Export derived stores for convenient access
export const navigationState = dynamicNavigation.getState();
export const currentPath = derived(navigationState, (state) => state.currentPath);
export const previousPath = derived(navigationState, (state) => state.previousPath);
export const breadcrumbs = derived(navigationState, (state) => state.breadcrumbs);
export const canGoBack = derived(navigationState, (state) => state.canGoBack);
export const canGoForward = derived(navigationState, (state) => state.canGoForward);
export const isNavigating = derived(navigationState, (state) => state.isNavigating);
export const navigationHistory = derived(navigationState, (state) => state.navigationHistory);
// Export convenience functions
export function navigate(path: string, options?: NavigationOptions): Promise<void> {
  return dynamicNavigation.navigate(path, options);
}

export function navigateToRoute(
  routeId: string,
  params?: Record<string, string>,
  options?: NavigationOptions
): Promise<void> {
  return dynamicNavigation.navigateToRoute(routeId, params, options);
}

export function goBack(): Promise<void> {
  return dynamicNavigation.goBack();
}

export function goForward(): Promise<void> {
  return dynamicNavigation.goForward();
}

export function refresh(invalidateAll?: boolean): Promise<void> {
  return dynamicNavigation.refresh(invalidateAll);
}

export function replace(path: string, state?: any): Promise<void> {
  return dynamicNavigation.replace(path, state);
}

export function addNavigationGuard(guard: NavigationGuard): void {
  return dynamicNavigation.addGuard(guard);
}

export function removeNavigationGuard(name: string): boolean {
  return dynamicNavigation.removeGuard(name);
}

export function clearNavigationGuards(): void {
  return dynamicNavigation.clearGuards();
}

/**
 * Higher-order component for route-aware navigation
 */
export function createRouteAwareNavigation(routeId: string) {
  return {
    navigate: (params: Record<string, string> = {}, options?: NavigationOptions) =>
      navigateToRoute(routeId, params, options),

    isActive: derived([currentPath], ([path]) => {
      const route = routeRegistry.getRoute(routeId);
      if (!route) return false;

      const routePath = 'route' in route ? route.route : route.path;
      return path === routePath || path.startsWith(routePath + '/');
    }),

    href: derived([page], ([page]) => {
      const route = routeRegistry.getRoute(routeId);
      if (!route) return '#';

      return 'route' in route ? route.route : route.path;
    }),
  };
}