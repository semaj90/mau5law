<script lang="ts">
	export let caseId: string | undefined;
	export let enableRealtimeUpdates = true;
	export let showMetrics = true;
	export let enableClusterMode = true;

	import { onMount, onDestroy } from 'svelte';
	import { writable, derived } from 'svelte/store';

	type Status = 'disconnected' | 'connecting' | 'connected' | 'error';

	const mcpStatus = writable<Status>('disconnected');
	const clusterMetrics = writable({
		activeWorkers: 0,
		totalRequests: 0,
		successRate: 0,
		averageResponseTime: 0,
		cacheHitRate: 0
	});

	// Derived store for success rate percentage
	const successRatePercent = derived(clusterMetrics, ($clusterMetrics) =>
		Math.round((($clusterMetrics.successRate || 0) * 100))
	);

	interface McpTool {
		id: string;
		name: string;
		description: string;
		status: 'available' | 'busy' | 'error';
		successCount: number;
		errorCount: number;
		lastUsed?: Date;
	}

	interface QueryResult {
		source?: string;
		timestamp?: number;
		query?: string;
		success: boolean;
		result?: any; // made optional to allow error entries without a payload
		error?: string; // Add an explicit error property for failed results
	}

	interface ContextualSuggestion {
		id: string;
		title: string;
		description: string;
		priority: 'high' | 'medium' | 'low';
	}

	const mcpTools = writable<McpTool[]>([]);
	const queryResults = writable<QueryResult[]>([]);
	const contextualSuggestions = writable<ContextualSuggestion[]>([]);

	let wsConnection: WebSocket | null = null;
	let queryInput = '';
	let selectedTool = '';
	let isProcessing = false;

	let metricsInterval: ReturnType<typeof setInterval> | null = null;

	const availableMCPTools = [
		{ id: 'enhanced_rag_query', name: 'Enhanced RAG Query', description: 'Semantic search with Context7 integration' },
		{ id: 'mcp_memory2_create_relations', name: 'Memory Relations', description: 'Create knowledge graph relations' },
		{ id: 'mcp_memory2_read_graph', name: 'Memory Read Graph', description: 'Query knowledge graph' }
	];

	onMount(() => {
		initializeMCPConnection();
		if (enableRealtimeUpdates) setupWebSocketConnection();
		loadInitialData();
		if (enableClusterMode) startMetricsPolling();
	});

	onDestroy(() => {
		if (wsConnection) wsConnection.close();
		if (metricsInterval) clearInterval(metricsInterval);
	});

	async function initializeMCPConnection() {
		mcpStatus.set('connecting');
		try {
			const response = await fetch('/mcp/health');
			if (response.ok) {
				mcpStatus.set('connected');
				mcpTools.set(availableMCPTools.map((tool) => ({ ...tool, status: 'available', successCount: 0, errorCount: 0 } as McpTool)));
			} else {
				throw new Error('MCP health check failed');
			}
		} catch (err) {
			console.warn('MCP connection failed (non-blocking):', err);
			mcpStatus.set('disconnected');
		}
	}

	function setupWebSocketConnection() {
		try {
			// Try a local MCP websocket endpoint; non-fatal if it fails
			wsConnection = new WebSocket('ws://localhost:3002/mcp/ws');
			wsConnection.addEventListener('open', () => {
				// no-op
			});
			wsConnection.addEventListener('message', (ev) => {
				try {
					const data = JSON.parse(ev.data);
					handleRealtimeUpdate(data);
				} catch (e) {
					console.warn('Invalid WS message', e);
				}
			});
			wsConnection.addEventListener('close', () => {
				// Attempt reconnect later
				setTimeout(() => setupWebSocketConnection(), 3000);
			});
		} catch (e) {
			console.warn('WebSocket setup failed (non-fatal)', e);
		}
	}

	function handleRealtimeUpdate(data: any) {
		if (!data || !data.type) return;
		switch (data.type) {
			case 'cluster-metrics-update':
				clusterMetrics.set({
					activeWorkers: data.metrics?.activeWorkers || 0,
					totalRequests: data.metrics?.totalRequests || 0,
					successRate: data.metrics?.successRate || 0,
					averageResponseTime: data.metrics?.averageResponseTime || 0,
					cacheHitRate: data.metrics?.cacheHitRate || 0
				});
				break;
			case 'mcp-tool-status':
				mcpTools.update((tools) => tools.map((tool) => (tool.id === data.toolId ? { ...tool, status: data.status, lastUsed: new Date() } : tool)));
				break;
			case 'query-result':
				queryResults.update((r) => [data.result, ...r].slice(0, 20));
				break;
		}
	}

	async function loadInitialData() {
		const suggestions: any[] = [];
		if (caseId) {
			suggestions.push({
				id: 'analyze-evidence',
				title: 'Analyze Case Evidence',
				description: 'Run enhanced RAG analysis on case evidence',
				priority: 'high'
			});
		}
		contextualSuggestions.set(suggestions);
	}

	function startMetricsPolling() {
		if (metricsInterval) return;
		metricsInterval = setInterval(async () => {
			try {
				const res = await fetch('/mcp/metrics');
				if (res.ok) {
					const data = await res.json();
					clusterMetrics.set({
						activeWorkers: data.activeWorkers || 0,
						totalRequests: data.totalRequests || 0,
						successRate: data.successRate || 0,
						averageResponseTime: data.averageResponseTime || 0,
						cacheHitRate: data.cacheHitRate || 0
					});
				}
			} catch (e) {
				// ignore polling errors
			}
		}, 5000);
	}

	async function executeMCPTool(toolId: string, args: any = {}) {
		if (isProcessing || !toolId) return; // Added !toolId check
		isProcessing = true;
		mcpTools.update((tools) => tools.map((t) => (t.id === toolId ? { ...t, status: 'busy' } : t)));
		try {
			const resp = await fetch('/mcp/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ toolId, args })
			});
			const data = await resp.json();
			if (resp.ok) {
				queryResults.update((r) => [{ success: true, result: data, query: args.query, timestamp: Date.now() }, ...r].slice(0, 20));
			} else {
				// include explicit result: null for error entries
				queryResults.update((r) => [{ success: false, result: null, error: data.error || 'Server error', query: args.query, timestamp: Date.now() }, ...r].slice(0, 20));
			}
		} catch (e: any) {
			console.error('executeMCPTool failed', e);
			// include explicit result: null for error entries
			queryResults.update((r) => [{ success: false, result: null, error: e.message || 'Network error', query: args.query, timestamp: Date.now() }, ...r].slice(0, 20));
		} finally {
			isProcessing = false;
			mcpTools.update((tools) => tools.map((t) => (t.id === toolId ? { ...t, status: 'available' } : t)));
		}
	}
