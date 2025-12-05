<script lang="ts">
	import RouteInspectorDetectiveBoard from '$lib/components/RouteInspectorDetectiveBoard.svelte';
	import routeReport from '$lib/data/route-organization-report.json';
	import { onMount } from 'svelte';

	interface RouteStatus {
		path: string;
		status: 'green' | 'yellow' | 'red';
		errorCount: number;
		lastError?: string;
		lastErrorTime?: string;
		category?: string;
		priority?: 'high' | 'medium' | 'low';
		functional?: boolean;
	}

	interface RouteDetail {
		path: string;
		kind: 'page' | 'layout' | 'endpoint';
		file: string;
		summary: string;
		health?: 'green' | 'yellow' | 'red';
		errorCount?: number;
		lastErrorCode?: string | null;
		lastErrorMessage?: string | null;
		category?: string;
		priority?: 'high' | 'medium' | 'low';
		functional?: boolean;
	}

	let routes: RouteStatus[] = $state([]);
	let loading = $state(true);
	let filterCategory = $state<string | null>(null);
	let filterPriority = $state<string | null>(null);
	let showOnlyFunctional = $state(false);

	// Detective Board modal state
	let modalOpen = $state(false);
	let selectedRoute = $state<RouteDetail | null>(null);

	// Build route metadata map from report
	function buildRouteMetadata() {
		const metadata = new Map<string, { category: string; priority: string; functional: boolean }>();

		for (const [category, data] of Object.entries(routeReport.categories)) {
			const priority = (data as any).priority || 'low';
			for (const route of (data as any).routes || []) {
				metadata.set(route.path, {
					category,
					priority,
					functional: route.functional !== false
				});
			}
		}

		return metadata;
	}

	const routeMetadata = buildRouteMetadata();

	function getRouteCategory(path: string): string {
		return routeMetadata.get(path)?.category || 'Uncategorized';
	}

	function getRoutePriority(path: string): 'high' | 'medium' | 'low' {
		return (routeMetadata.get(path)?.priority as any) || 'low';
	}

	function isRouteFunctional(path: string): boolean {
		return routeMetadata.get(path)?.functional ?? false;
	}

	function openDetectiveBoard(route: RouteStatus) {
		selectedRoute = {
			path: route.path,
			kind: 'page',
			file: `src/routes${route.path}/+page.svelte`,
			summary: `Route ${route.path} with ${route.errorCount} errors`,
			health: route.status,
			errorCount: route.errorCount,
			lastErrorCode: route.lastError || null,
			lastErrorMessage: null,
			category: route.category,
			priority: route.priority,
			functional: route.functional
		};
		modalOpen = true;
	}

	function closeDetectiveBoard() {
		modalOpen = false;
		selectedRoute = null;
	}

	function getFilteredRoutes() {
		let filtered = routes;

		if (filterCategory) {
			filtered = filtered.filter((r) => r.category === filterCategory);
		}

		if (filterPriority) {
			filtered = filtered.filter((r) => r.priority === filterPriority);
		}

		if (showOnlyFunctional) {
			filtered = filtered.filter((r) => r.functional);
		}

		return filtered;
	}

	onMount(async () => {
		try {
			// Fetch route status from Phase 72
			const res = await fetch('/api/phase72/errors');
			if (res.ok) {
				const data = await res.json();
				// Transform phase72_error rows into route status
				const routeMap = new Map<string, RouteStatus>();

				for (const error of data.errors || []) {
					const route = error.route || '/';
					if (!routeMap.has(route)) {
						routeMap.set(route, {
							path: route,
							status: 'green',
							errorCount: 0,
							category: getRouteCategory(route),
							priority: getRoutePriority(route),
							functional: isRouteFunctional(route)
						});
					}
					const r = routeMap.get(route)!;
					r.errorCount++;
					r.lastError = error.code;
					r.lastErrorTime = error.created_at;

					// Determine status
					if (r.errorCount >= 5) r.status = 'red';
					else if (r.errorCount >= 2) r.status = 'yellow';
				}

				routes = Array.from(routeMap.values()).sort((a, b) =>
					a.path.localeCompare(b.path)
				);
			}
		} catch (err) {
			console.error('Failed to fetch route status:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="all-routes-container">
	<header class="all-routes-header">
		<h1>ALL ROUTES</h1>
		<p>Phase 72 Route Health Dashboard + Route Organization Report</p>
		<div class="header-stats">
			<span>Total: {routeReport.metadata.totalRoutes}</span>
			<span>Functional: {routeReport.metadata.functionalRoutes}</span>
			<span>Lore: {routeReport.metadata.emptyStubs}</span>
		</div>
	</header>

	<div class="filters">
		<div class="filter-group">
			<label for="category-filter">Category:</label>
			<select id="category-filter" bind:value={filterCategory}>
				<option value={null}>All</option>
				<option value="AI">AI</option>
				<option value="Core">Core</option>
				<option value="Auth">Auth</option>
				<option value="Utility">Utility</option>
				<option value="Demo">Demo</option>
				<option value="Legacy">Legacy</option>
				<option value="Uncategorized">Uncategorized</option>
			</select>
		</div>

		<div class="filter-group">
			<label for="priority-filter">Priority:</label>
			<select id="priority-filter" bind:value={filterPriority}>
				<option value={null}>All</option>
				<option value="high">High</option>
				<option value="medium">Medium</option>
				<option value="low">Low</option>
			</select>
		</div>

		<div class="filter-group">
			<label for="functional-toggle">
				<input
					id="functional-toggle"
					type="checkbox"
					bind:checked={showOnlyFunctional}
				/>
				Real Routes Only
			</label>
		</div>

		<div class="filter-stats">
			Showing {getFilteredRoutes().length} of {routes.length} routes
		</div>
	</div>

	{#if loading}
		<div class="loading">Loading route status...</div>
	{:else}
		<table data-phase72-routes class="routes-table">
			<thead>
				<tr>
					<th>Route</th>
					<th>Category</th>
					<th>Priority</th>
					<th>Type</th>
					<th>Status</th>
					<th>Errors</th>
					<th>Last Error</th>
					<th>Last Seen</th>
				</tr>
			</thead>
			<tbody>
				{#each getFilteredRoutes() as route (route.path)}
					<tr
						data-route={route.path}
						data-status={route.status}
						data-error-count={route.errorCount}
						data-category={route.category}
						data-priority={route.priority}
						data-functional={route.functional}
						class="route-row status-{route.status} priority-{route.priority} {route.functional ? 'real' : 'lore'}"
						onclick={() => openDetectiveBoard(route)}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && openDetectiveBoard(route)}
					>
						<td class="route-path">{route.path}</td>
						<td class="route-category">
							<span class="category-badge category-{route.category?.toLowerCase()}">
								{route.category || 'Uncategorized'}
							</span>
						</td>
						<td class="route-priority">
							<span class="priority-badge priority-{route.priority}">
								{route.priority?.toUpperCase() || 'LOW'}
							</span>
						</td>
						<td class="route-type">
							{#if route.functional}
								<span class="type-badge real">✓ Real</span>
							{:else}
								<span class="type-badge lore">◇ Lore</span>
							{/if}
						</td>
						<td class="route-status">
							<span class="status-badge status-{route.status}">
								{route.status.toUpperCase()}
							</span>
						</td>
						<td class="route-error-count">{route.errorCount}</td>
						<td class="route-last-error">{route.lastError || '—'}</td>
						<td class="route-last-time">
							{route.lastErrorTime
								? new Date(route.lastErrorTime).toLocaleTimeString()
								: '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if getFilteredRoutes().length === 0}
			<div class="no-routes">No routes match your filters. Try adjusting them.</div>
		{/if}
	{/if}
</div>

<!-- Phase 82 Detective Board Modal -->
{#if modalOpen && selectedRoute}
	<RouteInspectorDetectiveBoard
		bind:open={modalOpen}
		bind:route={selectedRoute}
		onclose={closeDetectiveBoard}
	/>
{/if}

<style>
	.all-routes-container {
		background: var(--yorha-bg);
		color: var(--yorha-ink);
		font-family: var(--yorha-font);
		padding: 2rem;
		min-height: 100vh;
	}

	.all-routes-header {
		margin-bottom: 2rem;
		border-bottom: 3px solid var(--yorha-crimson);
		padding-bottom: 1rem;
	}

	.all-routes-header h1 {
		margin: 0;
		font-size: 2rem;
		color: var(--yorha-crimson);
		font-weight: bold;
	}

	.all-routes-header p {
		margin: 0.5rem 0 0 0;
		color: #666;
		font-size: 0.875rem;
	}

	.header-stats {
		display: flex;
		gap: 2rem;
		margin-top: 1rem;
		font-size: 0.875rem;
		color: #666;
	}

	.header-stats span {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filters {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		padding: 1rem;
		background: var(--yorha-paper);
		border: 1px solid #ddd;
		border-radius: 4px;
		flex-wrap: wrap;
		align-items: center;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-group label {
		font-size: 0.875rem;
		font-weight: bold;
		color: var(--yorha-ink);
	}

	.filter-group select,
	.filter-group input[type='checkbox'] {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 3px;
		font-family: var(--yorha-font);
		background: white;
		color: var(--yorha-ink);
	}

	.filter-group input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
	}

	.filter-stats {
		margin-left: auto;
		font-size: 0.875rem;
		color: #666;
	}

	.loading,
	.no-routes {
		padding: 2rem;
		text-align: center;
		background: var(--yorha-paper);
		border: 2px solid var(--yorha-ink);
		border-radius: 4px;
	}

	.routes-table {
		width: 100%;
		border-collapse: collapse;
		background: var(--yorha-paper);
		border: 2px solid var(--yorha-ink);
		font-size: 0.875rem;
	}

	.routes-table thead {
		background: var(--yorha-bg-dark);
		color: var(--yorha-paper);
	}

	.routes-table th {
		padding: 0.75rem;
		text-align: left;
		font-weight: bold;
		border-bottom: 2px solid var(--yorha-ink);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.routes-table td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid #ddd;
	}

	.route-row {
		transition: background-color 0.2s ease;
		cursor: pointer;
	}

	.route-row:hover {
		background-color: #f5f0e8;
		box-shadow: inset 0 0 0 2px var(--yorha-crimson);
	}

	.route-row:focus {
		outline: 2px solid var(--yorha-crimson);
		outline-offset: -2px;
	}

	.route-row.status-red {
		background-color: #ffe6e6;
	}

	.route-row.status-yellow {
		background-color: #fff9e6;
	}

	.route-row.status-green {
		background-color: #e6ffe6;
	}

	.route-row.lore {
		opacity: 0.7;
	}

	.route-path {
		font-weight: bold;
		font-family: var(--yorha-font);
		color: var(--yorha-ink);
	}

	.category-badge,
	.priority-badge,
	.type-badge,
	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		font-size: 0.65rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		white-space: nowrap;
	}

	.category-badge {
		background: #e0e0e0;
		color: #333;
	}

	.category-badge.category-ai {
		background: #c8e6c9;
		color: #1b5e20;
	}

	.category-badge.category-core {
		background: #bbdefb;
		color: #0d47a1;
	}

	.category-badge.category-auth {
		background: #ffe0b2;
		color: #e65100;
	}

	.category-badge.category-utility {
		background: #f8bbd0;
		color: #880e4f;
	}

	.category-badge.category-demo {
		background: #d1c4e9;
		color: #311b92;
	}

	.category-badge.category-legacy {
		background: #cfd8dc;
		color: #37474f;
	}

	.priority-badge {
		background: #e0e0e0;
		color: #333;
	}

	.priority-badge.priority-high {
		background: #ef5350;
		color: white;
	}

	.priority-badge.priority-medium {
		background: #ffa726;
		color: white;
	}

	.priority-badge.priority-low {
		background: #66bb6a;
		color: white;
	}

	.type-badge {
		background: #e0e0e0;
		color: #333;
	}

	.type-badge.real {
		background: #4caf50;
		color: white;
	}

	.type-badge.lore {
		background: #9e9e9e;
		color: white;
	}

	.status-badge {
		background: #e0e0e0;
		color: #333;
	}

	.status-badge.status-green {
		background: #00c853;
		color: white;
	}

	.status-badge.status-yellow {
		background: #ff9800;
		color: white;
	}

	.status-badge.status-red {
		background: var(--yorha-crimson);
		color: white;
	}

	.route-error-count {
		text-align: center;
		font-weight: bold;
	}

	.route-last-error {
		font-family: var(--yorha-font);
		font-size: 0.75rem;
		color: #666;
	}

	.route-last-time {
		font-size: 0.7rem;
		color: #999;
	}
</style>
