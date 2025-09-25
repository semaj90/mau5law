<script lang="ts">
  // Svelte 5 runes are auto-imported
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card/Card.svelte';
	import CardContent from '$lib/components/ui/Card/CardContent.svelte';
	import CardHeader from '$lib/components/ui/Card/CardHeader.svelte';
	import CardTitle from '$lib/components/ui/Card/CardTitle.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import AIChatMessage from '$lib/components/ai/AIChatMessage.svelte';
	import AISearchBar from '$lib/components/ui/enhanced-bits/AISearchBar.svelte';
	import { aiAssistant } from '$lib/stores/ai-assistant-unified.svelte';
	import { acceleratedLegalAssistant, enhanceAIResponse } from '$lib/ai/accelerated-legal-assistant';
	import { MessageSquare, Bot, User, Loader, Lightbulb, Link, FileText, Search, Zap } from 'lucide-svelte';
	// Svelte 5: Replace event dispatcher with callback props
	interface Props {
		caseId?: string;
		selectedEvidenceIds?: string[];
		isVisible?: boolean;
		onEvidenceSelect?: (data: { evidenceId: string }) => void;
		onEvidenceHighlight?: (data: { evidenceIds: string[] }) => void;
		onActionTrigger?: (data: { type: string; data: any }) => void;
	}
	let {
		caseId = 'case-001',
		selectedEvidenceIds = [],
		isVisible = true,
		onEvidenceSelect,
		onEvidenceHighlight,
		onActionTrigger
	}: Props = $props();
	// Svelte 5 state
	let userInput = $state('');
	let isLoading = $state(false);
	let currentContext = $state<'general' | 'analysis' | 'connection' | 'investigation'>('general');
	let showInsights = $state(true);
	let showSuggestions = $state(true);
	let useAcceleration = $state(false);
	let accelerationStatus = $state<'initializing' | 'ready' | 'error' | 'disabled'>('disabled');
	let lastAccelerationResults = $state<any>(null);
	// Reactive values using Svelte 5 $derived - properly connected to unified store
	const messages = $derived(aiAssistant.currentMessages);
	const caseContext = $derived(aiAssistant.currentCase);
	const insights = $derived(caseContext?.insights || []);
	const isAssistantLoading = $derived(aiAssistant.isLoading);
	// Initialize case and acceleration when component mounts
	$effect(() => {
		if (caseId) {
			aiAssistant.initializeCase(caseId, `Case ${caseId}`);
			aiAssistant.setCurrentCase(caseId);
		}
		// Initialize acceleration if enabled
		if (useAcceleration && accelerationStatus === 'disabled') {
			initializeAcceleration();
		}
	});
	// Initialize WebGPU + SIMD acceleration
	async function initializeAcceleration() {
		accelerationStatus = 'initializing';
		try {
			const success = await acceleratedLegalAssistant.initialize();
			accelerationStatus = success ? 'ready' : 'error';
			if (success) {
				console.log('🚀 AI Assistant acceleration enabled');
			}
		} catch (error) {
			console.error('Failed to initialize acceleration:', error);
			accelerationStatus = 'error';
		}
	}
	// Handle user input submission with optional acceleration
	async function handleSendMessage() {
		if (!userInput.trim() || isLoading) return;
		const prompt = userInput.trim();
		userInput = '';
		isLoading = true;
		try {
			// Use the unified store's sendMessage method with acceleration support
			await aiAssistant.sendMessage(caseId, prompt, selectedEvidenceIds, {
				useAcceleration: useAcceleration && accelerationStatus === 'ready',
				includeHistory: true
				legalContext: `Evidence IDs: ${selectedEvidenceIds.join(', ')}`
			});
		} catch (error) {
			console.error('Failed to send message:', error);
		} finally {
			isLoading = false;
		}
	}
	// Quick action handlers using unified store
	async function analyzeSelectedEvidence() {
		if (selectedEvidenceIds.length === 0) return;
		isLoading = true;
		try {
			const prompt = selectedEvidenceIds.length === 1
				? `Please analyze evidence item ${selectedEvidenceIds[0]} and provide insights.`
				: `Please analyze the connections between evidence items: ${selectedEvidenceIds.join(', ')}`;
			await aiAssistant.sendMessage(caseId, prompt, selectedEvidenceIds, {
				useAcceleration: useAcceleration && accelerationStatus === 'ready',
				legalContext: 'Evidence analysis request'
			});
		} catch (error) {
			console.error('Failed to analyze evidence:', error);
		} finally {
			isLoading = false;
		}
	}
	async function suggestNextSteps() {
		isLoading = true;
		try {
			const prompt = 'Based on the current evidence, what should be the next steps in this investigation?';
			const response = await aiAssistant.sendMessage(caseId, prompt, selectedEvidenceIds, {
				useAcceleration: useAcceleration && accelerationStatus === 'ready',
				legalContext: 'Investigation planning'
			});
			// Trigger action suggestions in parent component
			ondispatch?.({
				type: 'suggestions',
				data: response.metadata?.suggestions || [];
			});
		} catch (error) {
			console.error('Failed to get suggestions:', error);
		} finally {
			isLoading = false;
		}
	}
	function handleKeydown(_event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
	}
	function formatTimestamp(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
	function handleInsightClick(insight: any) {
		if (insight.evidenceIds && insight.evidenceIds.length > 0) {
			ondispatch?.({ evidenceIds: insight.evidenceIds });
		}
	}
	function setContext(context: typeof currentContext) {
		currentContext = context;
	}
</script>
<div class="ai-assistant-panel" class:hidden={!isVisible}>
	<Card class="h-full flex flex-col">
		<CardHeader class="pb-3">
			<div class="flex items-center justify-between">
				<CardTitle class="flex items-center gap-2 text-lg">
					<Bot class="w-5 h-5 text-primary" />
					Legal AI Assistant
				</CardTitle>
				<div class="flex items-center gap-1">
					{#if isAssistantLoading}
						<Loader class="w-4 h-4 animate-spin text-primary" />
					{/if}
					{#if selectedEvidenceIds.length > 0}
						<span class="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
							{selectedEvidenceIds.length} selected
						</span>
					{/if}
					<!-- Acceleration Toggle -->
					<button
						class="acceleration-toggle {useAcceleration && accelerationStatus === 'ready' ? 'enabled' : ''} {accelerationStatus === 'initializing' ? 'initializing' : ''} {accelerationStatus === 'error' ? 'error' : ''}"
						onclick={() => {
							useAcceleration = !useAcceleratio;
							if (useAcceleration && accelerationStatus === 'disabled') {
								initializeAcceleration();
							}
						}}
					>
						<Zap class="w-3 h-3" />
						<span class="sr-only">Toggle GPU Acceleration</span>
					</button>
				</div>
			</div>
			<!-- Context Selector -->
			<div class="flex gap-1 mt-2">
				<Button
					size="sm"
					variant={currentContext === 'general' ? 'default' : 'outline'}
					onclick={() => setContext('general')}
					class="text-xs"
				>
					General
				</Button>
				<Button
					size="sm"
					variant={currentContext === 'analysis' ? 'default' : 'outline'}
					onclick={() => setContext('analysis')}
					class="text-xs"
				>
					Analysis
				</Button>
				<Button
					size="sm"
					variant={currentContext === 'connection' ? 'default' : 'outline'}
					onclick={() => setContext('connection')}
					class="text-xs"
				>
					Connections
				</Button>
				<Button
					size="sm"
					variant={currentContext === 'investigation' ? 'default' : 'outline'}
					onclick={() => setContext('investigation')}
					class="text-xs"
				>
					Next Steps
				</Button>
			</div>
		</CardHeader>
		<CardContent class="flex-1 flex flex-col gap-4 overflow-hidden">
			<!-- Messages Area -->
			<div class="flex-1 overflow-y-auto space-y-3 min-h-0">
				{#if messages.length === 0}
					<div class="text-center text-muted-foreground py-8">
						<Bot class="w-12 h-12 mx-auto mb-2 opacity-50" />
						<p class="text-sm">Start a conversation with the AI assistant</p>
						<p class="text-xs mt-1">Ask about evidence, get insights, or request analysis</p>
					</div>
				{:else}
					{#each messages as message}
						<AIChatMessage
							message={{
								role: message.role,
								content: message.content,
								timestamp: formatTimestamp(message.timestamp),
								references: message.evidenceIds?.map(id => ({ id, score: 1.0 })) || []
							}}
							showReferences={true}
						/>
						{#if message.evidenceIds && message.evidenceIds.length > 0}
							<div class="evidence-refs mt-2 ml-4">
								<span class="text-xs text-muted-foreground">Evidence References:</span>
								<div class="flex flex-wrap gap-1 mt-1">
									{#each message.evidenceIds as evidenceId}
										<button
											class="evidence-ref-btn text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
											onclick={() => ondispatch?.({ evidenceId })}
										>
											{evidenceId}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					{/each}
				{/if}
			</div>
			<!-- Quick Actions -->
			<div class="quick-actions">
				<div class="flex gap-2 mb-2">
					<Button
						size="sm"
						variant="ghost"
						onclick={analyzeSelectedEvidence}
						disabled={selectedEvidenceIds.length === 0 || isLoading}
						class="text-xs"
					>
						<FileText class="w-3 h-3 mr-1" />
						Analyze Selected
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onclick={suggestNextSteps}
						disabled={isLoading}
						class="text-xs"
					>
						<Search class="w-3 h-3 mr-1" />
						Next Steps
					</Button>
				</div>
			</div>
			<!-- AI Search Input Area -->
			<div class="input-area">
				<AISearchBar
					placeholder={`Ask about ${currentContext === 'general' ? 'the case' : currentContext}...`}
					userContext={{
						caseId,
						selectedEvidenceIds,
						context: currentContext;
					}}
					analyticsLog={(event) => console.log('AI Search Analytics:', event)}
					onsearch={async (query) => {
						userInput = query;
						await handleSendMessage();
					}}
				/>
			</div>
			<!-- Acceleration Results Panel -->
			{#if useAcceleration && lastAccelerationResults}
				<div class="acceleration-panel">
					<button
						class="acceleration-header"
						onclick={() => showSuggestions = !showSuggestions}
					>
						<Zap class="w-4 h-4" />
						<span>GPU Acceleration Results</span>
					</button>
					{#if showSuggestions}
						<div class="acceleration-content">
							<div class="performance-metrics">
								<div class="metric">
									<span class="metric-label">Processing Time:</span>
									<span class="metric-value">{lastAccelerationResults.processingMetrics.totalProcessingTime.toFixed(1)}ms</span>
								</div>
								<div class="metric">
									<span class="metric-label">Acceleration:</span>
									<span class="metric-value">{lastAccelerationResults.processingMetrics.accelerationUsed}</span>
								</div>
								<div class="metric">
									<span class="metric-label">Vectors:</span>
									<span class="metric-value">{lastAccelerationResults.processingMetrics.vectorsProcessed}</span>
								</div>
								<div class="metric">
									<span class="metric-label">Similarities:</span>
									<span class="metric-value">{lastAccelerationResults.similarities.length}</span>
								</div>
							</div>
							{#if lastAccelerationResults.recommendations.length > 0}
								<div class="recommendation-list">
									{#each lastAccelerationResults.recommendations.slice(0, 2) as rec}
										<div class="recommendation-item">
											<div class="rec-type">{rec.type}</div>
											<div class="rec-description">{rec.description}</div>
											<div class="rec-confidence">{(rec.confidence * 100).toFixed(1)}% confidence</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
			<!-- Insights Panel -->
			{#if showInsights && insights.length > 0}
				<div class="insights-panel">
					<button
						class="insights-header"
						onclick={() => showInsights = !showInsights}
					>
						<Lightbulb class="w-4 h-4" />
						<span>AI Insights ({insights.length})</span>
					</button>
					{#if showInsights}
						<div class="insights-content">
							{#each insights.slice(0, 3) as insight}
								<button
									class="insight-item"
									onclick={() => handleInsightClick(insight)}
								>
									<div class="insight-type">{insight.type}</div>
									<div class="insight-description">{insight.description}</div>
									<div class="insight-confidence">
										Confidence: {Math.round(insight.confidence * 100)}%
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
<style>
	.ai-assistant-panel {
		@apply w-full h-full;
	}
	/* Cleaned up - using AIChatMessage component styles */
	.quick-actions {
		@apply border-t pt-2;
	}
	.input-area {
		@apply border-t pt-2;
	}
	.acceleration-toggle {
		@apply p-1.5 rounded border hover:bg-muted transition-colors text-muted-foreground;
	}
	.acceleration-toggle.enabled {
		@apply bg-green-500/10 text-green-600 border-green-500/20;
	}
	.acceleration-toggle.initializing {
		@apply bg-yellow-500/10 text-yellow-600 border-yellow-500/20;
		animation: pulse 2s infinite;
	}
	.acceleration-toggle.error {
		@apply bg-red-500/10 text-red-600 border-red-500/20;
	}
	.acceleration-panel {
		@apply border-t pt-2;
	}
	.acceleration-header {
		@apply flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 transition-color;
	}
	.acceleration-content {
		@apply space-y-3 mt-2;
	}
	.performance-metrics {
		@apply grid grid-cols-2 gap-2 text-x;
	}
	.metric {
		@apply flex justify-between p-1.5 bg-green-50 rounded border border-green-200;
	}
	.metric-label {
		@apply text-muted-foreground;
	}
	.metric-value {
		@apply font-medium text-green-700;
	}
	.recommendation-list {
		@apply space-y-2;
	}
	.recommendation-item {
		@apply p-2 bg-blue-50 rounded border border-blue-200;
	}
	.rec-type {
		@apply text-xs font-medium text-blue-600 capitaliz;
	}
	.rec-description {
		@apply text-sm mt-1;
	}
	.rec-confidence {
		@apply text-xs text-blue-500 mt-1;
	}
	.insights-panel {
		@apply border-t pt-2;
	}
	.insights-header {
		@apply flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-color;
	}
	.insights-content {
		@apply space-y-2 mt-2;
	}
	.insight-item {
		@apply w-full text-left p-2 bg-muted/50 rounded border hover:bg-muted transition-color;
	}
	.insight-type {
		@apply text-xs font-medium text-primary capitaliz;
	}
	.insight-description {
		@apply text-sm mt-1;
	}
	.insight-confidence {
		@apply text-xs text-muted-foreground mt-1;
	}
	.hidden {
		@apply hidden;
	}
</style>