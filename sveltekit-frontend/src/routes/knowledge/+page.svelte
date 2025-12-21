<script lang="ts">

	interface SearchResult {
		id: number;
		score: number;
		title: string;
		url: string;
		summary: string;
		entities: string;
	}

	interface WebSource {
		title?: string;
		uri?: string;
	}

	interface SearchResponse {
		query: string;
		results: SearchResult[];
		synthesized?: string;
		webSources?: WebSource[];
		searchUsed?: boolean;
		metadata: {
			totalResults: number;
			processingTime: number;
			cached: boolean;
			provider?: string;
		};
	}

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let synthesized = $state<string>('');
	let webSources = $state<WebSource[]>([]);
	let searchUsed = $state<boolean>(false);
	let metadata = $state<any>(null);
	let loading = $state(false);
	let error = $state('');
	let synthesizeEnabled = $state(true);
	let useWebSearch = $state(false);
	let provider = $state<'ollama' | 'gemini' | 'claude' | 'openai'>('ollama');

	// Sample queries
	const sampleQueries = [
		'TypeScript 5.6 breaking changes',
		'SvelteKit 2.0 migration guide',
		'Svelte 5 runes best practices',
		'Form actions and validation'
	];

	// Web search sample queries (for Gemini)
	const webSearchQueries = [
		'Latest TypeScript 5.7 features December 2024',
		'What are the newest SvelteKit 2.0 breaking changes?',
		'How to implement OAuth2 in modern SvelteKit apps?',
		'Best practices for pg_vector embeddings 2024'
	];

	async function search() {
		if (!query.trim()) return;

		loading = true;
		error = '';
		results = [];
		synthesized = '';
		webSources = [];
		searchUsed = false;

		try {
			const response = await fetch('/api/knowledge/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query,
					limit: 10,
					threshold: 0.3,
					synthesize: synthesizeEnabled,
					provider,
					useWebSearch: provider === 'gemini' && useWebSearch
				})
			});

			if (!response.ok) {
				throw new Error(`Search failed: ${response.statusText}`);
			}

			const data: SearchResponse = await response.json();
			results = data.results;
			synthesized = data.synthesized || '';
			webSources = data.webSources || [];
			searchUsed = data.searchUsed || false;
			metadata = data.metadata;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			search();
		}
	}

	function useSampleQuery(sample: string) {
		query = sample;
		search();
	}

	function handleProviderChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		provider = target.value as 'ollama' | 'gemini' | 'claude' | 'openai';
		// Auto-disable web search for non-Gemini providers
		if (provider !== 'gemini') {
			useWebSearch = false;
		}
	}
</script>

