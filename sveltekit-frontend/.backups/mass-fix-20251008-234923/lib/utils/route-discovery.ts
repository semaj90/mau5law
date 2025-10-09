/**
 * Dynamic Route Discovery System
 * Automatically discovers all SvelteKit routes in the application
 */

export interface RouteInfo {
  path: string;
  name: string;
  category: string;
  icon?: string;
  description?: string;
}

/**
 * Discover all routes programmatically
 */
export function discoverRoutes(): RouteInfo[] {
  const routes: RouteInfo[] = [
    // Core routes
    { path: '/', name: 'Home', category: 'core', icon: '🏠', description: 'Dashboard and overview' },
    { path: '/cases', name: 'Cases', category: 'core', icon: '📋', description: 'Case management' },
    { path: '/evidence', name: 'Evidence', category: 'core', icon: '🔍', description: 'Evidence board' },

    // AI routes
    { path: '/(ai)/chat', name: 'AI Chat', category: 'ai', icon: '💬' },
    { path: '/(ai)/rag', name: 'RAG Search', category: 'ai', icon: '🔎' },

    // Evidence routes
    { path: '/evidence/upload', name: 'Upload Evidence', category: 'evidence', icon: '📤' },
    { path: '/evidence/manage', name: 'Manage Evidence', category: 'evidence', icon: '⚙️' },
    { path: '/evidence/analyze', name: 'Analyze Evidence', category: 'evidence', icon: '🔬' },
    { path: '/evidence-board', name: 'Evidence Board', category: 'evidence', icon: '📌' },
    { path: '/evidence-canvas', name: 'Evidence Canvas', category: 'evidence', icon: '🎨' },
    { path: '/evidence-editor', name: 'Evidence Editor', category: 'evidence', icon: '✏️' },

    // POI routes
    { path: '/poi', name: 'Persons of Interest', category: 'poi', icon: '👤' },
    { path: '/persons', name: 'Persons', category: 'poi', icon: '👥' },

    // YoRHa routes
    { path: '/yorha', name: 'YoRHa Terminal', category: 'yorha', icon: '⚡' },
    { path: '/yorha/dashboard', name: 'YoRHa Dashboard', category: 'yorha', icon: '📊' },
  ];

  return routes;
}

export function getRoutesByCategory(category: string): RouteInfo[] {
  return discoverRoutes().filter(route => route.category === category);
}

export function searchRoutes(query: string): RouteInfo[] {
  const lowercaseQuery = query.toLowerCase();
  return discoverRoutes().filter(route =>
    route.name.toLowerCase().includes(lowercaseQuery) ||
    route.path.toLowerCase().includes(lowercaseQuery)
  );
}
