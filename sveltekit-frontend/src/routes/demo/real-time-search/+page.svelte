<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { OrchestrationCenter, FlowExplorer, ActivityStream, PerformancePulse } from '$lib/components/ui/enhanced-bits';
	
	let { data }: { data: PageData } = $props();
	
	let activeTab = $state('search');
	let searchQuery = $state(data.query);
	let selectedCategory = $state(data.searchType);
	let isSearching = $state(false);
	let searchProgress = $state(0);
	let liveResults = $state(data.searchResults);
	let showSuggestions = $state(false);
	let selectedFilters = $state<Record<string, string>>({});
	
	let tabs = $derived([
		{ id: 'search', label: 'Live Search', count: liveResults.length },
		{ id: 'categories', label: 'Categories', count: data.searchCategories.length },
		{ id: 'filters', label: 'Advanced Filters', count: Object.keys(selectedFilters).length },
		{ id: 'activity', label: 'Recent Activity', count: data.recentQueries.length },
		{ id: 'analytics', label: 'Search Analytics', count: 4 }
	]);

	let searchPerformanceColor = $derived(
		data.searchStats.search_performance.avg_response_time < 50 ? 'text-green-600' :
		data.searchStats.search_performance.avg_response_time < 100 ? 'text-yellow-600' : 'text-red-600'
	);

	let cacheHitRateColor = $derived(
		data.searchStats.search_performance.cache_hit_rate > 0.8 ? 'text-green-600' :
		data.searchStats.search_performance.cache_hit_rate > 0.6 ? 'text-yellow-600' : 'text-red-600'
	);

	function performSearch(query: string = searchQuery) {
		if (!query.trim()) return;
		
		isSearching = true;
		searchProgress = 0;
		
		// Simulate real-time search with progressive results
		const interval = setInterval(() => {
			searchProgress += Math.random() * 20;
			if (searchProgress >= 100) {
				searchProgress = 100;
				isSearching = false;
				clearInterval(interval);
				
				// Update URL and trigger search
				const params = new URLSearchParams($page.url.searchParams);
				params.set('query', query);
				params.set('type', selectedCategory);
				goto(`?${params.toString()}`, { replaceState: true });
			}
		}, 150);
	}

	function selectSuggestedQuery(suggested: string) {
		searchQuery = suggested;
		showSuggestions = false;
		performSearch(suggested);
	}

	function formatNumber(num: number): string {
		return new Intl.NumberFormat().format(num);
	}

	function formatPercentage(value: number): string {
		return `${Math.round(value * 100)}%`;
	}

	function getRelevanceColor(score: number): string {
		return score > 0.9 ? 'text-green-600' :
			   score > 0.8 ? 'text-blue-600' :
			   score > 0.7 ? 'text-yellow-600' : 'text-red-600';
	}

	function getConfidenceColor(confidence: number): string {
		return confidence > 0.9 ? 'text-green-600' :
			   confidence > 0.8 ? 'text-blue-600' :
			   confidence > 0.7 ? 'text-yellow-600' : 'text-red-600';
	}

	function getCategoryIcon(category: string): string {
		const icons: Record<string, string> = {
			legal_documents: '📄',
			case_law: '⚖️',
			statutes: '📚',
			legal_entities: '🏢',
			evidence: '🔍'
		};
		return icons[category] || '📋';
	}

	function truncateText(text: string, maxLength: number): string {
		return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
	}

	function highlightText(text: string, highlights: string[]): string {
		let result = text;
		highlights.forEach(highlight => {
			const regex = new RegExp(highlight, 'gi');
			result = result.replace(regex, `<mark class="bg-yellow-200 px-1">${highlight}</mark>`);
		});
		return result;
	}
</script>

