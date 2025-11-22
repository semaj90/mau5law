<script lang="ts">
  import type { Card, CardContent, CardHeader, CardTitle  } from '$lib/components/ui/card';
  // Change: Use individual default imports for Dialog components
  // Revert: Use named imports from the dialog index file, which is the standard Shadcn-svelte pattern.
  import type { Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogFooter, // Added: Import DialogFooter from main dialog entry
    DialogHeader, // Added: Import DialogHeader from main dialog entry
    DialogClose, // Added: Import DialogClose from main dialog entry
  import type { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import type {
<script lang="ts">
  import type { Card, CardContent, CardHeader, CardTitle  } from '$lib/components/ui/card';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogFooter,
    DialogHeader,
    DialogClose,
   } from '$lib/components/ui/dialog';
  import type { Props } from '$lib/types/page';
  // Removed: import DialogFooter from '$lib/components/ui/dialog/DialogFooter.svelte';
  // Removed: import DialogHeader from '$lib/components/ui/dialog/DialogHeader.svelte';
  // Removed: import DialogClose from '$lib/components/ui/dialog/DialogClose.svelte';
  import type { Props } from '$lib/types/page'; // Import the Props type

  // All Routes Explorer - Comprehensive Legal AI Platform Route Analysis
  // Integrates with Gemma Embeddings Vector Architecture for route categorization

  // Removed: type Props definition moved to $lib/types/page.ts

  let { data }: Props = $props ();
  let selectedRoute = $state <RouteItem | null>(null); // Explicitly typed
  let showModal = $state <boolean>(false);
  let searchTerm = $state <string>('');
  let selectedCategory = $state <string>('all');
  let selectedSection = $state <string>('all');
  let isLoaded = $state <boolean>(false);
  let showStats = $state <boolean>(true);
  let showSSRTest = $state <boolean>(false);
  let layoutMode = $state <'grid' | 'flexbox'>('grid');
  let showClustered = $state <boolean>(false);

  // K-means clustering logic for API endpoints
  function clusterAPIEndpoints(routes: RouteItem[]): Record<string, RouteItem[]> {
    const apiRoutes = routes.filter((route) => route.path.startsWith('/api/'));
    const clusters: Record<string, RouteItem[]> = {};

    apiRoutes.forEach((route) => {
      const parts = route.path.split('/').filter(Boolean);
      let serviceName = 'other';

      if (parts[0] === 'api') {
        if (parts[1] && /^v\d+$/i.test(parts[1]) && parts[2]) {
          serviceName = parts[2];
        } else if (parts[1]) {
          serviceName = parts[1];
        }
      } else {
        serviceName = parts[0] || 'other';
      }

      const p = route.path.toLowerCase();
      if (/(auth|login|user)/.test(p)) serviceName = 'authentication';
      else if (/(legal|case|evidence|contract)/.test(p)) serviceName = 'legal-services';
      else if (/(ai|chat|embedding|ollama)/.test(p)) serviceName = 'ai-services';
      else if (/(search|vector|similarity)/.test(p)) serviceName = 'search-services';
      else if (/(upload|file|document)/.test(p)) serviceName = 'file-services';
      else if (/(health|metrics|status)/.test(p)) serviceName = 'monitoring';
      else if (/(test|mock|debug)/.test(p)) serviceName = 'testing';
      else if (/(cache|redis|database)/.test(p)) serviceName = 'infrastructure';
      else if (/(gpu|cuda|webgpu)/.test(p)) serviceName = 'gpu-services';

      if (!clusters[serviceName]) {
        clusters[serviceName] = [];
      }
      clusters[serviceName].push(route);
    });
    return clusters;
  }

  // Clustered API routes
  let clusteredAPIs = $state <Record<string, RouteItem[]>>({});

  // --- Add: lightweight types to avoid implicit: unknown errors ---
  type RouteItem = {
    path: string;
    name: string;
    type: 'configured' | 'file-based';
    icon?: string;
    description?: string;
    category: string;
  };

  type CategoryInfo = {
    name: string;
    icon: string;
    color?: string;
    priority: 'production' | 'testing' | 'consolidation' | 'demo' | 'other' | string;
  };

  type RouteStats = {
    total: number;
    byCategory: Record<string, number>;
    byType: { configured: number; 'file-based': number };
    byPriority: Record<string, number>;
    sections: { core: number; api: number; demo: number; infrastructure: number; other: number };
  };

  // Enhanced route categorization with separation of core vs demo vs API testing
  const routeCategories: Record<string, CategoryInfo> = {
    'core-user': { name: 'Core User Routes', icon: '👤', color: 'blue', priority: 'production' },
    'core-legal': { name: 'Legal Core', icon: '⚖️', color: 'indigo', priority: 'production' },
    'core-admin': { name: 'Administration', icon: '👨‍💼', color: 'red', priority: 'production' },
    'api-production': {
      name: 'Production APIs',
      icon: '🚀',
      color: 'green',
      priority: 'production',
    },
    'api-testing': { name: 'APIs Need Testing', icon: '🧪', color: 'yellow', priority: 'testing' },
    'api-unversioned': {
      name: 'APIs Need Versioning',
      icon: '⚠️',
      color: 'orange',
      priority: 'consolidation',
    },
    'demo-development': {
      name: 'Development Demos',
      icon: '🛠️',
      color: 'purple',
      priority: 'demo',
    },
    'demo-showcase': { name: 'Feature Showcase', icon: '✨', color: 'pink', priority: 'demo' },
    'demo-games': { name: 'Game Demos', icon: '🎮', color: 'cyan', priority: 'demo' },
    infrastructure: { name: 'Infrastructure', icon: '🏗️', color: 'gray', priority: 'production' },
    other: { name: 'Other', icon: '📄', color: 'slate', priority: 'other' },
  };

  function categorizeRoute(path: string): string {
    // Core User Routes - Main user-facing functionality
    if (
      path === '/' ||
      path.includes('/dashboard') ||
      path.includes('/profile') ||
      path.includes('/settings') ||
      path.includes('/search') ||
      path.includes('/upload')
    ) {
      return 'core-user';
    }

    // Legal Core Routes - Production legal functionality
    if (
      path.includes('/legal/') ||
      path.includes('/cases/') ||
      path.includes('/evidence/') ||
      path.includes('/contracts/')
    ) {
      return 'core-legal';
    }

    // Administration Routes - Admin panels and management
    if (
      path.includes('/admin/') ||
      path.includes('/users/') ||
      path.includes('/cluster/') ||
      path.includes('/system/')
    ) {
      return 'core-admin';
    }

    // Production APIs - Stable, versioned APIs
    if (path.includes('/api/v1/') || path.includes('/api/v2/')) {
      // Check if these are testing endpoints
      if (
        path.includes('/test') ||
        path.includes('/mock') ||
        path.includes('/debug') ||
        path.includes('/validate')
      ) {
        return 'api-testing';
      }
      return 'api-production';
    }

    // APIs that need testing - Unversioned or test APIs
    if (
      path.includes('/api/') &&
      (path.includes('/test') ||
        path.includes('/mock') ||
        path.includes('/debug') ||
        path.includes('/validate') ||
        path.includes('/experiment') ||
        path.includes('/dev') ||
        !path.includes('/api/v')) // Unversioned APIs likely need testing
    ) {
      return 'api-testing';
    }

    // APIs that need versioning - Unversioned production APIs
    if (path.includes('/api/') && !path.includes('/api/v') && !path.includes('/test')) {
      return 'api-unversioned';
    }

    // Game Demos - Gaming and entertainment demos
    if (
      path.includes('/game/') ||
      path.includes('/n64/') ||
      path.includes('/nes/') ||
      path.includes('/tetris/') ||
      path.includes('/mario/')
    ) {
      return 'demo-games';
    }

    // Development Demos - Technical demos and experiments
    if (
      path.includes('/demo/') ||
      path.includes('/test/') ||
      path.includes('/experiment/') ||
      path.includes('/prototype/')
    ) {
      return 'demo-development';
    }

    // Feature Showcase - AI, WebGPU, and advanced features
    if (
      path.includes('/ai-demo') ||
      path.includes('/webgpu') ||
      path.includes('/cuda') ||
      path.includes('/embedding') ||
      path.includes('/gpu-demo')
    ) {
      return 'demo-showcase';
    }

    // Infrastructure routes
    if (
      path.includes('/health/') ||
      path.includes('/cache/') ||
      path.includes('/redis/') ||
      path.includes('/database/') ||
      path.includes('/metrics/')
    ) {
      return 'infrastructure';
    }

    return 'other';
  }

  // Enhanced route processing with categorization - typed
  let allRoutes = $state <RouteItem[]>([]);

  // Enhanced route statistics with section separation - typed
  const initialStats: RouteStats = {
    total: 0,
    byCategory: {},
    byType: { configured: 0, 'file-based': 0 },
    byPriority: { production: 0, testing: 0, consolidation: 0, demo: 0, other: 0 },
    sections: { core: 0, api: 0, demo: 0, infrastructure: 0, other: 0 },
  };
  let routeStats = $state <RouteStats>(initialStats);

  // Enhanced filtering with section and category support
  let filteredRoutes = $state <RouteItem[]>([]);

  $effect (() => {
    const routes: RouteItem[] = [];
    // Add configured routes
    if (data.availableRoutes) {
      data.availableRoutes.forEach((route) => {
        routes.push({
          path: route.path,
          name: route.path.replace(/\//g, ' → '),
          type: 'configured',
          icon: route.icon || '📄',
          description: route.description,
          category: categorizeRoute(route.path),
        });
      });
    }

    // Add file-based routes from inventory
    if (data.routeInventory?.fileRoutesSample) {
      data.routeInventory.fileRoutesSample.forEach((route) => {
        routes.push({
          path: route.route, // Use route.route for fileRoutesSample
          name: route.title || route.route.replace(/\//g, ' → '), // Use route.title if available
          type: 'file-based',
          icon: '🔗',
          description: 'Auto-discovered route',
          category: categorizeRoute(route.route),
        });
      });
    }

    allRoutes = routes.sort((a: RouteItem, b: RouteItem) => a.path.localeCompare(b.path)); // Explicitly typed a, b
  });

  $effect (() => {
    const stats: RouteStats = {
      total: allRoutes.length,
      byCategory: {},
      byType: { configured: 0, 'file-based': 0 },
      byPriority: { production: 0, testing: 0, consolidation: 0, demo: 0, other: 0 },
      sections: { core: 0, api: 0, demo: 0, infrastructure: 0, other: 0 },
    };

    allRoutes.forEach((route: RouteItem) => {
      const categoryInfo = routeCategories[route.category];
      // Category stats
      stats.byCategory[route.category] = (stats.byCategory[route.category] || 0) + 1;
      // Type stats
      stats.byType[route.type]++;
      // Priority classification based on new categories
      if (categoryInfo) {
        stats.byPriority[categoryInfo.priority] =
          (stats.byPriority[categoryInfo.priority] || 0) + 1;
      }

      // Section classification
      if (route.category.startsWith('core-')) {
        stats.sections.core++;
      } else if (route.category.startsWith('api-')) {
        stats.sections.api++;
      } else if (route.category.startsWith('demo-')) {
        stats.sections.demo++;
      } else if (route.category === 'infrastructure') {
        stats.sections.infrastructure++;
      } else {
        stats.sections.other++;
      }
    });
    routeStats = stats;
  });

  $effect (() => {
    let routes = allRoutes;

    // Filter by section
    if (selectedSection !== 'all') {
      routes = routes.filter((route) => {
        if (selectedSection === 'core') return route.category.startsWith('core-');
        if (selectedSection === 'api') return route.category.startsWith('api-');
        if (selectedSection === 'demo') return route.category.startsWith('demo-');
        if (selectedSection === 'infrastructure') return route.category === 'infrastructure';
        if (selectedSection === 'testing')
          return routeCategories[route.category]?.priority === 'testing';
        return true;
      });
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      routes = routes.filter((route) => route.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      routes = routes.filter(
        (route) =>
          route.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (route.description && route.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    filteredRoutes = routes;
  });

  $effect (() => {
    clusteredAPIs = clusterAPIEndpoints(allRoutes);
  });

  function openRouteModal(route: RouteItem) {
    // Explicitly typed route
    selectedRoute = route;
    showModal = true;
  }

  $effect (() => {
    isLoaded = true;
    console.log('All routes page loaded with', allRoutes.length, 'routes');
  });

  // --- Add: color class mapping helper to avoid `bg-{ color }-50` style tokens ---
  const colorClassMap: Record<string, Record<string, string>> = {
    blue: {
      bg50: 'bg-blue-50',
      bg100: 'bg-blue-100',
      text800: 'text-blue-800',
      text700: 'text-blue-700',
      text600: 'text-blue-600',
      border200: 'border-blue-200',
      border300: 'border-blue-300',
      hoverBorder300: 'hover:border-blue-300',
      bg500: 'bg-blue-500',
      hover500: 'hover:bg-blue-600',
    },
    green: {
      bg50: 'bg-green-50',
      bg100: 'bg-green-100',
      text800: 'text-green-800',
      text600: 'text-green-600',
      border200: 'border-green-200',
      border300: 'border-green-300',
      hoverBorder300: 'hover:border-green-300',
      bg500: 'bg-green-500',
      hover500: 'hover:bg-green-600',
    },
    purple: {
      bg50: 'bg-purple-50',
      bg100: 'bg-purple-100',
      text800: 'text-purple-800',
      text600: 'text-purple-600',
      border200: 'border-purple-200',
      border300: 'border-purple-300',
      hoverBorder300: 'hover:border-purple-300',
      bg500: 'bg-purple-500',
      hover500: 'hover:bg-purple-600',
    },
    yellow: {
      bg50: 'bg-yellow-50',
      bg100: 'bg-yellow-100',
      text800: 'text-yellow-800',
      text600: 'text-yellow-600',
      border200: 'border-yellow-200',
      border300: 'border-yellow-300',
      hoverBorder300: 'hover:border-yellow-300',
      bg500: 'bg-yellow-500',
      hover500: 'hover:bg-yellow-600',
    },
    gray: {
      bg50: 'bg-gray-50',
      bg100: 'bg-gray-100',
      text800: 'text-gray-800',
      text600: 'text-gray-600',
      border200: 'border-gray-200',
      border300: 'border-gray-300',
      hoverBorder300: 'hover:border-gray-300',
      bg500: 'bg-gray-500',
      hover500: 'hover:bg-gray-600',
    },
    orange: {
      bg50: 'bg-orange-50',
      bg100: 'bg-orange-100',
      text800: 'text-orange-800',
      text600: 'text-orange-600',
      border200: 'border-orange-200',
      border300: 'border-orange-300',
      hoverBorder300: 'hover:border-orange-300',
      bg500: 'bg-orange-500',
      hover500: 'hover:bg-orange-600',
    },
    pink: {
      bg50: 'bg-pink-50',
      bg100: 'bg-pink-100',
      text800: 'text-pink-800',
      text600: 'text-pink-600',
      border200: 'border-pink-200',
      border300: 'border-pink-300',
      hoverBorder300: 'hover:border-pink-300',
      bg500: 'bg-pink-500',
      hover500: 'hover:bg-pink-600',
    },
    indigo: {
      bg50: 'bg-indigo-50',
      bg100: 'bg-indigo-100',
      text800: 'text-indigo-800',
      text600: 'text-indigo-600',
      border200: 'border-indigo-200',
      border300: 'border-indigo-300',
      hoverBorder300: 'hover:border-indigo-300',
      bg500: 'bg-indigo-500',
      hover500: 'hover:bg-indigo-600',
    },
    emerald: {
      bg50: 'bg-emerald-50',
      bg100: 'bg-emerald-100',
      text800: 'text-emerald-800',
      text600: 'text-emerald-600',
      border200: 'border-emerald-200',
      border300: 'border-emerald-300',
      hoverBorder300: 'hover:border-emerald-300',
      bg500: 'bg-emerald-500',
      hover500: 'hover:bg-emerald-600',
    },
    cyan: {
      bg50: 'bg-cyan-50',
      bg100: 'bg-cyan-100',
      text800: 'text-cyan-800',
      text600: 'text-cyan-600',
      border200: 'border-cyan-200',
      border300: 'border-cyan-300',
      hoverBorder300: 'hover:border-cyan-300',
      bg500: 'bg-cyan-500',
      hover500: 'hover:bg-cyan-600',
    },
    slate: {
      bg50: 'bg-slate-50',
      bg100: 'bg-slate-100',
      text800: 'text-slate-800',
      text600: 'text-slate-600',
      border200: 'border-slate-200',
      border300: 'border-slate-300',
      hoverBorder300: 'hover:border-slate-300',
      bg500: 'bg-slate-500',
      hover500: 'hover:bg-slate-600',
    },
  };

  function getCategoryClasses(color: string | undefined) {
    if (!color) return colorClassMap.gray;
    return colorClassMap[color] ?? colorClassMap.gray;
  }

  // Minimal openCluster dialog state (keeps previous API)
  let openClusterDialogs = $state <{ [key: string]: boolean }>({});
  function openCluster(serviceName: string) {
    openClusterDialogs = { ...(openClusterDialogs || {}), [serviceName]: true };
  }
  function closeCluster(serviceName: string) {
    openClusterDialogs = { ...(openClusterDialogs || {}), [serviceName]: false };
  }
</script>

<div class="container mx-auto p-6">
  <header class="text-center">
    <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
      🗺️ Legal AI Route Explorer
    </h1>
    <p class="text-gray-600">
      Comprehensive routing analysis for the Gemma Embeddings Vector Architecture
    </p>
  </header>

  {#if isLoaded}
    <!-- Enhanced, Statistics, Dashboard -->

    {#if showStats}
      <div class="mb-8">
        <div class="flex justify-between items-center">
          <h2 class="text-2xl">📊 Platform Overview</h2>
          <button
            onclick={() => (showStats = !showStats)}
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {showStats ? 'Hide' : 'Show'} Stats
          </button>
        </div>

        <!-- Section, Overview -->
        <!-- Section Overview -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card class="bg-gradient-to-br from-blue-50 to-blue-100 border-2">
            <CardContent class="p-4">
              <h3 class="font-bold text-lg text-blue-800 flex items-center">👤 Core User</h3>
              <p class="text-3xl font-bold">{routeStats.sections.core}</p>
              <p class="text-sm">Production ready</p>
            </CardContent>
          </Card>
          <Card class="bg-gradient-to-br from-green-50 to-green-100 border-2">
            <CardContent class="p-4">
              <h3 class="font-bold text-lg text-green-800 flex items-center">🔌 API Routes</h3>
              <p class="text-3xl font-bold">{routeStats.sections.api}</p>
              <p class="text-sm">Backend services</p>
            </CardContent>
          </Card>
          <Card class="bg-gradient-to-br from-purple-50 to-purple-100 border-2">
            <CardContent class="p-4">
              <h3 class="font-bold text-lg text-purple-800 flex items-center">🧪 Demo Routes</h3>
              <p class="text-3xl font-bold">{routeStats.sections.demo}</p>
              <p class="text-sm">Development</p>
            </CardContent>
          </Card>
          <Card class="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2">
            <CardContent class="p-4">
              <h3 class="font-bold text-lg text-yellow-800 flex items-center">🧪 Need Testing</h3>
              <p class="text-3xl font-bold">{routeStats.byPriority.testing}</p>
              <p class="text-sm">API testing</p>
            </CardContent>
          </Card>
          <Card class="bg-gradient-to-br from-gray-50 to-gray-100 border-2">
            <CardContent class="p-4">
              <h3 class="font-bold text-lg text-gray-800 flex items-center">📊 Total Routes</h3>
              <p class="text-3xl font-bold">{routeStats.total}</p>
              <p class="text-sm">Platform-wide</p>
            </CardContent>
          </Card>
        </div>

        <!-- Priority, Breakdown -->
        <!-- Priority Breakdown -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            class="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-lg"
            class="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-lg p-4"
          >
            <h3 class="font-bold text-lg text-emerald-800 flex items-center">
              🚀 Production Ready
            </h3>
            <p class="text-3xl font-bold">{routeStats.byPriority.production}</p>
            <p class="text-sm">Core + APIs</p>
          </div>
          <div
            class="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg"
            class="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-4"
          >
            <h3 class="font-bold text-lg text-orange-800 flex items-center">⚠️ Need Versioning</h3>
            <p class="text-3xl font-bold">{routeStats.byPriority.consolidation}</p>
            <p class="text-sm">Unversioned APIs</p>
          </div>
          <div
            class="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-300 rounded-lg"
            class="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-300 rounded-lg p-4"
          >
            <h3 class="font-bold text-lg text-pink-800 flex items-center">✨ Demo Showcase</h3>
            <p class="text-3xl font-bold">{routeStats.byPriority.demo}</p>
            <p class="text-sm">Development demos</p>
          </div>
          <div
            class="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 rounded-lg"
            class="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 rounded-lg p-4"
          >
            <h3 class="font-bold text-lg text-indigo-800 flex items-center">🏗️ Infrastructure</h3>
            <p class="text-3xl font-bold">{routeStats.sections.infrastructure}</p>
            <p class="text-sm">System monitoring</p>
          </div>
        </div>

        <!-- Category, Breakdown -->
        <div class="bg-white rounded-lg border-2 border-gray-200">
          <h3 class="text-xl font-bold">🎯 Route Categories</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <!-- Category Breakdown -->
        <div class="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 class="text-xl font-bold mb-4">🎯 Route Categories</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {#each Object.entries(routeCategories) as [key, category]}
              {@const count = routeStats.byCategory[key] || 0}
              {@const cls = getCategoryClasses(category.color)}
              <div class={'text-center p-3 rounded-lg ' + cls.bg50 + ' ' + cls.border200}>
              <div class={'text-center p-3 rounded-lg ' + cls.bg50 + ' border ' + cls.border200}>
                <div class="text-2xl">{category.icon}</div>
                <div class={'font-bold ' + cls.text800}>{count}</div>
                <div class={'text-xs ' + cls.text600}>{category.name}</div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Enhanced Search and, Filters -->
    <!-- Enhanced Search and Filters -->
    <div class="bg-white rounded-lg border-2 border-gray-200 p-6">
      <div class="flex flex-col lg:flex-row">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Search -->
        <div class="flex-1">
          <label for="search-routes" class="block text-sm font-medium text-gray-700"
          <label for="search-routes" class="block text-sm font-medium text-gray-700 mb-2"
            >🔍 Search Routes</label
          >
          <input
            type="text"
            id="search-routes"
            bind:value={searchTerm}
            placeholder="Search by path, name, or description..."
            class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
          />
        </div>

        <!-- Section, Filter -->
        <!-- Section Filter -->
        <div class="lg:w-48">
          <label for="section-filter" class="block text-sm font-medium text-gray-700"
          <label for="section-filter" class="block text-sm font-medium text-gray-700 mb-2"
            >📂 Section</label
          >
          <select
            id="section-filter"
            bind:value={selectedSection}
            class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
          >
            <option value="all">All Sections ({routeStats.total})</option>
            <option value="core">👤 Core User ({routeStats.sections.core})</option>
            <option value="api">🔌 API Routes ({routeStats.sections.api})</option>
            <option value="demo">🧪 Demo Routes ({routeStats.sections.demo})</option>
            <option value="testing">🧪 Need Testing ({routeStats.byPriority.testing})</option>
            <option value="infrastructure"
              >🏗️ Infrastructure ({routeStats.sections.infrastructure})</option
            >
          </select>
        </div>

        <!-- Category, Filter -->
        <!-- Category Filter -->
        <div class="lg:w-64">
          <label for="category-filter" class="block text-sm font-medium text-gray-700"
          <label for="category-filter" class="block text-sm font-medium text-gray-700 mb-2"
            >🎯 Category</label
          >
          <select
            id="category-filter"
            bind:value={selectedCategory}
            class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
          >
            <option value="all">All Categories</option>

            {#each Object.entries(routeCategories) as [key, category]}
              {@const count = routeStats.byCategory[key] || 0}
              {#if count > 0}
                <option value={key}>{category.icon} {category.name} ({count})</option>
              {/if}
            {/each}
          </select>
        </div>
      </div>

      <!-- Quick Filter, Buttons -->
      <!-- Quick Filter Buttons -->
      <div class="mt-4">
        <span id="quick-filters-label" class="block text-sm font-medium text-gray-700"
        <span id="quick-filters-label" class="block text-sm font-medium text-gray-700 mb-2"
          >⚡ Quick Filters</span
        >
        <div class="flex flex-wrap" aria-labelledby="quick-filters-label">
        <div class="flex flex-wrap gap-2" aria-labelledby="quick-filters-label">
          <button
            onclick={() => {
              selectedSection = 'core';
              selectedCategory = 'all';
            }}
            class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full text-sm transition-colors"
          >
            👤 Core User ({routeStats.sections.core})
          </button>
          <button
            onclick={() => {
              selectedSection = 'testing';
              selectedCategory = 'all';
            }}
            class="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full text-sm transition-colors"
          >
            🧪 APIs Need Testing ({routeStats.byPriority.testing})
          </button>
          <button
            onclick={() => {
              selectedSection = 'demo';
              selectedCategory = 'all';
            }}
            class="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-full text-sm transition-colors"
          >
            ✨ Demo Routes ({routeStats.sections.demo})
          </button>
          <button
            onclick={() => {
              selectedCategory = 'api-unversioned';
              selectedSection = 'all';
            }}
            class="px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-full text-sm transition-colors"
          >
            ⚠️ Need Versioning ({routeStats.byPriority.consolidation})
          </button>
        </div>
      </div>

      <!-- Active, Filters -->
      <!-- Active Filters -->

      {#if selectedCategory !== 'all' || selectedSection !== 'all' || searchTerm}
        <div class="mt-4 flex flex-wrap">
          <span class="text-sm">Active filters:</span>
        <div class="mt-4 flex flex-wrap gap-2">
          <span class="text-sm text-gray-600">Active filters:</span>

          {#if selectedSection !== 'all'}
            <span
              class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center"
              class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center gap-1"
            >
              📂 Section {selectedSection}
              <button
                onclick={() => (selectedSection = 'all')}
                class="ml-1 text-purple-600 hover:text-purple-800">×</button
              >
            </span>
          {/if}
          {#if selectedCategory !== 'all'}
            <span
              class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center"
              class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
            >
              {routeCategories[selectedCategory].icon}
              {routeCategories[selectedCategory].name}
              <button
                onclick={() => (selectedCategory = 'all')}
                class="ml-1 text-blue-600 hover:text-blue-800">×</button
              >
            </span>{/if}
          {#if searchTerm}
            <span
              class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center"
              class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1"
            >
              🔍 "{searchTerm}"
              <button
                onclick={() => (searchTerm = '')}
                class="ml-1 text-green-600 hover:text-green-800">×</button
              >
            </span>
          {/if}
          <button
            onclick={() => {
              selectedSection = 'all';
              selectedCategory = 'all';
              searchTerm = '';
            }}
            class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full text-sm transition-colors"
          >
            🔄 Clear All
          </button>
        </div>
      {/if}
    </div>

    <!-- Enhanced, Routes, Grid -->
    <div class="mb-4 flex justify-between">
    <!-- Enhanced Routes Grid -->
    <div class="mb-4 flex justify-between items-center">
      <h2 class="text-2xl">🚀 Routes ({filteredRoutes.length})</h2>
      <div class="flex items-center">
        <!-- SSR, Test, Toggle -->
        <button
          onclick={() => (showSSRTest = !showSSRTest)}
          class="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-full text-sm transition-colors"
        >
          🧪 {showSSRTest ? 'Hide' : 'Show'} SSR Test
        </button>

        <!-- View Mode, Toggles -->
        <div class="flex">
          <button
            onclick={() => {
              layoutMode = 'grid';
              showClustered = false;
            }}
            class="px-3 py-1 rounded text-sm transition-colors {layoutMode === 'grid' &&
            !showClustered
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          >
            🔲 Grid
          </button>
          <button
            onclick={() => {
              layoutMode = 'flexbox';
              showClustered = false;
            }}
            class="px-3 py-1 rounded text-sm transition-colors {layoutMode === 'flexbox' &&
            !showClustered
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          >
            📊 Flexbox SSR
          </button>
          <button
            onclick={() => (showClustered = !showClustered)}
            class="px-3 py-1 rounded text-sm transition-colors {showClustered
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          >
            🔗 API Clusters
          </button>
        </div>
        <div class="text-sm">Showing {filteredRoutes.length} of {routeStats.total} routes</div>
      </div>
    </div>

    <!-- SSR Testing, Info, Panel -->

    {#if showSSRTest}
      <Card class="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-2">
        <CardContent class="p-4">
          <h3 class="text-lg font-bold text-purple-800 mb-2 flex items-center">
            🧪 SSR UI Components Test
          </h3>
          <p class="text-sm text-gray-700">
            Testing server-side rendering of UI components with CSS flexbox layout. Components are
            pre-rendered on the server for faster initial page load.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white/50 rounded">
              <strong>SSR Benefits:</strong> <br />• Faster first paint <br />• Better SEO <br />•
              Improved accessibility
            </div>
            <div class="bg-white/50 rounded">
              <strong>Flexbox Layout:</strong> <br />• Responsive columns <br />• Equal height cards
              <br />• Automatic wrapping
            </div>
            <div class="bg-white/50 rounded">
              <strong>Component Tests:</strong> <br />• Card components <br />• Typography rendering
              <br />• Icon display
            </div>
          </div>
        </CardContent>
      </Card>
    {/if}

    <!-- Clustered API, Services, View -->

    {#if showClustered}
      <div class="mb-8">
        <h3 class="text-xl font-bold mb-4 flex items-center">
          🔗 API Service Clusters
          <span class="text-sm font-normal"
            >({Object.keys(clusteredAPIs).length} services, {Object.values(clusteredAPIs).flat()
              .length} endpoints)</span
          >
        </h3>

        <!-- Enhanced SSR-optimized API service, cluster, grid -->
        <div class="api-service-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {#each Object.entries(clusteredAPIs) as [serviceName, endpoints]}
            {@const serviceIcon =
              serviceName === 'authentication'
                ? '🔐'
                : serviceName === 'legal-services'
                  ? '⚖️'
                  : serviceName === 'ai-services'
                    ? '🧠'
                    : serviceName === 'search-services'
                      ? '🔍'
                      : serviceName === 'file-services'
                        ? '📁'
                        : serviceName === 'monitoring'
                          ? '📊'
                          : serviceName === 'testing'
                            ? '🧪'
                            : serviceName === 'infrastructure'
                              ? '🏗️'
                              : serviceName === 'gpu-services'
                                ? '🖥️'
                                : '🔌'}
            <Card class="service-cluster border-2 border-gray-300">
              <CardHeader>
                <CardTitle class="flex items-center">
                  <div class="flex items-center">
                    <span class="text-2xl">{serviceIcon} </span>
                    <div>
                      <h4 class="font-bold text-lg">{serviceName.replace('-', ' ')}</h4>
                      <p class="text-sm">
                        {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent class="card-content">
                <!-- Service Endpoints Preview with, enhanced, styling -->
                <div class="endpoint-list">
                  {#each Array.isArray(endpoints.slice(0, 5)) ? endpoints.slice(0, 5) : [] as endpoint}
                    <div class="endpoint-item">
                      <code class="endpoint-code">{endpoint.path} </code>
                      <a
                        href={endpoint.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs"
                        title="Visit {endpoint.path}"
                      >
                        →
                      </a>
                    </div>
                  {/each}
                  {#if endpoints.length > 5}
                    <div class="endpoint-item">
                      <code class="endpoint-code">...and {endpoints.length - 5} more</code>
                    </div>
                  {/if}
                </div>

                <div class="action-buttons">
                  <!-- replace DialogTrigger + bind:open with, explicit, control -->
                  <button
                    onclick={() => openCluster(serviceName)}
                    class="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium transition-colors"
                  >
                    📋 View All ({endpoints.length})
                  </button>
                  <Dialog
                    open={!!openClusterDialogs?.[serviceName]}
                    onOpenChange={(v: boolean) => !v && closeCluster(serviceName)}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {serviceIcon}
                          {serviceName.replace('-', ' ')} Service
                        </DialogTitle>
                        <DialogDescription>
                          List of all endpoints for the {serviceName.replace('-', ' ')} service.
                        </DialogDescription>
                      </DialogHeader>
                      <div class="grid gap-3">
                        {#each Array.isArray(endpoints) ? endpoints : [] as endpoint}
                          <div class="flex items-center justify-between p-3 bg-gray-50">
                            <div class="flex-1">
                              <code class="text-sm font-mono">{endpoint.path} </code>

                              {#if endpoint.description}
                                <p class="text-xs text-gray-600">{endpoint.description}</p>
                              {/if}
                            </div>
                            <div class="flex">
                              <a
                                href={endpoint.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                              >
                                🚀 Visit
                              </a>
                              <button
                                onclick={() => navigator.clipboard.writeText(endpoint.path)}
                                class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-xs"
                              >
                                📋
                              </button>
                            </div>
                          </div>
                        {/each}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <button class="px-3 py-1 bg-gray-100 rounded">Close</button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          {/each}
        </div>
      </div>
    {/if}

    <!-- SSR Flexbox, Layout -->

    {#if layoutMode === 'flexbox' && !showClustered}
      <div class="ssr-flexbox-container flex flex-wrap">
        {#each filteredRoutes as route, index}
          {@const categoryInfo = routeCategories[route.category]}
          {@const cls = getCategoryClasses(categoryInfo?.color)}
          {@const columnClass =
            index % 3 === 0 ? 'flex-basis-31' : index % 3 === 1 ? 'flex-basis-33' : 'flex-basis-35'}
          <button
            type="button"
            class="h-full p-0 border-none bg-transparent text-left {columnClass}"
            onclick={() => openRouteModal(route)}
          >
            <Card class="{cls.hoverBorder300} group">
              <CardContent class="p-4">
                <!-- Route, Header -->
                <div class="flex items-start justify-between">
                  <div class="flex items-center flex-1">
                    <span class="text-2xl mr-3">{categoryInfo.icon} </span>
                    <div class="min-w-0">
                      <h3 class="font-semibold text-lg truncate group-hover:{cls.text700}">
                        {route.name}
                      </h3>
                      <p class="text-xs text-gray-500 uppercase tracking-wide">
                        {categoryInfo.name}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Route, Path -->
                <div class="mb-3">
                  <code class="text-sm bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                    {route.path}
                  </code>
                </div>

                <!-- Route, Description -->

                {#if route.description}
                  <p class="text-sm text-gray-600 mb-3">
                    {route.description}
                  </p>
                {/if}

                <!-- Route, Tags -->
                <div class="flex flex-wrap gap-2">
                  <span
                    class={'px-2 py-1 rounded-full text-xs ' +
                      cls.bg100 +
                      ' ' +
                      cls.text800 +
                      ' ' +
                      cls.border200}
                  >
                    {categoryInfo.name}
                  </span>
                  <span
                    class={'px-2 py-1 rounded-full text-xs ' +
                      (route.type === 'configured'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200')}
                  >
                    {route.type}
                  </span>
                </div>

                <!-- Route, Actions -->
                <div class="flex">
                  <a
                    href={route.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onclick={(e) => {
                      e.stopPropagation();
                    }}
                    class={'flex-1 px-3 py-2 ' +
                      cls.bg500 +
                      ' text-white rounded ' +
                      cls.hover500 +
                      ' text-sm font-medium transition-colors flex items-center justify-center gap-1'}
                  >
                    🚀 Visit
                  </a>
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(route.path);
                    }}
                    class="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm transition-colors"
                  >
                    📋
                  </button>
                </div>
              </CardContent>
            </Card>
          </button>
        {/each}
      </div>
    {:else if !showClustered}
      <!-- Standard, Grid, Layout -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each filteredRoutes as route}
          {@const categoryInfo = routeCategories[route.category]}
          {@const cls = getCategoryClasses(categoryInfo?.color)}
          <button
            type="button"
            class="w-full h-full p-0 border-none bg-transparent text-left"
            onclick={() => openRouteModal(route)}
          >
            <Card class={'hover:' + cls.border300 + ' group'}>
              <CardContent class="p-4">
                <!-- Route, Header -->
                <div class="flex items-start justify-between">
                  <div class="flex items-center flex-1">
                    <span class="text-2xl mr-3">{categoryInfo.icon} </span>
                    <div class="min-w-0">
                      <h3 class="font-semibold text-lg truncate group-hover:{cls.text700}">
                        {route.name}
                      </h3>
                      <p class="text-xs text-gray-500 uppercase tracking-wide">
                        {categoryInfo.name}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Route, Path -->
                <div class="mb-3">
                  <code class="text-sm bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                    {route.path}
                  </code>
                </div>

                <!-- Route, Description -->

                {#if route.description}
                  <p class="text-sm text-gray-600 mb-3">
                    {route.description}
                  </p>
                {/if}

                <!-- Route, Tags -->
                <div class="flex flex-wrap gap-2">
                  <span
                    class={'px-2 py-1 rounded-full text-xs ' +
                      cls.bg100 +
                      ' ' +
                      cls.text800 +
                      ' ' +
                      cls.border200}
                  >
                    {categoryInfo.name}
                  </span>
                  <span
                    class={'px-2 py-1 rounded-full text-xs ' +
                      (route.type === 'configured'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200')}
                  >
                    {route.type}
                  </span>
                </div>

                <!-- Route, Actions -->
                <div class="flex">
                  <a
                    href={route.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onclick={(e) => {
                      e.stopPropagation();
                    }}
                    class={'flex-1 px-3 py-2 ' +
                      cls.bg500 +
                      ' text-white rounded ' +
                      cls.hover500 +
                      ' text-sm font-medium transition-colors flex items-center justify-center gap-1'}
                  >
                    🚀 Visit
                  </a>
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(route.path);
                    }}
                    class="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm transition-colors"
                  >
                    📋
                  </button>
                </div>
              </CardContent>
            </Card>
          </button>
        {/each}
      </div>
    {/if}

    {#if filteredRoutes.length === 0}
      <div class="text-center py-12 bg-white rounded-lg border-2">
        <div class="text-6xl">🔍</div>
        <h3 class="text-xl font-bold text-gray-800">No Routes Found</h3>
        <p class="text-gray-500">
          {#if searchTerm}
            No routes found matching: "<strong>{searchTerm} </strong>"
          {:else}
            No routes found in the selected category
          {/if}
        </p>
        <button
          onclick={() => {
            searchTerm = '';
            selectedCategory = 'all';
          }}
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          🔄 Clear Filters
        </button>
      </div>
    {/if}

    <!-- Gemma Architecture Integration, Info -->
    <div
      class="mt-12 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg"
    >
      <h3 class="text-xl font-bold mb-4 flex items-center">
        🔬 Gemma Embeddings Vector Architecture Integration
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3">
        <div class="bg-white/50 rounded-lg">
          <h4 class="font-bold text-purple-800">🧠 AI/ML Routes</h4>
          <p class="text-sm">
            Routes leveraging Gemma embeddings for legal document processing, vector search, and RAG
            operations.
          </p>
          <div class="mt-2">
            <span class="text-2xl font-bold text-purple-900"
              >{routeStats.byCategory['ai-ml'] || 0}
            </span>
            <span class="text-sm text-purple-600">routes</span>
          </div>
        </div>
        <div class="bg-white/50 rounded-lg">
          <h4 class="font-bold text-cyan-800">🔍 Vector Search</h4>
          <p class="text-sm">
            pgvector-powered similarity search endpoints integrated with Gemma embeddings for legal
            discovery.
          </p>
          <div class="mt-2">
            <span class="text-2xl font-bold text-cyan-900"
              >{routeStats.byCategory['vector-search'] || 0}
            </span>
            <span class="text-sm text-cyan-600">routes</span>
          </div>
        </div>
        <div class="bg-white/50 rounded-lg">
          <h4 class="font-bold text-gray-800">📊 Monitoring & Infrastructure</h4>
          <p class="text-sm">
            Routes for system health, metrics, and infrastructure management.
          </p>
          <div class="mt-2">
            <span class="text-2xl font-bold text-gray-900"
              >{routeStats.byCategory['infrastructure'] || 0}
            </span>
            <span class="text-sm text-gray-600">routes</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<Dialog open={showModal} onOpenChange={(v) => (showModal = v)}>
  <DialogContent class="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>{selectedRoute?.name}</DialogTitle>
      <DialogDescription>Details for the route: {selectedRoute?.path}</DialogDescription>
    </DialogHeader>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <span class="text-right font-medium">Path:</span>
        <code class="col-span-3 bg-gray-100 p-2 rounded">{selectedRoute?.path}</code>
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <span class="text-right font-medium">Type:</span>
        <span class="col-span-3">{selectedRoute?.type}</span>
      </div>
      {#if selectedRoute?.description}
        <div class="grid grid-cols-4 items-center gap-4">
          <span class="text-right font-medium">Description:</span>
          <span class="col-span-3">{selectedRoute?.description}</span>
        </div>
      {/if}
      <div class="grid grid-cols-4 items-center gap-4">
        <span class="text-right font-medium">Category:</span>
        <span class="col-span-3"
          >{routeCategories[selectedRoute?.category || 'other']?.name}</span
        >
      </div>
    </div>
    <DialogFooter>
      <DialogClose asChild>
        <button class="px-4 py-2 bg-gray-100 rounded">Close</button>
      </DialogClose>
      <a
        href={selectedRoute?.path}
        target="_blank"
        rel="noopener noreferrer"
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Visit Route
      </a>
    </DialogFooter>
  </DialogContent>
</Dialog>

<style>
  /* Flexbox layout for SSR optimization */
  .ssr-flexbox-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem; /* Adjust gap as needed */
  }

  .flex-basis-31 {
    flex-basis: calc(31% - 1rem); /* Roughly 1/3 with gap */
  }
  .flex-basis-33 {
    flex-basis: calc(33% - 1rem); /* Roughly 1/3 with gap */
  }
  .flex-basis-35 {
    flex-basis: calc(35% - 1rem); /* Roughly 1/3 with gap */
  }

  @media (max-width: 768px) {
    .flex-basis-31,
    .flex-basis-33,
    .flex-basis-35 {
      flex-basis: 100%; /* Full width on small screens */
    }
  }

  /* General styling for route cards */
  .route-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
    transition: all 0.2s ease-in-out;
  }

  .route-card:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .route-card-content {
    padding: 1rem;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .route-card-header {
    display: flex;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .route-card-icon {
    font-size: 1.5rem;
    margin-right: 0.75rem;
  }

  .route-card-title {
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.25;
    margin-bottom: 0.25rem;
  }

  .route-card-category {
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .route-card-path {
    background-color: #f1f5f9;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.875rem;
    color: #334155;
    margin-bottom: 0.75rem;
    word-break: break-all;
  }

  .route-card-description {
    font-size: 0.875rem;
    color: #475569;
    margin-bottom: 1rem;
    flex-grow: 1;
  }

  .route-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .route-card-tag {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid;
  }

  .route-card-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: auto; /* Pushes actions to the bottom */
  }

  .route-card-action-button {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: center;
    transition: all 0.2s ease-in-out;
  }

  .route-card-action-button.visit {
    background-color: #3b82f6;
    color: white;
  }

  .route-card-action-button.visit:hover {
    background-color: #2563eb;
  }

  .route-card-action-button.copy {
    border: 1px solid #cbd5e1;
    background-color: white;
    color: #475569;
  }

  .route-card-action-button.copy:hover {
    background-color: #f1f5f9;
  }

  /* API Service Cluster Specific Styles */
  .api-service-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .service-cluster {
    display: flex;
    flex-direction: column;
    height: 100%;
    transition: all 0.3s ease;
    min-height: 340px;
    max-height: 500px;
  }

  .service-cluster .card-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .endpoint-list {
    margin-bottom: 1rem;
    flex-grow: 1;
    overflow-y: auto;
    max-height: 200px; /* Limit height for scrollable list */
  }

  .endpoint-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px dashed #e2e8f0;
  }

  .endpoint-item:last-child {
    border-bottom: none;
  }

  .endpoint-code {
    font-family: monospace;
    font-size: 0.875rem;
    color: #334155;
    background-color: #f8fafc;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    word-break: break-all;
    flex-grow: 1;
    margin-right: 0.5rem;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: auto;
  }

  /* Responsive adjustments for API service grid */
  @media (min-width: 768px) {
    .api-service-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .api-service-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
  }

  /* Service cluster enhancements for API display */
  .service-cluster {
    transition: all 0.3s ease;
    min-height: 340px;
    max-height: 500px;
    /* Improved visual hierarchy and spacing */
  }

  /* small input styling */
  input[type='text'] {
    width: 100%;
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid #ddd;
  }
</style>