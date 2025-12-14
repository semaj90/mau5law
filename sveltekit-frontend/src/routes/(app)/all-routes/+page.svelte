<script lang="ts">
	// @ts-nocheck
	import {
	  BADGE_DESCRIPTIONS,
	  COMMAND_CENTER_MANIFEST,
	  enrichRoutesWithPhase72,
	  type CommandCenterRoute
	} from '$lib/command-center-manifest';
	import ErrorModal from '$lib/components/phase78/ErrorModal.svelte';
	import RouteInspectorDetectiveBoard from '$lib/components/RouteInspectorDetectiveBoard.svelte';
	import { routeErrorAssistantMachine } from '$lib/phase78/routeErrorAssistantMachine';
	import { computeRouteCluster, getAllKnownClusters } from '$lib/shared/phase80-route-metadata';
	import * as Dialog from 'bits-ui/components/dialog';
	import { onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import type { PageData } from './$types';

	// ─────────────────────────────────────
	// Props & Data
	// ─────────────────────────────────────
	const { data }: { data: PageData } = $props();

	// All routes from manifest + phase72 enrichment
	const allRoutes: CommandCenterRoute[] = [
		...COMMAND_CENTER_MANIFEST.cases,
		...COMMAND_CENTER_MANIFEST.evidence,
		...COMMAND_CENTER_MANIFEST.persons,
		...COMMAND_CENTER_MANIFEST.system
	];

	const enrichedRoutes: CommandCenterRoute[] = enrichRoutesWithPhase72(
		allRoutes,
		data.graph || { nodes: [], edges: [] },
		data.shieldData || {},
		data.errorSummary || {}
	);

	// ─────────────────────────────────────
	// UI State (Stores)
	// ─────────────────────────────────────
	const searchQuery = writable('');
	const selectedCategory = writable<string | null>(null);
	const selectedKind = writable<string | null>(null);
	const selectedErrorState = writable<string | null>(null);
	const selectedCluster = writable<string | null>(null);
	const showOnlyErrors = writable(false);

	// Get unique categories, kinds, and clusters for filters
	const categories = [...new Set(enrichedRoutes.map(r => r.tab))];
	const kinds = [...new Set(enrichedRoutes.map(r => r.kind))];
	const clusters = getAllKnownClusters();
	const errorStates = ['healthy', 'flaky', 'broken'];

	const ERROR_BRAIN_BUSY_PHASES = new Set(['analyzing', 'applying', 'verifying']);
	const errorBrainSnapshot = writable(null);
	let errorBrainActor = null;

	// AI Patch Request State
	let requestingPatch = false;
	let lastPatchError: string | null = null;
	let lastPatchId: string | null = null;

	async function requestAiPatch(route: CommandCenterRoute | null) {
		if (!route) return;
		requestingPatch = true;
		lastPatchError = null;

		try {
			const res = await fetch('/api/phase78/route-patch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					route: {
						id: route.href,
						path: route.href,
						file: route.href,
						kind: route.kind,
						group: route.tab,
						label: route.label
					}
				})
			});

			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || `Request failed with status ${res.status}`);
			}

			const json = await res.json();
			lastPatchId = json.id ?? null;
			console.log('Phase78 patch suggestion generated:', json);
		} catch (err) {
			console.error('Request AI patch failed:', err);
			lastPatchError =
				err instanceof Error ? err.message : 'Unknown error requesting patch';
		} finally {
			requestingPatch = false;
		}
	}

	onMount(() => {
		errorBrainActor = routeErrorAssistantMachine.createActor();
		const subscription = errorBrainActor.subscribe((snapshot) => {
			errorBrainSnapshot.set(snapshot);
		});
		errorBrainActor.start();
		return () => {
			subscription.unsubscribe();
			errorBrainActor?.stop();
			errorBrainActor = null;
		};
	});

	// Filtered routes
	const filteredRoutes = derived(
		[searchQuery, selectedCategory, selectedKind, selectedErrorState, selectedCluster, showOnlyErrors],
		([$search, $category, $kind, $errorState, $cluster, $errorsOnly]) => {
			let result = enrichedRoutes;

			// Search filter
			if ($search.trim()) {
				const q = $search.toLowerCase();
				result = result.filter(r =>
					r.label.toLowerCase().includes(q) ||
					r.href.toLowerCase().includes(q) ||
					r.description.toLowerCase().includes(q)
				);
			}

			// Category filter
			if ($category) {
				result = result.filter(r => r.tab === $category);
			}

			// Kind filter
			if ($kind) {
				result = result.filter(r => r.kind === $kind);
			}

			// Cluster filter
			if ($cluster) {
				result = result.filter(r => computeRouteCluster(r.href) === $cluster);
			}

			// Error state filter
			if ($errorState) {
				result = result.filter(r => r.errorState === $errorState);
			}

			// Show only errors
			if ($errorsOnly) {
				result = result.filter(r => r.errorState === 'broken' || r.errorState === 'flaky');
			}

			return result;
		}
	);

	// Route stats
	const routeStats = derived(filteredRoutes, ($routes) => ({
		total: $routes.length,
		healthy: $routes.filter(r => r.errorState === 'healthy').length,
		flaky: $routes.filter(r => r.errorState === 'flaky').length,
		broken: $routes.filter(r => r.errorState === 'broken').length
	}));

	// ─────────────────────────────────────
	// Modal State
	// ─────────────────────────────────────
	let selectedRoute = $state<CommandCenterRoute | null>(null);
	let modalOpen = $state(false);
	let errorBrainModalOpen = $state(false);
	let errorBrainRoutePath = $state('');
	let detectiveBoardOpen = $state(false);
	let detectiveBoardRoute = $state<any>(null);

	function openRouteModal(route: CommandCenterRoute) {
		selectedRoute = route;
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
		selectedRoute = null;
	}

	function openDetectiveBoard(route: CommandCenterRoute) {
		detectiveBoardRoute = {
			path: route.href,
			kind: route.kind as 'page' | 'layout' | 'endpoint',
			file: `src/routes${route.href === '/' ? '/+page.svelte' : `${route.href.replace(/\/$/, '')}/+page.svelte`}`,
			summary: route.description,
			category: route.tab,
			version: 'v1',
			requiredPackages: route.badges || [],
			relatedRoutes: route.relatedRoutes || [],
			health: route.errorState === 'healthy' ? 'green' : route.errorState === 'flaky' ? 'yellow' : 'red',
			errorCount: route.errorCount,
			lastErrorCode: route.lastErrorCode || null,
			lastErrorMessage: route.lastErrorMessage || null
		};
		detectiveBoardOpen = true;
	}

	function openErrorBrainForRoute(routePath: string) {
		errorBrainRoutePath = routePath;
		errorBrainModalOpen = true;
	}

	function closeErrorBrain() {
		errorBrainModalOpen = false;
		errorBrainRoutePath = '';
	}

	function openErrorBrainModal(route: CommandCenterRoute) {
		errorBrainRoutePath = route.href;
		errorBrainModalOpen = true;
	}

	function closeErrorBrainModal() {
		errorBrainModalOpen = false;
		errorBrainRoutePath = '';
	}

	function visitRoute(route: CommandCenterRoute) {
		window.location.href = route.href;
	}

	function getHealthEmoji(state?: string): string {
		switch (state) {
			case 'healthy': return '✅';
			case 'flaky': return '⚠️';
			case 'broken': return '❌';
			default: return '❓';
		}
	}

	function getHealthClass(state?: string): string {
		switch (state) {
			case 'healthy': return 'health-healthy';
			case 'flaky': return 'health-flaky';
			case 'broken': return 'health-broken';
			default: return 'health-unknown';
		}
	}

	function clearFilters() {
		searchQuery.set('');
		selectedCategory.set(null);
		selectedKind.set(null);
		selectedErrorState.set(null);
		selectedCluster.set(null);
		showOnlyErrors.set(false);
	}

	// Derived state for Error Brain (Svelte 5 runes)
	const brainSnapshot = $derived($errorBrainSnapshot);
	const brainContext = $derived(brainSnapshot?.context || null);
	const brainPhase = $derived(brainContext?.phase || 'idle');
	const brainRouteId = $derived(brainContext?.route?.id || null);
	const brainIsBusy = $derived(ERROR_BRAIN_BUSY_PHASES.has(brainPhase));
	const brainSuggestions = $derived(brainContext?.suggestions ?? []);
	const brainSelectedSuggestion = $derived(brainContext?.suggestion ?? null);
	const brainCanApply = $derived(Boolean(brainSuggestions.length) && brainPhase === 'suggesting');

	function toRouteMeta(route: CommandCenterRoute) {
		const normalized = route.href === '/' ? '/+page.svelte' : `${route.href.replace(/\/$/, '')}/+page.svelte`;
		return {
			id: route.href,
			path: route.href,
			file: `src/routes${normalized}`,
			kind: route.kind,
			group: route.group,
			hasLoad: route.kind === 'page',
			hasActions: route.kind === 'page',
			hasAiImports: route.badges?.includes('ai') || false,
			lastModified: route.lastErrorAt || new Date().toISOString()
		};
	}

	function startErrorBrainAnalysis(route: CommandCenterRoute) {
		if (!errorBrainActor) return;
		errorBrainActor.send({ type: 'ANALYZE_ROUTE', route: toRouteMeta(route) });
	}

	function selectBrainSuggestion(index: number) {
		if (!errorBrainActor) return;
		errorBrainActor.send({ type: 'SELECT_SUGGESTION', index });
	}

	function applyBrainSuggestion(index?: number) {
		if (!errorBrainActor) return;
		errorBrainActor.send({ type: 'APPLY_PATCH', index });
	}

	function resetErrorBrain() {
		if (!errorBrainActor) return;
		errorBrainActor.send({ type: 'RESET' });
	}

	function isRouteActiveWithBrain(route: CommandCenterRoute | null) {
		if (!route || !brainRouteId) return false;
		return brainRouteId === route.href;
	}

	function getBrainButtonLabel(route: CommandCenterRoute | null) {
		if (!route || !isRouteActiveWithBrain(route)) {
			return '🧠 Error Brain';
		}

		switch (brainPhase) {
			case 'analyzing':
				return 'Analyzing…';
			case 'suggesting':
				return 'Review Suggestions';
			case 'applying':
				return 'Applying Patch…';
			case 'verifying':
				return 'Verifying…';
			case 'done':
				return 'Analysis Complete';
			case 'failed':
				return 'Retry Analysis';
			default:
				return '🧠 Error Brain';
		}
	}
