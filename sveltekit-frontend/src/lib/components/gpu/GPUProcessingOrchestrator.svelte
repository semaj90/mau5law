<!--
  GPU Processing Orchestrator - XState-powered document processing interface
  Manages concurrent GPU processing with real-time monitoring for Legal AI Platform
-->

<script lang="ts">
</script>
  import { onMount, onDestroy } from 'svelte';
  import { createGPUProcessingActor, type DocumentInput, type ProcessingResult } from '$lib/state/gpu-processing-machine';
  import { fade, fly } from 'svelte/transition';

  // Props
  export let documents: DocumentInput[] = [];
  export let autoStart: boolean = false;
  export let maxConcurrent: number = 5;

  // XState actor
  const gpuActor = createGPUProcessingActor();
  
  // Reactive state
  let state = $state(gpuActor.getSnapshot());
  let isProcessing = $derived(state.matches('processing'));
  let isPaused = $derived(state.matches('paused'));
  let processingQueue = $derived(state.context.processingQueue);
  let activeProcessing = $derived(state.context.activeProcessing);
  let completedDocuments = $derived(state.context.completedDocuments);
  let errorDocuments = $derived(state.context.errorDocuments);
  let serviceHealth = $derived(state.context.serviceHealth);
  let metrics = $derived(state.context.metrics);

  // UI state
  let selectedTab = $state('queue');
  let showDetails = $state(false);
  let newDocumentContent = $state('');
  let newDocumentTitle = $state('');
  let processType = $state('full');
  let priority = $state(5);

  // Start the actor
  onMount(() => {
    gpuActor.start();
    
    // Subscribe to state changes
    const subscription = gpuActor.subscribe((snapshot) => {
      state = snapshot;
    });

    // Auto-start processing if enabled
    if (autoStart && documents.length > 0) {
      gpuActor.send({ type: 'BATCH_PROCESS', documents });
    }

    // Periodic health checks
    const healthCheckInterval = setInterval(() => {
      gpuActor.send({ type: 'SERVICE_HEALTH_CHECK' });
    }, 30000); // Every 30 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(healthCheckInterval);
    };
  });

  onDestroy(() => {
    gpuActor.stop();
  });

  // Action handlers
  function addDocument() {
    if (!newDocumentContent.trim()) return;

    const document: DocumentInput = {
      documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: newDocumentContent,
      title: newDocumentTitle || undefined,
      options: {
        processType: processType as any,
        priority,
        timeout: 30000,
        retries: 3,
        batchSize: 1
      }
    };

    gpuActor.send({ type: 'PROCESS_DOCUMENT', ...document });
    
    // Clear form
    newDocumentContent = '';
    newDocumentTitle = '';
  }

  function processBatch() {
    if (documents.length === 0) return;
    gpuActor.send({ type: 'BATCH_PROCESS', documents });
  }

  function pauseProcessing() {
    gpuActor.send({ type: 'PAUSE_PROCESSING' });
  }

  function resumeProcessing() {
    gpuActor.send({ type: 'RESUME_PROCESSING' });
  }

  function clearQueue() {
    gpuActor.send({ type: 'CLEAR_QUEUE' });
  }

  function retryFailed() {
    gpuActor.send({ type: 'RETRY_FAILED' });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'healthy': return '#28a745';
      case 'degraded': return '#ffc107';
      case 'offline': return '#dc3545';
      default: return '#6c757d';
    }
  }
</script>

