<!-- @migration-task Error while migrating Svelte code: `</CardContent>` attempted to close an element that was not open
https://svelte.dev/e/element_invalid_closing_tag -->
<!-- @migration-task Error while migrating Svelte code: `</CardContent>` attempted to close an element that was not open -->
<script lang="ts">
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
    data.documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      type: doc.type as LegalEvidenceItem['type'],
      priority: 'medium' as const,
      confidence: doc.processed ? 0.95 : 0.5,
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
      if (result.type === 'success' && result.data?.response) {
        ragResponse = result.data.response;
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
  <title>RAG Analysis - {data.caseData.title}</title>
</svelte:head>

<div class="container mx-auto p-6 space-y-6">
  <!-- Case Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-primary mb-2">
      RAG Analysis: {data.caseData.title}
    </h1>
    <p class="text-muted-foreground">
      Status: <span class="font-medium">{data.caseData.status}</span>
    </p>
  </div>

  <!-- RAG Query Interface -->
  <OrchestratedCard.Analysis>
    <Card.Header>
      <Card.Title>Legal Document Analysis</Card.Title>
      <Card.Description>
        Query case documents using advanced RAG (Retrieval-Augmented Generation)
        powered by legal AI models
      </Card.Description>
    </Card.Header>

  <Card.Content class="space-y-4">
      <!-- Query Form -->
      <form method="POST" action="?/query" use:enhance={handleRAGSubmit}>
        <div class="flex gap-3">
          <Input
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
            <div class="flex gap-4 text-sm text-muted-foreground">
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
                      <div class="text-muted-foreground mt-1">"{source.excerpt}"</div>
                    {/if}
                    <div class="text-xs text-muted-foreground mt-1">
                      Relevance: {formatConfidence(source.score || 0)}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </Card.Content>
  </OrchestratedCard.Analysis>

  <!-- Case Documents -->
  <OrchestratedCard.Evidence>
    <Card.Header>
      <div class="flex items-center justify-between">
        <div>
          <Card.Title>Case Documents ({evidenceItems.length})</Card.Title>
          <Card.Description>Documents available for RAG analysis</Card.Description>
        </div>
        <Button
          variant="outline"
          onclick={() => showDocuments = !showDocuments}
        >
          {showDocuments ? 'Hide' : 'Show'} Documents
        </Button>
      </div>
    </Card.Header>

    {#if showDocuments}
      <Card.Content>
        <div class="grid gap-3">
          {#each evidenceItems as evidence}
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div class="flex-1">
                <div class="font-medium">{evidence.title}</div>
                <div class="text-sm text-muted-foreground capitalize">
                  Type: {evidence.type}
                  Status: {evidence.metadata.processed ? 'Processed' : 'Processing...'}
                </div>
              </div>
              <div class="text-right text-sm">
                <div class={getConfidenceClass(evidence.confidence)}>
                  {formatConfidence(evidence.confidence)}
                </div>
                <div class="text-xs text-muted-foreground">
                  {new Date(evidence.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </Card.Content>
    {/if}
  </OrchestratedCard.Evidence>

  <!-- RAG History -->
  {#if data.ragHistory?.length > 0}
    <Card>
      <Card.Header>
        <Card.Title>Recent Analysis History</Card.Title>
        <Card.Description>Previous RAG queries for this case</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="space-y-3">
          {#each data.ragHistory.slice(0, 5) as history}
            <div class="p-3 border rounded-lg">
              <div class="font-medium text-sm mb-1">{history.query}</div>
              <div class="text-xs text-muted-foreground">
                {new Date(history.timestamp).toLocaleString()}
                {history.sources?.length || 0} sources referenced
              </div>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card>
  {/if}
</div>

<style>
  .confidence-very-high { @apply text-green-600 font-medium; }
  .confidence-high { @apply text-blue-600 font-medium; }
  .confidence-medium { @apply text-yellow-600 font-medium; }
  .confidence-low { @apply text-red-600 font-medium; }
</style>