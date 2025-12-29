<script lang="ts">
	import { onMount } from 'svelte';

	interface SystemStatus {
		postgres: {
			error_instances_open: number;
			error_instances_stale: number;
			error_instances_resolved: number;
			embeddings_count: number;
			fix_attempts_total: number;
			kb_cards_total: number;
		};
		redis: {
			total_keys: number;
			phase89_keys: number;
			emb_keys: number;
			topk_keys: number;
			kb_keys: number;
		};
		qdrant: {
			phase89_error_chunks: number;
			phase89_ast_chunks: number;
			phase89_kb_cards: number;
			phase76_knowledge_base: number;
		};
		clusters: {
			total: number;
			top_patterns: Array<{ pattern: string; count: number; confidence: number }>;
		};
		timeline: Array<{
			timestamp: string;
			event_type: 'fix_attempt' | 'kb_update' | 'cluster_found' | 'embedding_generated';
			file_path: string;
			success: boolean;
			details: string;
		}>;
		cosine_rankings: Array<{
			query: string;
			top_match: string;
			similarity: number;
			confidence_boost: number;
		}>;
	}

	let status = $state<SystemStatus | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let lastUpdate = $state<Date | null>(null);
	let autoRefresh = $state(true);
	let refreshInterval: number | null = null;

	async function loadStatus() {
		try {
			loading = true;
			const response = await fetch('/api/phase89/status');
			if (!response.ok) throw new Error('Failed to load status');
			status = await response.json();
			lastUpdate = new Date();
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadStatus();

		if (autoRefresh) {
			refreshInterval = window.setInterval(loadStatus, 10000); // Refresh every 10s
		}

		return () => {
			if (refreshInterval) clearInterval(refreshInterval);
		};
	});

	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;

		if (autoRefresh) {
			refreshInterval = window.setInterval(loadStatus, 10000);
		} else if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}

	const statusColor = $derived(() => {
		if (!status) return 'gray';
		const totalErrors = status.postgres.error_instances_open;
		const resolvedErrors = status.postgres.error_instances_resolved;
		const resolveRate = totalErrors > 0 ? resolvedErrors / totalErrors : 0;

		if (resolveRate > 0.8) return 'green';
		if (resolveRate > 0.5) return 'yellow';
		return 'red';
	});
</script>

