<script lang="ts">
	import { onMount } from 'svelte';

	interface SearchResult {
		id: string;
		title: string;
		document_type: string;
		distance: number;
		semantic_score: number;
		relevance_level: 'high' | 'medium' | 'low';
		metadata: {
			parties?: string[];
			category?: string;
			jurisdiction?: string;
			effectiveDate?: string;
			expirationDate?: string;
			confidentiality?: string;
		};
		content?: string;
	}

	interface SearchResponse {
		success: boolean;
		query: string;
		results: SearchResult[];
		embedding_time: number;
		search_time: number;
		total_time: number;
		total_results: number;
		semantic_scores?: {
			highest_relevance: number;
			lowest_relevance: number;
			average_relevance: number;
		};
	}

	// Reactive state
	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let searchStats = $state<SearchResponse['semantic_scores'] | null>(null);
	let performanceMetrics = $state({ embedding_time: 0, search_time: 0, total_time: 0 });

	// Advanced filters
	let showFilters = $state(false);
	let filters = $state({
		category: '',
		jurisdiction: '',
		parties: '',
		threshold: 0.8
	});

	// Debounce function
	let debounceTimer: ReturnType<typeof setTimeout>;
	function debounce(fn: Function, delay: number) {
		return (...args: any[]) => {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => fn(...args), delay);
		};
	}

	// Perform semantic search
	async function performSemanticSearch(searchQuery: string) {
		if (!searchQuery.trim()) {
			results = [];
			return;
		}

		loading = true;
		error = null;

		try {
			const requestBody = {
				query: searchQuery.trim(),
				limit: 20,
				threshold: filters.threshold,
				...(showFilters && {
					filters: {
						...(filters.category && { category: filters.category }),
						...(filters.jurisdiction && { jurisdiction: filters.jurisdiction }),
						...(filters.parties && { parties: filters.parties.split(',').map(p => p.trim()) })
					}
				})
			};

			const response = await fetch('/api/rag/semantic-search', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody)
			});

			const data: SearchResponse = await response.json();

			if (data.success) {
				results = data.results;
				searchStats = data.semantic_scores || null;
				performanceMetrics = {
					embedding_time: data.embedding_time,
					search_time: data.search_time,
					total_time: data.total_time
				};
			} else {
				error = data.error || 'Search failed';
				results = [];
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Network error';
			results = [];
		} finally {
			loading = false;
		}
	}

	// Debounced search function
	const debouncedSearch = debounce((searchQuery: string) => {
		performSemanticSearch(searchQuery);
	}, 500);

	// React to query changes
	$effect(() => {
		if (query) {
			debouncedSearch(query);
		} else {
			results = [];
		}
	});

	// Get relevance color class
	function getRelevanceColor(level: string): string {
		switch (level) {
			case 'high': return 'text-green-600 bg-green-50';
			case 'medium': return 'text-yellow-600 bg-yellow-50';
			case 'low': return 'text-red-600 bg-red-50';
			default: return 'text-gray-600 bg-gray-50';
		}
	}

	// Format performance metrics
	function formatTime(ms: number): string {
		return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
	}

	// Sample queries for quick testing
	const sampleQueries = [
		'intellectual property license agreement',
		'patent royalty machine learning',
		'confidential software licensing',
		'federal jurisdiction contract terms'
	];
</script>

