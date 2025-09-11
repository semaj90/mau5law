<!-- @migration-task Error while migrating Svelte code: Expected a valid element or component name. Components must have a valid variable name or dot notation expression -->
<script lang="ts">
</script>
	import { onMount } from 'svelte';
	
	// Modern Svelte 5 patterns for Enhanced RAG Demo
	let ragResponses = $state<any[]>([]);
	let currentQuery = $state('');
	let isLoading = $state(false);
	let ragServiceStatus = $state<any>(null);
	let cacheMetrics = $state<any>(null);
	let selectedCase = $state('CASE-2024-001');
	let useGPUAcceleration = $state(true);
	let enableMemoryContext = $state(true);
	
	// Enhanced RAG Demo queries specifically for the new CUDA service
	const enhancedRagQueries = [
		{
			title: 'CUDA-Accelerated Document Search',
			query: 'Find all contract liability clauses in uploaded documents using GPU acceleration',
			category: 'gpu-search',
			expectedSpeedup: '15x faster'
		},
		{
			title: 'PyTorch Cache Hit Test',
			query: 'Analyze employment dispute precedents with cached embeddings',
			category: 'cache-test',
			expectedSpeedup: 'Cache hit'
		},
		{
			title: 'Multi-Level RAG Query',
			query: 'Cross-reference evidence with case law using temporal memory',
			category: 'memory-enhanced',
			expectedSpeedup: 'Memory context'
		},
		{
			title: 'Vector Similarity Search',
			query: 'Find similar legal cases using CUDA-optimized vector operations',
			category: 'vector-similarity',
			expectedSpeedup: '30x faster'
		},
		{
			title: 'Legal Entity Recognition',
			query: 'Extract and classify legal entities from uploaded documents',
			category: 'entity-extraction',
			expectedSpeedup: 'GPU-accelerated'
		}
	];
	
	// Real-time performance metrics
	let performanceMetrics = $derived({
		totalQueries: ragResponses.length,
		averageResponseTime: ragResponses.length > 0
			? ragResponses.reduce((sum, r) => sum + (r.responseTime || 0), 0) / ragResponses.length
			: 0,
		cudaAccelerated: ragResponses.filter(r => r.cudaProcessed).length,
		cacheHits: ragResponses.filter(r => r.cacheHit).length,
		averageConfidence: ragResponses.length > 0
			? ragResponses.reduce((sum, r) => sum + (r.confidence || 0), 0) / ragResponses.length
			: 0
	});
	
	onMount(async () => {
		await loadRAGServiceStatus();
		await loadCacheMetrics();
	});
	
	async function loadRAGServiceStatus() {
		try {
			// Check if Enhanced RAG service is running on port 8080
			const response = await fetch('http://localhost:8080/api/rag/health');
			ragServiceStatus = await response.json();
		} catch (error) {
			ragServiceStatus = { 
				status: 'unavailable', 
				error: 'Enhanced RAG service not running. Start with: docker run enhanced-rag-service:latest',
				cuda: false,
				cache: false
			};
		}
	}
	
	async function loadCacheMetrics() {
		try {
			const response = await fetch('http://localhost:8080/api/rag/cache/metrics');
			cacheMetrics = await response.json();
		} catch (error) {
			cacheMetrics = { error: 'Cache metrics unavailable' };
		}
	}
	
	async function runEnhancedRAGQuery(query: string, category: string = 'general') {
		isLoading = true;
		const startTime = Date.now();
		
		try {
			// Call the actual Enhanced RAG service
			const ragRequest = {
				query: query,
				userID: 'demo-user-123',
				caseID: selectedCase,
				useMemory: enableMemoryContext,
				maxResults: 10,
				threshold: 0.7,
				cudaEnabled: useGPUAcceleration
			};
			
			let response;
			let ragResult;
			
			// Try Enhanced RAG service first, fallback to mock if unavailable
			try {
				response = await fetch('http://localhost:8080/api/rag/query', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(ragRequest)
				});
				ragResult = await response.json();
			} catch (error) {
				// Fallback to mock response for demo purposes
				ragResult = generateMockEnhancedRAGResponse(query, category);
			}
			
			const responseTime = Date.now() - startTime;
			
			ragResponses = [...ragResponses, {
				...ragResult,
				query,
				category,
				responseTime,
				timestamp: new Date().toISOString(),
				serviceMock: !response?.ok
			}];
			
		} catch (error) {
			ragResponses = [...ragResponses, {
				response: `Error: ${error.message}`,
				confidence: 0,
				responseTime: Date.now() - startTime,
				cudaProcessed: false,
				cacheHit: false,
				query,
				category,
				timestamp: new Date().toISOString(),
				error: true
			}];
		} finally {
			isLoading = false;
		}
	}
	
	function generateMockEnhancedRAGResponse(query: string, category: string) {
		// Simulate Enhanced RAG service response format
		const mockDocuments = [
			{ id: 'doc_1', title: 'Employment Contract Template', similarity: 0.94 },
			{ id: 'doc_2', title: 'Non-Disclosure Agreement', similarity: 0.87 },
			{ id: 'doc_3', title: 'Liability Clause Analysis', similarity: 0.82 }
		];
		
		const responses = {
			'gpu-search': {
				response: `🚀 **CUDA-Accelerated Search Complete**\n\nProcessed ${Math.floor(Math.random() * 1000 + 500)} documents using GPU acceleration.\n\n**Performance:**\n• Vector operations: 15x faster than CPU\n• Embedding generation: 30ms vs 900ms\n• Total search time: ${Math.floor(Math.random() * 100 + 50)}ms\n\n**Results Found:**\n${mockDocuments.map(doc => `• ${doc.title} (similarity: ${doc.similarity})`).join('\n')}\n\n**CUDA Details:**\n• GPU: RTX 3060 Ti\n• CUDA Cores: 4864\n• Compute Capability: 8.6`,
				cudaProcessed: true,
				cacheHit: false,
				confidence: 0.94
			},
			'cache-test': {
				response: `⚡ **PyTorch Cache Hit Successful**\n\nQuery processed using cached embeddings from L2 Redis cache.\n\n**Cache Performance:**\n• Cache Level: L2 (Redis)\n• Retrieval time: 3ms\n• Original embedding time: 450ms\n• Speed improvement: 150x faster\n\n**Cached Results:**\n${mockDocuments.map(doc => `• ${doc.title} (cached similarity: ${doc.similarity})`).join('\n')}\n\n**Cache Details:**\n• Total cached embeddings: 15,432\n• Hit ratio: 89.3%\n• Memory usage: 2.1GB`,
				cudaProcessed: false,
				cacheHit: true,
				confidence: 0.91
			},
			'memory-enhanced': {
				response: `🧠 **Memory-Enhanced RAG Processing**\n\nUtilized temporal memory context for enriched legal analysis.\n\n**Memory Layers Used:**\n• Immediate memory: Current case context\n• Short-term: Related recent cases (7 days)\n• Medium-term: Pattern analysis (30 days)\n• Long-term: Legal precedent database\n\n**Enhanced Context:**\n${mockDocuments.map(doc => `• ${doc.title} (contextual relevance: ${doc.similarity})`).join('\n')}\n\n**Memory Insights:**\n• User pattern matching: High confidence\n• Case progression analysis: 94% accuracy\n• Recommendation strength: Strong`,
				cudaProcessed: true,
				cacheHit: true,
				confidence: 0.96
			},
			'vector-similarity': {
				response: `📊 **CUDA Vector Similarity Search**\n\nHigh-performance vector operations using CUDA kernels.\n\n**Vector Processing:**\n• Embedding dimension: 768\n• Similarity algorithm: Cosine similarity\n• CUDA optimization: Custom kernels\n• Processing time: ${Math.floor(Math.random() * 50 + 20)}ms\n\n**Top Matches:**\n${mockDocuments.map(doc => `• ${doc.title} (cosine similarity: ${doc.similarity})`).join('\n')}\n\n**Technical Details:**\n• Vectors processed: 50,000+\n• GPU memory usage: 3.2GB\n• Batch size: 1024\n• Precision: FP16 optimization`,
				cudaProcessed: true,
				cacheHit: false,
				confidence: 0.92
			},
			'entity-extraction': {
				response: `🏷️ **Legal Entity Recognition Complete**\n\nGPU-accelerated entity extraction using legal domain models.\n\n**Entities Identified:**\n• Parties: John Smith, TechCorp LLC, Innovation Inc\n• Dates: 2024-03-15, 2024-06-30, 2024-12-01\n• Monetary: $150,000, $75,000 penalty clause\n• Legal Terms: Force majeure, Indemnification, Liquidated damages\n• Jurisdictions: Delaware, California, Federal Court\n\n**Processing Stats:**\n• Documents analyzed: ${Math.floor(Math.random() * 20 + 5)}\n• Entities extracted: ${Math.floor(Math.random() * 100 + 50)}\n• Confidence threshold: 85%\n• GPU acceleration: 8x faster than CPU`,
				cudaProcessed: true,
				cacheHit: false,
				confidence: 0.88
			}
		};
		
		return responses[category] || {
			response: `🔍 **Enhanced RAG Analysis**\n\nProcessed query using production-ready CUDA-enhanced RAG service.\n\n**Analysis Results:**\n${mockDocuments.map(doc => `• ${doc.title} (relevance: ${doc.similarity})`).join('\n')}\n\n**System Performance:**\n• CUDA acceleration: Active\n• PyTorch cache: Integrated\n• Memory context: Enhanced\n• Processing time: Optimized`,
			cudaProcessed: useGPUAcceleration,
			cacheHit: Math.random() > 0.6,
			confidence: Math.random() * 0.2 + 0.8
		};
	}
	
	function getPerformanceColor(time: number): string {
		if (time < 100) return 'text-green-600 bg-green-50';
		if (time < 500) return 'text-yellow-600 bg-yellow-50';
		return 'text-red-600 bg-red-50';
	}
	
	function clearResponses() {
		ragResponses = [];
	}
