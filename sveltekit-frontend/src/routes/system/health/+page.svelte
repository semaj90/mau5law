<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable, get } from 'svelte/store';
  // Assuming master-service-coordinator exports a singleton instance named 'masterServiceCoordinator'
  // and that instance has a 'status' store and a 'services' array.
  import { MasterServiceCoordinator } from '$lib // TODO: Verify store subscription is correct for Svelte 5/services/master-service-coordinator'; // Changed to named import

  // Use the status store from the instance (guard at runtime in case the module exports a class/type)
  // If MasterServiceCoordinator.status isn't present, fall back to a safe writable store so `get(...)` won't fail.
  const coordinatorStatusStore = (MasterServiceCoordinator as any)?.status ?? writable(null);

  // local lightweight ServiceStatus shape (keeps TS happy without importing types from a .js module)
  type ServiceStatus = {
    status?: string;
    responseTime?: number | null;
    lastCheck?: number;
    errorCount?: number;
    uptime?: number;
    [key: string]: unknown;
  };

  interface ServiceMetadata {
    // Define an interface for service metadata
    id: string;
    displayName: string;
    port: number;
    tier: number;
    protocol: string;
    critical: boolean;
    cudaAccelerated: boolean;
  }

  interface SystemStatusSummary {
    totalServices: number;
    healthyServices: number;
    criticalErrors: number;
  }

  interface SystemStatusMetrics {
    successRate: number;
    avgResponseTime: number;
  }

  interface SystemStatusSnapshot {
    services: Map<string, ServiceStatus>;
    errors: Array<{ description: string }>;
    summary: SystemStatusSummary;
    metrics: SystemStatusMetrics;
  }

  interface ServiceHealth {
    id: string;
    name: string;
    url: string;
    status: 'online' | 'offline' | 'degraded';
    responseTime?: number;
    lastCheck: number;
    details?: unknown;
  }
  interface HealthData {
    timestamp: number;
    overall_status: 'healthy' | 'degraded' | 'critical';
    health_percentage: number;
    services_online: number;
    services_total: number;
    cuda: {
      service_available: boolean;
      worker_available: boolean;
      gpu_ready: boolean;
      response_time: number | null;
    };
    services: ServiceHealth[];
    summary: {
      critical_services: string[];
      degraded_services: string[];
      offline_services: string[];
    };
    recommendations: string[];
  }

  // Enhanced dashboard state
  const healthData = writable<HealthData | null>(null);
  const loading = writable(true);
  const error = writable<string | null>(null);
  let refreshInterval: ReturnType<typeof setInterval> | null = null;
  let autoRefresh = true;
  let refreshRate = 5000; // ms
  let selectedTier: 'all' | string = 'all';
  let showOnlyIssues = false;
  // Real-time snapshot holder for coordinator data (populated during fetch)
  let systemStatusSnapshot: SystemStatusSnapshot = {
    services: new Map<string, ServiceStatus>(),
    errors: [],
    summary: { totalServices: 0, healthyServices: 0, criticalErrors: 0 },
    metrics: { successRate: 1, avgResponseTime: 0 },
  };
  const fetchHealth = async () => {
    try {
      loading.set(true);
      // Fetch from both legacy and new coordinator APIs
      const [legacyResponse, coordinatorResponse] = await Promise.all([
        fetch('/api/health').catch(() => null),
        fetch('/api/v1/coordinator?action=health').catch(() => null),
      ]);
      let legacyData = null;
      let coordinatorData = null;
      if (legacyResponse?.ok) legacyData = await legacyResponse.json();
      if (coordinatorResponse?.ok) coordinatorData = await coordinatorResponse.json();
      // snapshot latest coordinator store (if available) for service maps/metrics
      const coordFromStore = get(coordinatorStatusStore);
      if (coordFromStore) {
        systemStatusSnapshot = coordFromStore as SystemStatusSnapshot;
      }

      // Merge data from both sources
      const mergedData = mergeHealthData(legacyData, coordinatorData);
      healthData.set(mergedData);
      error.set(null);
    } catch (err) {
      console.error('Health check failed:', err);
      error.set(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      loading.set(false);
    }
  };
  const mergeHealthData = (legacy: unknown, coordinator: unknown): HealthData => {
    const now = Date.now();
    // Use coordinator data if available, fallback to legacy
    if ((coordinator as any)?.success && (coordinator as any).data) {
      const data = (coordinator as any).data;
      // use the snapshot from the coordinator store (if present) for per-service status
      const servicesMap = systemStatusSnapshot.services;
      const errors = systemStatusSnapshot.errors;
      // cast entries once so TypeScript understands tuple shape in subsequent filters/maps
      const serviceEntries = Array.from(servicesMap.entries()) as [string, ServiceStatus][];
      return {
        timestamp: now,
        overall_status: mapHealthStatus(data.systemHealth),
        // avoid division by zero / NaN when totalServices is missing/zero
        health_percentage: data.totalServices
          ? Math.round((data.healthyServices / data.totalServices) * 100)
          : 0,
        services_online: data.healthyServices,
        services_total: data.totalServices,
        cuda: {
          service_available: data.performance?.cudaUtilization > 0,
          worker_available: true,
          gpu_ready: data.performance?.cudaUtilization > 0,
          response_time: data.performance?.avgResponseTime || null,
        },
        services: mapServicesToHealthFormat(servicesMap),
        summary: {
          critical_services: errors.map(
            (e: { description: string }) => e.description || 'Unknown Error'
          ),
          degraded_services: serviceEntries
            .filter(([, status]) => status?.status === 'degraded')
            .map(([id]) => findServiceById(id)?.displayName ?? id),
          offline_services: serviceEntries
            .filter(([, status]) => status?.status === 'failed' || status?.status === 'unknown')
            .map(([id]) => findServiceById(id)?.displayName ?? id),
        },
        recommendations: generateRecommendations(),
      };
    }

    // Fallback to legacy data format
    return (
      (legacy as HealthData) || {
        timestamp: now,
        overall_status: 'critical',
        health_percentage: 0,
        services_online: 0,
        services_total: 38,
        cuda: {
          service_available: false,
          worker_available: false,
          gpu_ready: false,
          response_time: null,
        },
        services: [],
        summary: {
          critical_services: ['Coordinator not available'],
          degraded_services: [],
          offline_services: [],
        },
        recommendations: ['Start the Master Service Coordinator'],
      }
    );
  };
  const mapHealthStatus = (health: string): 'healthy' | 'degraded' | 'critical' => {
    switch (health) {
      case 'excellent':
      case 'good':
        return 'healthy';
      case 'degraded':
        return 'degraded';
      case 'critical':
      case 'offline':
      default:
        return 'critical';
    }
  };
  const mapServicesToHealthFormat = (services: Map<string, ServiceStatus>): ServiceHealth[] => {
    const entries = Array.from(services.entries()) as [string, ServiceStatus][];
    return entries.map(([id, status]) => {
      const service = findServiceById(id);
      return {
        id,
        name: service?.displayName || id,
        url: service ? `http://localhost:${service.port}` : '',
        status: mapServiceStatus(status?.status || 'unknown'),
        // coerce: null -> undefined so the type matches ServiceHealth.responseTime?: number
        responseTime: typeof status?.responseTime === 'number' ? status?.responseTime : undefined,
        lastCheck: status?.lastCheck || Date.now(),
        details: {
          tier: service?.tier,
          protocol: service?.protocol,
          critical: service?.critical,
          cudaAccelerated: service?.cudaAccelerated,
          errorCount: status?.errorCount || 0,
          uptime: status?.uptime || 0,
        },
      };
    });
  };
  const mapServiceStatus = (status: string): 'online' | 'offline' | 'degraded' => {
    switch (status) {
      case 'healthy':
        return 'online';
      case 'degraded':
        return 'degraded';
      case 'failed':
      case 'unknown':
      default:
        return 'offline';
    }
  };
  const generateRecommendations = (): string[] => {
    const recommendations: string[] = [];
    const snap = systemStatusSnapshot;
    if (snap.summary.criticalErrors > 0 || (snap.errors && snap.errors.length > 0)) {
      recommendations.push('npm run coordinator:start - Start Master Service Coordinator');
    }
    if ((snap.metrics.successRate ?? 1) < 0.8) {
      recommendations.push('npm run coordinator:restart-failed - Restart failed services');
    }
    if ((snap.metrics.avgResponseTime ?? 0) > 5000) {
      recommendations.push('npm run coordinator:optimize - Optimize service performance');
    }
    return recommendations;
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'offline':
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'offline':
      case 'critical':
        return '❌';
      default:
        return '🔧';
    }
  };
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  const formatResponseTime = (time?: number | null) => {
    // treat: null/undefined as unavailable, but show 0ms when explicitly zero
    if (time === null || typeof time === 'undefined') return 'N/A';
    return `${time}ms`;
  };

  // Service actions
  async function restartService(serviceId: string): Promise<any> {
    try {
      const response = await fetch('/api/v1/coordinator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart_service', target: serviceId }),
      });
      if (response.ok) {
        console.log(`Restart initiated for ${serviceId}`);
        await fetchHealth(); // Refresh data
      }
    } catch (error) {
      console.error(`Failed to restart ${serviceId}:`, error);
    }
  }
  // Removed unused function startAllServices
  // Removed unused function forceHealthCheck

  // Toggle auto-refresh
  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    if (autoRefresh && !refreshInterval) {
      refreshInterval = setInterval(fetchHealth, refreshRate);
    } else if (!autoRefresh && refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // helper: safely find service metadata from multiple possible sources
  const findServiceById = (id: string): ServiceMetadata | undefined => {
    // try instance export shape (some modules export an instance with .services)
    const mscAny = MasterServiceCoordinator as any;
    if (mscAny && Array.isArray(mscAny.services)) {
      return (mscAny.services as ServiceMetadata[]).find((s) => s.id === id);
    }

    // try coordinator status store snapshot if it contains metadata (common shape: { servicesMetadata: [...] } or similar)
    try {
      const coordSnapshot = get(coordinatorStatusStore) as any;
      if (coordSnapshot) {
        if (Array.isArray(coordSnapshot.servicesMetadata)) {
          return (coordSnapshot.servicesMetadata as ServiceMetadata[]).find((s) => s.id === id);
        }
        // some coordinators expose a map keyed by id
        if (coordSnapshot.serviceCatalog && typeof coordSnapshot.serviceCatalog === 'object') {
          return coordSnapshot[id] as ServiceMetadata | undefined;
        }
      }
    } catch {
      // ignore snapshot extraction errors and fallthrough to undefined
    }

    // fallback: no metadata available
    return undefined;
  };

  // Compute displayed services reactively (works with template bindings)
  let displayServicesArray: ServiceHealth[] = [];

  $: {
    const hd = get(healthData);
    if (!hd) {
      displayServicesArray = [];
    } else {
      let services = hd.services ?? [];
      if (selectedTier !== 'all') {
        const tierNum = Number(selectedTier);
        services = services.filter((s: ServiceHealth) => (s.details as any)?.tier === tierNum);
      }
      if (showOnlyIssues) {
        services = services.filter((s: ServiceHealth) => s.status !== 'online');
      }
      displayServicesArray = services;
    }
  }

  onMount(() => {
    void fetchHealth();
    if (autoRefresh) {
      refreshInterval = setInterval(fetchHealth, refreshRate);
    }
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  });
</script>

<main class="container mx-auto p-4">
  <header class="mb-6">
    <h1 class="text-3xl font-bold">System Health Dashboard</h1>
    {#if $healthData // TODO: Verify store subscription is correct for Svelte 5}
      <p class="text-gray-600">Last updated: {formatTimestamp($healthData // TODO: Verify store subscription is correct for Svelte 5.timestamp)}</p>
    {/if}
  </header>

  {#if $loading // TODO: Verify store subscription is correct for Svelte 5 && !$healthData // TODO: Verify store subscription is correct for Svelte 5}
    <p>Loading health status...</p>
  {:else if $error // TODO: Verify store subscription is correct for Svelte 5}
    <div class="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
      <span class="font-medium">Error!</span>
      {$error // TODO: Verify store subscription is correct for Svelte 5}
    </div>
  {:else if $healthData // TODO: Verify store subscription is correct for Svelte 5}
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="p-4 rounded-lg shadow {getStatusColor($healthData // TODO: Verify store subscription is correct for Svelte 5.overall_status)}">
        <h2 class="font-bold">Overall Status</h2>
        <p class="text-2xl capitalize">{$healthData // TODO: Verify store subscription is correct for Svelte 5.overall_status}</p>
      </div>
      <div class="p-4 bg-white rounded-lg shadow">
        <h2 class="font-bold">Health</h2>
        <p class="text-2xl">{$healthData // TODO: Verify store subscription is correct for Svelte 5.health_percentage}%</p>
      </div>
      <div class="p-4 bg-white rounded-lg shadow">
        <h2 class="font-bold">Services Online</h2>
        <p class="text-2xl">{$healthData // TODO: Verify store subscription is correct for Svelte 5.services_online} / {$healthData // TODO: Verify store subscription is correct for Svelte 5.services_total}</p>
      </div>
      <div class="p-4 bg-white rounded-lg shadow">
        <h2 class="font-bold">CUDA Status</h2>
        <p class="text-2xl">{$healthData // TODO: Verify store subscription is correct for Svelte 5.cuda.gpu_ready ? 'Ready' : 'Unavailable'}</p>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
      <button
        onclick={fetchHealth}
        class="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
        disabled={$loading // TODO: Verify store subscription is correct for Svelte 5}
      >
        {$loading // TODO: Verify store subscription is correct for Svelte 5 ? 'Refreshing...' : 'Refresh Now'}
      </button>
      <button
        onclick={toggleAutoRefresh}
        class="px-4 py-2 rounded {autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-200'}"
      >
        Auto-Refresh: {autoRefresh ? 'On' : 'Off'}
      </button>
      <div class="flex items-center gap-2">
        <label for="tier-select">Filter by Tier:</label>
        <select id="tier-select" bind:value={selectedTier} class="p-2 border rounded">
          <option value="all">All Tiers</option>
          <option value="0">Tier 0 (Core)</option>
          <option value="1">Tier 1 (Data)</option>
          <option value="2">Tier 2 (AI/ML)</option>
          <option value="3">Tier 3 (Application)</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <input type="checkbox" id="show-issues" bind:checked={showOnlyIssues} class="w-4 h-4" />
        <label for="show-issues">Show only issues</label>
      </div>
    </div>

    <!-- Service List -->
    <div class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >Service</th
            >
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >Status</th
            >
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >Response Time</th
            >
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >Last Check</th
            >
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >Actions</th
            >
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each displayServicesArray as service (service.id)}
            <tr>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">{service.name}</div>
                <div class="text-sm text-gray-500">{service.url}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusColor(
                    service.status
                  )}"
                >
                  {getStatusIcon(service.status)}
                  {service.status}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                >{formatResponseTime(service.responseTime)}</td
              >
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                >{formatTimestamp(service.lastCheck)}</td
              >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {#if service.status !== 'online'}
                  <button
                    onclick={() => restartService(service.id)}
                    class="text-indigo-600 hover:text-indigo-900">Restart</button
                  >
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</main>

<style>
  .container {
    font-family:
      'Inter',
      system-ui,
      -apple-system,
      sans-serif;
  }
</style>
