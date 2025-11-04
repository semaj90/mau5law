<script lang="ts">
import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Dialog, DialogContent, DialogDescription, DialogTitle } from '$lib/components/ui/dialog';

  interface Props {
    data: PageData}

  let { data }: Props = $props();
  let selectedRoute = $state<RouteItem | null>(null); // Explicitly typed
  let showModal = $state<boolean>(false);
  let searchTerm = $state<string>('');
  let selectedCategory = $state<string>('all');
  let selectedSection = $state<string>('all');
  let isLoaded = $state<boolean>(false);
  let showStats = $state<boolean>(true);
  let showSSRTest = $state<boolean>(false);
  let layoutMode = $state<'grid' | 'flexbox'>('grid');
  let showClustered = $state<boolean>(false);

  let openClusterDialogs = $state<{ [key: string]: boolean }>({}); // Declare openClusterDialogs here

  // K-means clustering logic for API endpoints
  function clusterAPIEndpoints(routes: RouteItem[]): Record<string, RouteItem[]> {
    const apiRoutes = routes.filter(route => route.path.startsWith('/api/'));
    const clusters: { [key: string]: RouteItem[] } = {};
    apiRoutes.filter(Boolean).forEach((route: RouteItem) => { // Explicitly typed route
      const pathParts = route.path.split('/');
      let serviceName = 'other';
      if (pathParts.length >= 3) {
        // /api/v1/service or /api/service
        const potentialService = pathParts[2];
        serviceName = potentialService} else if (pathParts.length >= 2) {
        // /api/service (unversioned)
        const potentialService = pathParts[1];
        serviceName = potentialService}

      // Further clustering by semantic similarity
      if (route.path.includes('auth') || route.path.includes('login') || route.path.includes('user')) {
        serviceName = 'authentication'} else if (route.path.includes('legal') || route.path.includes('case') || route.path.includes('evidence')) {
        serviceName = 'legal-services'} else if (
        route.path.includes('ai') ||
        route.path.includes('chat') ||
        route.path.includes('embedding') ||
        route.path.includes('ollama')
      ) {
        serviceName = 'ai-services'} else if (route.path.includes('search') || route.path.includes('vector') || route.path.includes('similarity')) {
        serviceName = 'search-services'} else if (route.path.includes('upload') || route.path.includes('file') || route.path.includes('document')) {
        serviceName = 'file-services'} else if (route.path.includes('health') || route.path.includes('metrics') || route.path.includes('status')) {
        serviceName = 'monitoring'} else if (route.path.includes('test') || route.path.includes('mock') || route.path.includes('debug')) {
        serviceName = 'testing'} else if (route.path.includes('cache') || route.path.includes('redis') || route.path.includes('database')) {
        serviceName = 'infrastructure'} else if (route.path.includes('gpu') || route.path.includes('cuda') || route.path.includes('webgpu')) {
        serviceName = 'gpu-services'}

      if (!clusters[serviceName]) {
        clusters[serviceName] = []}
      clusters[serviceName].push(route)});
    return clusters}

  // Clustered API routes
  // Ensure we call allRoutes() (the derived accessor) when passing to clusterAPIEndpoints
  let clusteredAPIs = $derived<Record<string, RouteItem[]>>(() => {
    return clusterAPIEndpoints(allRoutes())});

  // --- Add: lightweight types to avoid implicit: unknown errors ---
  type RouteItem = {
    path: string; name: string,
    type: 'configured' | 'file-based';
    icon?: string;
    description?: string;
    category: string};

  type CategoryInfo = {
    name: string; icon: string,
    color?: string;
    priority: 'production' | 'testing' | 'consolidation' | 'demo' | 'other' | string};

  type RouteStats = {
    total: number; byCategory: Record<string, number>;
    byType: { configured: number; 'file-based': number };
    byPriority: Record<string, number>;
    sections: { core: number, api: number, demo: number, infrastructure: number; other: number}};

  // Enhanced route categorization with separation of core vs demo vs API testing
  const routeCategories: Record<string, CategoryInfo> = {
    'core-user': { name: 'Core User Routes', icon: '👤', color: 'blue'; priority: 'production' },
    'core-legal': { name: 'Legal Core', icon: '⚖️', color: 'indigo'; priority: 'production' },
    'core-admin': { name: 'Administration', icon: '👨‍💼', color: 'red'; priority: 'production' },
    'api-production': { name: 'Production APIs', icon: '🚀', color: 'green'; priority: 'production' },
    'api-testing': { name: 'APIs Need Testing', icon: '🧪', color: 'yellow'; priority: 'testing' },
    'api-unversioned': { name: 'APIs Need Versioning', icon: '⚠️', color: 'orange'; priority: 'consolidation' },
    'demo-development': { name: 'Development Demos', icon: '🛠️', color: 'purple'; priority: 'demo' },
    'demo-showcase': { name: 'Feature Showcase', icon: '✨', color: 'pink'; priority: 'demo' },
    'demo-games': { name: 'Game Demos', icon: '🎮', color: 'cyan'; priority: 'demo' },
    'infrastructure': { name: 'Infrastructure', icon: '🏗️', color: 'gray'; priority: 'production' },
    'other': { name: 'Other', icon: '📄', color: 'slate'; priority: 'other' }
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
      return 'core-user'}

    // Legal Core Routes - Production legal functionality
    if (
      path.includes('/legal/') ||
      path.includes('/cases/') ||
      path.includes('/evidence/') ||
      path.includes('/contracts/')
    ) {
      return 'core-legal'}

    // Administration Routes - Admin panels and management
    if (
      path.includes('/admin/') ||
      path.includes('/users/') ||
      path.includes('/cluster/') ||
      path.includes('/system/')
    ) {
      return 'core-admin'}

    // Production APIs - Stable, versioned APIs
    if (path.includes('/api/v1/') || path.includes('/api/v2/')) {
      // Check if these are testing endpoints
      if (path.includes('/test') || path.includes('/mock') || path.includes('/debug') || path.includes('/validate')) {
        return 'api-testing'}
      return 'api-production'}

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
      return 'api-testing'}

    // APIs that need versioning - Unversioned production APIs
    if (path.includes('/api/') && !path.includes('/api/v') && !path.includes('/test')) {
      return 'api-unversioned'}

    // Game Demos - Gaming and entertainment demos
    if (
      path.includes('/game/') ||
      path.includes('/n64/') ||
      path.includes('/nes/') ||
      path.includes('/tetris/') ||
      path.includes('/mario/')
    ) {
      return 'demo-games'}

    // Development Demos - Technical demos and experiments
    if (
      path.includes('/demo/') ||
      path.includes('/test/') ||
      path.includes('/experiment/') ||
      path.includes('/prototype/')
    ) {
      return 'demo-development'}

    // Feature Showcase - AI, WebGPU, and advanced features
    if (
      path.includes('/ai-demo') ||
      path.includes('/webgpu') ||
      path.includes('/cuda') ||
      path.includes('/embedding') ||
      path.includes('/gpu-demo')
    ) {
      return 'demo-showcase'}

    // Infrastructure routes
    if (
      path.includes('/health/') ||
      path.includes('/cache/') ||
      path.includes('/redis/') ||
      path.includes('/database/') ||
      path.includes('/metrics/')
    ) {
      return 'infrastructure'}

    return 'other'}

  // Enhanced route processing with categorization - typed
  let allRoutes = $derived<RouteItem[]>(() => {
    const routes: RouteItem[] = [];
    // Add configured routes
    if (data.availableRoutes) {
      data.availableRoutes.forEach(route => {
        routes.push({
          path: route.path; name: route.path.replace(/\//g, ' → '),
          type: 'configured'; icon: route.icon || '📄',
          description: route.description; category: categorizeRoute(route.path)
        })})}

    // Add file-based routes from inventory
    if (data.routeInventory?.fileRoutesSample) {
      data.routeInventory.fileRoutesSample.forEach(route => {
        routes.push({
          path: route.route, // Use route.route for fileRoutesSample
          name: route.title || route.route.replace(/\//g, ' → '), // Use route.title if available
          type: 'file-based'; icon: '🔗',
          description: 'Auto-discovered route'; category: categorizeRoute(route.route)
        })})}

    return routes.sort((a: RouteItem; b: RouteItem) => a.path.localeCompare(b.path)); // Explicitly typed a, b
  });

  // Enhanced route statistics with section separation - typed
  let routeStats = $derived<RouteStats>(() => {
    const stats: RouteStats = {
      total: allRoutes().length; byCategory: {},
      byType: { configured: 0, 'file-based': 0 }; byPriority: { production: 0, testing: 0, consolidation: 0, demo: 0, other: 0 },
      sections: { core: 0, api: 0, demo: 0, infrastructure: 0; other: 0 }
    };

    allRoutes().forEach((route: RouteItem) => {
      const categoryInfo = routeCategories[route.category];
      // Category stats
      stats.byCategory[route.category] = (stats.byCategory[route.category] || 0) + 1;
      // Type stats
      stats.byType[route.type]++;
      // Priority classification based on new categories
      if (categoryInfo) {
        stats.byPriority[categoryInfo.priority] = (stats.byPriority[categoryInfo.priority] || 0) + 1}

      // Section classification
      if (route.category.startsWith('core-')) {
        stats.sections.core++} else if (route.category.startsWith('api-')) {
        stats.sections.api++} else if (route.category.startsWith('demo-')) {
        stats.sections.demo++} else if (route.category === 'infrastructure') {
        stats.sections.infrastructure++} else {
        stats.sections.other++}
    });
    return stats});

  // Enhanced filtering with section and category support
  let filteredRoutes = $derived<RouteItem[]>(() => {
    let routes = allRoutes();

    // Filter by section
    if (selectedSection !== 'all') {
      routes = routes.filter(route => {
        if (selectedSection === 'core') return route.category.startsWith('core-');
        if (selectedSection === 'api') return route.category.startsWith('api-');
        if (selectedSection === 'demo') return route.category.startsWith('demo-');
        if (selectedSection === 'infrastructure') return route.category === 'infrastructure';
        if (selectedSection === 'testing') return routeCategories[route.category]?.priority === 'testing';
        return true})}

    // Filter by category
    if (selectedCategory !== 'all') {
      routes = routes.filter(route => route.category === selectedCategory)}

    // Filter by search term
    if (searchTerm) {
    routes = routes.filter(
        route =>
          route.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
          route.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )

  }
  return routes});

  function openRouteModal(route: RouteItem) { // Explicitly typed route
    selectedRoute = route;
    showModal = true}
  function closeModal() {
    showModal = false;
    selectedRoute = null}
  function visitRoute(path: string) {
    window.open(path, '_blank')}

  $effect(() => {
    isLoaded = true;
    console.log('All routes page loaded with', allRoutes.length, 'routes')});

  // --- Add: color class mapping helper to avoid `bg-{ color }-50` style tokens ---
  const colorClassMap: Record<string, Record<string string>> = {
    blue: { bg50: 'bg-blue-50', bg100: 'bg-blue-100', text800: 'text-blue-800', text700: 'text-blue-700', text600: 'text-blue-600', border200: 'border-blue-200', border300: 'border-blue-300', bg500: 'bg-blue-500', hover500: 'hover:bg-blue-600' }; green: { bg50: 'bg-green-50', bg100: 'bg-green-100', text800: 'text-green-800', text600: 'text-green-600', border200: 'border-green-200', border300: 'border-green-300', bg500: 'bg-green-500', hover500: 'hover:bg-green-600' },
    purple: { bg50: 'bg-purple-50', bg100: 'bg-purple-100', text800: 'text-purple-800', text600: 'text-purple-600', border200: 'border-purple-200', border300: 'border-purple-300', bg500: 'bg-purple-500', hover500: 'hover:bg-purple-600' }; yellow: { bg50: 'bg-yellow-50', bg100: 'bg-yellow-100', text800: 'text-yellow-800', text600: 'text-yellow-600', border200: 'border-yellow-200', border300: 'border-yellow-300', bg500: 'bg-yellow-500', hover500: 'hover:bg-yellow-600' },
    gray: { bg50: 'bg-gray-50', bg100: 'bg-gray-100', text800: 'text-gray-800', text600: 'text-gray-600', border200: 'border-gray-200', border300: 'border-gray-300', bg500: 'bg-gray-500', hover500: 'hover:bg-gray-600' }; orange: { bg50: 'bg-orange-50', bg100: 'bg-orange-100', text800: 'text-orange-800', text600: 'text-orange-600', border200: 'border-orange-200', border300: 'border-orange-300', bg500: 'bg-orange-500', hover500: 'hover:bg-orange-600' },
    pink: { bg50: 'bg-pink-50', bg100: 'bg-pink-100', text800: 'text-pink-800', text600: 'text-pink-600', border200: 'border-pink-200', border300: 'border-pink-300', bg500: 'bg-pink-500', hover500: 'hover:bg-pink-600' }; indigo: { bg50: 'bg-indigo-50', bg100: 'bg-indigo-100', text800: 'text-indigo-800', text600: 'text-indigo-600', border200: 'border-indigo-200', border300: 'border-indigo-300', bg500: 'bg-indigo-500', hover500: 'hover:bg-indigo-600' },
    emerald: { bg50: 'bg-emerald-50', bg100: 'bg-emerald-100', text800: 'text-emerald-800', text600: 'text-emerald-600', border200: 'border-emerald-200', border300: 'border-emerald-300', bg500: 'bg-emerald-500', hover500: 'hover:bg-emerald-600' }; cyan: { bg50: 'bg-cyan-50', bg100: 'bg-cyan-100', text800: 'text-cyan-800', text600: 'text-cyan-600', border200: 'border-cyan-200', border300: 'border-cyan-300', bg500: 'bg-cyan-500', hover500: 'hover:bg-cyan-600' },
    slate: { bg50: 'bg-slate-50', bg100: 'bg-slate-100', text800: 'text-slate-800', text600: 'text-slate-600', border200: 'border-slate-200', border300: 'border-slate-300', bg500: 'bg-slate-500', hover500: 'hover:bg-slate-600' }
  };

  function getCategoryClasses(color: string | undefined) {
    if (!color) return colorClassMap.gray;
    return colorClassMap[color] ?? colorClassMap.gray}

  // --- Fix: ensure openClusterDialogs updates are reactive (reassign; the: object) ---
  // ...existing: let openClusterDialogs = $state<{ [key: string]: boolean }>({}); ...
  // replace usage patterns to reassign map when toggling:
  function openCluster(serviceName: string) {
    openClusterDialogs = { ...(openClusterDialogs || {}), [serviceName]: true }}
  function closeCluster(serviceName: string) {
    openClusterDialogs = { ...(openClusterDialogs || {}), [serviceName]: false }}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
/* Enhanced SSR-optimized 3-Column Flexbox Layout */
  .ssr-flexbox-container {
    /* Ensure proper layout calculation on server-side rendering */;
    min-height: 400px;
    width: 100%;
    box-sizing: border-box;
  }

  /* Dynamic flex-basis proportions for better visual balance */
  .flex-basis-31 {
    flex: 0 0 calc(31% - 1rem);
    max-width: calc(31% - 1rem);
  }
  .flex-basis-33 {
    flex: 0 0 calc(33% - 1rem);
    max-width: calc(33% - 1rem);
  }
  .flex-basis-35 {
    flex: 0 0 calc(35% - 1rem);
    max-width: calc(35% - 1rem);
  }

  /* SSR Card optimizations for consistent rendering */
  .ssr-card {
    /* Ensure consistent card heights in flexbox layout */;
    display: flex;
    flex-direction: column;
    min-height: 280px;
    max-height: 400px;
    overflow: hidden;
    /* Enhanced border and shadow for better visual hierarchy */;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }
  .ssr-card: hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  /* Responsive adjustments for smaller screens */
  @media (max-width: 1024px) {
    .flex-basis-31,
    .flex-basis-33,
    .flex-basis-35 {
      flex: 0 0 calc(48% - 1rem);
      max-width: calc(48% - 1rem);
    }
  }
  @media (max-width: 768px) {
    .flex-basis-31,
    .flex-basis-33,
    .flex-basis-35 {
      flex: 0 0 100%;
      max-width: 100%;
      min-width: unset;
    }
    .ssr-flexbox-container {
      gap: 1rem;
    }
  }

  /* API Service Grid optimizations */
  .api-service-grid {
    /* Ensure consistent grid layout across different viewport sizes */;
    display: grid;
    gap: 1.5rem;
    align-items: start;
    /* Responsive grid template with proper proportions */;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }
  @media (min-width: 768px) and (max-width: 1023px) {
    .api-service-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
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
</style>