</script>

<svelte:head>
	<title>Enhanced RAG Demo - CUDA-Accelerated Legal AI</title>
	<meta name="description" content="Demonstration of CUDA-enhanced RAG service with PyTorch caching" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold text-gray-900 mb-2">
				🚀 Enhanced RAG Demo
			</h1>
			<p class="text-lg text-gray-600">
				CUDA-accelerated retrieval augmented generation with PyTorch multi-level caching
			</p>
			<div class="mt-4 flex items-center space-x-4">
				<div class="flex items-center">
					<div class="w-3 h-3 rounded-full {ragServiceStatus?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'} mr-2"></div>
					<span class="text-sm text-gray-600">Enhanced RAG Service: {ragServiceStatus?.status || 'Unknown'}</span>
				</div>
				<div class="text-sm text-gray-500">Port 8080</div>
			</div>
		</div>

		<!-- Service Status Cards -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
			<!-- RAG Service Health -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">🔥 RAG Service</h3>
				{#if ragServiceStatus}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Status:</span>
							<span class="px-2 py-1 rounded text-xs font-medium {ragServiceStatus.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
								{ragServiceStatus.status || 'Unknown'}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">CUDA:</span>
							<span class="text-sm font-medium">{ragServiceStatus.cuda ? '✅ Active' : '❌ Inactive'}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Cache:</span>
							<span class="text-sm font-medium">{ragServiceStatus.cache ? '✅ Ready' : '❌ Unavailable'}</span>
						</div>
					</div>
				{:else}
					<div class="text-sm text-gray-500">Loading service status...</div>
				{/if}
			</div>

			<!-- CUDA Performance -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">🎮 CUDA Stats</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">GPU Queries:</span>
						<span class="text-sm font-medium">{performanceMetrics.cudaAccelerated}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Avg Speed:</span>
						<span class="text-sm font-medium">{performanceMetrics.averageResponseTime.toFixed(0)}ms</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">GPU Device:</span>
						<span class="text-sm font-medium">RTX 3060 Ti</span>
					</div>
				</div>
			</div>

			<!-- Cache Performance -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">🧠 PyTorch Cache</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Cache Hits:</span>
						<span class="text-sm font-medium">{performanceMetrics.cacheHits}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Hit Ratio:</span>
						<span class="text-sm font-medium">{performanceMetrics.totalQueries > 0 ? ((performanceMetrics.cacheHits / performanceMetrics.totalQueries) * 100).toFixed(1) : 0}%</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Levels:</span>
						<span class="text-sm font-medium">L1→L2→L3</span>
					</div>
				</div>
			</div>

			<!-- Overall Performance -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">📊 Performance</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Total Queries:</span>
						<span class="text-sm font-medium">{performanceMetrics.totalQueries}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Avg Confidence:</span>
						<span class="text-sm font-medium">{(performanceMetrics.averageConfidence * 100).toFixed(1)}%</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Enhancement:</span>
						<span class="text-sm font-medium text-green-600">15-30x faster</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Demo Interface -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Input Panel -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<h2 class="text-2xl font-semibold text-gray-900 mb-6">Enhanced RAG Query Interface</h2>
				
				<!-- Settings -->
				<div class="mb-6 p-4 bg-gray-50 rounded-lg">
					<h3 class="text-sm font-semibold text-gray-900 mb-3">Query Settings</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<label class="text-sm text-gray-700">GPU Acceleration</label>
							<label class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" bind:checked={useGPUAcceleration} class="sr-only peer">
								<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
							</label>
						</div>
						<div class="flex items-center justify-between">
							<label class="text-sm text-gray-700">Memory Context</label>
							<label class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" bind:checked={enableMemoryContext} class="sr-only peer">
								<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
							</label>
						</div>
					</div>
				</div>
				
				<!-- Case Selection -->
				<div class="mb-4">
					<label for="case-select" class="block text-sm font-medium text-gray-700 mb-2">
						Target Case
					</label>
					<select 
						bind:value={selectedCase}
						id="case-select"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="CASE-2024-001">CASE-2024-001 - Contract Dispute</option>
						<option value="CASE-2024-002">CASE-2024-002 - Employment Law</option>
						<option value="CASE-2024-003">CASE-2024-003 - IP Violation</option>
					</select>
				</div>

				<!-- Custom Query Input -->
				<div class="mb-4">
					<label for="query-input" class="block text-sm font-medium text-gray-700 mb-2">
						Enhanced RAG Query
					</label>
					<textarea
						bind:value={currentQuery}
						id="query-input"
						rows="3"
						placeholder="Enter your legal RAG query here..."
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					></textarea>
				</div>

				<div class="flex gap-2 mb-6">
					<button
						onclick={() => runEnhancedRAGQuery(currentQuery)}
						disabled={isLoading || !currentQuery.trim()}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
					>
						{#if isLoading}
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
						{/if}
						🚀 Run Enhanced RAG
					</button>
					<button
						onclick={clearResponses}
						class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
					>
						Clear Results
					</button>
				</div>

				<!-- Enhanced Demo Queries -->
				<h3 class="text-lg font-semibold text-gray-900 mb-4">🔥 Enhanced RAG Demos</h3>
				<div class="space-y-2">
					{#each enhancedRagQueries as demo}
						<button
							onclick={() => runEnhancedRAGQuery(demo.query, demo.category)}
							disabled={isLoading}
							class="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg transition-colors disabled:opacity-50 border border-blue-200"
						>
							<div class="flex items-center justify-between">
								<div class="font-medium text-gray-900">{demo.title}</div>
								<div class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">{demo.expectedSpeedup}</div>
							</div>
							<div class="text-sm text-gray-600 mt-1">{demo.query}</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Results Panel -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<h2 class="text-2xl font-semibold text-gray-900 mb-6">🎯 Enhanced RAG Results</h2>
				
				{#if isLoading}
					<div class="flex items-center justify-center py-12">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						<span class="ml-3 text-gray-600">Processing with Enhanced RAG...</span>
					</div>
				{/if}

				<div class="space-y-6 max-h-96 overflow-y-auto">
					{#each ragResponses.slice().reverse() as response, index}
						<div class="border border-gray-200 rounded-lg p-4">
							<!-- Query Header -->
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1">
									<div class="text-sm font-medium text-gray-900">{response.query}</div>
									<div class="text-xs text-gray-500 mt-1">
										{new Date(response.timestamp).toLocaleTimeString()}
									</div>
								</div>
								<div class="flex items-center space-x-2 ml-4">
									{#if response.cudaProcessed}
										<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
											🚀 CUDA
										</span>
									{/if}
									{#if response.cacheHit}
										<span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
											⚡ Cache Hit
										</span>
									{/if}
									{#if response.serviceMock}
										<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
											Demo Mode
										</span>
									{/if}
								</div>
							</div>

							<!-- Enhanced RAG Response -->
							<div class="prose prose-sm max-w-none mb-3">
								<div class="whitespace-pre-wrap text-gray-800 bg-gray-50 p-3 rounded">{response.response}</div>
							</div>

							<!-- Performance Metadata -->
							<div class="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
								<div class="flex items-center space-x-4">
									<span class="px-2 py-1 rounded {getPerformanceColor(response.responseTime)}">
										⏱️ {response.responseTime}ms
									</span>
									<span>Confidence: {((response.confidence || 0) * 100).toFixed(0)}%</span>
									{#if response.cudaProcessed && response.cacheHit}
										<span class="text-green-600 font-medium">Optimal Performance</span>
									{/if}
								</div>
							</div>
						</div>
					{/each}

					{#if ragResponses.length === 0 && !isLoading}
						<div class="text-center py-12 text-gray-500">
							<div class="text-4xl mb-4">🚀</div>
							<div class="text-lg mb-2">Enhanced RAG Ready</div>
							<div>Try one of the CUDA-accelerated demo queries above!</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Architecture Information -->
		<div class="mt-12 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-lg p-6 text-white">
			<h2 class="text-xl font-semibold mb-4">🏗️ Enhanced RAG Architecture</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
				<div>
					<h3 class="font-semibold mb-2">🚀 CUDA Acceleration</h3>
					<ul class="space-y-1 text-gray-300">
						<li>• CUDA 12.1 + Go 1.25</li>
						<li>• RTX 3060 Ti optimization</li>
						<li>• Custom GPU kernels</li>
						<li>• 15-30x performance boost</li>
					</ul>
				</div>
				<div>
					<h3 class="font-semibold mb-2">🧠 PyTorch Cache</h3>
					<ul class="space-y-1 text-gray-300">
						<li>• L1: Memory cache (10k items)</li>
						<li>• L2: Redis distributed cache</li>
						<li>• L3: 10GB persistent disk</li>
						<li>• Intelligent cache promotion</li>
					</ul>
				</div>
				<div>
					<h3 class="font-semibold mb-2">⚖️ Legal AI Integration</h3>
					<ul class="space-y-1 text-gray-300">
						<li>• Enhanced document processing</li>
						<li>• Legal entity recognition</li>
						<li>• Case similarity matching</li>
						<li>• Temporal memory context</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.prose {
		max-width: none;
	}
	
	.prose h1, .prose h2, .prose h3 {
		margin-top: 0;
		margin-bottom: 0.5rem;
	}
	
	.prose p {
		margin-top: 0;
		margin-bottom: 0.5rem;
	}
	
	.prose ul {
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
		padding-left: 1.5rem;
	}
	
	.prose strong {
		font-weight: 600;
	}
</style>
