<script lang="ts">
	import { onMount } from 'svelte';

	interface InspectorResult {
		feature: string;
		pattern: string;
		timestamp: string;
		files: Array<{
			path: string;
			size: number;
			type: string;
		}>;
	}

	const features = [
		'API routes',
		'DB schema',
		'OCR pipeline',
		'MiniLM reranker',
		'Hybrid search',
		'Autoencoder CUDA',
		'Gemma legal summaries',
		'Evidence ingestion',
		'Timeline',
		'Neo4j citations'
	];

	let selectedFeature = $state('Hybrid search');
	let results: InspectorResult | null = $state(null);
	let loading = $state(false);
	let error = $state('');
	let expandedFiles: Set<string> = $state(new Set());

	async function runInspector() {
		loading = true;
		error = '';
		results = null;

		try {
			const response = await fetch('/api/admin/inspector', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ feature: selectedFeature })
			});

			if (!response.ok) {
				const errorData = await response.json();
				error = errorData.error || 'Inspector failed';
				return;
			}

			results = await response.json();
		} catch (err) {
			console.error('Inspector error:', err);
			error = 'Failed to run inspector';
		} finally {
			loading = false;
		}
	}

	function toggleFile(path: string) {
		if (expandedFiles.has(path)) {
			expandedFiles.delete(path);
		} else {
			expandedFiles.add(path);
		}
		expandedFiles = expandedFiles;
	}

	function getFileIcon(type: string): string {
		const icons: Record<string, string> = {
			'.ts': '📘',
			'.js': '📙',
			'.go': '🐹',
			'.py': '🐍',
			'.sql': '🗄️',
			'.json': '📋',
			'.svelte': '⚡',
			'.css': '🎨'
		};
		return icons[type] || '📄';
	}

	onMount(() => {
		// Auto-run on mount with default feature
		runInspector();
	});
</script>

<svelte:head>
	<title>Warden Inspector - Admin Panel</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
	<!-- Header -->
	<div class="bg-gradient-to-r from-red-900 to-gray-900 border-b-4 border-red-700 sticky top-0 z-30">
		<div class="max-w-7xl mx-auto px-6 py-6">
			<h1 class="text-4xl font-bold text-white font-mono">⚖️ WARDEN INSPECTOR</h1>
			<p class="text-red-200 mt-2">Codebase Analysis & Feature Mapping</p>
		</div>
	</div>

	<!-- Main Content -->
	<div class="max-w-7xl mx-auto px-6 py-8">
		<!-- Control Panel -->
		<div class="bg-gray-800 border-4 border-red-700 rounded-lg p-6 mb-8">
			<h2 class="text-xl font-bold text-white mb-4">🔍 Scan Configuration</h2>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label class="block text-sm font-semibold text-gray-300 mb-2">Select Feature Layer</label>
					<select
						bind:value={selectedFeature}
						disabled={loading}
						class="w-full px-4 py-2 bg-gray-700 text-white border-2 border-red-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
					>
						{#each features as feature}
							<option value={feature}>{feature}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-end">
					<button
						onclick={runInspector}
						disabled={loading}
						class="w-full px-6 py-2 bg-red-900 hover:bg-red-800 text-white font-bold border-2 border-red-700 rounded transition disabled:opacity-50"
					>
						{loading ? '⟳ Scanning...' : '🔎 Scan Codebase'}
					</button>
				</div>

				<div class="flex items-end">
					<div class="text-sm text-gray-400">
						{#if results}
							<div class="font-mono">
								<div>📁 Files: {results.files.length}</div>
								<div>⏱️ {new Date(results.timestamp).toLocaleTimeString()}</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Error Display -->
		{#if error}
			<div class="bg-red-900 border-2 border-red-700 text-red-100 p-4 rounded mb-8">
				<p class="font-bold">❌ Error</p>
				<p class="text-sm mt-1">{error}</p>
			</div>
		{/if}

		<!-- Results -->
		{#if results}
			<div class="space-y-4">
				<div class="bg-gray-800 border-2 border-red-700 rounded-lg p-4">
					<h3 class="text-lg font-bold text-white mb-2">📊 Scan Results</h3>
					<div class="grid grid-cols-3 gap-4 text-center">
						<div class="bg-gray-700 p-3 rounded">
							<div class="text-2xl font-bold text-red-400">{results.files.length}</div>
							<div class="text-xs text-gray-400">Files Found</div>
						</div>
						<div class="bg-gray-700 p-3 rounded">
							<div class="text-2xl font-bold text-blue-400">
								{(results.files.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)}
							</div>
							<div class="text-xs text-gray-400">KB Total</div>
						</div>
						<div class="bg-gray-700 p-3 rounded">
							<div class="text-2xl font-bold text-green-400">
								{new Set(results.files.map((f) => f.type)).size}
							</div>
							<div class="text-xs text-gray-400">File Types</div>
						</div>
					</div>
				</div>

				<!-- File List -->
				<div class="bg-gray-800 border-2 border-red-700 rounded-lg p-4">
					<h3 class="text-lg font-bold text-white mb-4">📁 Files</h3>
					<div class="space-y-2 max-h-96 overflow-y-auto">
						{#each results.files as file (file.path)}
							<button
								onclick={() => toggleFile(file.path)}
								class="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 border-l-4 border-red-700 rounded transition"
							>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2 flex-1 min-w-0">
										<span class="text-lg">{getFileIcon(file.type)}</span>
										<span class="text-gray-200 font-mono text-sm truncate">{file.path}</span>
									</div>
									<div class="text-xs text-gray-400 ml-2">
										{(file.size / 1024).toFixed(1)} KB
									</div>
									<span class="ml-2 text-gray-400">
										{expandedFiles.has(file.path) ? '▼' : '▶'}
									</span>
								</div>

								{#if expandedFiles.has(file.path)}
									<div class="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
										<div>Type: {file.type}</div>
										<div>Size: {file.size} bytes</div>
										<div class="mt-1 font-mono text-gray-500">{file.path}</div>
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Metadata -->
				<div class="bg-gray-800 border-2 border-red-700 rounded-lg p-4 text-xs text-gray-400 font-mono">
					<div>Feature: {results.feature}</div>
					<div>Pattern: {results.pattern}</div>
					<div>Scanned: {new Date(results.timestamp).toLocaleString()}</div>
				</div>
			</div>
		{:else if !loading && !error}
			<div class="bg-gray-800 border-2 border-gray-700 rounded-lg p-8 text-center text-gray-400">
				<p>Click "Scan Codebase" to begin inspection</p>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background-color: #111827;
	}
</style>
