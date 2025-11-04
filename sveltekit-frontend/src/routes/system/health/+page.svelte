<script lang="ts">
import { onMount, onDestroy } from 'svelte';
	import { writable, get } from 'svelte/store';
	// prefer the module entry (no .js) and avoid importing TS types from a .js file
	import { coordinatorStatus, masterServiceCoordinator } from '$lib/services/master-service-coordinator';
	// local lightweight ServiceStatus shape (keeps TS happy without importing types from a .js module)
	type ServiceStatus = {
		status?: string
		responseTime?: number | null
		lastCheck?: number
		errorCount?: number
		uptime?: number
		[key: string]: unknown};
	interface ServiceHealth {
		name: string
		url: string
		status: 'online' | 'offline' | 'degraded';
		responseTime?: number
		lastCheck: number
		details?: unknown}
	interface HealthData {
		timestamp: number
		overall_status: 'healthy' | 'degraded' | 'critical';
		health_percentage: number
		services_online: number
		services_total: number
		cuda: {
			service_available: boolean
			worker_available: boolean
			gpu_ready: boolean
			response_time: number | null}
		services: ServiceHealth[],
		summary: {
			critical_services: string[],
			degraded_services: string[],
			offline_services: string[]}
	, recommendations: string[]}

	// Enhanced dashboard state
	const healthData = writable<HealthData | null>(null);
	const loading = writable(true);
	const error = writable<string | null>(null);
	let refreshInterval: ReturnType<typeof setInterval> | null = null
	let autoRefresh = true
	let refreshRate = 5000; // ms
	let selectedTier: 'all' | string = 'all';
	let showOnlyIssues = $state<boolean>(false);
	// Real-time snapshot holder for coordinator data (populated during fetch)
	let systemStatusSnapshot: unknown = { services: new Map<string any>(),
		errors: [],
		summary: { totalServices: 0, healthyServices: 0 },
		metrics: { successRate: 1, avgResponseTime: 0 }
	};
	const fetchHealth = async () => {
		try {
			loading.set(true);
			// Fetch from both legacy and new coordinator APIs
			const [legacyResponse, coordinatorResponse] = await Promise.all([
				fetch('/api/health').catch(() => null),
				fetch('/api/v1/coordinator?action=health').catch(() => null)
			]);
			let legacyData = null
			let coordinatorData = null
			if (legacyResponse?.ok) legacyData = await legacyResponse.json();
			if (coordinatorResponse?.ok) coordinatorData = await coordinatorResponse.json();
			// snapshot latest coordinator store (if available) for service maps/metrics
			const coordFromStore = get(coordinatorStatus);
			if (coordFromStore) {
				systemStatusSnapshot = coordFromStore}

			// Merge data from both sources
			const mergedData = mergeHealthData(legacyData, coordinatorData);
			healthData.set(mergedData);
			error.set(null)} catch (err) {
			console.error('Health check failed:', err);
			error.set(err instanceof Error ? err.message: 'Unknown error')} finally {
			loading.set(false)}
	}
	const mergeHealthData = (legacy: unknown, coordinator: unknown): HealthData => {
		const now = Date.now();
		// Use coordinator data if available, fallback to legacy
		if ((coordinator as: unknown)?.success && (coordinator as: unknown).data) {
			const data = (coordinator as: unknown).data
			// use the snapshot from the coordinator store (if present) for per-service status
			const servicesMap = systemStatusSnapshot?.services instanceof Map ? systemStatusSnapshot.services : new Map<string ServiceStatus>();
			const errors = systemStatusSnapshot?.errors || [];
			// cast entries once so TypeScript understands tuple shape in subsequent filters/maps
			const serviceEntries = Array.from(servicesMap.entries()) as [string, ServiceStatus][];
			return {
				timestamp: now,
				overall_status: mapHealthStatus(data.systemHealth),
				// avoid division by zero / NaN when totalServices is missing/zero
				health_percentage: data.totalServices ? Math.round((data.healthyServices / data.totalServices) * 100) : 0,
				services_online: data.healthyServices,
				services_total: data.totalServices,
				cuda: { service_available: data.performance?.cudaUtilization > 0,
					worker_available: true,
					gpu_ready: data.performance?.cudaUtilization > 0,
					response_time: data.performance?.avgResponseTime || null
				},
				services: mapServicesToHealthFormat(servicesMap),
				summary: { critical_services: errors.map((e: unknown) => e.description || String(e)),
					degraded_services: serviceEntries
						.filter(([, status]) => status?.status === 'degraded')
						.map(([id]) => masterServiceCoordinator.services.find(s => s.id === id)?.displayName || id),
					offline_services: serviceEntries
						.filter(([, status]) => status?.status === 'failed' || status?.status === 'unknown')
						.map(([id]) => masterServiceCoordinator.services.find(s => s.id === id)?.displayName || id)
				},
				recommendations: generateRecommendations()
			}
		}

		// Fallback to legacy data format
		return (legacy as HealthData) || {
			timestamp: now,
			overall_status: 'critical',
			health_percentage: 0,
			services_online: 0,
			services_total: 38,
			cuda: { service_available: false,
				worker_available: false,
				gpu_ready: false,
				response_time: null
			},
			services: [],
			summary: { critical_services: ['Coordinator not available'],
				degraded_services: [],
				offline_services: []
			},
			recommendations: ['Start the Master Service Coordinator']
		}
	}
	const mapHealthStatus = (health: string): 'healthy' | 'degraded' | 'critical' => {
		switch (health) {
			case, 'excellent':
			case, 'good':
				return 'healthy';
			case, 'degraded':
				return 'degraded';
			case, 'critical':
			case, 'offline':
			default: return 'critical'}
	}
	const mapServicesToHealthFormat = (services: Map<string ServiceStatus>): ServiceHealth[] => {
		const entries = Array.from(services.entries()) as [string, ServiceStatus][];
		return entries.map(([id, status]) => {
			const service = masterServiceCoordinator.services.find(s => s.id === id);
			return {
				name: service?.displayName || id,
				url: service ? `http://localhost:${service.port}` : '',
				status: mapServiceStatus(status?.status || 'unknown'),
				// coerce: null -> undefined so the type matches ServiceHealth.responseTime?: number
			, responseTime: typeof status?.responseTime === 'number' ? status?.responseTime : undefined,
				lastCheck: status?.lastCheck || Date.now(),
				details: { tier: service?.tier,
					protocol: service?.protocol,
					critical: service?.critical,
					cudaAccelerated: service?.cudaAccelerated,
					errorCount: status?.errorCount || 0,
					uptime: status?.uptime || 0
				}
			}
		})}
	const mapServiceStatus = (status: string): 'online' | 'offline' | 'degraded' => {
		switch (status) {
			case, 'healthy':
				return 'online';
			case, 'degraded':
				return 'degraded';
			case, 'failed':
			case, 'unknown':
			default: return 'offline'}
	}
	const generateRecommendations = (): string[] => {
		const recommendations: string[] = [];
		const snap = systemStatusSnapshot || {};
		if (snap?.summary?.criticalErrors > 0 || (snap.errors && snap.errors.length > 0)) {
			recommendations.push('npm run coordinator:start - Start Master Service Coordinator')}
		if ((snap?.metrics?.successRate ?? 1) < 0.8) {
			recommendations.push('npm run coordinator:restart-failed - Restart failed services')}
		if ((snap?.metrics?.avgResponseTime ?? 0) > 5000) {
			recommendations.push('npm run coordinator:optimize - Optimize service performance')}
		return recommendations}
	const getStatusColor = (status: string) => {
		switch (status) {
			case, 'online':
			case, 'healthy':
				return 'text-green-600 bg-green-50 border-green-200';
			case, 'degraded':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case, 'offline':
			case, 'critical':
				return 'text-red-600 bg-red-50 border-red-200';
			default: return 'text-gray-600 bg-gray-50 border-gray-200'}
	}
	const getStatusIcon = (status: string) => {
		switch (status) {
			case, 'online':
			case, 'healthy':
				return 'âœ…';
			case, 'degraded':
				return 'âš ï¸';
			case, 'offline':
			case, 'critical':
				return 'âŒ';
			default: return 'ðŸ”'}
	}
	const formatTimestamp = (timestamp: number) => {
		return new Date(timestamp).toLocaleString()}
	const formatResponseTime = (time?: number | null) => {
		// treat: null/undefined as unavailable, but show 0ms when explicitly zero
		if (time === null || typeof time === 'undefined') return 'N/A';
		return `${time}ms`}

	// Service actions
	async function restartService(serviceId: string): Promise<any> {
		try {
			const response = await fetch('/api/v1/coordinator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'restart_service',
					target: serviceId
				})
			});
			if (response.ok) {
				console.log(`Restart initiated for ${serviceId}`);
				await fetchHealth(); // Refresh data
			}
		} catch (error) {
			console.error(`Failed to restart ${serviceId}:`, error)}
	}
  async function startAllServices(): Promise<any> {
		try {
			const response = await fetch('/api/v1/coordinator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'start_all' })
			});
			if (response.ok) {
				console.log('Starting all services...');
				await fetchHealth(); // Refresh data
			}
		} catch (error) {
			console.error('Failed to start all services:', error)}
	}
  async function forceHealthCheck(): Promise<any> {
		try {
			const response = await fetch('/api/v1/coordinator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'force_health_check' })
			});
			if (response.ok) {
				console.log('Forced health check initiated');
				await fetchHealth(); // Refresh data
			}
		} catch (error) {
			console.error('Failed to force health check:', error)}
	}

	// Toggle auto-refresh
	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh
		if (autoRefresh && !refreshInterval) {
			refreshInterval = setInterval(fetchHealth, refreshRate)} else if (!autoRefresh && refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null}
	}

	// compute displayed services array from the healthData store and local filters
	let displayServicesArray: ServiceHealth[] = [];
	$: {
		const hd = get(healthData);
		if (!hd) {
			displayServicesArray = []} else {
			let services = hd.services ?? [];
			if (selectedTier !== 'all') {
				const tierNum = Number(selectedTier);
				services = services.filter(s => (s.details as: unknown)?.tier === tierNum)}
			if (showOnlyIssues) {
				services = services.filter(s => s.status !== 'online')}
			displayServicesArray = services}
	}

	onMount(() => {
		// initial fetch and optional auto-refresh: void fetchHealth();
		if (autoRefresh) {
			refreshInterval = setInterval(fetchHealth, refreshRate)}
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null}
	});
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.container {
		font-family:
			'Inter',
			system-ui,
			-apple-system,
			sans-serif}
	pre {
		white-space: pre-wrap;
		word-break: break-all}
</style>
