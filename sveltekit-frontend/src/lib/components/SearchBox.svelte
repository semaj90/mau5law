<!-- Svelte 5 SearchBox component with NES.css styling for CUDA service integration -->
<script>
  // Svelte 5 runes are auto-imported
	import { writable } from 'svelte/store';
	// Svelte 5 props
	let {
		placeholder = "Search legal documents...",
		limit = 5,
		cudaServiceUrl = "http://localhost:8096",
		onResults = null,
		onError = null
	} = $props();
	// Svelte 5 reactive state
	let query = $state("");
	let isSearching = $state(false);
	let results = $state([]);
	let error = $state(null);
	let lastSearchTime = $state(0);
	// Derived state for search button
	let canSearch = $derived(query.trim.length > 0 && !isSearching);
	// Search function that calls the CUDA service /search endpoint
	async function performSearch() {
		if (!canSearch) return;
		const trimmedQuery = query.trim();
		if (!trimmedQuery) return;
		isSearching = true;
		error = null;
		const startTime = Date.now();
		try {
			const response = await fetch(`${cudaServiceUrl}/api/v1/search`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					q: trimmedQuery,
					limit: limit
				})
			});
			if (!response.ok) {
				throw new Error(`Search failed: ${response.status} ${response.statusText}`);
			}
			const data = await response.json();
			results = data.results || [];
			lastSearchTime = Date.now() - startTime;
			// Call external result handler if provided
			if (onResults) {
				onResults(data);
			}
		} catch (err) {
			error = err.messag;
			results = [];
			// Call external error handler if provided
			if (onError) {
				onError(err);
			}
		} finally {
			isSearching = false;
		}
	}
	// Handle Enter key in search box
	function handleKeydown(event) {
		if (event.key === 'Enter') {
			performSearch();
		}
	}
	// Format score for display
	function formatScore(score) {
		return (1 - score).toFixed(3); // Convert distance to similarity
	}
	// Parse metadata if it's a JSON string
	function parseMetadata(metadata) {
		try {
			return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
		} catch {
			return ;
		}
	}
</script>
<div class="search-container nes-container with-title">
	<p class="title">🔍 Legal AI Search</p>
	<!-- Search input and button -->
	<div class="search-input-group">
		<input
			type="text"
			bind:value={query}
			onkeydown={handleKeydown}
			{placeholder}
			class="nes-input search-input"
			disabled={isSearching}
		/>
		<button
			type="button"
			onclick={performSearch}
			disabled={!canSearch}
			class="nes-btn {canSearch ? 'is-primary' : 'is-disabled'} search-button"
		>
			{#if isSearching}
				⏳ Searching...
			{:else}
				🚀 Search
			{/if}
		</button>
	</div>
	<!-- Search configuration -->
	<div class="search-config">
		<label class="nes-text">
			Results limit:
			<input
				type="number"
				bind:value={limit}
				min="1"
				max="50"
				class="nes-input limit-input"
				disabled={isSearching}
			/>
		</label>
		{#if lastSearchTime > 0}
			<span class="search-time nes-text is-success">
				⚡ {lastSearchTime}ms
			</span>
		{/if}
	</div>
	<!-- Error display -->
	{#if error}
		<div class="nes-container is-dark error-container">
			<p class="nes-text is-error">❌ {error}</p>
		</div>
	{/if}
	<!-- Results display -->
	{#if results.length > 0}
		<div class="results-container">
			<h3 class="nes-text">📋 Search Results ({results.length})</h3>
			{#each results as result, index (result.id)}
				<div class="result-item nes-container">
					<div class="result-header">
						<span class="result-rank nes-badge">#{index + 1}</span>
						<span class="result-id nes-text is-primary">ID: {result.id}</span>
						<span class="result-score nes-text is-success">
							📊 {formatScore(result.score)}
						</span>
					</div>
					{#if result.task_id}
						<p class="nes-text">
							<strong>Task ID:</strong> {result.task_id}
						</p>
					{/if}
					<div class="result-payload nes-container is-rounded">
						<p class="nes-text payload-text">
							{result.payload}
						</p>
					</div>
					{#if result.metadata}
						{@const metadata = parseMetadata(result.metadata)}
						<details class="metadata-details">
							<summary class="nes-text is-warning">📋 Metadata</summary>
							<div class="metadata-content nes-table-responsive">
								<table class="nes-table is-bordered is-centered">
									<tbody>
										{#each Object.entries(metadata) as [key, value]}
											<tr>
												<td class="nes-text">{key}</td>
												<td class="nes-text">{value}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</details>
					{/if}
				</div>
			{/each}
		</div>
	{:else if query.trim() && !isSearching && !error}
		<div class="no-results nes-container is-rounded">
			<p class="nes-text">🔍 No results found for "{query}"</p>
		</div>
	{/if}
</div>
<style>
	.search-container {
		max-width: 800px;
		margin: 20px auto;
		padding: 20px;
	}
	.search-input-group {
		display: flex;
		gap: 10px;
		margin-bottom: 15px;
		align-items: center;
		flex-wrap: wrap;
	}
	.search-input {
		flex: 1;
		min-width: 300px;
	}
	.search-button {
		white-space: nowrap;
		min-width: 120px;
	}
	.search-config {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}
	.limit-input {
		width: 80px;
		margin-left: 10px;
	}
	.search-time {
		font-weight: bold;
	}
	.error-container {
		margin: 20px 0;
	}
	.results-container {
		margin-top: 30px;
	}
	.result-item {
		margin-bottom: 20px;
		padding: 15px;
	}
	.result-header {
		display: flex;
		align-items: center;
		gap: 15px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.result-rank {
		font-size: 0.9em;
	}
	.result-id {
		font-family: monospace;
		font-size: 0.9em;
	}
	.result-score {
		font-weight: bold;
	}
	.result-payload {
		margin: 15px 0;
		background-color: #f8f8f8;
	}
	.payload-text {
		margin: 0;
		line-height: 1.6;
		word-wrap: break-word;
	}
	.metadata-details {
		margin-top: 15px;
	}
	.metadata-details summary {
		cursor: pointer;
		margin-bottom: 10px;
		font-weight: bold;
	}
	.metadata-content {
		background-color: #f0f0f0;
		padding: 10px;
		border-radius: 8px;
	}
	.metadata-content table {
		width: 100%;
		font-size: 0.9em;
	}
	.metadata-content td:first-child {
		font-weight: bold;
		background-color: #e0e0e0;
		width: 30%;
	}
	.no-results {
		text-align: center;
		padding: 30px;
		background-color: #f8f8f8;
	}
	/* Responsive design */
	@media (max-width: 600px) {
		.search-input-group {
			flex-direction: column;
		}
		.search-input {
			min-width: 100%;
		}
		.search-button {
			width: 100%;
		}
		.search-config {
			flex-direction: column;
			align-items: flex-start;
		}
		.result-header {
			flex-direction: column;
			align-items: flex-start;
		}
	}
	/* NES.css overrides for better search experience */
	.nes-input:focus {
		box-shadow: 0 0 0 4px #92cc41;
	}
	.nes-btn.is-disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
	.nes-container.is-rounded {
		border-radius: 8px;
	}
	/* Animation for loading state */
	.search-button:disabled {
		animation: pulse 1.5s ease-in-out infinite alternate;
	}
	@keyframes pulse {
		from { opacity: 0.6; }
		to { opacity: 1; }
	}
</style>