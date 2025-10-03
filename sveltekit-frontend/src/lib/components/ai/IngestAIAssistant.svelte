<!-- @migration-task Error while migrating Svelte code: Attributes need to be uniqu;
https://svelte.dev/e/attribute_duplicate -->
<!-- @migration-task Error while migrating Svelte code: Attributes need to be unique -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  /**
   * Enhanced AI-Powered Document Ingest Assistant
   * Integrates with your existing AI agent store and production architecture
   * Uses Bits UI + Melt UI following your established component patterns
   */
  import { onMount } from 'svelte';
  import { writable, derived, get } from 'svelte/store';
  // Replaced typed UI components with native elements to avoid Svelte/TS typing issues.
  // Badge replaced with span - not available in enhanced-bits
  import Progress from '$lib/components/ui/progress/Progress.svelte';
  import Alert from '$lib/components/ui/alert/Alert.svelte';
  import AlertDescription from '$lib/components/ui/alert/AlertDescription.svelte';
  import Separator from '$lib/components/ui/separator/Separator.svelte';
  import Label from '$lib/components/ui/label/LabelCompat.svelte';
  // Your established store patterns
  import {
    aiAgentStore,
    isProcessing,
    systemHealth,
    performanceMetrics,
    currentConversation
  } from '$lib/stores/ai-agent';
  import { enhancedIngestService } from '$lib/services/enhanced-ingest-integration';
  // Component state following your patterns
  // Use Svelte 5 $state rune so updates are reactive (fixes non_reactive_update errors)
  let documentTitle = $state('');
  let documentContent = $state('');
  let caseId = $state('');
  let selectedDocumentType = $state('legal');
  let batchMode = false;
  let batchDocuments = writable([]);
  // Processing state
  let ingestResults = writable([] as any[]);
  let currentProgress = writable(0);
  let processingStatus = writable('idle');
  let errors = writable([] as any[]);
  // Svelte 5 rune: local boolean state for form eligibility
  let canIngest = $state(false);
  // Local copy of the AI session id (subscribe to store safely)
  let aiSessionId: string | undefined;
  let _aiUnsub: (() => void) | undefined;
  onMount(() => {
    _aiUnsub = aiAgentStore.subscribe((s: any) => {
      aiSessionId = s?.activeSessionId;
    });
    return () => _aiUnsub?.();
  });

  // Keep canIngest updated using $effect (runes-compatible reactive effect)
  $effect(() => {
    canIngest = $processingStatus === 'idle' && documentTitle.trim() !== '' && documentContent.trim() !== '';
  });
  const hasResults = derived(
    ingestResults,
    ($results) => $results.length > 0
  );
  // Document types following your legal AI patterns
  const documentTypes = [
    { value: 'legal', label: 'Legal Document', icon: '⚖️' },
    { value: 'evidence', label: 'Evidence', icon: '🔍' },
    { value: 'case', label: 'Case File', icon: '📁' },
    { value: 'contract', label: 'Contract', icon: '📜' },
    { value: 'precedent', label: 'Legal Precedent', icon: '📚' }
  ];
  // Enhanced ingest function with AI integration
  async function ingestDocument() {
    // Evaluate ingest eligibility directly (canIngest is a boolean from $derived)
    const can = ($processingStatus === 'idle' && documentTitle.trim() !== '' && documentContent.trim() !== '');
    if (!can) return;
    processingStatus.set('processing');
    currentProgress.set(10);
    try {
      const request = {
        title: documentTitle,
        content: documentContent,
        case_id: caseId || undefined,
        metadata: {
          document_type: selectedDocumentType,
          source: 'ai_assistant_ui',
          ai_enhanced: true,
          // Integrate with your AI agent session (read from subscribed store value)
          ai_session_id: aiSessionId,
        },
      } as any;
      currentProgress.set(30);
      // Use your enhanced ingest service
      const result = await enhancedIngestService.ingestDocument(request);
      currentProgress.set(70);
      // Generate AI summary using your existing chat system
      if ((result as any).success) {
        await generateAISummary((result as any).documentId, documentContent);
      }
      currentProgress.set(100);
      // Update results
      ingestResults.update(results => [...results, { ...(result as any), title: documentTitle, type: selectedDocumentType, timestamp: new Date() }]);
      // Clear form
      clearForm();
      processingStatus.set('completed');
      setTimeout(() => processingStatus.set('idle'), 2000);
    } catch (error) {
      console.error('Ingest failed:', error);
      errors.update(errs => [...errs, { id: Date.now(), message: (error as any)?.message || String(error), timestamp: new Date(), type: 'ingest_error' }]);
      processingStatus.set('error');
      setTimeout(() => processingStatus.set('idle'), 3000);
    }
  }
  // AI summary generation using your existing chat patterns
  async function generateAISummary(documentId: string, content: string) {
    try {
      const prompt = `Please provide a concise legal analysis summary of this document:\n\n${content.substring(0, 1000)}...`;
      // Use your existing AI agent for summary
      await aiAgentStore.sendMessage(prompt, { document_id: documentId, analysis_type: 'legal_summary', source: 'ingest_assistant' });
    } catch (error) {
      console.warn('AI summary generation failed:', error);
    }
  }
  // Batch processing following your batch patterns
  async function processBatch() {
    let documents: any[] = [];
    batchDocuments.subscribe(v => (documents = v))();
    if (documents.length === 0) return;
    processingStatus.set('batch_processing');
    currentProgress.set(0);
    try {
      const batchRequest = documents.map(doc => ({ title: doc.title, content: doc.content, case_id: doc.case_id, metadata: { document_type: doc.type || 'legal', batch_processing: true, source: 'ai_assistant_batch' } }));
      // Runtime-safe call: some service implementations may expose ingestBatch, others only ingestDocument.
      const svc: any = enhancedIngestService;
      let batchResult: any;
      if (typeof svc.ingestBatch === 'function') {
        // Preferred fast-path when service supports batch ingestion
        currentProgress.set(30);
        batchResult = await svc.ingestBatch(batchRequest);
        currentProgress.set(90);
      } else {
        // Fallback: call per-document ingestDocument in parallel and aggregate results
        currentProgress.set(20);
        const promises = batchRequest.map(req => {
          if (typeof svc.ingestDocument === 'function') {
            return svc.ingestDocument(req);
          }
          return Promise.reject(new Error('No ingest method available on enhancedIngestService'));
        });
        const settled = await Promise.allSettled(promises);
        const processed = settled.length;
        const successes = settled.filter(r => r.status === 'fulfilled').length;
        const successRate = processed > 0 ? (successes / processed) * 100 : 0;
        // Build a consistent batchResult shape to keep UI logic unchanged
        batchResult = {
          success: successes > 0,
          processed,
          successRate,
          details: settled.map((s, i) => ({ index: i, status: s.status, value: s.status === 'fulfilled' ? (s as PromiseFulfilledResult<any>).value : undefined, reason: s.status === 'rejected' ? (s as PromiseRejectedResult).reason : undefined }))
        };
        currentProgress.set(90);
      }

      currentProgress.set(100);
      // Update results with batch information
      ingestResults.update(results => [...results, { ...(batchResult as any), is_batch: true, timestamp: new Date() }]);
      batchDocuments.set([]);
      processingStatus.set('completed');
      setTimeout(() => processingStatus.set('idle'), 2000);
    } catch (error) {
      console.error('Batch processing failed:', error);
      errors.update(errs => [...errs, { id: Date.now(), message: `Batch processing failed: ${(error as any)?.message || String(error)}`, timestamp: new Date(), type: 'batch_error' }]);
      processingStatus.set('error');
      setTimeout(() => processingStatus.set('idle'), 3000);
    }
  }
  function clearForm() {
    documentTitle = '';
    documentContent = '';
    caseId = '';
  }
  function addToBatch() {
    if (!documentTitle.trim() || !documentContent.trim()) return;
    batchDocuments.update(docs => [...docs, { id: Date.now(), title: documentTitle, content: documentContent, case_id: caseId, type: selectedDocumentType }]);
    clearForm();
  }
  function removeFromBatch(id: number) {
    batchDocuments.update(docs => docs.filter(doc => doc.id !== id));
  }
  function dismissError(errorId: number) {
    errors.update(errs => errs.filter(err => err.id !== errorId));
  }
  $effect(() => {
    // Initialize AI agent connection following your patterns
    if (typeof aiAgentStore?.connect === 'function') {
      // call connect (may return a Promise) and handle rejections
      aiAgentStore.connect().catch((err) => console.error(err));
    }
  });
