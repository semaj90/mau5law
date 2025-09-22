/**
 * SvelteKit 2 Route Discovery System
 * Automatically discovers and categorizes all available routes
 * Following SvelteKit 2 best practices for dynamic route management
 */

import { dev } from '$app/environment';
import type { RouteDefinition } from '$lib/data/routes-config';

export interface DiscoveredRoute {
  path: string;
  type: 'page' | 'api' | 'layout' | 'error';
  category: 'core-user' | 'core-legal' | 'core-admin' | 'api-production' | 'api-testing' | 'api-unversioned' | 'demo-development' | 'demo-showcase' | 'demo-games' | 'infrastructure' | 'other';
  priority: 'production' | 'testing' | 'consolidation' | 'demo' | 'other';
  hasServer: boolean;
  hasLayout: boolean;
  framework: 'sveltekit' | 'static';
  metadata?: {
    title?: string;
    description?: string;
    icon?: string;
    tags?: string[];
  };
}

/**
 * The 37 consolidatable routes identified for integration
 */
const CONSOLIDATABLE_ROUTES = [
  '/admin/gpu-demo',
  '/ai-test',
  '/auth/test',
  '/authenticated-crud-test',
  '/demo/enhanced-bits-showcase',
  '/dev/ai-setup',
  '/dev/cache-demo',
  '/dev/context7-test',
  '/dev/copilot-optimizer',
  '/dev/dynamic-routing-test',
  '/dev/enhanced-processor',
  '/dev/gpu-tiling',
  '/dev/ingestion-dashboard',
  '/dev/ingest-status',
  '/dev/mcp-tools',
  '/dev/metrics',
  '/dev/pgvector-test',
  '/dev/route-explorer',
  '/dev/self-prompting-demo',
  '/dev/suggestions',
  '/dev/tensor-demo',
  '/dev/vector-search-demo',
  '/dev/vite-error-demo',
  '/dev/webgl-fallback-test',
  '/dev/webgpu-diagnostics',
  '/examples/svelte5',
  '/legal-ai/database-sync-test',
  '/legal-ai/embedding-search-test',
  '/mcp/demo',
  '/nier-showcase',
  '/showcase',
  '/simple-test',
  '/simple-upload-test',
  '/upload-test',
  '/webgpu-test',
  '/yorha/api-test',
  '/yorha/detective/test'
];

/**
 * Categorize route based on path following SvelteKit 2 conventions
 */
export function categorizeRoute(path: string): DiscoveredRoute['category'] {
  // Core User Routes - Main user-facing functionality
  if (path === '/' || path.includes('/dashboard') || path.includes('/profile') ||
      path.includes('/settings') || path.includes('/search') || path.includes('/upload')) {
    return 'core-user';
  }

  // Legal Core Routes - Production legal functionality
  if (path.includes('/legal/') || path.includes('/cases/') || path.includes('/evidence/') ||
      path.includes('/contracts/') || path.includes('/case-management/')) {
    return 'core-legal';
  }

  // Administration Routes - Admin panels and management
  if (path.includes('/admin/') || path.includes('/users/') || path.includes('/cluster/') ||
      path.includes('/system/') || path.includes('/management/')) {
    return 'core-admin';
  }

  // Production APIs - Stable, versioned APIs
  if (path.includes('/api/v1/') || path.includes('/api/v2/')) {
    // Check if these are testing endpoints
    if (path.includes('/test') || path.includes('/mock') || path.includes('/debug') ||
        path.includes('/validate')) {
      return 'api-testing';
    }
    return 'api-production';
  }

  // APIs that need testing - Unversioned or test APIs
  if (path.includes('/api/') && (
    path.includes('/test') ||
    path.includes('/mock') ||
    path.includes('/debug') ||
    path.includes('/validate') ||
    path.includes('/experiment') ||
    path.includes('/dev') ||
    !path.includes('/api/v') // Unversioned APIs likely need testing
  )) {
    return 'api-testing';
  }

  // APIs that need versioning - Unversioned production APIs
  if (path.includes('/api/') && !path.includes('/api/v') && !path.includes('/test')) {
    return 'api-unversioned';
  }

  // Game Demos - Gaming and entertainment demos
  if (path.includes('/game/') || path.includes('/n64/') || path.includes('/nes/') ||
      path.includes('/tetris/') || path.includes('/mario/') || path.includes('/yorha/')) {
    return 'demo-games';
  }

  // Development Demos - Technical demos and experiments
  if (path.includes('/demo/') || path.includes('/test/') || path.includes('/experiment/') ||
      path.includes('/prototype/') || path.includes('/dev/') || path.includes('/showcase/')) {
    return 'demo-development';
  }

  // Feature Showcase - AI, WebGPU, and advanced features
  if (path.includes('/ai-demo') || path.includes('/webgpu') || path.includes('/cuda') ||
      path.includes('/embedding') || path.includes('/gpu-demo') || path.includes('/enhanced-bits/')) {
    return 'demo-showcase';
  }

  // Infrastructure routes
  if (path.includes('/health/') || path.includes('/cache/') || path.includes('/redis/') ||
      path.includes('/database/') || path.includes('/metrics/')) {
    return 'infrastructure';
  }

  return 'other';
}

/**
 * Determine priority based on category
 */
export function determinePriority(category: DiscoveredRoute['category']): DiscoveredRoute['priority'] {
  const categoryPriorityMap: Record<DiscoveredRoute['category'], DiscoveredRoute['priority']> = {
    'core-user': 'production',
    'core-legal': 'production',
    'core-admin': 'production',
    'api-production': 'production',
    'api-testing': 'testing',
    'api-unversioned': 'consolidation',
    'demo-development': 'demo',
    'demo-showcase': 'demo',
    'demo-games': 'demo',
    'infrastructure': 'production',
    'other': 'other'
  };

  return categoryPriorityMap[category] || 'other';
}

