<script lang="ts">
  // Svelte 5 runes are auto-imported
  // Updated to use bits-ui components
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select'; // Corrected import for bits-ui Select components
  import { Input } from '$lib/components/ui/input'; // Added import
  import { Label } from '$lib/components/ui/label'; // Added import
  import { Textarea } from '$lib/components/ui/textarea'; // Added import
  import * as Card from '$lib/components/ui/card'; // Added import
  import { Loader2 } from 'lucide-svelte'; // Added import for Loader2 icon
  import { onMount } from "svelte";
  // Enhanced AI Types
  interface DocumentRequest {
    content: string;
    document_type: string;
    practice_area?: string;
    jurisdiction: string;
    metadata?: { [key: string]: any };
    use_gpu?: boolean;
  }
  interface DocumentResponse {
    success: boolean;
    message: string;
    processed_content?: string;
    summary?: string;
    keywords?: string[];
    legal_entities?: LegalEntity[];
    sentiment?: number;
    confidence?: number;
    processing_time?: string;
    cached_result?: boolean;
  }
  interface LegalEntity {
    name: string;
    type: string;
    confidence: number;
    start_pos: number;
    end_pos: number;
  }
  interface VectorSearchRequest {
    query: string;
    limit?: number;
    filters?: { [key: string]: any }; // Added semicolon
    use_gpu?: boolean;
    model?: string;
  }
  interface VectorSearchResponse {
    results: VectorResult[];
    total: number;
    query: string;
    took: string;
  }
  interface VectorResult {
    id: string;
    content: string;
    score: number;
    metadata: { [key: string]: any }
  }

  // Define ServiceStatus interface
  interface ServiceStatus {
    healthy: boolean;
    loading: boolean;
    services: Record<string, string>;
    version: string;
    config: { [key: string]: any };
  }

  // Component state
  let serviceStatus: ServiceStatus = $state({ // Explicitly type serviceStatus
    healthy: false,
    loading: true,
    services: {},
    version: "",
    config: {},
  });
  let documentContent = $state("");
  let selectedDocumentType = $state("contract");
  let selectedJurisdiction = $state("US");
  let selectedPracticeArea = $state("commercial");
  let useGPU = $state(true);
  let processing = $state(false);
  let processResult: DocumentResponse | null = $state(null);
  let searchQuery = $state("");
  let searchLimit = $state(10);
  let searching = $state(false);
  let searchResults: VectorSearchResponse | null = $state(null);
  let showProcessDialog = $state(false);
  let showSearchDialog = $state(false);
  // Enhanced configuration
  // Enhanced configuration
  const API_BASE = "/api"; // Use SvelteKit API routes
  const documentTypes = [
    { value: "contract", label: "Contract" },
    { value: "litigation", label: "Litigation" },
    { value: "patent", label: "Patent" },
    { value: "regulatory", label: "Regulatory" },
    { value: "general", label: "General Legal" },
  ];
  const jurisdictions = [
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "UK", label: "United Kingdom" },
    { value: "EU", label: "European Union" },
    { value: "INTL", label: "International" },
  ];
  const practiceAreas = [
    { value: "commercial", label: "Commercial Law" },
    { value: "ip", label: "Intellectual Property" },
    { value: "constitutional", label: "Constitutional Law" },
    { value: "criminal", label: "Criminal Law" },
    { value: "corporate", label: "Corporate Law" },
    { value: "employment", label: "Employment Law" },
  ];
  // Enhanced service functions
  async function checkServiceHealth() {
    try {
      serviceStatus.loading = true;
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        const health = await response.json();
        serviceStatus = {
          healthy: true,
          loading: false,
          services: health.services || {},
          version: health.version || "",
          config: health.config || {},
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Health check failed:", error);
      serviceStatus = {
        healthy: false,
        loading: false,
        services: {},
        version: "",
        config: {},
      }
    }
  }
  async function processDocument() {
    if (!documentContent.trim()) {
      alert("Please enter document content");
      return;
    }
    try {
      processing = true;
      processResult = null;
      const request: DocumentRequest = {
        content: documentContent,
        document_type: selectedDocumentType,
        practice_area: selectedPracticeArea,
        jurisdiction: selectedJurisdiction,
        use_gpu: useGPU,
        metadata: {
          timestamp: new Date().toISOString(),
          user_id: "demo-user",
          session_id: "demo-session",
        },
      }
      const response = await fetch(`${API_BASE}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error("Document processing failed");
      processResult = await response.json();
    } catch (error) {
      console.error("Document processing error:", error);
      processResult = { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    } finally {
      processing = false;
    }
    showProcessDialog = true;
  }
  async function performVectorSearch() {
    if (!searchQuery.trim()) {
      alert("Please enter a search query");
      return;
    }
    try {
      searching = true;
      searchResults = null;
      const request: VectorSearchRequest = {
        query: searchQuery, // Added comma
        limit: searchLimit, // Added comma
        use_gpu: useGPU,
        model: "gemma3-legal",
        filters: {
          jurisdiction: selectedJurisdiction, // Added comma
          practice_area: selectedPracticeArea,
        },
      }
      const response = await fetch(`${API_BASE}/vector-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) { // Simplified type assertion
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      searchResults = await response.json(); // Simplified type assertion
      showSearchDialog = true;
    } catch (error) {
      console.error("Vector search failed:", error);
      alert(`Search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      searching = false;
    }
  }
  function getSentimentColor(sentiment: number): string {
    if (sentiment > 0.7) return "text-green-600";
    if (sentiment > 0.5) return "text-blue-600";
    if (sentiment > 0.3) return "text-yellow-600";
    return "text-red-600";
  }
  function getSentimentLabel(sentiment: number): string {
    if (sentiment > 0.7) return "Positive";
    if (sentiment > 0.5) return "Neutral-Positive";
    if (sentiment > 0.3) return "Neutral-Negative";
    return "Negative";
  }
  $effect(() => {
    checkServiceHealth();
    // Refresh health status every 30 seconds
    const interval = setInterval(checkServiceHealth, 30000);
    return () => clearInterval(interval);
  });
</script>
<!-- Enhanced Legal AI Interface -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <header class="mb-8">
      <h1 class="text-4xl font-bold text-slate-800 mb-2">
        🏛️ Enhanced Legal AI System
      </h1>
      <p class="text-slate-600 text-lg">
        Gemma3-Legal GGUF • NVIDIA CUDA • Redis-Native • Advanced RAG
      </p>
      <!-- Service Status -->
      <div
        class="mt-4 p-4 rounded-lg border-2 {serviceStatus.healthy
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'}"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-3 h-3 rounded-full {serviceStatus.healthy
                ? 'bg-green-500'
                : 'bg-red-500'}"
            ></div>
            <span
              class="font-semibold {serviceStatus.healthy
                ? 'text-green-800'
                : 'text-red-800'}"
            >
              {serviceStatus.healthy ? "System Online" : "System Offline"}
            </span>
            {#if serviceStatus.version}
              <span class="text-sm text-slate-600"
                >v{serviceStatus.version}</span
              >
            {/if}
          </div>
          {#if serviceStatus.healthy}
            <div class="flex gap-4 text-sm">
              <span class="text-slate-600">
                Redis: <span
                  class="font-mono {serviceStatus.services.redis === 'connected'
                    ? 'text-green-600'
                    : 'text-red-600'}"
                >
                  {serviceStatus.services.redis || "unknown"}
                </span>
              </span>
              <span class="text-slate-600">
                GPU: <span
                  class="font-mono {serviceStatus.services.gpu === 'true'
                    ? 'text-green-600'
                    : 'text-blue-600'}"
                >
                  {serviceStatus.services.gpu === "true"
                    ? "enabled"
                    : "disabled"}
                </span>
              </span>
            </div>
          {/if}
        </div>
      </div>
    </header>
    <!-- Main Interface -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Document Processing -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h2
          class="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2"
        >
          📄 Document Processing
        </h2>
        <!-- Configuration -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <Select.Root bind:value={selectedDocumentType}>
            <Select.Trigger class="w-full mt-1">
              <Select.Value placeholder="Select a document type" />
            </Select.Trigger>
            <Select.Content>
              {#each documentTypes as type}
                <Select.Item value={type.value}>{type.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          <Select.Root bind:value={selectedJurisdiction}>
            <Select.Trigger class="w-full mt-1">
              <Select.Value placeholder="Select jurisdiction" />
            </Select.Trigger>
            <Select.Content>
              {#each jurisdictions as jurisdiction}
                <Select.Item value={jurisdiction.value}>{jurisdiction.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <Select.Root bind:value={selectedPracticeArea}>
            <Select.Trigger class="w-full mt-1">
              <Select.Value placeholder="Select practice area" />
            </Select.Trigger>
            <Select.Content>
              {#each practiceAreas as area}
                <Select.Item value={area.value}>{area.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="use-gpu" bind:checked={useGPU} class="h-4 w-4" />
            <Label for="use-gpu">Use GPU Acceleration</Label>
          </div>
        </div>
        <!-- Document Input -->
        <div>
          <Label for="document-content">Document Content</Label>
          <Textarea
            id="document-content"
            bind:value={documentContent}
            placeholder="Paste your legal document here..."
            rows={8}
            class="mt-1"
          />
        </div>
        <!-- Process Button -->
        <Button
          onclick={processDocument}
          disabled={processing || !serviceStatus.healthy}
          class="w-full mt-4"
        >
          {#if processing}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Processing...
          {:else}
            Process Document
          {/if}
        </Button>
      </div>
      <!-- Vector Search -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h2
          class="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2"
        >
          🔍 Vector Search
        </h2>
        <!-- Search Configuration -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label for="search-query">Search Query</Label>
            <Input
              id="search-query"
              bind:value={searchQuery}
              placeholder="e.g., 'breach of contract in software licensing'"
              class="mt-1"
            />
          </div>
          <div>
            <Label for="search-limit">Result Limit</Label>
            <Input
              id="search-limit"
              type="number"
              bind:value={searchLimit}
              min={1}
              max={50}
              class="mt-1"
            />
          </div>
        </div>
        <!-- Search Button -->
        <Button
          onclick={performVectorSearch}
          disabled={searching || !serviceStatus.healthy}
          class="w-full mt-4"
        >
          {#if searching}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Searching...
          {:else}
            Perform Vector Search
          {/if}
        </Button>
      </div>
    </div>
  </div>
</div>
<!-- Process Results Dialog -->
<Dialog.Root bind:open={showProcessDialog}>
  <Dialog.Content class="sm:max-w-[600px]">
    <Dialog.Header>
      <Dialog.Title>Document Processing Results</Dialog.Title>
      <Dialog.Description>
        Detailed analysis of your legal document.
      </Dialog.Description>
    </Dialog.Header>
    {#if processResult}
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">Success:</Label>
          <span class="col-span-3">{processResult.success ? 'Yes' : 'No'}</span>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">Message:</Label>
          <span class="col-span-3">{processResult.message}</span>
        </div>
        {#if processResult.summary}
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">Summary:</Label>
            <span class="col-span-3 text-sm">{processResult.summary}</span>
          </div>
        {/if}
        {#if processResult.keywords && processResult.keywords.length > 0}
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">Keywords:</Label>
            <span class="col-span-3">{processResult.keywords.join(', ')}</span>
          </div>
        {/if}
        {#if processResult.legal_entities && processResult.legal_entities.length > 0}
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">Entities:</Label>
            <div class="col-span-3">
              {#each processResult.legal_entities as entity}
                <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">
                  {entity.name} ({entity.type})
                </span>
              {/each}
            </div>
          </div>
        {/if}
        {#if processResult.sentiment !== undefined}
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">Sentiment:</Label>
            <span class="col-span-3">{getSentimentLabel(processResult.sentiment)} ({processResult.sentiment.toFixed(2)})</span>
          </div>
        {/if}
        {#if processResult.confidence !== undefined}
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">Confidence:</Label>
            <span class="col-span-3">{(processResult.confidence * 100).toFixed(2)}%</span>
          </div>
        {/if}
        {#if processResult.processing_time}
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">Time:</Label>
            <span class="col-span-3">{processResult.processing_time}</span>
          </div>
        {/if}
        {#if processResult.cached_result !== undefined}
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">Cached:</Label>
            <span class="col-span-3">{processResult.cached_result ? 'Yes' : 'No'}</span>
          </div>
        {/if}
      </div>
    {:else}
      <p>No results to display.</p>
    {/if}
    <Dialog.Footer>
      <Button on:click={() => (showProcessDialog = false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
<!-- Search Results Dialog -->
<Dialog.Root bind:open={showSearchDialog}>
  <Dialog.Content class="sm:max-w-[700px]">
    <Dialog.Header>
      <Dialog.Title>Vector Search Results</Dialog.Title>
      <Dialog.Description>
        Documents and cases semantically similar to your query.
      </Dialog.Description>
    </Dialog.Header>
    {#if searchResults && searchResults.results.length > 0}
      <div class="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
        <p class="text-sm text-muted-foreground">
          Found {searchResults.total} results for "{searchResults.query}" in {searchResults.took}.
        </p>
        {#each searchResults.results as result}
          <Card.Root class="border-l-4 border-blue-500 p-3">
            <Card.Title class="text-lg">{result.metadata.title || 'Untitled Document'}</Card.Title>
            <Card.Description class="text-sm text-muted-foreground">
              Score: {(result.score * 100).toFixed(2)}% | ID: {result.id}
            </Card.Description>
            <p class="mt-2 text-sm line-clamp-3">{result.content}</p>
            {#if result.metadata.source}
              <p class="text-xs text-gray-500 mt-1">Source: {result.metadata.source}</p>
            {/if}
            <div class="flex flex-wrap gap-2 text-xs mt-2">
              {#each Object.entries(result.metadata) as [key, value]}
                <span class="px-2 py-1 bg-slate-100 text-slate-700 rounded">
                  {key}: {value}
                </span>
              {/each}
            </div>
          </Card.Root>
        {/each}
      </div>
    {:else if searchResults && searchResults.results.length === 0}
      <p class="py-4 text-center text-muted-foreground">No similar documents found for "{searchResults.query}".</p>
    {:else}
      <p class="py-4 text-center text-muted-foreground">Enter a query to see search results.</p>
    {/if}
    <Dialog.Footer>
      <Button on:click={() => (showSearchDialog = false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
<style>
  /* UnoCSS will handle most styling, but we can add custom styles here if needed */
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
<Dialog.Root open={showSearchDialog} openchange={(open) => showSearchDialog = open}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 bg-black/50 z-40" />
    <Dialog.Content
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 max-w-4xl max-h-[80vh] overflow-y-auto z-50"
    >
      {#if searchResults}
        <Dialog.Title class="text-2xl font-bold text-slate-800 mb-4">
          🔍 Vector Search Results
        </Dialog.Title>
        <div class="mb-4 text-sm text-slate-600">
          Found {searchResults.total} results for "{searchResults.query}" in {searchResults.took}
        </div>
        <div class="space-y-4">
          {#each searchResults.results as result}
            <div
              class="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
            >
              <div class="flex justify-between items-start mb-2">
                <span class="font-medium text-slate-800">{(result as { id?: unknown; score?: unknown; content?: unknown; metadata?: unknown }).id}</span>
                <span class="text-sm font-semibold text-green-600">
                  {((result as { id?: unknown; score?: unknown; content?: unknown; metadata?: unknown }).score * 100).toFixed(1)}% match
                </span>
              </div>
              <p class="text-slate-600 mb-3">{(result as { id?: unknown; score?: unknown; content?: unknown; metadata?: unknown }).content}</p>
              <div class="flex flex-wrap gap-2 text-xs">
                {#each Object.entries(result.metadata) as [key, value]} <!-- Corrected syntax: Object.entries(result.metadata) -->
                  <span class="px-2 py-1 bg-slate-100 text-slate-700 rounded">
                    {key}: {value}
                  </span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
      <Dialog.Close
        class="mt-6 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
      >
        Close
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
<style>
  /* UnoCSS will handle most styling, but we can add custom styles here if needed */
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
