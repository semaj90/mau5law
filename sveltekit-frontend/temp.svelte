<script lang="ts">
	import { derived, writable } from 'svelte/store';
	import type { PageData } from './$types';
	import {
		COMMAND_CENTER_MANIFEST,
		getRoutesByTab,
		enrichRoutesWithPhase72,
		BADGE_DESCRIPTIONS,
		type CommandCenterRoute,
	} from '$lib/command-center-manifest';

	interface Props {
		data: PageData;
	}

	const { data }: Props = $props();

	type TabType = 'cases' | 'evidence' | 'persons' | 'system';

	let activeTab = writable<TabType>('cases');
	let selectedRoute = writable<CommandCenterRoute | null>(null);
	let searchQuery = writable('');
	let filterKind = writable<string | null>(null);
	let filterAiOnly = writable(false);
	let showErrorBrain = writable(false);
	let errorBrainLoading = writable(false);
	let errorBrainSuggestion: any = $state(null);

	// Enrich canonical routes with Phase 72 data
	const enrichedRoutes = enrichRoutesWithPhase72(
		[...Object.values(COMMAND_CENTER_MANIFEST).flat()],
		data.graph || { nodes: [], edges: [] },
		data.shieldData || {},
		data.errorSummary || {}
	);

	// Derived filtered nodes for current tab
	const tabRoutes = derived(activeTab, ($tab) => {
		return enrichedRoutes.filter((r) => r.tab === $tab).sort((a, b) => a.priority - b.priority);
	});

	const filteredRoutes = derived(
		[searchQuery, filterKind, filterAiOnly, tabRoutes],
		([$search, $kind, $aiOnly, routes]) => {
			let result = routes;

			if ($search.trim()) {
				const q = $search.toLowerCase();
				result = result.filter(
					(r) =>
						r.label.toLowerCase().includes(q) ||
						r.href.toLowerCase().includes(q) ||
						r.description.toLowerCase().includes(q)
				);
			}

			if ($kind) {
				result = result.filter((r) => r.kind === $kind);
			}

			if ($aiOnly) {
				result = result.filter((r) => r.badges.includes('ai'));
			}

			return result;
		}
	);

	function selectRoute(route: CommandCenterRoute) {
		selectedRoute.set(route);
		showErrorBrain.set(false);
		errorBrainSuggestion = null;
	}

	function closeModal() {
		selectedRoute.set(null);
		showErrorBrain.set(false);
	}

	function navigateToRoute(href: string) {
		window.location.href = href;
	}

	async function askErrorBrain() {
		const route = $selectedRoute;
		if (!route) return;

		errorBrainLoading.set(true);
		showErrorBrain.set(true);

		try {
			const response = await fetch('/api/error-brain/recommend', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					routePath: route.href,
					useCache: true
				})
			});

			if (!response.ok) {
				throw new Error(`Error brain failed: ${response.status}`);
			}

			const data = await response.json();
			errorBrainSuggestion = data.suggestion;
		} catch (error) {
			console.error('Error brain request failed:', error);
			errorBrainSuggestion = {
				summary: 'Error brain unavailable',
				patch: '/* Unable to generate suggestion */',
				riskLevel: 'unknown',
				confidence: 0
			};
		} finally {
			errorBrainLoading.set(false);
		}
	}

	function getHealthBadgeColor(errorState: string | undefined): string {
		switch (errorState) {
			case 'healthy':
				return 'success';
			case 'flaky':
				return 'warning';
			case 'broken':
				return 'error';
			default:
				return 'info';
		}
	}

	function getHealthIcon(errorState: string | undefined): string {
		switch (errorState) {
			case 'healthy':
				return '✅';
			case 'flaky':
				return '⚠️';
			case 'broken':
				return '❌';
			default:
				return 'ℹ️';
		}
	}
</script>