<div class="knowledge-search-container">
	<div class="header">
		<h1>🧠 Phase 76: Knowledge Base Search</h1>
		<p class="subtitle">
			Search across {metadata?.totalResults ?? 13} documentation sources with AI-powered synthesis
		</p>
	</div>

	<!-- Search Bar -->
	<div class="search-bar">
		<input
			type="text"
			bind:value={query}
			onkeypress={handleKeyPress}
			placeholder="Ask a question about TypeScript, SvelteKit, or Svelte 5..."
			class="search-input"
		/>
		<button onclick={search} disabled={loading || !query.trim()} class="search-button">
			{loading ? '🔄 Searching...' : '🔍 Search'}
		</button>
	</div>

	<!-- Options -->
	<div class="options">
		<label class="checkbox-label">
			<input type="checkbox" bind:checked={synthesizeEnabled} />
			<span>AI Synthesis (generate answer)</span>
		</label>

		{#if synthesizeEnabled}
			<select value={provider} onchange={handleProviderChange} class="provider-select">
				<option value="ollama">🦙 Ollama (Local)</option>
				<option value="gemini">🔮 Gemini 3 (Search)</option>
				<option value="claude">🧠 Claude</option>
				<option value="openai">🤖 GPT-4</option>
			</select>

			{#if provider === 'gemini'}
				<label class="checkbox-label web-search-toggle">
					<input type="checkbox" bind:checked={useWebSearch} />
					<span>🌐 Enable Google Search Grounding</span>
				</label>
			{/if}
		{/if}
	</div>

	<!-- Sample Queries -->
	<div class="samples">
		<span class="samples-label">Try:</span>
		{#each (provider === 'gemini' && useWebSearch ? webSearchQueries : sampleQueries) as sample}
			<button onclick={() => useSampleQuery(sample)} class="sample-button">
				{sample}
			</button>
		{/each}
	</div>

	<!-- Error -->
	{#if error}
		<div class="error-banner">
			❌ {error}
		</div>
	{/if}

	<!-- Synthesized Answer -->
	{#if synthesized}
		<div class="synthesized-answer" class:web-grounded={searchUsed}>
			<h2>
				{#if searchUsed}
					🌐 AI Answer (Web Grounded)
				{:else}
					🤖 AI-Generated Answer
				{/if}
			</h2>
			<div class="answer-content">
				{synthesized}
			</div>

			{#if webSources && webSources.length > 0}
				<div class="web-sources">
					<h3>📚 Web Sources</h3>
					<ul>
						{#each webSources as source}
							<li>
								{#if source.uri}
									<a href={source.uri} target="_blank" rel="noopener noreferrer">
										{source.title || source.uri}
									</a>
								{:else}
									<span>{source.title || 'Unknown source'}</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if metadata?.provider}
				<div class="answer-meta">
					Provider: {metadata.provider} | Time: {metadata.processingTime}ms
					{#if searchUsed}
						| 🌐 Web Search Used
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Search Results -->
	{#if results.length > 0}
		<div class="results-container">
			<h2>
				📚 Found {results.length} Documentation Sources
				{#if metadata}
					<span class="results-meta">({metadata.processingTime}ms)</span>
				{/if}
			</h2>

			{#each results as result, idx (result.id)}
				<div class="result-card">
					<div class="result-header">
						<span class="result-rank">#{idx + 1}</span>
						<h3 class="result-title">{result.title}</h3>
						<span class="result-score">{(result.score * 100).toFixed(1)}% match</span>
					</div>

					<a href={result.url} target="_blank" rel="noopener noreferrer" class="result-url">
						📄 {result.url}
					</a>

					<div class="result-summary">
						{result.summary}
					</div>

					{#if result.entities}
						<details class="result-entities">
							<summary>🏷️ Entities</summary>
							<div class="entities-content">
								{result.entities}
							</div>
						</details>
					{/if}
				</div>
			{/each}
		</div>
	{:else if !loading && query}
		<div class="no-results">
			No results found for "<strong>{query}</strong>"
		</div>
	{/if}
</div>

<style>
	.knowledge-search-container {
		max-width: 1200px;
		margin: 2rem auto;
		padding: 0 2rem;
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.header h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	}

	.subtitle {
		color: #666;
		font-size: 1.1rem;
	}

	.search-bar {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.search-input {
		flex: 1;
		padding: 1rem 1.5rem;
		font-size: 1.1rem;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
		outline: none;
		transition: border-color 0.2s;
	}

	.search-input:focus {
		border-color: #667eea;
	}

	.search-button {
		padding: 1rem 2rem;
		font-size: 1.1rem;
		font-weight: 600;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.search-button:hover:not(:disabled) {
		transform: translateY(-2px);
	}

	.search-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.options {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-bottom: 1rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.provider-select {
		padding: 0.5rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.9rem;
	}

	.samples {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 2rem;
		padding: 1rem;
		background: #f7fafc;
		border-radius: 12px;
	}

	.samples-label {
		font-weight: 600;
		color: #4a5568;
	}

	.sample-button {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.sample-button:hover {
		background: #667eea;
		color: white;
		border-color: #667eea;
	}

	.error-banner {
		padding: 1rem;
		background: #fed7d7;
		color: #c53030;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.synthesized-answer {
		background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
		padding: 2rem;
		border-radius: 12px;
		margin-bottom: 2rem;
		border: 2px solid #667eea50;
	}

	.synthesized-answer h2 {
		margin-bottom: 1rem;
		color: #667eea;
	}

	.answer-content {
		line-height: 1.8;
		white-space: pre-wrap;
		font-size: 1.05rem;
	}

	.answer-meta {
		margin-top: 1rem;
		font-size: 0.9rem;
		color: #666;
	}

	.results-container h2 {
		margin-bottom: 1.5rem;
		font-size: 1.5rem;
	}

	.results-meta {
		font-size: 0.9rem;
		color: #666;
		font-weight: normal;
	}

	.result-card {
		background: white;
		padding: 1.5rem;
		border-radius: 12px;
		margin-bottom: 1.5rem;
		border: 1px solid #e2e8f0;
		transition: box-shadow 0.2s;
	}

	.result-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.result-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.result-rank {
		background: #667eea;
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.result-title {
		flex: 1;
		font-size: 1.2rem;
		margin: 0;
	}

	.result-score {
		background: #48bb78;
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.result-url {
		display: block;
		color: #667eea;
		text-decoration: none;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.result-url:hover {
		text-decoration: underline;
	}

	.result-summary {
		line-height: 1.6;
		color: #2d3748;
		margin-bottom: 1rem;
	}

	.result-entities {
		margin-top: 1rem;
	}

	.result-entities summary {
		cursor: pointer;
		color: #667eea;
		font-weight: 600;
	}

	.entities-content {
		margin-top: 0.5rem;
		padding: 1rem;
		background: #f7fafc;
		border-radius: 8px;
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.no-results {
		text-align: center;
		padding: 3rem;
		color: #666;
		font-size: 1.1rem;
	}

	/* Web Search Styles */
	.web-search-toggle {
		background: linear-gradient(135deg, #667eea15 0%, #22c55e15 100%);
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 1px solid #667eea30;
	}

	.web-search-toggle span {
		font-weight: 500;
		color: #22c55e;
	}

	.synthesized-answer.web-grounded {
		background: linear-gradient(135deg, #22c55e15 0%, #667eea15 100%);
		border-color: #22c55e50;
	}

	.synthesized-answer.web-grounded h2 {
		color: #22c55e;
	}

	.web-sources {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(102, 126, 234, 0.2);
	}

	.web-sources h3 {
		font-size: 1rem;
		margin-bottom: 0.75rem;
		color: #4a5568;
	}

	.web-sources ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.web-sources li {
		padding: 0.5rem 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
	}

	.web-sources li:last-child {
		border-bottom: none;
	}

	.web-sources a {
		color: #667eea;
		text-decoration: none;
		font-size: 0.9rem;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.web-sources a:hover {
		text-decoration: underline;
		color: #764ba2;
	}
</style>
