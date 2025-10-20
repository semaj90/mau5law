<!--
AI RAG Interface - Retrieval Augmented Generation for legal documents
Fully integrated with LangChain RAG backend and Lucia v3 authentication
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported
	import EssentialRoutePage from '$lib/templates/EssentialRoutePage.svelte';
	import Button from '$lib/components/ui/enhanced-bits';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/enhanced-bits';
	import RAGAssistantChat from '$lib/components/ai/RAGAssistantChat.svelte';
	import { FileText, Brain, Search, Zap } from 'lucide-svelte';

	// RAG search state
	let query = $state('');
	let isSearching = $state(false);
	let results = $state<any[]>([]);
	let answer = $state('');
	let confidence = $state(0);
	let processingTime = $state(0);
	let errorMessage = $state('');

	// Advanced filter state
	let useThinkingMode = $state(false);
	let confidenceThreshold = $state(0.7);

	/**
	 * Perform RAG search using the real API endpoint
	 */
	async function handleRAGSearch() {
		if (!query.trim()) return;

		isSearching = true;
		errorMessage = '';
		results = [];
		answer = '';

		try {
			const startTime = performance.now();

			const response = await fetch('/api/ai/rag/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query,
					options: {
						thinkingMode: useThinkingMode,
						confidenceThreshold,
						maxRetrievedDocs: 5,
						useEnhancedSemanticSearch: true,
					},
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Search failed');
			}

			if (data.success) {
				results = data.results || [];
				answer = data.answer || '';
				confidence = data.confidence || 0;
				processingTime = data.metadata?.processingTime || performance.now() - startTime;

				console.log(`✅ RAG search completed: ${results.length} results in ${processingTime.toFixed(0)}ms`);
			} else {
				throw new Error(data.error || 'Search returned no results');
			}
		} catch (error) {
			console.error('RAG search failed:', error);
			errorMessage = error instanceof Error ? error.message : 'Search failed. Please try again.';
		} finally {
			isSearching = false;
		}
	}
	const features = [
		{
			icon: Brain;
			title: 'Intelligent Search',
			description: 'AI-powered document retrieval with semantic understanding',
		},
		{
			icon: FileText;
			title: 'Context Aware',
			description: 'Retrieves relevant legal documents based on case context',
		},
		{
			icon: Search;
			title: 'Vector Search',
			description: 'Advanced vector similarity search across legal corpus',
		},
		{
			icon: Zap;
			title: 'Fast Results',
			description: 'Sub-second response times with cached embeddings',
		}
	];
</script>
<EssentialRoutePage
	pageTitle="RAG Interface"
	description="Retrieval Augmented Generation for Legal Research"
	showBackButton={true}
>
	{#snippet children()}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Search Interface -->
			<div class="lg:col-span-2">
				<Card class="nes-container is-rounded mb-6">
					<CardHeader>
						<CardTitle class="nes-text is-primary">
							Legal Document Search
						</div.Title>
					</div.Header>
					<CardContent>
						<div class="space-y-4">
							<div>
								<label class="nes-text text-sm mb-2 block">
									Enter your legal question or search query
								</label>
								<div class="flex gap-2">
									<input
										class="nes-input flex-1"
										type="text";
										bind:value={query}
										placeholder="What evidence supports the prosecution's case?"
										onkeydown={(e) => e.key === 'Enter' && handleRAGSearch()}
									/>
									<Button
										class="nes-btn is-primary"
										on:click={handleRAGSearch}
										disabled={isSearching || !query.trim()}
									>
										{#if isSearching}
											<div class="animate-pulse">...</div>
										{:else}
											Search
										{/if}
									</Button>
								</div>
							</div>

							<!-- Advanced Options -->
							<div class="flex gap-4 text-xs flex-wrap">
								<label class="flex items-center gap-2">
									<input type="checkbox" bind:checked={useThinkingMode} />
									<span>Thinking Mode</span>
								</label>
								<label class="flex items-center gap-2">
									<span>Confidence: {confidenceThreshold}</span>
									<input
										type="range"
										bind:value={confidenceThreshold}
										min="0.1"
										max="1.0"
										step="0.1"
										class="w-24"
									/>
								</label>
							</div>

							<!-- Error Message -->
							{#if errorMessage}
								<div class="nes-container is-error">
									<p class="text-sm">{errorMessage}</p>
								</div>
							{/if}

							<!-- AI Answer -->
							{#if answer}
								<div class="nes-container with-title">
									<p class="title">AI Analysis</p>
									<p class="text-sm whitespace-pre-wrap">{answer}</p>
									<div class="flex justify-between items-center mt-3 text-xs">
										<span class="nes-badge">
											Confidence: {Math.round(confidence * 100)}%
										</span>
										<span class="text-gray-400">
											{processingTime.toFixed(0)}ms
										</span>
									</div>
								</div>
							{/if}

							<!-- Source Documents -->
							{#if results.length > 0}
								<div class="space-y-3">
									<h3 class="nes-text is-success text-sm">
										Found {results.length} relevant documents
									</h3>
									{#each results as result}
										<div class="nes-container with-title is-centered">
											<p class="title">{result.title}</p>
											<p class="text-sm">{result.snippet}</p>
											<div class="flex justify-between items-center mt-2">
												<span class="nes-badge is-success">
													{Math.round((result.relevance || 0) * 100)}% match
												</span>
												{#if result.metadata?.source}
													<span class="text-xs text-gray-400">
														{result.metadata.source}
													</span>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div.Content>
				</div.Root>
				<!-- Chat Interface -->
				<Card class="nes-container is-rounded">
					<CardHeader>
						<CardTitle class="nes-text is-primary">
							RAG Assistant Chat
						</div.Title>
					</div.Header>
					<CardContent class="p-0">
						<div class="h-96">
							<RAGAssistantChat />
						</div>
					</div.Content>
				</div.Root>
			</div>
			<!-- Features Sidebar -->
			<div>
				<Card class="nes-container is-rounded">
					<CardHeader>
						<CardTitle class="nes-text is-primary text-sm">
							RAG Features
						</div.Title>
					</div.Header>
					<CardContent>
						<div class="space-y-4">
							{#each features as feature}
								<div class="border-b border-gray-600 pb-3 last:border-0">
									<div class="flex items-center gap-2 mb-2">
										<svelte:component this={feature.icon} class="w-4 h-4" />
										<h4 class="nes-text text-xs font-bold">
											{feature.title}
										</h4>
									</div>
									<p class="nes-text is-disabled text-xs leading-relaxed">
										{feature.description}
									</p>
								</div>
							{/each}
						</div>
					</div.Content>
				</div.Root>
				<!-- Quick Actions -->
				<Card class="nes-container is-rounded mt-6">
					<CardHeader>
						<CardTitle class="nes-text is-primary text-sm">
							Quick Actions
						</div.Title>
					</div.Header>
					<CardContent>
						<div class="space-y-2">
							<Button class="nes-btn w-full text-xs" size="sm">
								Search Similar Cases
							<Button class="nes-btn w-full text-xs" size="sm" variant="ghost">
								Browse Legal Database
							<Button class="nes-btn w-full text-xs" size="sm" variant="ghost">
								View Search History
						</div>
					</div.Content>
				</div.Root>
			</div>
		</div>
	{/snippet}
</EssentialRoutePage>;