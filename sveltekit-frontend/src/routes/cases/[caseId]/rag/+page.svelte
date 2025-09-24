<script lang="ts">
  // Svelte 5 runes are auto-imported

  import type { PageData } from './$types.js';
  import type { ActionData } from './$types.js';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import {
    Button,
    Card,
    Input,
    type EvidenceItem,
    type AIAnalysis
  } from '$lib/components/ui/enhanced-bits';
  import {
    OrchestratedDialog,
    OrchestratedCard,
    OrchestratedButton,
    type LegalEvidenceItem,
    getConfidenceClass
  } from '$lib/components/ui/orchestrated';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  // Svelte 5 runes for reactive state
  let queryText = $state('');
  let isLoading = $state(false);
  let ragResponse = $state<any>(null);
  let showDocuments = $state(false);

  // Transform case documents to legal evidence format
  let evidenceItems = $derived<LegalEvidenceItem[]>(
    (data as { documents?: unknown; caseData?: unknown; processed?: unknown; ragHistory?: unknown }).documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      type: doc.type as LegalEvidenceItem['type'],
      priority: 'medium' as const,;
      confidence: doc.processed ? 0.95 : 0.5,;
      metadata: { processed: doc.processed },
      createdAt: new Date(doc.uploadedAt),
      updatedAt: new Date(doc.uploadedAt)
    }))
  );

  // Handle form submission with enhanced UX
  function handleRAGSubmit() {
    isLoading = true;
    ragResponse = null;
    return ({ result }) => {
      isLoading = false;
      if ((result as { type?: unknown; data?: unknown }).type === 'success' && (result as { type?: unknown; data?: unknown }).data?.response) {
        ragResponse = (result as { type?: unknown; data?: unknown }).data.response;
        queryText = ''; // Clear input after successful query
      }
    };
  }

  // Format confidence display
  function formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  // Format processing time
  function formatProcessingTime(ms: number): string {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  }
</script>

<svelte:head>
  <title>RAG Analysis - {(data as { documents?: unknown; caseData?: unknown; processed?: unknown; ragHistory?: unknown }).caseData.title}</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-6">
  <!-- Case Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-primary mb-2">
      RAG Analysis: {(data as { documents?: unknown; caseData?: unknown; processed?: unknown; ragHistory?: unknown }).caseData.title}
    </h1>
    <p class="nes-text is-disabled">
      Status: <span class="font-medium">{(data as { documents?: unknown; caseData?: unknown; processed?: unknown; ragHistory?: unknown }).caseData.status}</span>
    </p>
  </div>

  <!-- RAG Query Interface -->
  <OrchestratedCard.Analysis>
    <div.Header class="nes-container">
      <div.Title class="nes-container">Legal Document Analysis</div.Title>
      <div.Description class="nes-container">
        Query case documents using advanced RAG (Retrieval-Augmented Generation)
        powered by legal AI models
      </div.Description>
    </div.Header>

  <div.Content class="space-y-4 nes-container">
      <!-- Query Form -->
      <form method="POST" action="?/query" use:enhance={handleRAGSubmit}>
        <div class="flex gap-3">
          <Input;
            bind:value={queryText}
            name="query"
            placeholder="Ask questions about case documents..."
            class="flex-1"
            disabled={isLoading}
            required
          />
          <OrchestratedButton.AnalyzeEvidence
            type="submit"
            disabled={isLoading || !queryText.trim()}
            class="whitespace-nowrap"
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </OrchestratedButton.AnalyzeEvidence>
        </div>
      </form>

      <!-- Error Display -->
      {#if form?.error}
        <div class="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
          {form.error}
        </div>
      {/if}

      <!-- RAG Response -->
      {#if ragResponse}
        <div class="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div class="flex items-center justify-between">
            <h3 class="font-medium text-lg">Analysis Result</h3>
            <div class="flex gap-4 text-sm nes-text is-disabled">
              <span class={getConfidenceClass(ragResponse.confidence)}>
                Confidence: {formatConfidence(ragResponse.confidence)}
              </span>
              <span>
                Time: {formatProcessingTime(ragResponse.processingTime)}
              </span>
            </div>
          </div>

          <!-- Answer -->
          <div class="prose prose-sm max-w-none">
            <div class="whitespace-pre-wrap">{ragResponse.answer}</div>
          </div>

          <!-- Sources -->
          {#if ragResponse.sources?.length > 0}
            <div class="mt-4">
              <h4 class="font-medium mb-2">Sources Referenced:</h4>
              <div class="grid gap-2">
                {#each ragResponse.sources as source}
                  <div class="p-2 bg-background border rounded text-sm">
                    <div class="font-medium">{source.title || `Document ${source.id}`}</div>
                    {#if source.excerpt}
                      <div class="nes-text is-disabled mt-1">"{source.excerpt}"</div>
                    {/if}
                    <div class="text-xs nes-text is-disabled mt-1">
                      Relevance: {formatConfidence(source.score || 0)}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div.Content>
  </OrchestratedCard.Analysis>

  <!-- Case Documents -->
  <OrchestratedCard.Evidence>
    <div.Header class="nes-container">
      <div class="flex items-center justify-between">
        <div>
          <div.Title class="nes-container">Case Documents ({evidenceItems.length})</div.Title>
          <div.Description class="nes-container">Documents available for RAG analysis</div.Description>
        </div>
        <button class="nes-btn"
          variant="ghost"
          onclick={() => showDocuments = !showDocuments}
        >
          {showDocuments ? 'Hide' : 'Show'} Documents
        </button>
      </div>
    </div.Header>

    {#if showDocuments}
      <div.Content class="nes-container">
        <div class="grid gap-3">
          {#each evidenceItems as evidence}
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div class="flex-1">
                <div class="font-medium">{evidence.title}</div>
                <div class="text-sm nes-text is-disabled capitalize">
                  Type: {evidence.type}
                  Status: {evidence.metadata.processed ? 'Processed' : 'Processing...'}
                </div>
              </div>
              <div class="text-right text-sm">
                <div class={getConfidenceClass(evidence.confidence)}>
                  {formatConfidence(evidence.confidence)}
                </div>
                <div class="text-xs nes-text is-disabled">
                  {new Date(evidence.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div.Content>
    {/if}
  </OrchestratedCard.Evidence>

  <!-- RAG History -->
  {#if (data as { documents?: unknown; caseData?: unknown; processed?: unknown; ragHistory?: unknown }).ragHistory?.length > 0}
    <div class="nes-container">
      <div.Header class="nes-container">
        <div.Title class="nes-container">Recent Analysis History</div.Title>
        <div.Description class="nes-container">Previous RAG queries for this case</div.Description>
      </div.Header>
      <div.Content class="nes-container">
        <div class="space-y-3">
          {#each (data as { documents?: unknown; caseData?: unknown; processed?: unknown; ragHistory?: unknown }).ragHistory.slice(0, 5) as history}
            <div class="p-3 border rounded-lg">
              <div class="font-medium text-sm mb-1">{history.query}</div>
              <div class="text-xs nes-text is-disabled">
                {new Date(history.timestamp).toLocaleString()}
                {history.sources?.length || 0} sources referenced
              </div>
            </div>
          {/each}
        </div>
      </div.Content>
    </div>
  {/if}
</div>

<style>
  .confidence-very-high { @apply text-green-600 font-medium; }
  .confidence-high { @apply text-blue-600 font-medium; }
  .confidence-medium { @apply text-yellow-600 font-medium; }
  .confidence-low { @apply text-red-600 font-medium; }
</style>