</script>
<!-- Component HTML following your UI patterns -->
<div class="w-full max-w-4xl mx-auto p-6 space-y-6">
  <!-- Header with system status -->
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="w-3 h-3 rounded-full {$systemHealth === 'healthy' ? 'bg-green-500' : $systemHealth === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}"></div>
      <h1 class="text-2xl font-bold">AI-Powered Document Ingest</h1>
      <span
        class={($systemHealth === 'healthy'
          ? 'bg-green-100 text-green-800 border-green-300'
          : $systemHealth === 'degraded'
          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
          : 'bg-red-100 text-red-800 border-red-300') + ' px-2 py-1 rounded text-xs font-medium border'}
      >
        {$systemHealth}
      </span>
    </div>
    <div class="flex items-center space-x-2">
      <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{$isProcessing ? 'Processing...' : 'Ready'}</span>
      {#if $performanceMetrics.totalRequests > 0}
        <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{$performanceMetrics.successRate.toFixed(1)}% Success</span>
      {/if}
    </div>
  </div>
  <!-- Error Display -->
  {#each $errors as error (error.id)}
    <Alert variant="error" class="mb-4">
      <AlertDescription class="flex items-center justify-between">
        <span>{error.message}</span>
        <!-- native button to avoid typed component event issues -->
        <button
          class="bits-btn px-2 py-1 text-sm bg-transparent hover:bg-gray-100 rounded"
          onclick={() => dismissError(error.id)}
          aria-label="Dismiss error"
        >✕</button>
      </AlertDescription>
    </Alert>
  {/each}
  <!-- Progress Indicator -->
  {#if $processingStatus !== 'idle'}
    <div class="nes-container">
      <div class="yorha-panel-content p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">
            {$processingStatus === 'processing' ? 'Processing Document...' :
             $processingStatus === 'batch_processing' ? 'Processing Batch...' :
             $processingStatus === 'completed' ? 'Completed Successfully!' :
             'Processing Failed'}
          </span>
          <span class="text-sm nes-text is-disabled">{$currentProgress}%</span>
        </div>
        <Progress value={$currentProgress} class="w-full" />
      </div>
    </div>
  {/if}
  <!-- Main Input Form -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="nes-container">
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary">Document Details</h3>
      </div>
      <div class="yorha-panel-content space-y-4">
        <div class="space-y-2">
          <Label for="title">Document Title</Label>
          <!-- native input to avoid component typing issues -->
          <input
            id="title"
            class="w-full border rounded px-3 py-2"
            bind:value={documentTitle}
            placeholder="Enter document title..."
            disabled={$isProcessing}
          />
        </div>
        <div class="space-y-2">
          <Label for="case-id">Case ID (Optional)</Label>
          <input
            id="case-id"
            class="w-full border rounded px-3 py-2"
            bind:value={caseId}
            placeholder="CASE-2024-001"
            disabled={$isProcessing}
          />
        </div>

        <div class="space-y-2">
          <Label>Document Type</Label>
          <div class="grid grid-cols-2 gap-2">
            {#each documentTypes as type}
              <!-- native button with conditional classes instead of `variant` prop -->
              <button
                class="nes-btn bits-btn justify-start flex items-center px-3 py-1 rounded text-sm
                  {selectedDocumentType === type.value ? 'bg-gray-900 text-white' : 'bg-white border'}"
                onclick={() => (selectedDocumentType = type.value)}
                disabled={$isProcessing}
                type="button"
              >
                <span class="mr-2">{type.icon}</span>
                {type.label}
              </button>
            {/each}
          </div>
        </div>

        <div class="space-y-2">
          <Label for="content">Document Content</Label>
          <textarea
            id="content"
            class="w-full border rounded px-3 py-2"
            bind:value={documentContent}
            placeholder="Paste or type document content here..."
            rows={8}
            disabled={$isProcessing}
          ></textarea>
        </div>
        <div class="flex space-x-2">
          <button
            class="bits-btn flex-1 px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            onclick={ingestDocument}
            disabled={!canIngest || $isProcessing}
            type="button"
          >
            {$isProcessing ? 'Processing...' : '🚀 Ingest Document'}
          </button>
          <button
            class="bits-btn px-3 py-2 rounded bg-transparent border disabled:opacity-50"
            onclick={addToBatch}
            disabled={!documentTitle.trim() || !documentContent.trim() || $isProcessing}
            type="button"
          >
            ➕ Add to Batch
          </button>
        </div>
      </div>
    </div>
    <!-- Batch Processing Panel -->
    <div class="nes-container">
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary flex items-center justify-between">
          Batch Processing
          {#if $batchDocuments.length > 0}
            <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700 border">
              {$batchDocuments.length} documents
            </span>
          {/if}
        </h3>
      </div>
      <div class="yorha-panel-content">
        {#if $batchDocuments.length === 0}
          <div class="text-center nes-text is-disabled py-8">
            <p>No documents in batch</p>
            <p class="text-sm">Add documents to process multiple files at once</p>
          </div>
        {:else}
          <div class="space-y-2 mb-4 max-h-40 overflow-y-auto">
            {#each $batchDocuments as doc (doc.id)}
              <div class="flex items-center justify-between p-2 bg-muted rounded">
                <div class="flex-1 truncate">
                  <div class="font-medium text-sm truncate">{doc.title}</div>
                  <div class="text-xs nes-text is-disabled">
                    {doc.type} • {doc.content.length} chars
                  </div>
                </div>
                <button
                  class="bits-btn px-2 py-1 text-sm bg-transparent hover:bg-gray-100 rounded"
                  onclick={() => removeFromBatch(doc.id)}
                  type="button"
                >✕</button>
              </div>
            {/each}
          </div>
          <div class="space-y-2">
            <button
              class="bits-btn w-full px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
              onclick={processBatch}
              disabled={$isProcessing}
              type="button"
            >
              {$processingStatus === 'batch_processing' ? 'Processing Batch...' : `🔥 Process ${$batchDocuments.length} Documents`}
            </button>
            <button
              class="bits-btn px-3 py-1 rounded bg-transparent border disabled:opacity-50"
              onclick={() => batchDocuments.set([])}
              disabled={$isProcessing}
              type="button"
            >
              Clear Batch
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
  <!-- Results Display -->
  {#if $hasResults}
    <div class="nes-container">
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary">Processing Results</h3>
      </div>
      <div class="yorha-panel-content">
        <div class="space-y-4">
          {#each $ingestResults as result ((result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).documentId || (result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).batchId)}
            <div class="border rounded-lg p-4">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <div class="font-medium">
                    {(result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).is_batch ? `Batch: ${(result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).processed} documents` : (result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).title}
                  </div>
                  <div class="text-sm nes-text is-disabled">
                    {(result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).is_batch ? `Success Rate: ${(result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).successRate}` : `Type: ${(result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).type}`}
                  </div>
                </div>
                <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">✓ Completed</span>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div class="nes-text is-disabled">Processing Time</div>
                  <div class="font-medium">
                    {(result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).processingTime ? `${(result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).processingTime.toFixed(1)}ms` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div class="nes-text is-disabled">Document ID</div>
                  <div class="font-mono text-xs">
                    {(result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).documentId?.substring(0, 8) || (result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).batchId?.substring(0, 8)}...
                  </div>
                </div>
                <div>
                  <div class="nes-text is-disabled">Embedding ID</div>
                  <div class="font-mono text-xs">
                    {(result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).embeddingId?.substring(0, 8)}...
                  </div>
                </div>
                <div>
                  <div class="nes-text is-disabled">Timestamp</div>
                  <div class="text-xs">
                    {(result as { success?: any; documentId?: any; batchId?: any; is_batch?: any; processed?: any; title?: any; successRate?: any; type?: any; processingTime?: any; embeddingId?: any; timestamp?: any }).timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
  <!-- AI Chat Integration (if active conversation exists) -->
  {#if $currentConversation.length > 0}
    <div class="nes-container">
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary">AI Analysis</h3>
      </div>
      <div class="yorha-panel-content">
        <div class="space-y-4 max-h-60 overflow-y-auto">
          {#each $currentConversation.slice(-2) as message}
            <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
              <div class="max-w-[80%] p-3 rounded-lg {message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}">
                <div class="text-sm">
                  {message.content}
                </div>
                {#if message.sources?.length > 0}
                  <div class="text-xs opacity-75 mt-2">
                    Sources: {message.sources.length} documents
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
<style>
  /* Custom styles following your YoRHa theme patterns */
  :global(.progress-bar) {
    background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);
  }
  /* Enhanced focus states following your accessibility patterns
     Use :focus-visible and restrict to interactive elements to avoid
     styling non-interactive elements and to reduce visual noise. */
  :global(a:focus-visible,
          button:focus-visible,
          input:focus-visible,
          textarea:focus-visible,
          select:focus-visible) {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
</style>