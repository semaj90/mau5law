<script lang="ts">
	/**
	 * ═══════════════════════════════════════════════════════════════════════
	 * Error Cards View
	 * ═══════════════════════════════════════════════════════════════════════
	 * Task: 13.1 - Create admin route structure
	 * Route: /command-center/codebase/errors
	 * Purpose: Browse and filter all error cards from phase90_error_cards
	 */
	import { Card, CardContent } from '$lib/components/ui';
	import { Button } from '$lib/components/ui/button';
	import {
	  AlertTriangle,
	  ArrowLeft,
	  ChevronDown,
	  Code,
	  FileCode,
	  Filter,
	  Layers,
	  RefreshCw,
	  Search,
	  X
	} from 'lucide-svelte';
	import { onMount } from 'svelte';

	// Types
	interface ErrorCard {
		id: string;
		kind: string;
		tool: string;
		errorCode: string;
		severity: string;
		filePath: string;
		line: number;
		col: number;
		message: string;
		signature: string;
		surface: string[];
		tech: string[];
		clusterId: string | null;
		runId: string;
		timestamp: string;
	}

	// State
	let isLoading = $state(true);
	let errors = $state<ErrorCard[]>([]);
	let totalCount = $state(0);
	let page = $state(1);
	let pageSize = $state(50);

	// Filters
	let searchQuery = $state('');
	let selectedErrorCode = $state<string | null>(null);
	let selectedSurface = $state<string | null>(null);
	let selectedTech = $state<string | null>(null);
	let selectedTool = $state<string | null>(null);
	let showFilters = $state(false);

	// Available filter options
	let errorCodes = $state<string[]>([]);
	let surfaces = $state<string[]>([]);
	let techs = $state<string[]>([]);
	let tools = $state<string[]>(['tsc', 'svelte-check', 'eslint']);

	onMount(async () => {
		await Promise.all([loadErrors(), loadFilterOptions()]);
	});

	async function loadErrors() {
		isLoading = true;
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				pageSize: pageSize.toString()
			});

			if (searchQuery) params.set('search', searchQuery);
			if (selectedErrorCode) params.set('errorCode', selectedErrorCode);
			if (selectedSurface) params.set('surface', selectedSurface);
			if (selectedTech) params.set('tech', selectedTech);
			if (selectedTool) params.set('tool', selectedTool);

			const response = await fetch(`/api/codebase-index/errors?${params}`);
			if (response.ok) {
				const data = await response.json();
				errors = data.errors || [];
				totalCount = data.total || 0;
			}
		} catch (error) {
			console.error('Failed to load errors:', error);
		} finally {
			isLoading = false;
		}
	}

	async function loadFilterOptions() {
		try {
			const response = await fetch('/api/codebase-index/error-filters');
			if (response.ok) {
				const data = await response.json();
				errorCodes = data.errorCodes || [];
				surfaces = data.surfaces || [];
				techs = data.techs || [];
			}
		} catch (error) {
			console.error('Failed to load filter options:', error);
		}
	}

	function clearFilters() {
		searchQuery = '';
		selectedErrorCode = null;
		selectedSurface = null;
		selectedTech = null;
		selectedTool = null;
		page = 1;
		loadErrors();
	}

	function applyFilters() {
		page = 1;
		loadErrors();
	}

	function getErrorCodeColor(code: string): string {
		if (code.startsWith('TS1')) return 'text-red-400 bg-red-500/20';
		if (code.startsWith('TS2')) return 'text-orange-400 bg-orange-500/20';
		if (code.startsWith('TS7')) return 'text-yellow-400 bg-yellow-500/20';
		return 'text-blue-400 bg-blue-500/20';
	}

	function getSeverityColor(severity: string): string {
		return severity === 'error'
			? 'text-red-400 bg-red-500/20'
			: 'text-yellow-400 bg-yellow-500/20';
	}

	function getSurfaceColor(surface: string): string {
		const colors: Record<string, string> = {
			routes: 'bg-purple-500/20 text-purple-300',
			components: 'bg-blue-500/20 text-blue-300',
			stores: 'bg-green-500/20 text-green-300',
			services: 'bg-orange-500/20 text-orange-300',
			api: 'bg-cyan-500/20 text-cyan-300',
			evidence: 'bg-red-500/20 text-red-300',
			admin: 'bg-yellow-500/20 text-yellow-300',
			ui: 'bg-pink-500/20 text-pink-300'
		};
		return colors[surface] || 'bg-gray-500/20 text-gray-300';
	}

	function formatFilePath(path: string): string {
		// Shorten long paths
		const parts = path.split('/');
		if (parts.length > 4) {
			return `.../${parts.slice(-3).join('/')}`;
		}
		return path;
	}

	let hasActiveFilters = $derived(
		!!searchQuery || !!selectedErrorCode || !!selectedSurface || !!selectedTech || !!selectedTool
	);

	let totalPages = $derived(Math.ceil(totalCount / pageSize));
