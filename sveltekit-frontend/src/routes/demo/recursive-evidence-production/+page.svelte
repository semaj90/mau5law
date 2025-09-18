<script lang="ts">
	import { onMount } from 'svelte';
	import { Bash, Read, Grep } from '$lib/icons';

	// State management with Svelte 5 runes
	let dbStatus = $state({ connected: false, message: 'Not connected' });
	let evidenceData = $state<any[]>([]);
	let recursionResults = $state<any>(null);
	let isProcessing = $state(false);
	let errorMessage = $state('');
	let testResults = $state<any[]>([]);
	let dockerStatus = $state({ ollama: 'unknown', postgres: 'unknown', redis: 'unknown' });

	// Configuration
	let config = $state({
		maxDepth: 10,
		includeWeakCorrelations: true,
		enablePerformanceMetrics: true,
		caseId: '',
		evidenceIds: [] as string[]
	});

	// Recursion visualization
	let visualizationData = $state({
		nodes: [],
		edges: [],
		depth: 0,
		totalNodes: 0
	});

	onMount(async () => {
		await checkDatabaseConnection();
		await checkDockerInfrastructure();
		await loadSampleEvidence();
	});

	async function checkDatabaseConnection() {
		try {
			const response = await fetch('/api/health/database');
			const data = await response.json();
			dbStatus = {
				connected: data.connected,
				message: data.message || 'Connected to PostgreSQL'
			};
		} catch (error) {
			dbStatus = {
				connected: false,
				message: 'Failed to connect to database'
			};
		}
	}

	async function checkDockerInfrastructure() {
		try {
			// Check Ollama
			const ollamaResponse = await fetch('http://localhost:11435/api/tags').catch(() => null);
			dockerStatus.ollama = ollamaResponse ? 'running (port 11435)' : 'not running';

			// Check PostgreSQL
			const pgResponse = await fetch('/api/health/database');
			dockerStatus.postgres = pgResponse.ok ? 'running (port 5433)' : 'not running';

			// Check Redis
			const redisResponse = await fetch('/api/health/redis');
			dockerStatus.redis = redisResponse.ok ? 'running (port 6379)' : 'not running';
		} catch (error) {
			console.error('Docker check failed:', error);
		}
	}

	async function loadSampleEvidence() {
		try {
			// Load real evidence from database
			const response = await fetch('/api/v1/evidence?limit=10');
			if (response.ok) {
				const data = await response.json();
				evidenceData = data.data || [];
				if (evidenceData.length > 0) {
					config.caseId = evidenceData[0].case_id || '';
					config.evidenceIds = evidenceData.slice.map(e => e.id);
				}
			}
		} catch (error) {
			console.error('Failed to load evidence:', error);
		}
	}

	async function runRecursiveProcessing() {
		if (!config.caseId || config.evidenceIds.length === 0) {
			errorMessage = 'Please select evidence to process';
			return;
		}

		isProcessing = true;
		errorMessage = '';

		try {
			const response = await fetch(`/api/v1/evidence/organize/${config.caseId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					organizationMode: 'recursive_chain',
					evidenceIds: config.evidenceIds,
					options: {
						maxDepth: config.maxDepth,
						includeWeakCorrelations: config.includeWeakCorrelations,
						enablePerformanceMetrics: config.enablePerformanceMetrics
					}
				})
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			const result = await response.json();
			recursionResults = result;

			// Update visualization
			if (result.hierarchy) {
				updateVisualization(result.hierarchy);
			}

			// Log test result
			testResults = [...testResults, {
				timestamp: new Date().toISOString(),
				success: true,
				nodesProcessed: result.metadata?.nodesProcessed || 0,
				maxDepth: result.metadata?.maxDepthReached || 0,
				processingTime: result.metadata?.processingTime || 0
			}];

		} catch (error) {
			errorMessage = `Processing failed: ${error.message}`;
			testResults = [...testResults, {
				timestamp: new Date().toISOString(),
				success: false,
				error: error.message
			}];
		} finally {
			isProcessing = false;
		}
	}

	function updateVisualization(hierarchy: unknown) {
		const nodes: unknown[] = [];
		const edges: unknown[] = [];
		let maxDepth = 0;

		function traverse(node: unknown, depth = 0) {
			nodes.push({
				id: node.evidenceId,
				label: node.title || node.evidenceId,
				depth,
				confidence: node.confidence
			});

			maxDepth = Math.max(maxDepth, depth);

			if (node.children && node.children.length > 0) {
				node.children.forEach((child: unknown) => {
					edges.push({
						from: node.evidenceId,
						to: child.evidenceId,
						strength: child.relationshipStrength || 0.5
					});
					traverse(child, depth + 1);
				});
			}
		}

		traverse(hierarchy);

		visualizationData = {
			nodes,
			edges,
			depth: maxDepth,
			totalNodes: nodes.length
		};
	}

	async function fixOllamaPort() {
		// Update Ollama configuration to use port 11435
		try {
			const response = await fetch('/api/admin/docker/fix-ollama', {
				method: 'POST'
			});
			const result = await response.json();
			if (result.success) {
				await checkDockerInfrastructure();
			}
		} catch (error) {
			console.error('Failed to fix Ollama port:', error);
		}
	}

	function selectEvidence(evidenceId: string) {
		if (config.evidenceIds.includes(evidenceId)) {
			config.evidenceIds = config.evidenceIds.filter(id => id !== evidenceId);
		} else {
			config.evidenceIds = [...config.evidenceIds, evidenceId];
		}
	}

	function renderDepthVisualization(depth: number): string {
		return '🪆'.repeat(Math.min(depth + 1, 10));
	}
</script>

<div class="max-w-7xl mx-auto p-6 space-y-8">
	<!-- Header -->
	<div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-8">
		<h1 class="text-4xl font-bold mb-4">
			🚀 Production Recursive Evidence Testing
		</h1>
		<p class="text-xl opacity-90">
			Phase 1: Real Database Integration & Docker Infrastructure
		</p>
	</div>

	<!-- Infrastructure Status -->
	<div class="grid md:grid-cols-3 gap-6">
		<!-- Database Status -->
		<div class="bg-white rounded-lg shadow-lg p-6">
			<h3 class="text-lg font-semibold mb-4 flex items-center">
				<span class="text-2xl mr-2">🗄️</span>
				PostgreSQL Database
			</h3>
			<div class={`px-4 py-2 rounded-lg ${dbStatus.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
				<div class="font-semibold">{dbStatus.connected ? '✅ Connected' : '❌ Disconnected'}</div>
				<div class="text-sm mt-1">{dbStatus.message}</div>
			</div>
			{#if evidenceData.length > 0}
				<div class="mt-4 text-sm text-gray-600">
					<div>📊 Evidence records: {evidenceData.length}</div>
					<div>🔗 Active cases: {new Set(evidenceData.map(e => e.case_id)).size}</div>
				</div>
			{/if}
		</div>

		<!-- Docker Services -->
		<div class="bg-white rounded-lg shadow-lg p-6">
			<h3 class="text-lg font-semibold mb-4 flex items-center">
				<span class="text-2xl mr-2">🐳</span>
				Docker Services
			</h3>
			<div class="space-y-2">
				<div class="flex justify-between items-center">
					<span>Ollama:</span>
					<span class={`text-sm font-semibold ${dockerStatus.ollama.includes('running') ? 'text-green-600' : 'text-red-600'}`}>
						{dockerStatus.ollama}
					</span>
				</div>
				<div class="flex justify-between items-center">
					<span>PostgreSQL:</span>
					<span class={`text-sm font-semibold ${dockerStatus.postgres.includes('running') ? 'text-green-600' : 'text-red-600'}`}>
						{dockerStatus.postgres}
					</span>
				</div>
				<div class="flex justify-between items-center">
					<span>Redis:</span>
					<span class={`text-sm font-semibold ${dockerStatus.redis.includes('running') ? 'text-green-600' : 'text-red-600'}`}>
						{dockerStatus.redis}
					</span>
				</div>
			</div>
			{#if dockerStatus.ollama.includes('not running')}
				<button
					onclick={fixOllamaPort}
					class="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
				>
					🔧 Fix Ollama Port Conflict
				</button>
			{/if}
		</div>

		<!-- Performance Metrics -->
		<div class="bg-white rounded-lg shadow-lg p-6">
			<h3 class="text-lg font-semibold mb-4 flex items-center">
				<span class="text-2xl mr-2">📊</span>
				Performance Metrics
			</h3>
			{#if recursionResults?.metadata}
				<div class="space-y-2">
					<div class="flex justify-between">
						<span>Nodes:</span>
						<span class="font-semibold">{recursionResults.metadata.nodesProcessed}</span>
					</div>
					<div class="flex justify-between">
						<span>Max Depth:</span>
						<span class="font-semibold">{recursionResults.metadata.maxDepthReached}</span>
					</div>
					<div class="flex justify-between">
						<span>Time:</span>
						<span class="font-semibold">{recursionResults.metadata.processingTime}ms</span>
					</div>
				</div>
			{:else}
				<div class="text-gray-500 text-center py-4">
					No metrics yet
				</div>
			{/if}
		</div>
	</div>

	<!-- Evidence Selection -->
	{#if evidenceData.length > 0}
		<div class="bg-white rounded-lg shadow-lg p-6">
			<h2 class="text-2xl font-semibold mb-4">📁 Select Evidence for Processing</h2>
			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each evidenceData as evidence}
					<button
						onclick={() => selectEvidence(evidence.id)}
						class={`p-4 rounded-lg border-2 transition-all ${
							config.evidenceIds.includes(evidence.id)
								? 'border-blue-500 bg-blue-50'
								: 'border-gray-200 hover:border-gray-300'
						}`}
					>
						<div class="text-left">
							<div class="font-semibold text-sm truncate">{evidence.title || 'Untitled'}</div>
							<div class="text-xs text-gray-600 mt-1">
								Type: {evidence.evidence_type || 'Unknown'}
							</div>
							<div class="text-xs text-gray-500 mt-1">
								ID: {evidence.id.substring(0, 8)}...
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Processing Configuration -->
	<div class="bg-white rounded-lg shadow-lg p-6">
		<h2 class="text-2xl font-semibold mb-4">⚙️ Processing Configuration</h2>
		<div class="grid md:grid-cols-3 gap-6">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Max Recursion Depth
				</label>
				<input
					type="number"
					bind:value={config.maxDepth}
					min="1"
					max="50"
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Include Weak Correlations
				</label>
				<select
					bind:value={config.includeWeakCorrelations}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
				>
					<option value={true}>Yes</option>
					<option value={false}>No</option>
				</select>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Performance Metrics
				</label>
				<select
					bind:value={config.enablePerformanceMetrics}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
				>
					<option value={true}>Enabled</option>
					<option value={false}>Disabled</option>
				</select>
			</div>
		</div>

		<div class="mt-6 flex gap-4">
			<button
				onclick={runRecursiveProcessing}
				disabled={isProcessing || config.evidenceIds.length === 0}
				class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{#if isProcessing}
					⏳ Processing...
				{:else}
					🚀 Run Recursive Processing
				{/if}
			</button>

			<button
				onclick={loadSampleEvidence}
				class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
			>
				🔄 Refresh Evidence
			</button>
		</div>
	</div>

	<!-- Error Display -->
	{#if errorMessage}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-red-800">❌ {errorMessage}</p>
		</div>
	{/if}

	<!-- Visualization -->
	{#if visualizationData.totalNodes > 0}
		<div class="bg-white rounded-lg shadow-lg p-6">
			<h2 class="text-2xl font-semibold mb-4">🎨 Evidence Hierarchy Visualization</h2>
			<div class="bg-gray-50 rounded-lg p-6">
				<div class="text-center mb-6">
					<div class="text-6xl mb-2">{renderDepthVisualization(visualizationData.depth)}</div>
					<div class="text-lg font-semibold">Recursion Depth: {visualizationData.depth}</div>
					<div class="text-sm text-gray-600">Total Nodes: {visualizationData.totalNodes}</div>
				</div>

				<!-- Node Hierarchy -->
				<div class="space-y-2">
					{#each visualizationData.nodes as node}
						<div
							class="flex items-center space-x-2"
							style={`margin-left: ${node.depth * 40}px`}
						>
							<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
							<div class="text-sm">
								<span class="font-medium">{node.label}</span>
								<span class="text-gray-500 ml-2">
									(confidence: {(node.confidence * 100).toFixed(1)}%)
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Processing Results -->
	{#if recursionResults}
		<div class="bg-white rounded-lg shadow-lg p-6">
			<h2 class="text-2xl font-semibold mb-4">📋 Processing Results</h2>
			<div class="bg-gray-50 rounded-lg p-4 overflow-x-auto">
				<pre class="text-xs">{JSON.stringify(recursionResults, null, 2)}</pre>
			</div>
		</div>
	{/if}

	<!-- Test History -->
	{#if testResults.length > 0}
		<div class="bg-white rounded-lg shadow-lg p-6">
			<h2 class="text-2xl font-semibold mb-4">📜 Test History</h2>
			<div class="space-y-2">
				{#each testResults.slice.reverse() as test, index}
					<div class={`p-3 rounded-lg ${test.success ? 'bg-green-50' : 'bg-red-50'}`}>
						<div class="flex justify-between items-center">
							<div>
								<span class={`font-semibold ${test.success ? 'text-green-700' : 'text-red-700'}`}>
									{test.success ? '✅ Success' : '❌ Failed'}
								</span>
								<span class="text-sm text-gray-600 ml-2">
									{new Date(test.timestamp).toLocaleTimeString()}
								</span>
							</div>
							{#if test.success}
								<div class="text-sm text-gray-600">
									{test.nodesProcessed} nodes | Depth: {test.maxDepth} | {test.processingTime}ms
								</div>
							{:else}
								<div class="text-sm text-red-600">
									{test.error}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Implementation Details -->
	<div class="bg-white rounded-lg shadow-lg p-6">
		<h2 class="text-2xl font-semibold mb-4">📚 Implementation Details</h2>
		<div class="prose max-w-none">
			<h3 class="text-lg font-semibold mb-2">Russian Nesting Dolls Pattern</h3>
			<p class="text-gray-700 mb-4">
				The recursive evidence processing uses a Russian nesting dolls (matryoshka) pattern where each evidence
				item may contain references to other evidence, creating a hierarchical structure that is processed
				recursively until base cases are reached.
			</p>

			<h3 class="text-lg font-semibold mb-2">Base Cases</h3>
			<ul class="list-disc list-inside text-gray-700 space-y-1">
				<li>Maximum recursion depth reached (default: 50 levels)</li>
				<li>Circular reference detected (evidence already visited)</li>
				<li>No child evidence found (leaf node)</li>
				<li>Processing error encountered</li>
			</ul>

			<h3 class="text-lg font-semibold mb-2 mt-4">Performance Optimizations</h3>
			<ul class="list-disc list-inside text-gray-700 space-y-1">
				<li>Visited evidence tracking to prevent infinite loops</li>
				<li>Parallel processing of evidence branches</li>
				<li>Relationship caching for repeated analyses</li>
				<li>Configurable depth limiting</li>
			</ul>
		</div>
	</div>
</div>

<style>
	.prose h3 {
		@apply text-lg font-semibold mb-2;
	}

	.prose p {
		@apply text-gray-700 mb-4;
	}

	.prose ul {
		@apply list-disc list-inside text-gray-700 space-y-1;
	}
</style>