<div class="gpu-orchestrator">
  <!-- Header -->
  <div class="orchestrator-header">
    <h2>🚀 GPU Processing Orchestrator</h2>
    <div class="status-indicators">
      <div class="status-item">
        <span class="status-dot" style="background-color: {getStatusColor(serviceHealth.gpu)}"></span>
        GPU: {serviceHealth.gpu}
      </div>
      <div class="status-item">
        <span class="status-dot" style="background-color: {getStatusColor(serviceHealth.webgpu)}"></span>
        WebGPU: {serviceHealth.webgpu}
      </div>
      <div class="status-item">
        <span class="status-dot" style="background-color: {getStatusColor(serviceHealth.vectorDb)}"></span>
        Vector DB: {serviceHealth.vectorDb}
      </div>
    </div>
  </div>

  <!-- Metrics Dashboard -->
  <div class="metrics-dashboard">
    <div class="metric-card">
      <h3>Queue</h3>
      <div class="metric-value">{metrics.queueLength}</div>
      <div class="metric-label">Documents</div>
    </div>
    <div class="metric-card">
      <h3>Processing</h3>
      <div class="metric-value">{metrics.concurrentJobs}</div>
      <div class="metric-label">Active Jobs</div>
    </div>
    <div class="metric-card">
      <h3>Success Rate</h3>
      <div class="metric-value">{metrics.successRate.toFixed(1)}%</div>
      <div class="metric-label">Completion</div>
    </div>
    <div class="metric-card">
      <h3>GPU Usage</h3>
      <div class="metric-value">{metrics.gpuUtilization.toFixed(0)}%</div>
      <div class="metric-label">Utilization</div>
    </div>
  </div>

  <!-- Controls -->
  <div class="control-panel">
    <div class="control-group">
      <button 
        class="btn btn-primary" 
        onclick={processBatch}
        disabled={documents.length === 0}
      >
        🚀 Start Batch Processing
      </button>
      
      {#if isProcessing}
        <button class="btn btn-warning" onclick={pauseProcessing}>
          ⏸️ Pause
        </button>
      {/if}
      
      {#if isPaused}
        <button class="btn btn-success" onclick={resumeProcessing}>
          ▶️ Resume
        </button>
      {/if}
      
      <button class="btn btn-danger" onclick={clearQueue}>
        🗑️ Clear Queue
      </button>
      
      {#if errorDocuments.length > 0}
        <button class="btn btn-info" onclick={retryFailed}>
          🔄 Retry Failed ({errorDocuments.length})
        </button>
      {/if}
    </div>
  </div>

  <!-- Add Document Form -->
  <div class="add-document-form">
    <h3>📄 Add Legal Document</h3>
    <div class="form-group">
      <input 
        type="text" 
        bind:value={newDocumentTitle}
        placeholder="Document title (optional)"
        class="form-input"
      />
    </div>
    <div class="form-group">
      <textarea 
        bind:value={newDocumentContent}
        placeholder="Document content..."
        class="form-textarea"
        rows="4"
      ></textarea>
    </div>
    <div class="form-row">
      <select bind:value={processType} class="form-select">
        <option value="full">Full Processing</option>
        <option value="extract">Text Extraction</option>
        <option value="analyze">Legal Analysis</option>
        <option value="vectorize">Vectorization Only</option>
      </select>
      <input 
        type="range" 
        bind:value={priority}
        min="1" 
        max="10" 
        class="priority-slider"
      />
      <span class="priority-label">Priority: {priority}</span>
    </div>
    <button 
      class="btn btn-primary" 
      onclick={addDocument}
      disabled={!newDocumentContent.trim()}
    >
      ➕ Add to Queue
    </button>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button 
      class="tab {selectedTab === 'queue' ? 'active' : ''}"
      onclick={() => selectedTab = 'queue'}
    >
      📋 Queue ({processingQueue.length})
    </button>
    <button 
      class="tab {selectedTab === 'active' ? 'active' : ''}"
      onclick={() => selectedTab = 'active'}
    >
      ⚙️ Processing ({activeProcessing.size})
    </button>
    <button 
      class="tab {selectedTab === 'completed' ? 'active' : ''}"
      onclick={() => selectedTab = 'completed'}
    >
      ✅ Completed ({completedDocuments.length})
    </button>
    <button 
      class="tab {selectedTab === 'errors' ? 'active' : ''}"
      onclick={() => selectedTab = 'errors'}
    >
      ❌ Errors ({errorDocuments.length})
    </button>
  </div>

  <!-- Tab Content -->
  <div class="tab-content">
    {#if selectedTab === 'queue'}
      <div class="document-list">
        {#each processingQueue as doc, i (doc.documentId)}
          <div class="document-item" in:fade={{ duration: 300 }}>
            <div class="document-info">
              <h4>{doc.title || `Document ${i + 1}`}</h4>
              <p class="document-preview">{doc.content.substring(0, 100)}...</p>
              <div class="document-meta">
                Type: {doc.options?.processType} | Priority: {doc.options?.priority}
              </div>
            </div>
            <div class="document-status">
              <span class="status-badge queued">Queued</span>
            </div>
          </div>
        {/each}
        {#if processingQueue.length === 0}
          <div class="empty-state">
            📭 No documents in queue
          </div>
        {/if}
      </div>
    {/if}

    {#if selectedTab === 'active'}
      <div class="document-list">
        {#each Array.from(activeProcessing.values()) as doc (doc.documentId)}
          <div class="document-item processing" in:fly={{ x: -20, duration: 300 }}>
            <div class="document-info">
              <h4>{doc.title || 'Processing Document'}</h4>
              <p class="document-preview">{doc.content.substring(0, 100)}...</p>
              <div class="processing-indicator">
                <div class="spinner"></div>
                Processing on GPU...
              </div>
            </div>
            <div class="document-status">
              <span class="status-badge processing">Processing</span>
            </div>
          </div>
        {/each}
        {#if activeProcessing.size === 0}
          <div class="empty-state">
            🔄 No active processing jobs
          </div>
        {/if}
      </div>
    {/if}

    {#if selectedTab === 'completed'}
      <div class="document-list">
        {#each completedDocuments as result (result.documentId)}
          <div class="document-item completed" in:fade={{ duration: 300 }}>
            <div class="document-info">
              <h4>Document Completed</h4>
              <div class="result-summary">
                ✅ Processed in {result.processingTime}ms
                {#if result.result?.extractedText}
                  <br/>📄 Extracted {result.result.extractedText.length} characters
                {/if}
                {#if result.result?.embeddings}
                  <br/>🔢 Generated {result.result.embeddings.length} embeddings
                {/if}
              </div>
              <div class="timestamp">
                Completed: {result.timestamp.toLocaleString()}
              </div>
            </div>
            <div class="document-status">
              <span class="status-badge completed">Completed</span>
            </div>
          </div>
        {/each}
        {#if completedDocuments.length === 0}
          <div class="empty-state">
            📋 No completed documents
          </div>
        {/if}
      </div>
    {/if}

    {#if selectedTab === 'errors'}
      <div class="document-list">
        {#each errorDocuments as result (result.documentId)}
          <div class="document-item error" in:fade={{ duration: 300 }}>
            <div class="document-info">
              <h4>Processing Failed</h4>
              <p class="error-message">❌ {result.error}</p>
              <div class="timestamp">
                Failed: {result.timestamp.toLocaleString()}
              </div>
            </div>
            <div class="document-status">
              <span class="status-badge error">Failed</span>
            </div>
          </div>
        {/each}
        {#if errorDocuments.length === 0}
          <div class="empty-state">
            🎉 No processing errors
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .gpu-orchestrator {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }

  .orchestrator-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #007bff;
  }

  .orchestrator-header h2 {
    margin: 0;
    color: #333;
    font-size: 1.8rem;
  }

  .status-indicators {
    display: flex;
    gap: 1rem;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #666;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: block;
  }

  .metrics-dashboard {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .metric-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .metric-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.25rem;
  }

  .metric-label {
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .control-panel {
    margin-bottom: 2rem;
  }

  .control-group {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary { background: #007bff; color: white; }
  .btn-primary:hover:not(:disabled) { background: #0056b3; }
  .btn-warning { background: #ffc107; color: #212529; }
  .btn-warning:hover:not(:disabled) { background: #e0a800; }
  .btn-success { background: #28a745; color: white; }
  .btn-success:hover:not(:disabled) { background: #1e7e34; }
  .btn-danger { background: #dc3545; color: white; }
  .btn-danger:hover:not(:disabled) { background: #c82333; }
  .btn-info { background: #17a2b8; color: white; }
  .btn-info:hover:not(:disabled) { background: #138496; }

  .add-document-form {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .add-document-form h3 {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-input, .form-textarea, .form-select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .form-textarea {
    resize: vertical;
    min-height: 100px;
  }

  .form-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .priority-slider {
    flex: 1;
  }

  .priority-label {
    min-width: 80px;
    font-size: 0.9rem;
    color: #666;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #ddd;
    margin-bottom: 1rem;
  }

  .tab {
    background: none;
    border: none;
    padding: 1rem 1.5rem;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .tab:hover {
    background: #f8f9fa;
  }

  .tab.active {
    border-bottom-color: #007bff;
    color: #007bff;
    font-weight: 600;
  }

  .tab-content {
    min-height: 400px;
  }

  .document-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .document-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
    transition: all 0.2s ease;
  }

  .document-item:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .document-item.processing {
    border-color: #ffc107;
    background: #fffbf0;
  }

  .document-item.completed {
    border-color: #28a745;
    background: #f8fff9;
  }

  .document-item.error {
    border-color: #dc3545;
    background: #fff5f5;
  }

  .document-info {
    flex: 1;
  }

  .document-info h4 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1rem;
  }

  .document-preview {
    color: #666;
    font-size: 0.9rem;
    margin: 0.5rem 0;
  }

  .document-meta, .timestamp {
    font-size: 0.8rem;
    color: #888;
  }

  .processing-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #ffc107;
    font-size: 0.9rem;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #ffc107;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .result-summary {
    color: #28a745;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .error-message {
    color: #dc3545;
    font-size: 0.9rem;
    margin: 0.5rem 0;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.queued { background: #e9ecef; color: #495057; }
  .status-badge.processing { background: #fff3cd; color: #856404; }
  .status-badge.completed { background: #d4edda; color: #155724; }
  .status-badge.error { background: #f8d7da; color: #721c24; }

  .empty-state {
    text-align: center;
    color: #666;
    font-size: 1.1rem;
    padding: 3rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .gpu-orchestrator {
      padding: 1rem;
    }

    .orchestrator-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .status-indicators {
      flex-wrap: wrap;
    }

    .control-group {
      flex-direction: column;
    }

    .form-row {
      flex-direction: column;
      align-items: stretch;
    }

    .tabs {
      overflow-x: auto;
      flex-wrap: nowrap;
    }

    .document-item {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
  }
</style>