<div class="container mx-auto p-6 space-y-6">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Real-Time Legal Search</h1>
			<p class="text-lg text-gray-600 mt-2">AI-powered semantic search across {formatNumber(data.searchStats.total_indexed)} legal documents</p>
		</div>
		
		<div class="flex items-center gap-4">
			<div class="text-right">
				<div class="text-sm text-gray-500">Active Connections</div>
				<div class="text-2xl font-bold text-blue-600">{data.searchStats.active_connections}</div>
			</div>
			<div class="text-right">
				<div class="text-sm text-gray-500">Response Time</div>
				<div class="text-2xl font-bold {searchPerformanceColor}">{data.searchStats.search_performance.avg_response_time}ms</div>
			</div>
		</div>
	</div>

	<!-- Search Interface -->
	<div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
		<div class="flex gap-4 mb-4">
			<div class="flex-1 relative">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search legal documents, cases, statutes..."
					class="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							performSearch();
						}
					}}
					onfocus={() => showSuggestions = true}
					onblur={() => setTimeout(() => showSuggestions = false, 200)}
				/>
				
				{#if showSuggestions && data.suggestedQueries.length > 0}
					<div class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1">
						{#each data.suggestedQueries as suggestion}
							<button
								class="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
								onclick={() => selectSuggestedQuery(suggestion)}
							>
								{suggestion}
							</button>
						{/each}
					</div>
				{/if}
			</div>
			
			<select 
				bind:value={selectedCategory}
				class="px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
			>
				{#each data.searchCategories as category}
					<option value={category.id}>{category.name}</option>
				{/each}
			</select>
			
			<button 
				class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				onclick={() => performSearch()}
				disabled={isSearching}
			>
				{isSearching ? 'Searching...' : 'Search'}
			</button>
		</div>

		{#if isSearching}
			<div class="bg-blue-50 p-4 rounded-lg">
				<div class="flex items-center justify-between mb-2">
					<span class="text-blue-800 font-medium">Searching across {formatNumber(data.searchStats.total_indexed)} documents</span>
					<span class="text-blue-600">{Math.round(searchProgress)}%</span>
				</div>
				<div class="w-full bg-blue-200 rounded-full h-2">
					<div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: {searchProgress}%"></div>
				</div>
			</div>
		{/if}
	</div>

	<OrchestrationCenter>
		<FlowExplorer {tabs} bind:activeTab>
			{#snippet tabContent()}
				{#if activeTab === 'search'}
					<div class="space-y-6">
						{#if liveResults.length > 0}
							<div class="text-sm text-gray-600 mb-4">
								Found {liveResults.length} results for "{data.query}"
							</div>
							
							{#each liveResults as result}
								<div class="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
									<div class="flex justify-between items-start mb-3">
										<div class="flex items-center gap-3">
											<span class="text-2xl">{getCategoryIcon(result.category)}</span>
											<div>
												<h3 class="text-lg font-semibold text-gray-900">{result.title}</h3>
												<div class="flex items-center gap-4 text-sm text-gray-500">
													<span class="capitalize">{result.category.replace('_', ' ')}</span>
													<span>Modified: {new Date(result.last_modified).toLocaleDateString()}</span>
													{#if result.file_type}
														<span class="uppercase">{result.file_type}</span>
													{/if}
													{#if result.page_count}
														<span>{result.page_count} pages</span>
													{/if}
												</div>
											</div>
										</div>
										
										<div class="text-right">
											<div class="text-lg font-bold {getRelevanceColor(result.relevance_score)}">
												{formatPercentage(result.relevance_score)}
											</div>
											<div class="text-sm text-gray-500">relevance</div>
											<div class="text-sm {getConfidenceColor(result.confidence)} mt-1">
												{formatPercentage(result.confidence)} confidence
											</div>
										</div>
									</div>
									
									<p class="text-gray-700 mb-3">{@html highlightText(truncateText(result.content, 200), result.highlights)}</p>
									
									{#if result.highlights.length > 0}
										<div class="flex flex-wrap gap-2 mb-3">
											{#each result.highlights as highlight}
												<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
													{highlight}
												</span>
											{/each}
										</div>
									{/if}
									
									{#if result.case_references || result.court || result.jurisdiction}
										<div class="flex gap-4 text-sm text-gray-600">
											{#if result.case_references}
												<span>Cases: {result.case_references.join(', ')}</span>
											{/if}
											{#if result.court}
												<span>Court: {result.court}</span>
											{/if}
											{#if result.jurisdiction}
												<span>Jurisdiction: {result.jurisdiction}</span>
											{/if}
											{#if result.citations}
												<span>Citations: {result.citations}</span>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						{:else if data.query}
							<div class="text-center py-12">
								<div class="text-6xl mb-4">🔍</div>
								<h3 class="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
								<p class="text-gray-600 mb-4">Try adjusting your search terms or using different keywords</p>
								<div class="flex flex-wrap gap-2 justify-center">
									{#each data.suggestedQueries.slice(0, 4) as suggestion}
										<button 
											class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200"
											onclick={() => selectSuggestedQuery(suggestion)}
										>
											{suggestion}
										</button>
									{/each}
								</div>
							</div>
						{:else}
							<div class="text-center py-12">
								<div class="text-6xl mb-4">⚡</div>
								<h3 class="text-xl font-semibold text-gray-900 mb-2">Ready for Real-Time Search</h3>
								<p class="text-gray-600 mb-4">Enter a query above to start searching across millions of legal documents</p>
								<div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
									{#each data.suggestedQueries.slice(0, 8) as suggestion}
										<button 
											class="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
											onclick={() => selectSuggestedQuery(suggestion)}
										>
											{suggestion}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{:else if activeTab === 'categories'}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each data.searchCategories as category}
							<div class="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
								 role="button" tabindex="0"
								 onclick={() => { selectedCategory = category.id; activeTab = 'search'; }}>
								<div class="flex items-center gap-4 mb-4">
									<div class="text-3xl">{category.icon}</div>
									<div>
										<h3 class="text-lg font-semibold text-gray-900">{category.name}</h3>
										<div class="text-sm text-gray-600">{formatNumber(category.count)} documents</div>
									</div>
								</div>
								<p class="text-gray-700 text-sm">{category.description}</p>
							</div>
						{/each}
					</div>
				{:else if activeTab === 'filters'}
					<div class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div class="bg-white p-6 rounded-lg border border-gray-200">
								<h4 class="text-lg font-semibold text-gray-900 mb-4">Date Range</h4>
								<div class="space-y-2">
									{#each data.searchFilters.date_ranges as range}
										<label class="flex items-center gap-3">
											<input 
												type="radio" 
												name="dateRange" 
												value={range.value}
												bind:group={selectedFilters.dateRange}
											/>
											<span class="flex-1">{range.label}</span>
											<span class="text-sm text-gray-500">{formatNumber(range.count)}</span>
										</label>
									{/each}
								</div>
							</div>

							<div class="bg-white p-6 rounded-lg border border-gray-200">
								<h4 class="text-lg font-semibold text-gray-900 mb-4">Jurisdiction</h4>
								<div class="space-y-2">
									{#each data.searchFilters.jurisdictions as jurisdiction}
										<label class="flex items-center gap-3">
											<input 
												type="radio" 
												name="jurisdiction" 
												value={jurisdiction.value}
												bind:group={selectedFilters.jurisdiction}
											/>
											<span class="flex-1">{jurisdiction.label}</span>
											<span class="text-sm text-gray-500">{formatNumber(jurisdiction.count)}</span>
										</label>
									{/each}
								</div>
							</div>

							<div class="bg-white p-6 rounded-lg border border-gray-200">
								<h4 class="text-lg font-semibold text-gray-900 mb-4">Confidence Level</h4>
								<div class="space-y-2">
									{#each data.searchFilters.confidence_levels as level}
										<label class="flex items-center gap-3">
											<input 
												type="radio" 
												name="confidence" 
												value={level.value}
												bind:group={selectedFilters.confidence}
											/>
											<span class="flex-1">{level.label}</span>
											<span class="text-sm text-gray-500">{formatNumber(level.count)}</span>
										</label>
									{/each}
								</div>
							</div>
						</div>

						<div class="flex justify-end gap-4">
							<button 
								class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
								onclick={() => selectedFilters = {}}
							>
								Clear Filters
							</button>
							<button 
								class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
								onclick={() => { activeTab = 'search'; performSearch(); }}
							>
								Apply Filters
							</button>
						</div>
					</div>
				{:else if activeTab === 'activity'}
					<ActivityStream>
						{#snippet streamItems()}
							{#each data.recentQueries as query}
								<div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
									<div class="flex-1">
										<div class="font-medium text-gray-900">"{query.query}"</div>
										<div class="text-sm text-gray-600">
											by {query.user} • {formatNumber(query.results)} results
										</div>
										<div class="text-xs text-gray-500 mt-1">
											{new Date(query.timestamp).toLocaleString()}
										</div>
									</div>
									<button 
										class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
										onclick={() => selectSuggestedQuery(query.query)}
									>
										Rerun
									</button>
								</div>
							{/each}
						{/snippet}
					</ActivityStream>
				{:else if activeTab === 'analytics'}
					<div class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							<div class="bg-white p-6 rounded-lg border border-gray-200 text-center">
								<div class="text-3xl font-bold text-blue-600">{formatNumber(data.searchStats.total_indexed)}</div>
								<div class="text-gray-600">Documents Indexed</div>
							</div>
							<div class="bg-white p-6 rounded-lg border border-gray-200 text-center">
								<div class="text-3xl font-bold text-green-600">{data.searchStats.search_performance.queries_per_second}</div>
								<div class="text-gray-600">Queries/Second</div>
							</div>
							<div class="bg-white p-6 rounded-lg border border-gray-200 text-center">
								<div class="text-3xl font-bold {searchPerformanceColor}">{data.searchStats.search_performance.avg_response_time}ms</div>
								<div class="text-gray-600">Avg Response</div>
							</div>
							<div class="bg-white p-6 rounded-lg border border-gray-200 text-center">
								<div class="text-3xl font-bold {cacheHitRateColor}">{formatPercentage(data.searchStats.search_performance.cache_hit_rate)}</div>
								<div class="text-gray-600">Cache Hit Rate</div>
							</div>
						</div>

						<div class="bg-white p-6 rounded-lg border border-gray-200">
							<h4 class="text-lg font-semibold text-gray-900 mb-4">Search Categories Distribution</h4>
							<div class="space-y-3">
								{#each data.searchCategories as category}
									<div class="flex items-center gap-4">
										<div class="text-2xl">{category.icon}</div>
										<div class="flex-1">
											<div class="flex justify-between items-center mb-1">
												<span class="font-medium">{category.name}</span>
												<span class="text-sm text-gray-600">{formatNumber(category.count)}</span>
											</div>
											<div class="w-full bg-gray-200 rounded-full h-2">
												<div 
													class="bg-blue-600 h-2 rounded-full" 
													style="width: {(category.count / data.searchStats.total_indexed) * 100}%"
												></div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<div class="bg-green-50 p-6 rounded-lg border border-green-200">
							<h4 class="text-lg font-semibold text-green-900 mb-2">System Status: Optimal</h4>
							<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								<div>
									<span class="text-green-700 font-medium">Index Freshness:</span>
									<span class="text-green-600 ml-2">{formatPercentage(data.searchStats.search_performance.index_freshness)}</span>
								</div>
								<div>
									<span class="text-green-700 font-medium">Real-time Updates:</span>
									<span class="text-green-600 ml-2">{data.searchStats.real_time_updates ? 'Active' : 'Inactive'}</span>
								</div>
								<div>
									<span class="text-green-700 font-medium">Last Updated:</span>
									<span class="text-green-600 ml-2">{new Date(data.searchStats.last_updated).toLocaleString()}</span>
								</div>
								<div>
									<span class="text-green-700 font-medium">Active Connections:</span>
									<span class="text-green-600 ml-2">{data.searchStats.active_connections}</span>
								</div>
							</div>
						</div>
					</div>
				{/if}
			{/snippet}
		</FlowExplorer>

		<PerformancePulse>
			{#snippet metrics()}
				<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
					<div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
						<div class="text-2xl font-bold text-blue-600">{formatNumber(data.searchStats.total_indexed)}</div>
						<div class="text-sm text-gray-600">Total Docs</div>
					</div>
					<div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
						<div class="text-2xl font-bold {searchPerformanceColor}">{data.searchStats.search_performance.avg_response_time}ms</div>
						<div class="text-sm text-gray-600">Response Time</div>
					</div>
					<div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
						<div class="text-2xl font-bold text-green-600">{data.searchStats.search_performance.queries_per_second}</div>
						<div class="text-sm text-gray-600">QPS</div>
					</div>
					<div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
						<div class="text-2xl font-bold {cacheHitRateColor}">{formatPercentage(data.searchStats.search_performance.cache_hit_rate)}</div>
						<div class="text-sm text-gray-600">Cache Hit</div>
					</div>
					<div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
						<div class="text-2xl font-bold text-purple-600">{data.searchStats.active_connections}</div>
						<div class="text-sm text-gray-600">Connections</div>
					</div>
				</div>
			{/snippet}
		</PerformancePulse>
	</OrchestrationCenter>
</div>