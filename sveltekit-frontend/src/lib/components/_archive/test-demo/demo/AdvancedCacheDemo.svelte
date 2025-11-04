<script lang="ts">
	import { onDestroy } from 'svelte';

	const legalQueries = [
		'Analyze employment contract termination clause',
		'Review intellectual property licensing agreement',
		'Assess compliance with GDPR regulations',
		'Evaluate litigation risk for breach of contract',
		'Examine patent infringement claims'
	];

	type CacheStats = {
		hits: number;
		misses: number;
		evictions: number;
		totalSize: number;
		itemsCount: number;
	};

	type Recommendation = {
		title: string;
		content: string;
		risk: 'low' | 'medium' | 'high';
		confidence: number;
	};

	let demoQuery = legalQueries[0];
	let cacheStats: CacheStats = {
		hits: 1280,
		misses: 42,
		evictions: 3,
		totalSize: 42,
		itemsCount: 512
	};
	let recommendations: Recommendation[] = [];
	let bestPractices = [
		{
			title: 'Warm critical queries',
			description: 'Pre-seed cache entries for the top 20 legal workflows every morning.',
			priority: 'high'
		},
		{
			title: 'Rotate embeddings',
			description: 'Refresh long-lived embeddings every 72 hours to capture new filings.',
			priority: 'medium'
		},
		{
			title: 'Audit misses',
			description: 'Export cache misses weekly and feed them into the retraining queue.',
			priority: 'medium'
		}
	];
	let isLoading = false;
	let aiResponse = '';
	let statsTimer: ReturnType<typeof setInterval> | null = null;

	refreshStats();
	statsTimer = setInterval(refreshStats, 8000);
	onDestroy(() => {
		if (statsTimer) {
			clearInterval(statsTimer);
		}
	});

	function refreshStats(): void {
		cacheStats = {
			hits: cacheStats.hits + Math.floor(Math.random() * 40),
			misses: cacheStats.misses + Math.floor(Math.random() * 3),
			evictions: Math.max(0, cacheStats.evictions + (Math.random() > 0.85 ? 1 : 0)),
			totalSize: 40 + Math.random() * 8,
			itemsCount: cacheStats.itemsCount
		};
	}

	function formatPercent(val: number): string {
		return `${(val * 100).toFixed(1)}%`;
	}

	async function analyzeQuery(): Promise<void> {
		if (isLoading) return;
		isLoading = true;
		recommendations = [];
		aiResponse = '';

		await new Promise((resolve) => setTimeout(resolve, 900));

		recommendations = [
			{
				title: 'Highlight liability caps',
				content: 'Compare liability sections 4.1 and 7.2 to ensure mutual caps are aligned.',
				risk: 'medium',
				confidence: 0.82
			},
			{
				title: 'Verify governing law',
				content: 'Current clause references Delaware; confirm that matches the latest term sheet.',
				risk: 'low',
				confidence: 0.71
			},
			{
				title: 'Escalate termination clause',
				content: 'Termination for convenience is one-sided; flag to litigation for review.',
				risk: 'high',
				confidence: 0.65
			}
		];

		aiResponse = `Based on "${demoQuery}" the cache suggests reviewing liability language, verifying governing law, and double-checking the termination clause for unilateral triggers.`;
		isLoading = false;
	}

	function clearResults(): void {
		recommendations = [];
		aiResponse = '';
	}
</script>