<div class="semantic-search-container">
	<!-- Header -->
	<div class="search-header">
		<h1>🔍 Legal AI Semantic Search</h1>
		<p class="subtitle">One-click intelligent document search powered by Gemma embeddings</p>
	</div>

	<!-- Search Input -->
	<div class="search-input-section">
		<div class="search-box">
			<input
				type="text"
				bind:value={query}
				placeholder="Search legal documents... (e.g., intellectual property licensing)"
				class="search-input"
				autocomplete="off"
			/>
			<div class="search-icon">🔍</div>
		</div>

		<!-- Sample queries -->
		<div class="sample-queries">
			<span class="sample-label">Try:</span>
			{#each sampleQueries as sampleQuery}
				<button
					class="sample-query-btn"
					onclick={() => query = sampleQuery}
				>
					{sampleQuery}
				</button>
			{/each}
		</div>

		<!-- Advanced Filters Toggle -->
		<button
			class="filters-toggle"
			onclick={() => showFilters = !showFilters}
		>
			{showFilters ? '▲' : '▼'} Advanced Filters
		</button>

		{#if showFilters}
			<div class="filters-panel">
				<div class="filter-row">
					<label>
						Category:
						<select bind:value={filters.category}>
							<option value="">All Categories</option>
							<option value="intellectual-property">Intellectual Property</option>
							<option value="contract">Contract</option>
							<option value="license">License</option>
						</select>
					</label>

					<label>
						Jurisdiction:
						<select bind:value={filters.jurisdiction}>
							<option value="">All Jurisdictions</option>
							<option value="federal">Federal</option>
							<option value="state">State</option>
							<option value="international">International</option>
						</select>
					</label>
				</div>

				<div class="filter-row">
					<label>
						Parties (comma-separated):
						<input type="text" bind:value={filters.parties} placeholder="TechCorp, DataSoft" />
					</label>

					<label>
						Relevance Threshold:
						<input
							type="range"
							bind:value={filters.threshold}
							min="0.1"
							max="1.0"
							step="0.1"
						/>
						<span>{filters.threshold}</span>
					</label>
				</div>
			</div>
		{/if}
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Generating embeddings and searching...</p>
		</div>
	{/if}

	<!-- Error State -->
	{#if error}
		<div class="error-state">
			<p>❌ Error: {error}</p>
		</div>
	{/if}

	<!-- Performance Metrics -->
	{#if performanceMetrics.total_time > 0}
		<div class="performance-metrics">
			<div class="metric">
				<span class="metric-label">Embedding:</span>
				<span class="metric-value">{formatTime(performanceMetrics.embedding_time)}</span>
			</div>
			<div class="metric">
				<span class="metric-label">Search:</span>
				<span class="metric-value">{formatTime(performanceMetrics.search_time)}</span>
			</div>
			<div class="metric">
				<span class="metric-label">Total:</span>
				<span class="metric-value">{formatTime(performanceMetrics.total_time)}</span>
			</div>
			{#if searchStats}
				<div class="metric">
					<span class="metric-label">Avg Relevance:</span>
					<span class="metric-value">{(1 - searchStats.average_relevance).toFixed(3)}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Search Results -->
	{#if results.length > 0}
		<div class="results-section">
			<div class="results-header">
				<h2>🎯 Search Results</h2>
				<span class="results-count">{results.length} documents found</span>
			</div>

			<div class="results-list">
				{#each results as result}
					<div class="result-card">
						<div class="result-header">
							<div class="result-title">
								<h3>{result.title || 'Untitled Document'}</h3>
								<span class="document-type">{result.document_type}</span>
							</div>
							<div class="relevance-badge {getRelevanceColor(result.relevance_level)}">
								{result.relevance_level} ({(result.semantic_score * 100).toFixed(1)}%)
							</div>
						</div>

						<div class="result-metadata">
							{#if result.metadata.parties}
								<div class="metadata-item">
									<span class="metadata-label">Parties:</span>
									<span class="metadata-value">{result.metadata.parties.join(', ')}</span>
								</div>
							{/if}

							{#if result.metadata.category}
								<div class="metadata-item">
									<span class="metadata-label">Category:</span>
									<span class="metadata-value">{result.metadata.category}</span>
								</div>
							{/if}

							{#if result.metadata.jurisdiction}
								<div class="metadata-item">
									<span class="metadata-label">Jurisdiction:</span>
									<span class="metadata-value">{result.metadata.jurisdiction}</span>
								</div>
							{/if}

							{#if result.metadata.effectiveDate}
								<div class="metadata-item">
									<span class="metadata-label">Effective Date:</span>
									<span class="metadata-value">{result.metadata.effectiveDate}</span>
								</div>
							{/if}
						</div>

						<div class="result-technical">
							<span class="technical-detail">Distance: {result.distance.toFixed(4)}</span>
							<span class="technical-detail">ID: {result.id.slice(0, 8)}...</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if query && !loading}
		<div class="no-results">
			<p>No documents found for "{query}"</p>
			<p class="no-results-hint">Try adjusting your search terms or filters</p>
		</div>
	{/if}
</div>

<style>
	.semantic-search-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.search-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.search-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #6b7280;
		font-size: 1.1rem;
		margin: 0;
	}

	.search-input-section {
		margin-bottom: 2rem;
	}

	.search-box {
		position: relative;
		margin-bottom: 1rem;
	}

	.search-input {
		width: 100%;
		padding: 1rem 1rem 1rem 3rem;
		font-size: 1.1rem;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		outline: none;
		transition: all 0.2s;
		box-sizing: border-box;
	}

	.search-input:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: #9ca3af;
		font-size: 1.2rem;
	}

	.sample-queries {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 1rem;
	}

	.sample-label {
		color: #6b7280;
		font-weight: 500;
		margin-right: 0.5rem;
	}

	.sample-query-btn {
		padding: 0.25rem 0.75rem;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 20px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.sample-query-btn:hover {
		background: #e5e7eb;
		border-color: #9ca3af;
	}

	.filters-toggle {
		padding: 0.5rem 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.filters-toggle:hover {
		background: #e2e8f0;
	}

	.filters-panel {
		margin-top: 1rem;
		padding: 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
	}

	.filter-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.filter-row:last-child {
		margin-bottom: 0;
	}

	.filter-row label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-weight: 500;
		color: #374151;
	}

	.filter-row input, .filter-row select {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.loading-state {
		text-align: center;
		padding: 2rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #e5e7eb;
		border-top: 4px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-state {
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		color: #dc2626;
		margin-bottom: 1rem;
	}

	.performance-metrics {
		display: flex;
		gap: 2rem;
		padding: 1rem;
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 8px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.metric {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.metric-label {
		color: #0369a1;
		font-weight: 500;
	}

	.metric-value {
		font-weight: 700;
		color: #0c4a6e;
	}

	.results-section {
		margin-top: 2rem;
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.results-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.results-count {
		color: #6b7280;
		font-weight: 500;
	}

	.results-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.result-card {
		padding: 1.5rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition: all 0.2s;
	}

	.result-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		border-color: #d1d5db;
	}

	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.result-title h3 {
		font-size: 1.2rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.25rem 0;
	}

	.document-type {
		padding: 0.25rem 0.5rem;
		background: #f3f4f6;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
	}

	.relevance-badge {
		padding: 0.375rem 0.75rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.result-metadata {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.metadata-item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.metadata-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metadata-value {
		font-size: 0.875rem;
		color: #1f2937;
		font-weight: 500;
	}

	.result-technical {
		display: flex;
		gap: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid #f3f4f6;
	}

	.technical-detail {
		font-size: 0.75rem;
		color: #9ca3af;
		font-family: 'Monaco', 'Menlo', monospace;
	}

	.no-results {
		text-align: center;
		padding: 3rem 1rem;
		color: #6b7280;
	}

	.no-results-hint {
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	@media (max-width: 768px) {
		.semantic-search-container {
			padding: 1rem;
		}

		.search-header h1 {
			font-size: 2rem;
		}

		.filter-row {
			grid-template-columns: 1fr;
		}

		.performance-metrics {
			flex-direction: column;
			gap: 1rem;
		}

		.result-header {
			flex-direction: column;
			gap: 1rem;
		}

		.result-metadata {
			grid-template-columns: 1fr;
		}
	}
</style>