</script>

<div class="all-routes-layout">
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- LEFT SIDEBAR: Categories & Filters -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<aside class="sidebar">
		<div class="sidebar-header">
			<h2>🗂️ Filters</h2>
			<button type="button" class="clear-btn" onclick={() => clearFilters()}>Clear</button>
		</div>

		<!-- Stats -->
		<div class="stats-panel">
			<div class="stat">
				<span class="stat-value">{$routeStats.total}</span>
				<span class="stat-label">Routes</span>
			</div>
			<div class="stat health-healthy">
				<span class="stat-value">{$routeStats.healthy}</span>
				<span class="stat-label">Healthy</span>
			</div>
			<div class="stat health-flaky">
				<span class="stat-value">{$routeStats.flaky}</span>
				<span class="stat-label">Flaky</span>
			</div>
			<div class="stat health-broken">
				<span class="stat-value">{$routeStats.broken}</span>
				<span class="stat-label">Broken</span>
			</div>
		</div>

		<!-- Category Filter -->
		<div class="filter-section">
			<h3>Category</h3>
			<div class="filter-tags">
				{#each categories as cat}
					<button
						type="button"
						class="tag-btn"
						class:active={$selectedCategory === cat}
						onclick={() => selectedCategory.set($selectedCategory === cat ? null : cat)}
					>
						{cat}
					</button>
				{/each}
			</div>
		</div>

		<!-- Kind Filter -->
		<div class="filter-section">
			<h3>Kind</h3>
			<div class="filter-tags">
				{#each kinds as kind}
					<button
						type="button"
						class="tag-btn"
						class:active={$selectedKind === kind}
						onclick={() => selectedKind.set($selectedKind === kind ? null : kind)}
					>
						{kind}
					</button>
				{/each}
			</div>
		</div>

		<!-- Cluster Filter -->
		<div class="filter-section">
			<h3>Cluster</h3>
			<div class="filter-tags">
				{#each clusters as cluster}
					<button
						type="button"
						class="tag-btn"
						class:active={$selectedCluster === cluster}
						onclick={() => selectedCluster.set($selectedCluster === cluster ? null : cluster)}
					>
						{cluster}
					</button>
				{/each}
			</div>
		</div>

		<!-- Error State Filter -->
		<div class="filter-section">
			<h3>Health</h3>
			<div class="filter-tags">
				{#each errorStates as state}
					<button
						type="button"
						class="tag-btn {getHealthClass(state)}"
						class:active={$selectedErrorState === state}
						onclick={() => selectedErrorState.set($selectedErrorState === state ? null : state)}
					>
						{getHealthEmoji(state)} {state}
					</button>
				{/each}
			</div>
		</div>

		<!-- Quick Toggle -->
		<div class="filter-section">
			<label class="toggle-label">
				<input type="checkbox" bind:checked={$showOnlyErrors} />
				<span>Show only errors</span>
			</label>
		</div>
	</aside>

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- MAIN CONTENT: Search + Route List -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<main class="main-content">
		<!-- Header with Search -->
		<header class="content-header">
			<div class="header-title">
				<h1>🕹️ Route Command Center</h1>
				<p>Phase 72 AST · Phase 78 Error Brain · All Routes Consolidated</p>
			</div>
			<div class="search-bar">
				<input
					type="text"
					placeholder="Search routes, paths, descriptions..."
					bind:value={$searchQuery}
					class="search-input"
				/>
			</div>
		</header>

		<!-- Route Grid -->
		<section class="route-grid">
			{#each $filteredRoutes as route (route.href)}
				<div class="route-card-wrapper">
					<button
						type="button"
						class="route-card {getHealthClass(route.errorState)}"
						onclick={() => openDetectiveBoard(route)}
					>
						<div class="card-header">
							<span class="route-kind">{route.kind}</span>
							<span class="route-health">{getHealthEmoji(route.errorState)}</span>
						</div>
						<div class="card-body">
							<h3 class="route-label">{route.label}</h3>
							<code class="route-path">{route.href}</code>
							<div class="route-meta">
								<span class="meta-cluster">📦 {computeRouteCluster(route.href)}</span>
							</div>
							<p class="route-desc">{route.description}</p>
						</div>
						<div class="card-footer">
							{#if route.badges}
								{#each route.badges.slice(0, 3) as badge}
									<span class="badge" title={BADGE_DESCRIPTIONS[badge] || ''}>
										{badge}
									</span>
								{/each}
							{/if}
							{#if route.errorCount}
								<span class="error-count">
									{route.errorCount} errors
								</span>
							{/if}
						</div>
					</button>
					{#if route.errorCount}
						<button
							type="button"
							class="card-overlay-btn"
							onclick={(e) => {
								e.stopPropagation();
								openErrorBrainForRoute(route.href);
							}}
							title="Analyze with Error Brain"
						>
							🧠
						</button>
					{/if}
				</div>
			{/each}

			{#if $filteredRoutes.length === 0}
				<div class="no-results">
					<p>No routes match your filters.</p>
					<button type="button" onclick={() => clearFilters()}>Clear Filters</button>
				</div>
			{/if}
		</section>
	</main>

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- RIGHT SIDEBAR: Error Summary / Quick Actions -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<aside class="right-sidebar">
		<div class="sidebar-header">
			<h2>🧠 Error Brain</h2>
		</div>

		<div class="error-summary">
			<h3>svelte-check Summary</h3>
			<div class="summary-stats">
				<div class="summary-stat">
					<span class="val">62,224</span>
					<span class="lbl">Total Errors</span>
				</div>
				<div class="summary-stat">
					<span class="val">954</span>
					<span class="lbl">Warnings</span>
				</div>
				<div class="summary-stat">
					<span class="val">2,678</span>
					<span class="lbl">Files</span>
				</div>
			</div>
		</div>

		<div class="quick-actions">
			<h3>Quick Actions</h3>
			<button type="button" class="action-btn">
				🔧 Run Route Fixer
			</button>
			<button type="button" class="action-btn">
				📊 Generate AST Graph
			</button>
			<button type="button" class="action-btn">
				🧹 Disable Legacy Routes
			</button>
		</div>

		<div class="top-errors">
			<h3>Top Error Types</h3>
			<ul class="error-list">
				<li>
					<span class="err-code">TS2345</span>
					<span class="err-count">12,450</span>
				</li>
				<li>
					<span class="err-code">import type</span>
					<span class="err-count">8,200</span>
				</li>
				<li>
					<span class="err-code">onclick syntax</span>
					<span class="err-count">5,100</span>
				</li>
				<li>
					<span class="err-code">$: reactive</span>
					<span class="err-count">3,800</span>
				</li>
			</ul>
		</div>
	</aside>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- ROUTE DETAIL MODAL -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<Dialog.Root
	open={modalOpen}
	onOpenChange={(open) => {
		if (!open) closeModal();
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay class="modal-overlay" />
		<Dialog.Content class="modal-content">
			{#if selectedRoute}
				<header class="modal-header">
					<div class="modal-title">
						<span class="modal-kind">{selectedRoute.kind}</span>
						<span class="modal-health {getHealthClass(selectedRoute.errorState)}">
							{getHealthEmoji(selectedRoute.errorState)} {selectedRoute.errorState || 'unknown'}
						</span>
					</div>
					<Dialog.Close class="modal-close" onclick={closeModal}>✕</Dialog.Close>
				</header>

				<div class="modal-body">
					<section class="modal-section">
						<h2>{selectedRoute.label}</h2>
						<code class="modal-path">{selectedRoute.href}</code>
					</section>

					<section class="modal-section">
						<h3>Description</h3>
						<p>{selectedRoute.description}</p>
					</section>

					<section class="modal-section">
						<h3>Badges</h3>
						<div class="modal-badges">
							{#if selectedRoute.badges}
								{#each selectedRoute.badges as badge}
									<span class="badge" title={BADGE_DESCRIPTIONS[badge] || ''}>
										{badge}
									</span>
								{/each}
							{:else}
								<span class="no-data">No badges</span>
							{/if}
						</div>
					</section>

					{#if selectedRoute.errorCount}
						<section class="modal-section error-section">
							<h3>⚠️ Errors ({selectedRoute.errorCount})</h3>
							<p class="error-hint">
								Click "Analyze" to get AI-suggested fixes from the Error Brain.
							</p>
						</section>
					{/if}

					{#if selectedRoute && brainSnapshot}
						{#if isRouteActiveWithBrain(selectedRoute)}
							<section class="modal-section error-brain-panel">
								<div class="error-brain-heading">
									<h3>🧠 Error Brain</h3>
									<span class="error-brain-phase {brainPhase}">{brainPhase}</span>
								</div>
								{#if brainSuggestions.length}
									<div class="error-brain-suggestion-pills">
										{#each brainSuggestions as suggestion, index}
											<button
												type="button"
												class="suggestion-pill"
												class:selected={index === (brainContext?.selectedSuggestionIndex ?? 0)}
												onclick={() => selectBrainSuggestion(index)}
												disabled={brainPhase !== 'suggesting'}
											>
												{index + 1}. {suggestion.title}
											</button>
										{/each}
									</div>
								{/if}
								{#if brainContext?.error}
									<p class="error-brain-message">{brainContext.error}</p>
								{:else if brainSelectedSuggestion}
									<div class="error-brain-suggestion">
										<p class="suggestion-title">{brainSelectedSuggestion.title}</p>
										<p class="suggestion-body">{brainSelectedSuggestion.explanation}</p>
										{#if brainSelectedSuggestion.hints?.length}
											<ul class="suggestion-hints">
												{#each brainSelectedSuggestion.hints as hint}
													<li>{hint}</li>
											{/each}
											</ul>
										{/if}
										<p class="suggestion-confidence">
											Confidence {Math.round((brainSelectedSuggestion.confidence || 0) * 100)}%
										</p>
										{#if brainSelectedSuggestion.patch}
											<pre class="suggestion-patch">{brainSelectedSuggestion.patch}</pre>
										{/if}
									</div>
								{:else}
									<p class="error-brain-message">Crunching AST telemetry…</p>
								{/if}
								{#if brainContext?.cluster}
									<div class="error-brain-cluster">
										<div>
											<span class="cluster-label">Code</span>
											<span class="cluster-value">{brainContext.cluster.errorCode}</span>
										</div>
										<div>
											<span class="cluster-label">Last seen</span>
											<span class="cluster-value">{brainContext.cluster.lastSeen}</span>
										</div>
									</div>
								{/if}
								{#if brainContext && brainPhase !== 'analyzing'}
									<div class="error-brain-actions">
										<button
											type="button"
											class="btn-primary"
											onclick={() => requestAiPatch(selectedRoute)}
											disabled={requestingPatch || !selectedRoute}
										>
											{#if requestingPatch}
												Requesting Patch…
											{:else}
												Request AI Patch (Phase 78)
											{/if}
										</button>
										{#if lastPatchError}
											<div class="patch-error">
												{lastPatchError}
											</div>
										{:else if lastPatchId}
											<div class="patch-success">
												Patch {lastPatchId.slice(0, 8)} created.
											</div>
										{/if}
										<button
											type="button"
											class="btn-ghost"
											onclick={() => applyBrainSuggestion(brainContext?.selectedSuggestionIndex)}
											disabled={!brainCanApply}
										>
											Apply Selected Suggestion
										</button>
										<button
											type="button"
											class="btn-secondary"
											onclick={resetErrorBrain}
											disabled={brainPhase === 'analyzing'}
										>
											Reset Brain
										</button>
									</div>
								{/if}
							</section>
						{:else}
							<section class="modal-section error-brain-panel muted">
								<p>
									Error Brain is currently focused on {brainContext?.route?.path || 'another route'}. Launch a new run to retarget this route.
								</p>
							</section>
						{/if}
					{/if}

					<section class="modal-meta">
						<div class="meta-item">
							<span class="meta-label">Category</span>
							<span class="meta-value">{selectedRoute.tab}</span>
						</div>
						<div class="meta-item">
							<span class="meta-label">Priority</span>
							<span class="meta-value">{selectedRoute.priority || 50}</span>
						</div>
					</section>
				</div>

				<footer class="modal-footer">
					<button type="button" class="btn-secondary" onclick={closeModal}>
						Close
					</button>
					{#if selectedRoute.errorCount}
						<button
							type="button"
							class="btn-warning"
							onclick={() => startErrorBrainAnalysis(selectedRoute)}
							disabled={!errorBrainActor || (brainIsBusy && !isRouteActiveWithBrain(selectedRoute))}
						>
							{getBrainButtonLabel(selectedRoute)}
						</button>
					{/if}
					<button type="button" class="btn-primary" onclick={() => visitRoute(selectedRoute)}>
						Visit Page →
					</button>
				</footer>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Error Brain Modal (Phase 78) -->
<ErrorModal
	bind:open={errorBrainModalOpen}
	routePath={errorBrainRoutePath}
	onClose={closeErrorBrain}
/>

<!-- YoRHa Detective Board (Phase 72/78/82 Integration) -->
<RouteInspectorDetectiveBoard
	bind:open={detectiveBoardOpen}
	route={detectiveBoardRoute}
/>

<style>
	/* ═══════════════════════════════════════════════════════════════════════ */
	/* LAYOUT: 3-Column Grid */
	/* ═══════════════════════════════════════════════════════════════════════ */
	.all-routes-layout {
		display: grid;
		grid-template-columns: 260px 1fr 280px;
		min-height: 100vh;
		background: #0a0a12;
		color: #e5e7eb;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	/* ═══════════════════════════════════════════════════════════════════════ */
	/* LEFT SIDEBAR */
	/* ═══════════════════════════════════════════════════════════════════════ */
	.sidebar {
		background: #111827;
		border-right: 2px solid #1f2937;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
	}

	.sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid #374151;
		padding-bottom: 0.5rem;
	}

	.sidebar-header h2 {
		font-size: 1rem;
		margin: 0;
	}

	.clear-btn {
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border: 1px solid #6b7280;
		background: transparent;
		color: #9ca3af;
		cursor: pointer;
	}

	.clear-btn:hover {
		background: #1f2937;
	}

	/* Stats Panel */
	.stats-panel {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.stat {
		background: #1f2937;
		border: 1px solid #374151;
		padding: 0.5rem;
		text-align: center;
		border-radius: 4px;
	}

	.stat-value {
		display: block;
		font-size: 1.2rem;
		font-weight: bold;
	}

	.stat-label {
		font-size: 0.65rem;
		color: #9ca3af;
		text-transform: uppercase;
	}

	/* Filter Sections */
	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.filter-section h3 {
		font-size: 0.75rem;
		text-transform: uppercase;
		color: #9ca3af;
		margin: 0;
	}

	.filter-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.tag-btn {
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border: 1px solid #374151;
		background: #1f2937;
		color: #d1d5db;
		cursor: pointer;
		border-radius: 4px;
	}

	.tag-btn:hover {
		background: #374151;
	}

	.tag-btn.active {
		background: #3b82f6;
		border-color: #3b82f6;
		color: #fff;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	/* ═══════════════════════════════════════════════════════════════════════ */
	/* MAIN CONTENT */
	/* ═══════════════════════════════════════════════════════════════════════ */
	.main-content {
		padding: 1rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.content-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-title h1 {
		font-size: 1.3rem;
		margin: 0;
	}

	.header-title p {
		font-size: 0.8rem;
		color: #9ca3af;
		margin: 0.25rem 0 0;
	}

	.search-bar {
		flex: 1;
		max-width: 400px;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		border: 2px solid #374151;
		background: #1f2937;
		color: #e5e7eb;
		border-radius: 4px;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	/* Route Grid */
	.route-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
	}

	.route-card-wrapper {
		position: relative;
	}

	.route-card {
		background: #1f2937;
		border: 2px solid #374151;
		padding: 0.75rem;
		cursor: pointer;
		text-align: left;
		border-radius: 6px;
		transition: all 0.15s ease;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.route-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		border-color: #4b5563;
	}

	.route-card.health-healthy {
		border-left: 4px solid #22c55e;
	}

	.route-card.health-flaky {
		border-left: 4px solid #eab308;
	}

	.route-card.health-broken {
		border-left: 4px solid #ef4444;
	}

	.card-overlay-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(59, 130, 246, 0.9);
		border: 2px solid #60a5fa;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		transition: all 0.15s ease;
		opacity: 0;
		pointer-events: none;
	}

	.route-card-wrapper:hover .card-overlay-btn {
		opacity: 1;
		pointer-events: auto;
	}

	.card-overlay-btn:hover {
		background: rgba(59, 130, 246, 1);
		transform: scale(1.1);
		box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.route-kind {
		font-size: 0.65rem;
		text-transform: uppercase;
		color: #60a5fa;
		border: 1px solid #3b82f6;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
	}

	.route-health {
		font-size: 0.9rem;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.route-label {
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0;
	}

	.route-path {
		font-size: 0.75rem;
		color: #9ca3af;
		font-family: ui-monospace, monospace;
	}

	.route-desc {
		font-size: 0.75rem;
		color: #6b7280;
		margin: 0;
		line-height: 1.3;
	}

	.card-footer {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
		margin-top: auto;
	}

	.badge {
		font-size: 0.6rem;
		padding: 0.1rem 0.35rem;
		background: #374151;
		border-radius: 4px;
		text-transform: uppercase;
	}

	.error-count {
		font-size: 0.65rem;
		color: #ef4444;
		margin-left: auto;
	}

	.no-results {
		grid-column: 1 / -1;
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}

	/* ═══════════════════════════════════════════════════════════════════════ */
	/* RIGHT SIDEBAR */
	/* ═══════════════════════════════════════════════════════════════════════ */
	.right-sidebar {
		background: #111827;
		border-left: 2px solid #1f2937;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
	}

	.error-summary, .quick-actions, .top-errors {
		background: #1f2937;
		border: 1px solid #374151;
		padding: 0.75rem;
		border-radius: 6px;
	}

	.error-summary h3, .quick-actions h3, .top-errors h3 {
		font-size: 0.8rem;
		margin: 0 0 0.5rem;
		color: #9ca3af;
	}

	.summary-stats {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.5rem;
		text-align: center;
	}

	.summary-stat .val {
		display: block;
		font-size: 1rem;
		font-weight: bold;
		color: #ef4444;
	}

	.summary-stat .lbl {
		font-size: 0.6rem;
		color: #6b7280;
	}

	.action-btn {
		display: block;
		width: 100%;
		padding: 0.5rem;
		margin-bottom: 0.4rem;
		font-size: 0.75rem;
		background: #374151;
		border: 1px solid #4b5563;
		color: #e5e7eb;
		cursor: pointer;
		border-radius: 4px;
		text-align: left;
	}

	.action-btn:hover {
		background: #4b5563;
	}

	.error-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.error-list li {
		display: flex;
		justify-content: space-between;
		padding: 0.3rem 0;
		border-bottom: 1px solid #374151;
		font-size: 0.75rem;
	}

	.err-code {
		color: #f87171;
	}

	.err-count {
		color: #6b7280;
	}

	/* ═══════════════════════════════════════════════════════════════════════ */
	/* HEALTH CLASSES */
	/* ═══════════════════════════════════════════════════════════════════════ */
	.health-healthy { color: #22c55e; }
	.health-flaky { color: #eab308; }
	.health-broken { color: #ef4444; }
	.health-unknown { color: #6b7280; }

	/* ═══════════════════════════════════════════════════════════════════════ */
	/* MODAL */
	/* ═══════════════════════════════════════════════════════════════════════ */
	:global(.modal-overlay) {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		z-index: 2000;
	}

	:global(.modal-content) {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 560px;
		max-width: 95vw;
		max-height: 85vh;
		overflow-y: auto;
		background: #1f2937;
		border: 3px solid #374151;
		border-radius: 8px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
		z-index: 2001;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #374151;
		background: #111827;
	}

	.modal-title {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.modal-kind {
		font-size: 0.7rem;
		text-transform: uppercase;
		padding: 0.15rem 0.5rem;
		border: 1px solid #3b82f6;
		color: #60a5fa;
		border-radius: 4px;
	}

	.modal-health {
		font-size: 0.75rem;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		background: #374151;
	}

	.modal-close {
		background: #ef4444;
		border: none;
		color: #fff;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		border-radius: 4px;
	}

	.modal-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal-section {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.modal-section h2 {
		font-size: 1.1rem;
		margin: 0;
	}

	.modal-section h3 {
		font-size: 0.75rem;
		text-transform: uppercase;
		color: #9ca3af;
		margin: 0;
	}

	.modal-path {
		font-size: 0.85rem;
		color: #60a5fa;
		background: #111827;
		padding: 0.4rem 0.6rem;
		border-radius: 4px;
	}

	.modal-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.error-section {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		padding: 0.75rem;
		border-radius: 6px;
	}

	.error-hint {
		font-size: 0.8rem;
		color: #f87171;
		margin: 0;
	}

	.modal-meta {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.meta-item {
		background: #111827;
		padding: 0.5rem;
		border-radius: 4px;
	}

	.meta-label {
		display: block;
		font-size: 0.65rem;
		text-transform: uppercase;
		color: #6b7280;
	}

	.meta-value {
		font-size: 0.85rem;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-top: 1px solid #374151;
		background: #111827;
	}

	.btn-primary, .btn-secondary, .btn-warning {
		padding: 0.4rem 0.8rem;
		font-size: 0.8rem;
		border: 2px solid transparent;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-primary {
		background: #22c55e;
		color: #111;
	}

	.btn-secondary {
		background: #374151;
		color: #e5e7eb;
		border-color: #4b5563;
	}

	.btn-warning {
		background: #eab308;
		color: #111;
	}

	.btn-warning:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.no-data {
		font-size: 0.8rem;
		color: #6b7280;
		font-style: italic;
	}

	.error-brain-panel {
		background: #101827;
		border: 1px solid #1f2937;
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 0.75rem;
	}

	.error-brain-suggestion-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}

	.suggestion-pill {
		font-size: 0.7rem;
		padding: 0.25rem 0.55rem;
		background: #1f2839;
		border: 1px solid #2f3a4e;
		color: #cbd5f5;
		border-radius: 999px;
		cursor: pointer;
	}

	.suggestion-pill.selected {
		background: #3b82f6;
		border-color: #3b82f6;
		color: #fff;
	}

	.error-brain-panel.muted {
		opacity: 0.7;
		font-size: 0.85rem;
	}

	.error-brain-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.error-brain-phase {
		text-transform: uppercase;
		font-size: 0.65rem;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		background: #374151;
		color: #f3f4f6;
	}

	.error-brain-phase.analyzing {
		background: #3b82f6;
	}

	.error-brain-phase.verifying,
	.error-brain-phase.applying {
		background: #f59e0b;
		color: #111827;
	}

	.error-brain-phase.done {
		background: #22c55e;
	}

	.error-brain-message {
		font-size: 0.85rem;
		color: #e5e7eb;
	}

	.error-brain-suggestion {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.suggestion-title {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.suggestion-body {
		font-size: 0.85rem;
		color: #cbd5f5;
	}

	.suggestion-hints {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	.suggestion-confidence {
		font-size: 0.75rem;
		color: #a5b4fc;
	}

	.suggestion-patch {
		margin: 0.5rem 0 0;
		padding: 0.5rem;
		background: #05070f;
		border: 1px solid #1f2937;
		border-radius: 4px;
		font-size: 0.7rem;
		line-height: 1.4;
		max-height: 160px;
		overflow-y: auto;
	}

	.error-brain-cluster {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
	}

	.cluster-label {
		display: block;
		color: #9ca3af;
		text-transform: uppercase;
		font-size: 0.65rem;
	}

	.cluster-value {
		font-family: ui-monospace, monospace;
	}

	.error-brain-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
		flex-wrap: wrap;
	}

	.btn-ghost {
		padding: 0.35rem 0.75rem;
		border: 1px dashed #3b82f6;
		background: transparent;
		color: #bfdbfe;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-ghost:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.patch-error {
		margin-top: 0.35rem;
		padding: 0.3rem 0.5rem;
		font-size: 0.7rem;
		color: #fecaca;
		background: rgba(220, 38, 38, 0.1);
		border: 1px solid rgba(220, 38, 38, 0.3);
		border-radius: 3px;
		word-break: break-word;
	}

	.patch-success {
		margin-top: 0.35rem;
		padding: 0.3rem 0.5rem;
		font-size: 0.7rem;
		color: #bbf7d0;
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: 3px;
	}

	.btn-primary {
		padding: 0.35rem 0.75rem;
		border: 1px solid #10b981;
		background: rgba(16, 185, 129, 0.15);
		color: #a7f3d0;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.btn-primary:hover:not(:disabled) {
		background: rgba(16, 185, 129, 0.25);
		border-color: #6ee7b7;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		padding: 0.35rem 0.75rem;
		border: 1px solid #6366f1;
		background: transparent;
		color: #a5b4fc;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.75rem;
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