</script>

<div class="enhanced-mcp-integration">
	<div class="mcp-header">
		<div class="mcp-title">
			<strong>Enhanced MCP</strong>
			<span class="connection-status">{$mcpStatus}</span>
		</div>
		<div class="connection-indicator" class:show-metrics={showMetrics}>
			<span class="status-indicator" aria-hidden="true"></span>
		</div>
	</div>

	{#if showMetrics}
		<div class="cluster-metrics">
			<div class="metrics-grid">
				<div class="metric">
					<div class="metric-label">Active Workers</div>
					<div class="metric-value">{$clusterMetrics.activeWorkers}</div>
				</div>
				<div class="metric">
					<div class="metric-label">Total Requests</div>
					<div class="metric-value">{$clusterMetrics.totalRequests}</div>
				</div>
				<div class="metric">
					<div class="metric-label">Success Rate</div>
					<div class="metric-value">{$successRatePercent}%</div>
				</div>
			</div>
		</div>
	{/if}

	<div class="mcp-interface">
		<div class="query-section">
			<h3>Run MCP Tool</h3>
			<div class="query-form">
				<select class="tool-selector" bind:value={selectedTool}>
					<option value="">Select tool...</option>
					{#each $mcpTools as tool}
						<option value={tool?.id}>{tool?.name}</option>
					{/each}
				</select>
				<input class="query-input" placeholder="Enter query or parameters" bind:value={queryInput} />
				<button class="execute-button" on:click={() => selectedTool && executeMCPTool(selectedTool, { query: queryInput })} disabled={!selectedTool || isProcessing}>
					Execute
				</button>
			</div>
		</div>

		<div class="suggestions-section">
			<h3>Suggestions</h3>
			<ul>
				{#each $contextualSuggestions as s}
					<li>{s.title} — {s.description}</li>
				{/each}
			</ul>
		</div>

		<div class="results-section">
			<h3>Recent Results</h3>
			<div class="results-list">
				{#each $queryResults as result}
					<div class="result-card">
						<div class="result-meta">
							<div class="result-source">{result?.source || 'mcp'}</div>
							<div class="result-time">{result?.timestamp ? new Date(result.timestamp).toLocaleTimeString() : ''}</div>
						</div>
						<div class="result-query">{result?.query}</div>
						<div class="result-content">
							{#if result.success}
								<pre>{JSON.stringify(result.result, null, 2)}</pre>
							{:else}
								<div class="error-message">Error: {result.error || 'Unknown error'}</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.enhanced-mcp-integration {
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		border-radius: 12px;
		padding: 24px;
		color: #e5e7eb;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}
	.mcp-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
		border-bottom: 1px solid rgba(229, 231, 235, 0.06);
		padding-bottom: 16px;
	}
	.mcp-title { font-size: 1.25rem; font-weight: 600; color: #f3f4f6; }
	.connection-status { font-size: 0.875rem; color: #9ca3af; margin-left: 8px; }
	.connection-indicator { display: flex; align-items: center; }
	.connection-indicator:not(.show-metrics) { display: none; }
	.status-indicator { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
	.cluster-metrics { margin-bottom: 24px; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; }
	.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
	.metric { text-align: center; }
	.metric-label { color: #9ca3af; font-size: 0.75rem; }
	.metric-value { color: #10b981; font-weight: 700; font-size: 1.1rem; }
	.query-form { display: flex; gap: 12px; align-items: center; }
	.tool-selector, .query-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 8px 10px; color: #e5e7eb; }
	.tool-selector { min-width: 180px; }
	.query-input { flex: 1; }
	.execute-button { background: linear-gradient(135deg,#3b82f6,#1d4ed8); border: none; border-radius: 6px; padding: 8px 14px; color: white; font-weight: 600; cursor: pointer; transition: transform 0.12s ease; }
	.execute-button:disabled { opacity: 0.5; cursor: not-allowed; }
	.execute-button:hover:not(:disabled) { transform: translateY(-2px); }
	.results-list { margin-top: 12px; display: grid; gap: 10px; }
	.result-card { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 12px; }
	.result-meta { display:flex; justify-content:space-between; font-size:0.8rem; color:#9ca3af; margin-bottom:8px; }
	.result-content pre { white-space: pre-wrap; word-break: break-word; font-size:0.85rem; }
	.error-message { color: #fca5a5; }
</style>