/**
 * Generate metadata for route based on path and category
 */
export function generateRouteMetadata(path: string, category: DiscoveredRoute['category']): DiscoveredRoute['metadata'] {
  const icons: Record<DiscoveredRoute['category'], string> = {
    'core-user': '👤',
    'core-legal': '⚖️',
    'core-admin': '👨‍💼',
    'api-production': '🚀',
    'api-testing': '🧪',
    'api-unversioned': '⚠️',
    'demo-development': '🛠️',
    'demo-showcase': '✨',
    'demo-games': '🎮',
    'infrastructure': '🏗️',
    'other': '📄'
  };

  const pathSegments = path.split('/').filter(Boolean);
  const title = pathSegments
    .map(segment => segment.replace(/[-_]/g, ' '))
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' → ');

  const tags = [];

  // Add category-based tags
  if (category.startsWith('api-')) tags.push('api');
  if (category.startsWith('demo-')) tags.push('demo');
  if (category.startsWith('core-')) tags.push('core');
  if (path.includes('/dev/')) tags.push('development');
  if (path.includes('/test')) tags.push('testing');

  // Add technology tags based on path
  if (path.includes('webgpu')) tags.push('webgpu');
  if (path.includes('webgl')) tags.push('webgl');
  if (path.includes('ai')) tags.push('ai');
  if (path.includes('legal')) tags.push('legal');
  if (path.includes('embedding')) tags.push('embeddings');
  if (path.includes('vector')) tags.push('vector-search');
  if (path.includes('cache')) tags.push('caching');
  if (path.includes('database')) tags.push('database');
  if (path.includes('mcp')) tags.push('mcp');
  if (path.includes('yorha')) tags.push('yorha');
  if (path.includes('nier')) tags.push('nier');

  return {
    title,
    description: `${category.replace('-', ' ')} route - ${title}`,
    icon: icons[category],
    tags
  };
}

/**
 * Convert discovered route to RouteDefinition format
 */
export function convertToRouteDefinition(discovered: DiscoveredRoute): RouteDefinition {
  const metadata = discovered.metadata || generateRouteMetadata(discovered.path, discovered.category);

  return {
    id: discovered.path.replace(/\//g, '-').replace(/^-/, '') || 'root',
    label: metadata.title || discovered.path,
    route: discovered.path,
    icon: metadata.icon || '📄',
    description: metadata.description || `Auto-discovered ${discovered.type} route`,
    category: mapCategoryToRouteDefinitionCategory(discovered.category),
    status: discovered.priority === 'production' ? 'active' :
            discovered.priority === 'testing' ? 'beta' :
            discovered.priority === 'demo' ? 'experimental' : 'development',
    tags: metadata.tags || ['auto-discovered']
  };
}

/**
 * Map discovery categories to RouteDefinition categories
 */
function mapCategoryToRouteDefinitionCategory(category: DiscoveredRoute['category']): RouteDefinition['category'] {
  const categoryMap: Record<DiscoveredRoute['category'], RouteDefinition['category']> = {
    'core-user': 'main',
    'core-legal': 'legal',
    'core-admin': 'admin',
    'api-production': 'system',
    'api-testing': 'dev',
    'api-unversioned': 'system',
    'demo-development': 'demo',
    'demo-showcase': 'demo',
    'demo-games': 'demo',
    'infrastructure': 'system',
    'other': 'utilities'
  };

  return categoryMap[category] || 'utilities';
}

/**
 * Discover all consolidatable routes and return them as RouteDefinitions
 */
export function getConsolidatableRoutes(): RouteDefinition[] {
  return CONSOLIDATABLE_ROUTES.map(path => {
    const category = categorizeRoute(path);
    const priority = determinePriority(category);
    const metadata = generateRouteMetadata(path, category);

    const discovered: DiscoveredRoute = {
      path,
      type: 'page',
      category,
      priority,
      hasServer: false, // Would need file system check in real implementation
      hasLayout: false, // Would need file system check in real implementation
      framework: 'sveltekit',
      metadata
    };

    return convertToRouteDefinition(discovered);
  });
}

/**
 * Get route statistics for the consolidatable routes
 */
export function getRouteStatistics() {
  const routes = getConsolidatableRoutes();

  const stats = {
    total: routes.length,
    byCategory: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    byStatus: {} as Record<string, number>
  };

  routes.forEach(route => {
    stats.byCategory[route.category] = (stats.byCategory[route.category] || 0) + 1;
    stats.byPriority[route.status] = (stats.byPriority[route.status] || 0) + 1;
    stats.byStatus[route.status] = (stats.byStatus[route.status] || 0) + 1;
  });

  return stats;
}

/**
 * SvelteKit 2 best practice: Progressive enhancement for route discovery
 */
export function enhanceRouteDiscovery() {
  if (dev) {
    console.log('🗺️ Route Discovery: Enhanced mode active');
    console.log(`📊 Discovered ${CONSOLIDATABLE_ROUTES.length} consolidatable routes`);
    console.log('📈 Statistics:', getRouteStatistics());
  }

  return {
    consolidatableRoutes: getConsolidatableRoutes(),
    statistics: getRouteStatistics(),
    categories: [...new Set(getConsolidatableRoutes().map(r => r.category))],
    isEnhanced: true
  };
}