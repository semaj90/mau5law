<!--
All Routes Testing Page - Interactive route explorer
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let selectedRoute = $state<any>(null);
	let showModal = $state(false);
	let searchTerm = $state('');
	let isLoaded = $state(false);

	// Get all routes from both configured and file-based sources
	let allRoutes = $derived(() => {
		const routes = [];

		// Add configured routes
		if (data.availableRoutes) {
			routes.push(...data.availableRoutes.map(route => ({
				path: route.path,
				name: route.name || route.title || (route.path || '').replace(/^\//, '').replace(/\//g, ' → '),
				type: 'configured',
				icon: route.icon || '📄',
				description: route.description
			})));
		}

		// Add file-based routes from inventory
		if (data.routeInventory?.fileRoutesSample) {
			routes.push(...data.routeInventory.fileRoutesSample.map(route => ({
				path: route.route,
				name: route.title || (route.route || '').replace(/^\//, '').replace(/\//g, ' → '),
				type: 'file-based',
				icon: '🔗',
				description: `Auto-discovered route`
			})));
		}

		return routes;
	});

	// Filter routes based on search
	let filteredRoutes = $derived(() => {
		if (!searchTerm) return allRoutes;
		return allRoutes.filter(route =>
			route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			route.path.toLowerCase().includes(searchTerm.toLowerCase())
		);
	});

	function openRouteModal(route: any) {
		selectedRoute = route;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedRoute = null;
	}

	function visitRoute(path: string) {
		window.open(path, '_blank');
	}

	onMount(() => {
		isLoaded = true;
		console.log('All routes page loaded with', allRoutes.length, 'routes');
	});
</script>

<div class="container mx-auto p-6">
	<h1 class="text-3xl font-bold mb-6 text-center">🗺️ Route Explorer</h1>

	{#if isLoaded}
		<!-- Route Statistics -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
			<div class="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
				<h3 class="font-bold text-lg text-blue-800">📊 Total Routes</h3>
				<p class="text-2xl font-bold text-blue-900">{allRoutes.length}</p>
			</div>
			<div class="bg-green-100 border-2 border-green-400 rounded-lg p-4">
				<h3 class="font-bold text-lg text-green-800">⚙️ Configured</h3>
				<p class="text-2xl font-bold text-green-900">{data.routeInventory?.counts?.config || data.availableRoutes?.length || 0}</p>
			</div>
			<div class="bg-purple-100 border-2 border-purple-400 rounded-lg p-4">
				<h3 class="font-bold text-lg text-purple-800">🔍 Discovered</h3>
				<p class="text-2xl font-bold text-purple-900">{data.routeInventory?.counts?.fileBased || 0}</p>
			</div>
		</div>

		<!-- Search -->
		<div class="mb-6">
			<input
				type="text"
				bind:value={searchTerm}
				placeholder="🔍 Search routes..."
				class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
			/>
		</div>

		<!-- Routes Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
			{#each filteredRoutes as route}
				<div class="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
					onclick={() => openRouteModal(route)}>
					<div class="flex items-center mb-2">
						<span class="text-2xl mr-3">{route.icon}</span>
						<h3 class="font-semibold text-lg truncate">{route.name}</h3>
					</div>
					<p class="text-sm text-gray-600 mb-2">{route.path}</p>
					<div class="flex justify-between items-center">
						<span class="px-2 py-1 rounded text-xs {route.type === 'configured' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}">
							{route.type}
						</span>
						<button
							onclick={(e) => { e.stopPropagation(); visitRoute(route.path); }}
							class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">
							Visit →
						</button>
					</div>
				</div>
			{/each}
		</div>

		{#if filteredRoutes.length === 0}
			<div class="text-center py-8">
				<p class="text-gray-500">No routes found matching "{searchTerm}"</p>
			</div>
		{/if}
	{:else}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2">Loading routes...</p>
		</div>
	{/if}
</div>

<!-- Route Modal -->
{#if showModal && selectedRoute}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick={closeModal}>
		<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl font-bold">{selectedRoute.icon} {selectedRoute.name}</h2>
				<button onclick={closeModal} class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
			</div>

			<div class="space-y-4">
				<div>
					<label class="font-semibold text-gray-700">URL:</label>
					<code class="block mt-1 p-2 bg-gray-100 rounded text-sm">{selectedRoute.path}</code>
				</div>

				<div>
					<label class="font-semibold text-gray-700">Type:</label>
					<span class="ml-2 px-2 py-1 rounded text-xs {selectedRoute.type === 'configured' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}">
						{selectedRoute.type}
					</span>
				</div>

				{#if selectedRoute.description}
					<div>
						<label class="font-semibold text-gray-700">Description:</label>
						<p class="mt-1 text-gray-600">{selectedRoute.description}</p>
					</div>
				{/if}

				<div class="flex gap-3 pt-4">
					<button
						onclick={() => visitRoute(selectedRoute.path)}
						class="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
						🚀 Visit Route
					</button>
					<button
						onclick={() => navigator.clipboard.writeText(selectedRoute.path)}
						class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
						📋 Copy URL
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}