<section class="advanced-cache-demo">
	<header class="demo-header">
		<div>
			<p class="eyebrow">Context7 cache demo</p>
			<h1>AI-Assisted Legal Workflow</h1>
			<p class="subtitle">
				Simulated flow that warms cache entries, inspects embeddings, and surfaces best practices.
			</p>
		</div>
		<div class="controls">
			<label>
				<span>Pick a sample query</span>
				<select bind:value={demoQuery}>
					{#each legalQueries as query}
						<option value={query}>{query}</option>
					{/each}
				</select>
			</label>
			<button class="primary" on:click={analyzeQuery} disabled={isLoading}>
				{isLoading ? 'Analyzing…' : 'Analyze query'}
			</button>
			<button class="ghost" on:click={clearResults}>Clear results</button>
		</div>
	</header>

	<section class="stats-grid">
		<div class="stat-card">
			<p class="label">Cache hits</p>
			<p class="value">{cacheStats.hits.toLocaleString()}</p>
		</div>
		<div class="stat-card">
			<p class="label">Cache misses</p>
			<p class="value">{cacheStats.misses.toLocaleString()}</p>
		</div>
		<div class="stat-card">
			<p class="label">Evictions</p>
			<p class="value">{cacheStats.evictions}</p>
		</div>
		<div class="stat-card">
			<p class="label">Approx size</p>
			<p class="value">{cacheStats.totalSize.toFixed(1)} MB</p>
		</div>
	</section>

	<section class="results-panel">
		<h2>AI insight</h2>
		{#if aiResponse}
			<p class="ai-response">{aiResponse}</p>
		{:else if isLoading}
			<p class="muted">Generating answer…</p>
		{:else}
			<p class="muted">Run an analysis to see responses.</p>
		{/if}

		{#if recommendations.length > 0}
			<ul class="recommendations">
				{#each recommendations as rec}
					<li>
						<div class="recommendation-header">
							<span class="pill {rec.risk}">{rec.risk} risk</span>
							<span class="confidence">{formatPercent(rec.confidence)} confidence</span>
						</div>
						<h3>{rec.title}</h3>
						<p>{rec.content}</p>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="best-practices">
		<h2>Cache best practices</h2>
		<div class="practice-grid">
			{#each bestPractices as practice}
				<article>
					<header>
						<h3>{practice.title}</h3>
						<span class="pill">{practice.priority}</span>
					</header>
					<p>{practice.description}</p>
				</article>
			{/each}
		</div>
	</section>
</section>

<style>
	.advanced-cache-demo {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 2rem;
		border-radius: 1rem;
		background: radial-gradient(circle at top, rgba(80, 90, 255, 0.15), rgba(0, 0, 0, 0));
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: var(--yorha-text-primary, #f8fafc);
	}

	.demo-header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 1rem;
	}

	.eyebrow {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--yorha-text-muted, #9ca3af);
		margin-bottom: 0.3rem;
	}

	.subtitle {
		color: var(--yorha-text-secondary, #cbd5f5);
		margin-top: 0.2rem;
	}

	.controls {
		display: flex;
		gap: 0.75rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}

	select {
		min-width: 18rem;
		padding: 0.65rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(0, 0, 0, 0.35);
		color: inherit;
	}

	.primary,
	.ghost {
		padding: 0.65rem 1.2rem;
		border-radius: 0.5rem;
		border: 1px solid transparent;
		transition: opacity 0.2s ease;
	}

	.primary {
		background: linear-gradient(120deg, #5eead4, #6366f1);
		color: #0b1120;
		font-weight: 600;
	}

	.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ghost {
		border-color: rgba(255, 255, 255, 0.2);
		background: transparent;
		color: inherit;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(8px);
	}

	.stat-card .label {
		font-size: 0.85rem;
		color: var(--yorha-text-muted, #94a3b8);
		margin-bottom: 0.25rem;
	}

	.stat-card .value {
		font-size: 1.6rem;
		font-weight: 600;
		color: inherit;
	}

	.results-panel {
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 1.5rem;
		background: rgba(15, 23, 42, 0.35);
		backdrop-filter: blur(12px);
	}

	.ai-response {
		margin: 0.5rem 0 1rem;
		line-height: 1.5;
	}

	.muted {
		color: var(--yorha-text-muted, #94a3b8);
	}

	.recommendations {
		display: grid;
		gap: 1rem;
		margin-top: 1rem;
	}

	.recommendations li {
		list-style: none;
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(2, 6, 23, 0.4);
	}

	.recommendation-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		background: rgba(255, 255, 255, 0.08);
	}

	.pill.low {
		background: rgba(16, 185, 129, 0.15);
		color: #34d399;
	}

	.pill.medium {
		background: rgba(234, 179, 8, 0.15);
		color: #facc15;
	}

	.pill.high {
		background: rgba(248, 113, 113, 0.15);
		color: #f87171;
	}

	.confidence {
		font-size: 0.85rem;
		color: var(--yorha-text-muted, #94a3b8);
	}

	.best-practices .practice-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}

	.best-practices article {
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 1rem;
		background: rgba(8, 12, 30, 0.5);
	}

	.best-practices header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}
</style>