<div class="command-center">
	<!-- Header -->
	<div class="cc-header">
		<h1>🎮 YoRHa Command Center</h1>
		<p class="cc-subtitle">Phase 72 Route Inspector • {enrichedRoutes.length} canonical routes</p>
	</div>

	<!-- NES Tabs -->
	<div class="nes-tabs">
		<button
			class="nes-tab {$activeTab === 'cases' ? 'active' : ''}"
			onclick={() => activeTab.set('cases')}
		>
			📋 Cases
		</button>
		<button
			class="nes-tab {$activeTab === 'evidence' ? 'active' : ''}"
			onclick={() => activeTab.set('evidence')}
		>
			🔍 Evidence
		</button>
		<button
			class="nes-tab {$activeTab === 'persons' ? 'active' : ''}"
			onclick={() => activeTab.set('persons')}
		>
			👥 Persons
		</button>
		<button
			class="nes-tab {$activeTab === 'system' ? 'active' : ''}"
			onclick={() => activeTab.set('system')}
		>
			⚙️ System
		</button>
	</div>

	<!-- Search & Filters -->
	<div class="cc-controls">
		<input
			type="text"
			class="nes-input search-input"
			placeholder="Search routes..."
			bind:value={$searchQuery}
		/>
		<select class="nes-select kind-filter" bind:value={$filterKind}>
			<option value={null}>All Kinds</option>
			<option value="page">📄 Page</option>
			<option value="layout">📁 Layout</option>
			<option value="server">⚙️ Server</option>
			<option value="page_server">🔧 Page+Server</option>
		</select>
		<label class="nes-checkbox ai-only-filter">
			<input type="checkbox" bind:checked={$filterAiOnly} />
			<span>🤖 AI Only</span>
		</label>
	</div>

	<!-- Route Table -->
	<div class="route-table">
		<div class="table-header nes-border-thick">
			<div class="col-route">Route</div>
			<div class="col-kind">Kind</div>
			<div class="col-badges">Status</div>
		</div>

		<div class="table-body">
			{#each $filteredRoutes as route (route.href)}
				<div
					class="table-row nes-border-thick"
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							selectRoute(route);
						}
					}}
					onclick={() => selectRoute(route)}
				>
					<div class="col-route">
						<span class="route-label">{route.label}</span>
						<span class="route-path">{route.href}</span>
					</div>
					<div class="col-kind">
						<span class="kind-badge kind-{route.kind}">{route.kind}</span>
					</div>
					<div class="col-badges">
						{#each route.badges as badge (badge)}
							<span class="nes-badge badge-{badge}" title={BADGE_DESCRIPTIONS[badge]}>
								{#if badge === 'ai'}🤖{:else if badge === 'shield'}🛡️{:else if badge === 'error'}⚠️{:else if badge === 'experimental'}✨{:else}✅{/if}
								{badge}
							</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Right Sidebar: Route Details / Modal -->
	{#if $selectedRoute}
		<div
			class="modal-overlay"
			role="button"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === 'Escape') closeModal();
			}}
			onclick={() => closeModal()}
		>
			<div
				class="modal-content nes-border-thick"
				role="dialog"
				aria-label="Route details"
				onclick={(e) => e.stopPropagation()}
			>
				<button
					class="modal-close nes-btn"
					onclick={() => closeModal()}
					aria-label="Close modal"
				>
					✕
				</button>

				<h2>{$selectedRoute.label}</h2>
				<p class="modal-path">{$selectedRoute.href}</p>

				<div class="modal-body">
					<div class="info-block">
						<h3>Description</h3>
						<p>{$selectedRoute.description}</p>
					</div>

					<div class="info-block">
						<h3>Health Status</h3>
						{#if $selectedRoute.meta?.errorState}
							<div class="health-display">
								<span class="health-badge health-{$selectedRoute.meta.errorState}">
									{getHealthIcon($selectedRoute.meta.errorState)}
									{$selectedRoute.meta.errorState}
								</span>
								{#if $selectedRoute.meta.errorCount}
									<p class="health-info">
										<strong>Total Errors:</strong> {$selectedRoute.meta.errorCount}
									</p>
								{/if}
								{#if $selectedRoute.meta.lastErrorAt}
									<p class="health-info">
										<strong>Last Error:</strong> {new Date($selectedRoute.meta.lastErrorAt).toLocaleString()}
									</p>
								{/if}
								{#if $selectedRoute.meta.lastErrorMessageShort}
									<p class="health-info error-preview">
										<strong>Preview:</strong> {$selectedRoute.meta.lastErrorMessageShort}
									</p>
								{/if}
							</div>
						{:else}
							<p class="health-unknown">No error data available yet</p>
						{/if}
					</div>

					<div class="info-block">
						<h3>Metadata</h3>
						<ul>
							<li><strong>Type:</strong> {$selectedRoute.kind}</li>
							<li><strong>Tab:</strong> {$selectedRoute.tab}</li>
							<li><strong>Priority:</strong> {$selectedRoute.priority}/12</li>
						</ul>
					</div>

					{#if $selectedRoute.badges.length > 0}
						<div class="info-block">
							<h3>Badges</h3>
							<div class="badges-list">
								{#each $selectedRoute.badges as badge (badge)}
									<span class="nes-badge badge-{badge}">
										{#if badge === 'ai'}🤖{:else if badge === 'shield'}🛡️{:else if badge === 'error'}⚠️{:else if badge === 'experimental'}✨{:else}✅{/if}
										{badge}
									</span>
									<p class="badge-desc">{BADGE_DESCRIPTIONS[badge]}</p>
								{/each}
							</div>
						</div>
					{/if}

					{#if $showErrorBrain}
						<div class="info-block error-brain-panel">
							<h3>🧠 Error Brain Suggestion</h3>
							{#if $errorBrainLoading}
								<p class="loading">⏳ Analyzing errors and building context...</p>
							{:else if errorBrainSuggestion}
								<div class="suggestion-content">
									<p><strong>Summary:</strong> {errorBrainSuggestion.summary}</p>
									<div class="suggestion-patch">
										<strong>Suggested Patch:</strong>
										<pre><code>{errorBrainSuggestion.patch}</code></pre>
									</div>
									<div class="suggestion-meta">
										<p><strong>Risk Level:</strong> <span class="risk-{errorBrainSuggestion.riskLevel}">{errorBrainSuggestion.riskLevel}</span></p>
										<p><strong>Confidence:</strong> {Math.round(errorBrainSuggestion.confidence * 100)}%</p>
										{#if errorBrainSuggestion.affectedFiles?.length > 0}
											<p><strong>Files:</strong> {errorBrainSuggestion.affectedFiles.join(', ')}</p>
										{/if}
										{#if errorBrainSuggestion.testsToRun?.length > 0}
											<p><strong>Tests to Run:</strong> {errorBrainSuggestion.testsToRun.join(', ')}</p>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<div class="modal-actions">
						<button
							class="nes-btn is-primary"
							onclick={() => askErrorBrain()}
							disabled={$errorBrainLoading}
						>
							🧠 Ask Error Brain
						</button>
						<button
							class="nes-btn"
							onclick={() => navigateToRoute($selectedRoute.href)}
						>
							→ Go to Route
						</button>
						<button
							class="nes-btn is-error"
							onclick={() => closeModal()}
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
<style>
	.all-routes-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: 'Courier New', monospace;
	}

	.header {
		margin-bottom: 2rem;
		border-bottom: 2px solid #333;
		padding-bottom: 1rem;
	}

	.header h1 {
		font-size: 2rem;
		margin: 0;
		color: #000;
	}

	.subtitle {
		margin: 0.5rem 0 0 0;
		color: #666;
		font-size: 0.9rem;
	}

	.generated {
		margin: 0.5rem 0 0 0;
		color: #999;
		font-size: 0.8rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		border: 2px solid #333;
		padding: 1rem;
		text-align: center;
		background: #f5f5f5;
	}

	.stat-number {
		font-size: 2rem;
		font-weight: bold;
		color: #000;
	}

	.stat-label {
		font-size: 0.9rem;
		color: #666;
		margin-top: 0.5rem;
	}

	.search-section {
		margin-bottom: 2rem;
	}

	.search-controls {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.search-input {
		flex: 1;
		min-width: 250px;
		padding: 0.75rem;
		border: 2px solid #333;
		font-family: inherit;
		font-size: 1rem;
	}

	.search-input:focus {
		outline: none;
		background: #ffffcc;
	}

	.filter-controls {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.filter-select {
		padding: 0.75rem;
		border: 2px solid #333;
		font-family: inherit;
		background: white;
	}

	.filter-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.5rem;
		border: 1px solid #ddd;
		background: #f5f5f5;
	}

	.filter-checkbox input {
		margin: 0;
		cursor: pointer;
	}

	.routes-tree h2 {
		margin-bottom: 1rem;
		font-size: 1.2rem;
	}

	.tree-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.tree-item {
		border: 1px solid #ddd;
		margin-bottom: 0.5rem;
	}

	.node-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		cursor: pointer;
		background: #f9f9f9;
		user-select: none;
	}

	.node-header:hover {
		background: #eeeeee;
	}

	.kind-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border: 1px solid #333;
		background: #fff;
		font-size: 0.75rem;
		font-weight: bold;
		min-width: 50px;
		text-align: center;
	}

	.command-center {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.5rem;
		font-family: 'Courier New', monospace;
		background: #fff;
		color: #000;
	}

	.kind-page {
		background: #ccffcc;
	}

	.kind-layout {
		background: #ccccff;
	}

	.kind-server {
		background: #ffcccc;
	}

	.kind-page_server {
		background: #ffffcc;
	}

	.route-path {
		flex: 1;
		font-weight: bold;
	}

	.ai-badge {
		padding: 0.25rem 0.5rem;
		border: 1px solid #000;
		background: #ffffcc;
		font-size: 0.75rem;
	}

	.shield-badge {
		padding: 0.25rem 0.5rem;
		border: 1px solid #000;
		background: #ccffcc;
		font-size: 0.75rem;
	}

	.cc-header {
		margin-bottom: 1.5rem;
		border-bottom: 3px solid #333;
		padding-bottom: 1rem;
	}

	.cc-header h1 {
		font-size: 1.8rem;
		margin: 0;
		text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
	}

	.cc-subtitle {
		margin: 0.5rem 0 0 0;
		color: #666;
		font-size: 0.9rem;
	}

	/* NES Tab Styling */
	.nes-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		border-bottom: 3px solid #333;
	}

	.nes-tab {
		padding: 0.75rem 1.5rem;
		border: 2px solid #333;
		border-bottom: none;
		background: #eee;
		cursor: pointer;
		font-family: inherit;
		font-weight: bold;
		font-size: 1rem;
		transition: background 0.2s;
	}

	.nes-tab:hover {
		background: #ddd;
	}

	.nes-tab.active {
		background: #fff;
		border-bottom: 3px solid #fff;
		position: relative;
		z-index: 1;
	}

	/* Controls */
	.cc-controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.search-input {
		flex: 1;
		min-width: 250px;
		padding: 0.75rem;
		border: 2px solid #333;
		font-family: inherit;
		font-size: 1rem;
		background: #fff;
	}

	.search-input:focus {
		outline: none;
		background: #ffffcc;
		box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.05);
	}

	.kind-filter {
		padding: 0.75rem;
		border: 2px solid #333;
		font-family: inherit;
		background: #fff;
		cursor: pointer;
	}

	.ai-only-filter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: 2px solid #333;
		background: #f5f5f5;
		cursor: pointer;
		user-select: none;
	}

	.ai-only-filter input {
		cursor: pointer;
	}

	/* Route Table */
	.route-table {
		border: 3px solid #333;
		overflow: hidden;
		margin-bottom: 2rem;
	}

	.table-header {
		display: grid;
		grid-template-columns: 1fr auto 200px;
		gap: 1rem;
		padding: 1rem;
		background: #ddd;
		font-weight: bold;
		border-bottom: 3px solid #333;
	}

	.table-body {
		max-height: 600px;
		overflow-y: auto;
	}

	.table-row {
		display: grid;
		grid-template-columns: 1fr auto 200px;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #ddd;
		cursor: pointer;
		transition: background 0.2s;
	}

	.table-row:hover {
		background: #ffffcc;
	}

	.col-route {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.route-label {
		font-weight: bold;
		color: #000;
	}

	.route-path {
		font-size: 0.85rem;
		color: #666;
		font-family: monospace;
	}

	.col-kind {
		display: flex;
		align-items: center;
	}

	.kind-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border: 2px solid #333;
		background: #fff;
		font-size: 0.75rem;
		font-weight: bold;
		min-width: 70px;
		text-align: center;
	}

	.kind-page {
		background: #ccffcc;
	}

	.kind-layout {
		background: #ccccff;
	}

	.kind-server {
		background: #ffcccc;
	}

	.kind-page_server {
		background: #ffffcc;
	}

	.col-badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
	}

	.nes-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border: 1px solid #333;
		background: #f5f5f5;
		font-size: 0.7rem;
		font-weight: bold;
		white-space: nowrap;
	}

	.badge-ai {
		background: #ffffcc;
		border-color: #000;
	}

	.badge-shield {
		background: #ccffcc;
		border-color: #000;
	}

	.badge-error {
		background: #ffcccc;
		border-color: #cc0000;
	}

	.badge-experimental {
		background: #ffeecc;
		border-color: #ff6600;
	}

	.badge-online {
		background: #ccffcc;
		border-color: #00cc00;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: #fff;
		border: 4px solid #333;
		box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
		max-width: 700px;
		max-height: 80vh;
		overflow-y: auto;
		padding: 2rem;
		position: relative;
	}

	.modal-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: #fff;
		border: 2px solid #333;
		width: 2.5rem;
		height: 2.5rem;
		cursor: pointer;
		font-size: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		transition: background 0.2s;
	}

	.modal-close:hover {
		background: #ffcccc;
	}

	.modal-content h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.4rem;
		border-bottom: 2px solid #333;
		padding-bottom: 0.5rem;
	}

	.modal-path {
		color: #666;
		font-size: 0.85rem;
		margin: 0 0 1.5rem 0;
		font-family: monospace;
	}

	.modal-body {
		margin-bottom: 1.5rem;
	}

	.info-block {
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #ddd;
	}

	.info-block h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		color: #000;
	}

	.info-block p {
		margin: 0;
		color: #333;
		line-height: 1.5;
	}

	.info-block ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.info-block li {
		padding: 0.25rem 0;
		color: #333;
	}

	.badges-list {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.badge-desc {
		margin: 0 0 0.75rem 0;
		font-size: 0.85rem;
		color: #666;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
		border-top: 2px solid #333;
		padding-top: 1rem;
	}

	.nes-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 2px solid #333;
		background: #fff;
		cursor: pointer;
		font-family: inherit;
		font-weight: bold;
		font-size: 0.95rem;
		transition: all 0.2s;
	}

	.nes-btn:hover {
		background: #ffffcc;
		transform: translate(1px, 1px);
		box-shadow: -1px -1px 0 rgba(0, 0, 0, 0.2);
	}

	.nes-btn:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}

	.nes-btn.is-error {
		background: #ffcccc;
	}

	.nes-btn.is-error:hover {
		background: #ff9999;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.command-center {
			padding: 1rem;
		}

		.table-header,
		.table-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.col-badges {
			justify-content: flex-start;
		}

		.nes-tabs {
			flex-wrap: wrap;
		}

		.nes-tab {
			flex: 1;
			min-width: 80px;
			padding: 0.5rem;
		}
	}
</style>