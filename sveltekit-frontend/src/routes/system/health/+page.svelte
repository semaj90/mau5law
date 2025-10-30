<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { writable, get } from 'svelte/store';
	// prefer the module entry (no .js) and avoid importing TS types from a .js file
	import { coordinatorStatus, masterServiceCoordinator } from '$lib/services/master-service-coordinator';
	// local lightweight ServiceStatus shape (keeps TS happy without importing types from a .js module)
	type ServiceStatus = {
		status?: string;
		responseTime?: number | null;
		lastCheck?: number;
		errorCount?: number;
		uptime?: number;
		[key: string]: unknown;
	};
	interface ServiceHealth {
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
		}
		services: ServiceHealth[];
		summary: {
			critical_services: string[];
			degraded_services: string[];
			offline_services: string[];
		}
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
	let systemStatusSnapshot: any = {
		services: new Map<string, any>(),
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
			let legacyData = null;
			let coordinatorData = null;
			if (legacyResponse?.ok) legacyData = await legacyResponse.json();
			if (coordinatorResponse?.ok) coordinatorData = await coordinatorResponse.json();
			// snapshot latest coordinator store (if available) for service maps/metrics
			const coordFromStore = get(coordinatorStatus);
			if (coordFromStore) {
				systemStatusSnapshot = coordFromStore;
			}
			// Merge data from both sources
			const mergedData = mergeHealthData(legacyData, coordinatorData);
			healthData.set(mergedData);
			error.set(null);
		} catch (err) {
			console.error('Health check failed:', err);
			error.set(err instanceof Error ? err.message: 'Unknown error');
		} finally {
			loading.set(false);
		}
	}
	const mergeHealthData = (legacy: unknown, coordinator: unknown): HealthData => {
		const now = Date.now();
		// Use coordinator data if available, fallback to legacy
		if ((coordinator as any)?.success && (coordinator as any).data) {
			const data = (coordinator as any).data;
			// use the snapshot from the coordinator store (if present) for per-service status
			const servicesMap = systemStatusSnapshot?.services instanceof Map ? systemStatusSnapshot.services : new Map();
			const errors = systemStatusSnapshot?.errors || [];
			return {
				timestamp: now,
				overall_status: mapHealthStatus(data.systemHealth),
				// avoid division by zero / NaN when totalServices is missing/zero
				health_percentage: data.totalServices ? Math.round((data.healthyServices / data.totalServices) * 100) : 0,
				services_online: data.healthyServices,
				services_total: data.totalServices,
				cuda: {
					service_available: data.performance?.cudaUtilization > 0,
					worker_available: true,
					gpu_ready: data.performance?.cudaUtilization > 0,
					response_time: data.performance?.avgResponseTime || null
				},
				services: mapServicesToHealthFormat(servicesMap),
				summary: {
					critical_services: errors.map((e: any) => e.description || String(e)),
					degraded_services: Array.from(servicesMap.entries())
						.filter(([_, status]) => status?.status === 'degraded')
						.map(([id, _]) => {
							const service = masterServiceCoordinator.services.find(s => s.id === id);
							return service?.displayName || id;
						}),
					offline_services: Array.from(servicesMap.entries())
						.filter(([_, status]) => status?.status === 'failed' || status?.status === 'unknown')
						.map(([id, _]) => {
							const service = masterServiceCoordinator.services.find(s => s.id === id);
							return service?.displayName || id;
						})
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
			cuda: {
				service_available: false,
				worker_available: false,
				gpu_ready: false,
				response_time: null
			},
			services: [],
			summary: {
				critical_services: ['Coordinator not available'],
				degraded_services: [],
				offline_services: []
			},
			recommendations: ['Start the Master Service Coordinator']
		}
	}
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
	}
	const mapServicesToHealthFormat = (services: Map<string, ServiceStatus>): ServiceHealth[] => {
		return Array.from(services.entries()).map(([id, status]) => {
			const service = masterServiceCoordinator.services.find(s => s.id === id);
			return {
				name: service?.displayName || id,
				url: service ? `http://localhost:${service.port}` : '',
				status: mapServiceStatus(status?.status || 'unknown'),
				responseTime: status?.responseTime,
				lastCheck: status?.lastCheck || Date.now(),
				details: {
					tier: service?.tier,
					protocol: service?.protocol,
					critical: service?.critical,
					cudaAccelerated: service?.cudaAccelerated,
					errorCount: status?.errorCount || 0,
					uptime: status?.uptime || 0
				}
			}
		});
	}
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
	}
	const generateRecommendations = (): string[] => {
		const recommendations: string[] = [];
		const snap = systemStatusSnapshot || {};
		if (snap?.summary?.criticalErrors > 0 || (snap.errors && snap.errors.length > 0)) {
			recommendations.push('npm run coordinator:start - Start Master Service Coordinator');
		}
		if ((snap?.metrics?.successRate ?? 1) < 0.8) {
			recommendations.push('npm run coordinator:restart-failed - Restart failed services');
		}
		if ((snap?.metrics?.avgResponseTime ?? 0) > 5000) {
			recommendations.push('npm run coordinator:optimize - Optimize service performance');
		}
		return recommendations;
	}
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
	}
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
				return '🔍';
		}
	}
	const formatTimestamp = (timestamp: number) => {
		return new Date(timestamp).toLocaleString();
	}
	const formatResponseTime = (time?: number | null) => {
		// treat null/undefined as unavailable, but show 0ms when explicitly zero
		if (time === null || typeof time === 'undefined') return 'N/A';
		return `${time}ms`;
	}
	// Service actions
	async function restartService(serviceId: string) {
		try {
			const response = await fetch('/api/v1/coordinator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'restart_service',
					target: serviceId
				})
			});
			if (response.ok) {
				console.log(`Restart initiated for ${serviceId}`);
				await fetchHealth(); // Refresh data
			}
		} catch (error) {
			console.error(`Failed to restart ${serviceId}:`, error);
		}
	}
	async function startAllServices() {
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
			console.error('Failed to start all services:', error);
		}
	}
	async function forceHealthCheck() {
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
			console.error('Failed to force health check:', error);
		}
	}
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
	// compute displayed services array from the healthData store and local filters
	let displayServicesArray: ServiceHealth[] = [];
	$: {
		const hd = get(healthData);
		if (!hd) {
			displayServicesArray = [];
		} else {
			let services = hd.services ?? [];
			if (selectedTier !== 'all') {
				const tierNum = Number(selectedTier);
				services = services.filter(s => (s.details as any)?.tier === tierNum);
			}
			if (showOnlyIssues) {
				services = services.filter(s => s.status !== 'online');
			}
			displayServicesArray = services;
		}
	}

	onMount(() => {
		// initial fetch and optional auto-refresh
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

<svelte:head>
	<title>System Health Dashboard - Legal AI Platform</title>
</svelte:head>
<div class="container mx-auto p-6 max-w-7xl">
	<div class="flex justify-between items-center mb-8">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">System Health Dashboard</h1>
			<p class="text-gray-600 mt-1">Legal AI Platform - CUDA GPU Integration Status</p>
		</div>
		<button
			on:click={fetchHealth}
			class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
			disabled={$loading}
		>
			{#if $loading}
				<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
			{:else}
				🔄
			{/if}
			Refresh
		</button>
	</div>
	{#if $error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
			<div class="flex items-center gap-2">
				<span class="text-xl">❌</span>
				<div>
					<h3 class="font-semibold">Health Check Failed</h3>
					<p class="text-sm mt-1">{$error}</p>
				</div>
			</div>
		</div>
	{/if}
	{#if $healthData}
		<!-- Overall Status -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			<div class={`p-6 rounded-lg border-2 ${getStatusColor($healthData.overall_status)}`}>
				<div class="flex items-center gap-3">
					<span class="text-3xl">{getStatusIcon($healthData.overall_status)}</span>
					<div>
						<h3 class="text-lg font-semibold capitalize">{$healthData.overall_status}</h3>
						<p class="text-sm opacity-75">Overall System Status</p>
					</div>
				</div>
			</div>
			<div class="p-6 rounded-lg border-2 border-blue-200 bg-blue-50">
				<div class="flex items-center gap-3">
					<span class="text-3xl">📊</span>
					<div>
						<h3 class="text-lg font-semibold text-blue-700">{$healthData.health_percentage}%</h3>
						<p class="text-sm text-blue-600">
							Services Online ({$healthData.services_online}/{$healthData.services_total})
						</p>
					</div>
				</div>
			</div>
			<div
				class={`p-6 rounded-lg border-2 ${$healthData.cuda.gpu_ready ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
			>
				<div class="flex items-center gap-3">
					<span class="text-3xl">🎯</span>
					<div>
						<h3 class={`text-lg font-semibold ${$healthData.cuda.gpu_ready ? 'text-green-700' : 'text-red-700'}`}>
							{$healthData.cuda.gpu_ready ? 'GPU Ready' : 'GPU Not Available'}
						</h3>
						<p class={`text-sm ${$healthData.cuda.gpu_ready ? 'text-green-600' : 'text-red-600'}`}>
							CUDA Worker Status
						</p>
					</div>
				</div>
			</div>
		</div>
		<!-- CUDA Service Details -->
		<div class="mb-8">
			<h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
				<span>⚡</span> CUDA GPU Service
			</h2>
			<div class="bg-white rounded-lg border shadow-sm p-6">
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="text-center">
						<div class={`text-2xl mb-2 ${$healthData.cuda.service_available ? 'text-green-600' : 'text-red-600'}`}>
							{$healthData.cuda.service_available ? '✅' : '❌'}
						</div>
						<h4 class="font-semibold">Service</h4>
						<p class="text-sm text-gray-600">{$healthData.cuda.service_available ? 'Running' : 'Offline'}</p>
					</div>
					<div class="text-center">
						<div class={`text-2xl mb-2 ${$healthData.cuda.worker_available ? 'text-green-600' : 'text-red-600'}`}>
							{$healthData.cuda.worker_available ? '🔧' : '❌'}
						</div>
						<h4 class="font-semibold">Worker</h4>
						<p class="text-sm text-gray-600">{$healthData.cuda.worker_available ? 'Available' : 'Not Built'}</p>
					</div>
					<div class="text-center">
						<div class={`text-2xl mb-2 ${$healthData.cuda.gpu_ready ? 'text-green-600' : 'text-red-600'}`}>
							{$healthData.cuda.gpu_ready ? '🚀' : '❌'}
						</div>
						<h4 class="font-semibold">GPU Ready</h4>
						<p class="text-sm text-gray-600">{$healthData.cuda.gpu_ready ? 'Yes' : 'No'}</p>
					</div>
					<div class="text-center">
						<div class="text-2xl mb-2 text-blue-600">⏱️</div>
						<h4 class="font-semibold">Response Time</h4>
						<p class="text-sm text-gray-600">{formatResponseTime($healthData.cuda.response_time)}</p>
					</div>
				</div>
			</div>
		</div>
		<!-- Services Grid -->
		<div class="mb-8">
			<h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
				<span>🏗️</span> All Services
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each displayServicesArray as service}
					<div class={`p-4 rounded-lg border-2 ${getStatusColor(service.status)}`}>
						<div class="flex items-center justify-between mb-2">
							<h3 class="font-semibold capitalize">{service.name.replace('-', ' ')}</h3>
							<span class="text-xl">{getStatusIcon(service.status)}</span>
						</div>
						<div class="space-y-1 text-sm">
							<p><span class="font-medium">Status:</span> {service.status}</p>
							{#if service.responseTime}
								<p><span class="font-medium">Response:</span> {formatResponseTime(service.responseTime)}</p>
							{/if}
							<p class="text-xs opacity-75">Last check: {formatTimestamp(service.lastCheck)}</p>
							{#if service.details && typeof service.details === 'object'}
								<details class="mt-2">
									<summary class="cursor-pointer text-xs opacity-75">Details</summary>
									<pre class="text-xs mt-1 opacity-60 overflow-x-auto">{JSON.stringify(
										service.details,
										null,
										2
									)}</pre>
								</details>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
		<!-- Recommendations -->
		{#if $healthData.recommendations.length > 0}
			<div class="mb-8">
				<h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
					<span>💡</span> Recommendations
				</h2>
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<ul class="space-y-2">
						{#each $healthData.recommendations as recommendation}
							<li class="flex items-start gap-2">
								<span class="text-blue-600 mt-0.5">•</span>
								<code class="text-sm bg-blue-100 px-2 py-1 rounded">{recommendation}</code>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}
		<!-- Summary -->
		<div class="bg-gray-50 rounded-lg p-4">
			<h3 class="font-semibold mb-2">Summary</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
				{#if $healthData.summary.critical_services.length > 0}
					<div>
						<h4 class="font-medium text-red-600 mb-1">Critical Services Down:</h4>
						<ul class="space-y-1">
							{#each $healthData.summary.critical_services as service}
								<li class="text-red-700">• {service}</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if $healthData.summary.degraded_services.length > 0}
					<div>
						<h4 class="font-medium text-yellow-600 mb-1">Degraded Services:</h4>
						<ul class="space-y-1">
							{#each $healthData.summary.degraded_services as service}
								<li class="text-yellow-700">• {service}</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if $healthData.summary.offline_services.length > 0}
					<div>
						<h4 class="font-medium text-gray-600 mb-1">Offline Services:</h4>
						<ul class="space-y-1">
							{#each $healthData.summary.offline_services as service}
								<li class="text-gray-700">• {service}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
			<p class="text-xs text-gray-500 mt-4">
				Last updated: {formatTimestamp($healthData?.timestamp ?? Date.now())} | Auto-refresh: {Math.round(refreshRate/1000)}s
			</p>
		</div>
	{:else if $loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-2 text-gray-600">Loading health data...</span>
		</div>
	{/if}
</div>

<style>
	.container {
		font-family:
			'Inter',
			system-ui,
			-apple-system,
			sans-serif;
	}
	pre {
		white-space: pre-wrap;
		word-break: break-all;
	}
</style>