</script>

<svelte:head>
	<title>Error Cards - Codebase Intelligence</title>
</svelte:head>

<div class="errors-page">
	<!-- Header -->
	<header class="page-header">
		<div class="header-left">
			<a href="/command-center/codebase" class="back-link">
				<ArrowLeft class="h-4 w-4" />
				Back to Dashboard
			</a>
			<h1 class="page-title">
				<AlertTriangle class="h-6 w-6 text-red-400" />
				Error Cards
			</h1>
			<p class="page-subtitle">{totalCount.toLocaleString()} errors in codebase</p>
		</div>
		<div class="header-actions">
			<Button variant="outline" onclick={() => showFilters = !showFilters}>
				<Filter class="h-4 w-4 mr-2" />
				Filters
				{#if hasActiveFilters}
					<span class="filter-badge">Active</span>
				{/if}
				<ChevronDown class={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
			</Button>
			<Button variant="outline" onclick={loadErrors} disabled={isLoading}>
				<RefreshCw class={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
				Refresh
			</Button>
		</div>
	</header>

	<!-- Filters Panel -->
	{#if showFilters}
		<Card class="filters-panel">
			<CardContent class="filters-content">
				<div class="filter-row">
					<div class="filter-group">
						<label class="filter-label">Search</label>
						<div class="search-box">
							<Search class="h-4 w-4 search-icon" />
							<input
								type="text"
								placeholder="Search messages, files..."
								bind:value={searchQuery}
								class="filter-input search-input"
							/>
						</div>
					</div>

					<div class="filter-group">
						<label class="filter-label">Error Code</label>
						<select bind:value={selectedErrorCode} class="filter-select">
							<option value={null}>All Codes</option>
							{#each errorCodes as code}
								<option value={code}>{code}</option>
							{/each}
						</select>
					</div>

					<div class="filter-group">
						<label class="filter-label">Surface</label>
						<select bind:value={selectedSurface} class="filter-select">
							<option value={null}>All Surfaces</option>
							{#each surfaces as surface}
								<option value={surface}>{surface}</option>
							{/each}
						</select>
					</div>

					<div class="filter-group">
						<label class="filter-label">Technology</label>
						<select bind:value={selectedTech} class="filter-select">
							<option value={null}>All Tech</option>
							{#each techs as tech}
								<option value={tech}>{tech}</option>
							{/each}
						</select>
					</div>

					<div class="filter-group">
						<label class="filter-label">Tool</label>
						<select bind:value={selectedTool} class="filter-select">
							<option value={null}>All Tools</option>
							{#each tools as tool}
								<option value={tool}>{tool}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="filter-actions">
					<Button variant="outline" onclick={clearFilters}>
						<X class="h-4 w-4 mr-2" />
						Clear
					</Button>
					<Button onclick={applyFilters}>
						Apply Filters
					</Button>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Error List -->
	{#if isLoading}
		<div class="loading-state">
			<RefreshCw class="h-8 w-8 animate-spin text-cyan-400" />
			<p>Loading errors...</p>
		</div>
	{:else if errors.length === 0}
		<div class="empty-state">
			<Code class="h-12 w-12 text-green-400" />
			<h3>No Errors Found</h3>
			<p>
				{#if hasActiveFilters}
					No errors match your filters. Try adjusting your criteria.
				{:else}
					Your codebase is error-free! 🎉
				{/if}
			</p>
		</div>
	{:else}
		<div class="errors-list">
			{#each errors as error}
				<Card class="error-card">
					<CardContent class="error-content">
						<div class="error-header">
							<div class="error-badges">
								<span class={`badge ${getErrorCodeColor(error.errorCode)}`}>
									{error.errorCode}
								</span>
								<span class={`badge ${getSeverityColor(error.severity)}`}>
									{error.severity}
								</span>
								<span class="badge bg-gray-500/20 text-gray-300">
									{error.tool}
								</span>
							</div>
							{#if error.clusterId}
								<a
									href="/command-center/codebase/clusters/{error.clusterId}"
									class="cluster-link"
								>
									<Layers class="h-4 w-4" />
									View Cluster
								</a>
							{/if}
						</div>

						<div class="error-file">
							<FileCode class="h-4 w-4" />
							<span class="file-path">{formatFilePath(error.filePath)}</span>
							<span class="file-location">:{error.line}:{error.col}</span>
						</div>

						<p class="error-message">{error.message}</p>

						<div class="error-tags">
							{#each error.surface as surface}
								<span class={`tag ${getSurfaceColor(surface)}`}>{surface}</span>
							{/each}
							{#each error.tech as tech}
								<span class="tag bg-gray-500/20 text-gray-300">{tech}</span>
							{/each}
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="pagination">
				<Button
					variant="outline"
					disabled={page === 1}
					onclick={() => { page--; loadErrors(); }}
				>
					Previous
				</Button>
				<span class="page-info">
					Page {page} of {totalPages}
				</span>
				<Button
					variant="outline"
					disabled={page === totalPages}
					onclick={() => { page++; loadErrors(); }}
				>
					Next
				</Button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.errors-page {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.6);
		text-decoration: none;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.back-link:hover {
		color: #00d4ff;
	}

	.page-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: white;
	}

	.page-subtitle {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.filter-badge {
		background: #00d4ff;
		color: #0f0f23;
		font-size: 0.65rem;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		margin-left: 0.5rem;
		font-weight: 600;
	}

	.filters-panel {
		margin-bottom: 1.5rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.filters-content {
		padding: 1.5rem;
	}

	.filter-row {
		display: grid;
		grid-template-columns: 2fr repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.filter-input,
	.filter-select {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		color: white;
		font-size: 0.875rem;
	}

	.filter-input:focus,
	.filter-select:focus {
		outline: none;
		border-color: rgba(0, 212, 255, 0.5);
	}

	.search-box {
		position: relative;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: rgba(255, 255, 255, 0.4);
	}

	.search-input {
		padding-left: 2.5rem;
		width: 100%;
	}

	.filter-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem;
		gap: 1rem;
		color: rgba(255, 255, 255, 0.6);
		text-align: center;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		color: white;
		margin: 0;
	}

	.errors-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.error-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		transition: border-color 0.2s ease;
	}

	.error-card:hover {
		border-color: rgba(255, 255, 255, 0.15);
	}

	.error-content {
		padding: 1rem 1.25rem;
	}

	.error-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.error-badges {
		display: flex;
		gap: 0.5rem;
	}

	.badge {
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
	}

	.cluster-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #00d4ff;
		text-decoration: none;
	}

	.cluster-link:hover {
		text-decoration: underline;
	}

	.error-file {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
	}

	.file-path {
		font-family: 'JetBrains Mono', monospace;
	}

	.file-location {
		color: rgba(255, 255, 255, 0.5);
	}

	.error-message {
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.875rem;
		line-height: 1.5;
		margin-bottom: 0.75rem;
	}

	.error-tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tag {
		font-size: 0.65rem;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.page-info {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.875rem;
	}

	@media (max-width: 1024px) {
		.filter-row {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			gap: 1rem;
		}

		.filter-row {
			grid-template-columns: 1fr;
		}
	}
</style>