<div class="phase89-dashboard">
	<!-- Header -->
	<div class="dashboard-header">
		<div class="title-section">
			<h1>🧠 Phase 89: CUDA-Accelerated Knowledge System</h1>
			<p class="subtitle">Codebase Analysis Dashboard</p>
		</div>

		<div class="controls">
			<button class="refresh-btn" on:click={loadStatus} disabled={loading}>
				{loading ? '⏳ Loading...' : '🔄 Refresh'}
			</button>
			<button
				class="auto-refresh-btn"
				class:active={autoRefresh}
				on:click={toggleAutoRefresh}
			>
				{autoRefresh ? '⏸️ Pause Auto-refresh' : '▶️ Enable Auto-refresh'}
			</button>
			{#if lastUpdate}
				<span class="last-update">Last updated: {lastUpdate.toLocaleTimeString()}</span>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="error-banner">
			⚠️ {error}
		</div>
	{/if}

	{#if status}
		<!-- System Health Overview -->
		<div class="health-overview">
			<div class="health-card" data-status={statusColor()}>
				<div class="health-indicator"></div>
				<div class="health-stats">
					<h3>System Health</h3>
					<p class="health-percentage">
						{((status.postgres.error_instances_resolved /
						  (status.postgres.error_instances_open || 1)) * 100).toFixed(1)}%
					</p>
					<p class="health-label">Resolution Rate</p>
				</div>
			</div>

			<div class="stat-card">
				<span class="stat-icon">📦</span>
				<div>
					<p class="stat-value">{status.postgres.embeddings_count.toLocaleString()}</p>
					<p class="stat-label">Total Embeddings</p>
				</div>
			</div>

			<div class="stat-card">
				<span class="stat-icon">🔧</span>
				<div>
					<p class="stat-value">{status.postgres.fix_attempts_total}</p>
					<p class="stat-label">Fix Attempts</p>
				</div>
			</div>

			<div class="stat-card">
				<span class="stat-icon">📚</span>
				<div>
					<p class="stat-value">{status.postgres.kb_cards_total}</p>
					<p class="stat-label">KB Cards</p>
				</div>
			</div>
		</div>

		<!-- Main Grid -->
		<div class="dashboard-grid">
			<!-- PostgreSQL Status -->
			<div class="panel postgres-panel">
				<h2>🐘 PostgreSQL</h2>
				<div class="metric-grid">
					<div class="metric">
						<span class="metric-label">Open Errors</span>
						<span class="metric-value error-open">{status.postgres.error_instances_open}</span>
					</div>
					<div class="metric">
						<span class="metric-label">Resolved</span>
						<span class="metric-value error-resolved">{status.postgres.error_instances_resolved}</span>
					</div>
					<div class="metric">
						<span class="metric-label">Stale</span>
						<span class="metric-value error-stale">{status.postgres.error_instances_stale}</span>
					</div>
					<div class="metric">
						<span class="metric-label">Embeddings</span>
						<span class="metric-value">{status.postgres.embeddings_count.toLocaleString()}</span>
					</div>
					<div class="metric">
						<span class="metric-label">Fix Attempts</span>
						<span class="metric-value">{status.postgres.fix_attempts_total}</span>
					</div>
					<div class="metric">
						<span class="metric-label">KB Cards</span>
						<span class="metric-value">{status.postgres.kb_cards_total}</span>
					</div>
				</div>
			</div>

			<!-- Redis Status -->
			<div class="panel redis-panel">
				<h2>⚡ Redis Keyspace</h2>
				<div class="metric-grid">
					<div class="metric highlight">
						<span class="metric-label">Total Keys</span>
						<span class="metric-value">{status.redis.total_keys.toLocaleString()}</span>
					</div>
					<div class="metric">
						<span class="metric-label">phase89:*</span>
						<span class="metric-value">{status.redis.phase89_keys.toLocaleString()}</span>
					</div>
					<div class="metric">
						<span class="metric-label">emb:*</span>
						<span class="metric-value">{status.redis.emb_keys.toLocaleString()}</span>
					</div>
					<div class="metric">
						<span class="metric-label">topk:*</span>
						<span class="metric-value">{status.redis.topk_keys.toLocaleString()}</span>
					</div>
					<div class="metric">
						<span class="metric-label">kb:*</span>
						<span class="metric-value">{status.redis.kb_keys.toLocaleString()}</span>
					</div>
				</div>
			</div>

			<!-- Qdrant Collections -->
			<div class="panel qdrant-panel">
				<h2>🔍 Qdrant Collections</h2>
				<div class="collection-list">
					<div class="collection-item">
						<span class="collection-name">phase89_error_chunks</span>
						<span class="collection-count">{status.qdrant.phase89_error_chunks.toLocaleString()}</span>
					</div>
					<div class="collection-item">
						<span class="collection-name">phase89_ast_chunks</span>
						<span class="collection-count">{status.qdrant.phase89_ast_chunks.toLocaleString()}</span>
					</div>
					<div class="collection-item">
						<span class="collection-name">phase89_kb_cards</span>
						<span class="collection-count">{status.qdrant.phase89_kb_cards.toLocaleString()}</span>
					</div>
					<div class="collection-item">
						<span class="collection-name">phase76_knowledge_base</span>
						<span class="collection-count">{status.qdrant.phase76_knowledge_base.toLocaleString()}</span>
					</div>
				</div>
			</div>

			<!-- Clusters -->
			<div class="panel clusters-panel">
				<h2>🔬 Error Clusters</h2>
				<div class="cluster-summary">
					<p class="cluster-total">Total Clusters: <strong>{status.clusters.total}</strong></p>
					<div class="cluster-patterns">
						{#each status.clusters.top_patterns as pattern}
							<div class="pattern-item">
								<div class="pattern-header">
									<span class="pattern-name">{pattern.pattern}</span>
									<span class="pattern-confidence">{(pattern.confidence * 100).toFixed(0)}%</span>
								</div>
								<div class="pattern-bar">
									<div
										class="pattern-fill"
										style="width: {(pattern.count / status.postgres.error_instances_open * 100).toFixed(1)}%"
									></div>
								</div>
								<span class="pattern-count">{pattern.count} errors</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Cosine Similarity Rankings -->
			<div class="panel rankings-panel">
				<h2>📊 Top Cosine Similarity Matches</h2>
				<div class="rankings-list">
					{#each status.cosine_rankings.slice(0, 5) as ranking}
						<div class="ranking-item">
							<div class="ranking-header">
								<span class="ranking-query">{ranking.query}</span>
								<span class="ranking-similarity">{ranking.similarity.toFixed(3)}</span>
							</div>
							<div class="ranking-match">{ranking.top_match}</div>
							{#if ranking.confidence_boost > 0}
								<div class="confidence-boost">
									+{(ranking.confidence_boost * 100).toFixed(0)}% confidence boost
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Timeline -->
			<div class="panel timeline-panel">
				<h2>⏱️ Activity Timeline</h2>
				<div class="timeline">
					{#each status.timeline.slice(0, 10) as event}
						<div class="timeline-event" class:success={event.success} class:failure={!event.success}>
							<div class="event-time">{new Date(event.timestamp).toLocaleTimeString()}</div>
							<div class="event-icon">
								{#if event.event_type === 'fix_attempt'}🔧
								{:else if event.event_type === 'kb_update'}📚
								{:else if event.event_type === 'cluster_found'}🔬
								{:else}📦{/if}
							</div>
							<div class="event-content">
								<div class="event-title">{event.event_type.replace(/_/g, ' ')}</div>
								<div class="event-file">{event.file_path}</div>
								<div class="event-details">{event.details}</div>
							</div>
							<div class="event-status">
								{event.success ? '✅' : '❌'}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- What Worked vs What Didn't -->
		<div class="insights-section">
			<h2>💡 Learning Insights</h2>
			<div class="insights-grid">
				<div class="insight-panel success">
					<h3>✅ What Worked</h3>
					<ul>
						<li>GPU embedding generation (6-7x faster)</li>
						<li>CUDA clustering for topological grouping</li>
						<li>KB-enhanced contextual prompts</li>
						<li>Cosine similarity ranking for diffs</li>
						<li>Non-destructive error tracking</li>
					</ul>
				</div>
				<div class="insight-panel partial">
					<h3>⚠️ Partial Success</h3>
					<ul>
						<li>Auto-apply mode (needs validation gate)</li>
						<li>Batch fixes (requires manual review)</li>
						<li>Graph features (Neo4j integration pending)</li>
					</ul>
				</div>
				<div class="insight-panel failure">
					<h3>❌ What Didn't Work</h3>
					<ul>
						<li>Raw AST embedding (too noisy)</li>
						<li>Unchecked KB updates (quality issues)</li>
						<li>Linear search at scale (switched to HNSW)</li>
						<li>Single-pass fixes (now iterative)</li>
					</ul>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.phase89-dashboard {
		background: #0f172a;
		color: #e2e8f0;
		min-height: 100vh;
		padding: 2rem;
		font-family: 'Inter', -apple-system, system-ui, sans-serif;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 2px solid #334155;
	}

	.title-section h1 {
		font-size: 2rem;
		margin: 0 0 0.5rem 0;
		background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.subtitle {
		color: #94a3b8;
		margin: 0;
	}

	.controls {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	button {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		border: none;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.refresh-btn {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		color: white;
	}

	.refresh-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4);
	}

	.refresh-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.auto-refresh-btn {
		background: #1e293b;
		color: #94a3b8;
		border: 1px solid #334155;
	}

	.auto-refresh-btn.active {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
		border-color: transparent;
	}

	.last-update {
		color: #64748b;
		font-size: 0.875rem;
	}

	.error-banner {
		background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
		color: white;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}

	.health-overview {
		display: grid;
		grid-template-columns: 2fr repeat(3, 1fr);
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.health-card {
		background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		border: 2px solid transparent;
	}

	.health-card[data-status="green"] {
		border-color: #10b981;
	}

	.health-card[data-status="yellow"] {
		border-color: #f59e0b;
	}

	.health-card[data-status="red"] {
		border-color: #ef4444;
	}

	.health-indicator {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	.health-card[data-status="green"] .health-indicator {
		background: radial-gradient(circle, #10b981 0%, #059669 100%);
		box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
	}

	.health-card[data-status="yellow"] .health-indicator {
		background: radial-gradient(circle, #f59e0b 0%, #d97706 100%);
		box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
	}

	.health-card[data-status="red"] .health-indicator {
		background: radial-gradient(circle, #ef4444 0%, #dc2626 100%);
		box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.7; transform: scale(1.1); }
	}

	.health-stats h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		color: #94a3b8;
	}

	.health-percentage {
		font-size: 2rem;
		font-weight: bold;
		margin: 0;
	}

	.health-label {
		color: #64748b;
		font-size: 0.875rem;
		margin: 0;
	}

	.stat-card {
		background: #1e293b;
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.stat-icon {
		font-size: 2rem;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: bold;
		margin: 0;
	}

	.stat-label {
		color: #94a3b8;
		font-size: 0.875rem;
		margin: 0;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.panel {
		background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid #334155;
	}

	.panel h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		color: #f1f5f9;
	}

	.metric-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.metric {
		background: #0f172a;
		padding: 1rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
	}

	.metric.highlight {
		grid-column: 1 / -1;
		background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
	}

	.metric-label {
		color: #94a3b8;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.metric-value {
		font-size: 1.5rem;
		font-weight: bold;
		color: #f1f5f9;
	}

	.metric-value.error-open {
		color: #f87171;
	}

	.metric-value.error-resolved {
		color: #34d399;
	}

	.metric-value.error-stale {
		color: #fbbf24;
	}

	.collection-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.collection-item {
		background: #0f172a;
		padding: 1rem;
		border-radius: 8px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.collection-name {
		font-family: 'Fira Code', monospace;
		color: #94a3b8;
		font-size: 0.875rem;
	}

	.collection-count {
		font-weight: bold;
		font-size: 1.25rem;
		color: #60a5fa;
	}

	.cluster-summary {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.cluster-total {
		font-size: 1.125rem;
		color: #94a3b8;
	}

	.cluster-patterns {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.pattern-item {
		background: #0f172a;
		padding: 1rem;
		border-radius: 8px;
	}

	.pattern-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.pattern-name {
		font-weight: 600;
		color: #f1f5f9;
	}

	.pattern-confidence {
		color: #10b981;
		font-weight: bold;
	}

	.pattern-bar {
		height: 6px;
		background: #1e293b;
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.25rem;
	}

	.pattern-fill {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
	}

	.pattern-count {
		color: #64748b;
		font-size: 0.875rem;
	}

	.rankings-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.ranking-item {
		background: #0f172a;
		padding: 1rem;
		border-radius: 8px;
	}

	.ranking-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.ranking-query {
		font-weight: 600;
		color: #f1f5f9;
		flex: 1;
	}

	.ranking-similarity {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-weight: bold;
		font-size: 0.875rem;
	}

	.ranking-match {
		color: #94a3b8;
		font-size: 0.875rem;
		font-family: 'Fira Code', monospace;
		margin-bottom: 0.5rem;
	}

	.confidence-boost {
		color: #10b981;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.timeline-panel {
		grid-column: 1 / -1;
	}

	.timeline {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.timeline-event {
		background: #0f172a;
		padding: 1rem;
		border-radius: 8px;
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		gap: 1rem;
		align-items: center;
		border-left: 3px solid #334155;
	}

	.timeline-event.success {
		border-left-color: #10b981;
	}

	.timeline-event.failure {
		border-left-color: #ef4444;
	}

	.event-time {
		color: #64748b;
		font-size: 0.875rem;
		font-family: 'Fira Code', monospace;
	}

	.event-icon {
		font-size: 1.5rem;
	}

	.event-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.event-title {
		font-weight: 600;
		color: #f1f5f9;
		text-transform: capitalize;
	}

	.event-file {
		color: #60a5fa;
		font-size: 0.875rem;
		font-family: 'Fira Code', monospace;
	}

	.event-details {
		color: #94a3b8;
		font-size: 0.875rem;
	}

	.event-status {
		font-size: 1.5rem;
	}

	.insights-section {
		margin-top: 2rem;
	}

	.insights-section h2 {
		font-size: 1.5rem;
		margin-bottom: 1.5rem;
		color: #f1f5f9;
	}

	.insights-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.insight-panel {
		background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
		border-radius: 12px;
		padding: 1.5rem;
		border: 2px solid;
	}

	.insight-panel.success {
		border-color: #10b981;
	}

	.insight-panel.partial {
		border-color: #f59e0b;
	}

	.insight-panel.failure {
		border-color: #ef4444;
	}

	.insight-panel h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
	}

	.insight-panel ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.insight-panel li {
		padding-left: 1.5rem;
		position: relative;
		color: #cbd5e1;
		font-size: 0.875rem;
	}

	.insight-panel li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: inherit;
	}
</style>
