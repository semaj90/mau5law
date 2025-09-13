<!--
  Database Sync Integration Test
  
  Demonstrates complete end-to-end database synchronization with:
  1. SSR initial data loading
  2. Reactive store updates from API
  3. Real-time UI sync with database
  4. Error handling and loading states
-->

<script lang="ts">
  import { onMount } from 'svelte';
  
  // Logic Layer imports - our decoupled stores
  import { 
    langchainService, 
    documentProcessing, 
    langchainServiceLogic 
  } from '$lib/stores/langchain-service-store.js';
  
  // Presentation Layer imports - accessibility actions
  import { 
    accessibleClick, 
    ariaState,
    a11yUtils
  } from '$lib/actions/accessibility-actions.js';
  
  // Type imports
  import type { PageData } from './$types.js';
  
  // Component props - receives SSR data
  export let data: PageData;
  
  // ===== LOGIC LAYER =====
  // Pure reactive state derived from stores
  
  $: langchainState = $langchainService;
  $: documentState = $documentProcessing;
  $: serviceStatus = data.initialState.serviceStatus;
  $: recentSessions = data.initialState.recentSessions;
  $: recentDocuments = data.initialState.recentDocuments;
  
  // Local component state for testing
  let testDocument = `
    LEGAL SERVICES AGREEMENT
    
    This Agreement is entered into on January 15, 2024, between:
    
    Client: TechStart Inc., a Delaware corporation
    Attorney: Legal Partners LLP
    
    SCOPE OF SERVICES:
    1. Corporate formation and governance advice
    2. Contract review and negotiation
    3. Intellectual property protection
    4. Regulatory compliance consulting
    
    TERMS:
    - Hourly rate: $450/hour
    - Retainer: $10,000
    - Billing cycle: Monthly
    
    This agreement shall be governed by Delaware law.
  `;
  
  let selectedSession: string | null = null;
  let testResults: any = null;
  let testLog: string[] = [];
  
  // ===== DATABASE SYNC TESTING FUNCTIONS =====
  
  async function testDocumentProcessing() {
    addToLog('Starting document processing test...');
    
    try {
      // Test the database sync via our decoupled store
      await langchainServiceLogic.processDocument(
        testDocument, 
        'contract', 
        'corporate-law'
      );
      
      addToLog('✅ Document processed successfully');
      addToLog(`Result stored with ID: ${$documentProcessing.result?.id}`);
      addToLog(`Session ID: ${$documentProcessing.sessionId}`);
      
      testResults = $documentProcessing.result;
      
    } catch (error) {
      addToLog(`❌ Processing failed: ${error}`);
    }
  }
  
  async function testSessionLoading() {
    if (!selectedSession) {
      addToLog('❌ No session selected for loading test');
      return;
    }
    
    addToLog(`Loading session: ${selectedSession}`);
    
    try {
      await langchainServiceLogic.loadSession(selectedSession);
      addToLog('✅ Session loaded successfully');
      addToLog(`Loaded ${$documentProcessing.result ? 'with results' : 'empty session'}`);
      
    } catch (error) {
      addToLog(`❌ Session loading failed: ${error}`);
    }
  }
  
  async function testDocumentDeletion() {
    if (!testResults?.id) {
      addToLog('❌ No document to delete');
      return;
    }
    
    addToLog(`Deleting document: ${testResults.id}`);
    
    try {
      await langchainServiceLogic.deleteDocument(testResults.id);
      addToLog('✅ Document deleted successfully');
      testResults = null;
      
    } catch (error) {
      addToLog(`❌ Deletion failed: ${error}`);
    }
  }
  
  async function testServiceAvailability() {
    addToLog('Testing service availability...');
    
    try {
      await langchainServiceLogic.initialize();
      addToLog(`✅ LangChain available: ${$langchainService.isAvailable}`);
      addToLog(`✅ Models found: ${$langchainService.models.length}`);
      
      if ($langchainService.models.length > 0) {
        addToLog(`Available models: ${$langchainService.models.join(', ')}`);
      }
      
    } catch (error) {
      addToLog(`❌ Service test failed: ${error}`);
    }
  }
  
  function addToLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    testLog = [`[${timestamp}] ${message}`, ...testLog];
  }
  
  function clearLog() {
    testLog = [];
    testResults = null;
  }
  
  // ===== PRESENTATION LAYER =====
  // ARIA state management
  
  $: ariaProps = {
    expanded: false,
    disabled: $documentProcessing.isProcessing,
    label: $documentProcessing.isProcessing ? 'Processing...' : 'Test database sync',
    live: $documentProcessing.isProcessing ? 'polite' : 'off'
  };
  
  onMount(() => {
    addToLog('🚀 Database sync test component mounted');
    addToLog(`📊 SSR loaded ${recentSessions.length} sessions, ${recentDocuments.length} documents`);
    
    // Announce initial state
    if (langchainState.isAvailable) {
      a11yUtils.announce('Legal AI services are ready for testing');
    } else {
      a11yUtils.announce('Legal AI services are not available');
    }
  });
</script>

<!-- ===== UI LAYER ===== -->

<div class="database-sync-test">
  <header>
    <h1>Database Sync Integration Test</h1>
    <p class="subtitle">Testing decoupled architecture with PostgreSQL synchronization</p>
  </header>

  <!-- Service Status Dashboard -->
  <section class="status-dashboard">
    <h2>Service Status</h2>
    <div class="status-grid">
      <div class="status-card" class:online={serviceStatus.postgresql}>
        <span class="status-indicator" aria-label="PostgreSQL status"></span>
        <strong>PostgreSQL</strong>
        <span>{serviceStatus.postgresql ? 'Online' : 'Offline'}</span>
      </div>
      
      <div class="status-card" class:online={serviceStatus.ollama}>
        <span class="status-indicator" aria-label="Ollama status"></span>
        <strong>Ollama</strong>
        <span>{serviceStatus.ollama ? 'Online' : 'Offline'}</span>
      </div>
      
      <div class="status-card" class:online={serviceStatus.redis}>
        <span class="status-indicator" aria-label="Redis status"></span>
        <strong>Redis</strong>
        <span>{serviceStatus.redis ? 'Online' : 'Offline'}</span>
      </div>
    </div>
    
    <p class="last-checked">
      Last checked: {new Date(serviceStatus.lastChecked).toLocaleString()}
      <br>
      Server render time: {data.meta.serverRenderTime}ms
    </p>
  </section>

  <!-- SSR Data Display -->
  <section class="ssr-data">
    <h2>SSR Initial Data</h2>
    <div class="data-grid">
      <div class="data-card">
        <h3>Recent Sessions ({recentSessions.length})</h3>
        {#if recentSessions.length > 0}
          <ul>
            {#each recentSessions as session}
              <li>
                <button
                  use:accessibleClick={{
                    handler: () => selectedSession = session.id,
                    label: `Select session ${session.sessionName}`
                  }}
                  class="session-item"
                  class:selected={selectedSession === session.id}
                >
                  <strong>{session.sessionName}</strong>
                  <span>{session.documentsProcessed} docs, {session.messageCount} messages</span>
                  <time>{new Date(session.lastActivity).toLocaleDateString()}</time>
                </button>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="empty-state">No recent sessions found</p>
        {/if}
      </div>
      
      <div class="data-card">
        <h3>Recent Documents ({recentDocuments.length})</h3>
        {#if recentDocuments.length > 0}
          <ul>
            {#each recentDocuments as doc}
              <li class="document-item">
                <strong>{doc.title}</strong>
                <p>{doc.summary}</p>
                <div class="doc-meta">
                  <span class="doc-type">{doc.documentType}</span>
                  <time>{new Date(doc.createdAt).toLocaleDateString()}</time>
                </div>
                {#if doc.keyTerms?.length}
                  <div class="key-terms">
                    {#each doc.keyTerms.slice(0, 3) as term}
                      <span class="term">{term}</span>
                    {/each}
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="empty-state">No recent documents found</p>
        {/if}
      </div>
    </div>
  </section>

  <!-- Database Sync Testing Controls -->
  <section class="test-controls">
    <h2>Database Sync Tests</h2>
    
    <div class="test-actions">
      <button
        use:accessibleClick={{
          handler: testServiceAvailability,
          label: 'Test service availability',
          disabled: ariaProps.disabled
        }}
        disabled={$documentProcessing.isProcessing}
        class="test-btn"
      >
        🔍 Test Services
      </button>
      
      <button
        use:accessibleClick={{
          handler: testDocumentProcessing,
          label: 'Test document processing and database sync',
          disabled: ariaProps.disabled
        }}
        disabled={$documentProcessing.isProcessing || !langchainState.isAvailable}
        class="test-btn primary"
      >
        📄 Process Document
      </button>
      
      <button
        use:accessibleClick={{
          handler: testSessionLoading,
          label: 'Test session loading from database',
          disabled: ariaProps.disabled || !selectedSession
        }}
        disabled={$documentProcessing.isProcessing || !selectedSession}
        class="test-btn"
      >
        📂 Load Session
      </button>
      
      <button
        use:accessibleClick={{
          handler: testDocumentDeletion,
          label: 'Test document deletion from database',
          disabled: ariaProps.disabled || !testResults
        }}
        disabled={$documentProcessing.isProcessing || !testResults}
        class="test-btn danger"
      >
        🗑️ Delete Document
      </button>
      
      <button
        use:accessibleClick={{
          handler: clearLog,
          label: 'Clear test log'
        }}
        class="test-btn secondary"
      >
        🧹 Clear Log
      </button>
    </div>
  </section>

  <!-- Live Results Display -->
  <section class="live-results">
    <h2>Live Database Sync Results</h2>
    
    <!-- Processing State -->
    {#if $documentProcessing.isProcessing}
      <div class="processing-state" aria-live="polite">
        <div class="spinner" aria-hidden="true"></div>
        <span>Processing document...</span>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            style="width: {$documentProcessing.progress}%"
            aria-label="Processing progress"
          ></div>
        </div>
      </div>
    {/if}
    
    <!-- Test Results -->
    {#if testResults}
      <div class="result-display" role="region" aria-labelledby="results-heading">
        <h3 id="results-heading">Processing Results</h3>
        <div class="result-grid">
          <div class="result-item">
            <label>Document ID:</label>
            <code>{testResults.id}</code>
          </div>
          <div class="result-item">
            <label>Session ID:</label>
            <code>{testResults.sessionId}</code>
          </div>
          <div class="result-item">
            <label>Processing Time:</label>
            <span>{testResults.processingTime}ms</span>
          </div>
          <div class="result-item">
            <label>Cache Hit:</label>
            <span class="cache-status" class:hit={testResults.cacheHit}>
              {testResults.cacheHit ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        
        <div class="result-content">
          <h4>Summary</h4>
          <p>{testResults.summary}</p>
          
          {#if testResults.keyTerms?.length}
            <h4>Key Terms</h4>
            <div class="key-terms">
              {#each testResults.keyTerms as term}
                <span class="term">{term}</span>
              {/each}
            </div>
          {/if}
          
          {#if testResults.entities?.length}
            <h4>Legal Entities</h4>
            <ul class="entities-list">
              {#each testResults.entities as entity}
                <li>{entity.text || entity}</li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    {/if}
    
    <!-- Error Display -->
    {#if langchainState.error || $documentProcessing.error}
      <div class="error-display" role="alert" aria-live="assertive">
        <strong>⚠️ Error:</strong>
        {langchainState.error || $documentProcessing.error}
      </div>
    {/if}
  </section>

  <!-- Test Log -->
  <section class="test-log">
    <h2>Test Execution Log</h2>
    <div class="log-container" role="log" aria-label="Test execution log">
      {#if testLog.length > 0}
        {#each testLog as entry}
          <div class="log-entry">{entry}</div>
        {/each}
      {:else}
        <p class="empty-log">No test activities yet. Run some tests to see the log.</p>
      {/if}
    </div>
  </section>

  <!-- Sample Document -->
  <section class="sample-document">
    <h2>Sample Test Document</h2>
    <textarea 
      bind:value={testDocument}
      class="document-editor"
      rows="12"
      placeholder="Edit the test document here..."
      aria-label="Sample legal document for testing"
    ></textarea>
  </section>
</div>

<style>
  .database-sync-test {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
    line-height: 1.6;
  }
  
  header {
    text-align: center;
    margin-bottom: 3rem;
  }
  
  .subtitle {
    color: #666;
    font-size: 1.1rem;
  }
  
  section {
    margin: 3rem 0;
    padding: 2rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
  }
  
  section h2 {
    margin-top: 0;
    color: #333;
    border-bottom: 2px solid #0066cc;
    padding-bottom: 0.5rem;
  }
  
  /* Status Dashboard */
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }
  
  .status-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    transition: border-color 0.2s;
  }
  
  .status-card.online {
    border-color: #28a745;
  }
  
  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #dc3545;
  }
  
  .status-card.online .status-indicator {
    background: #28a745;
  }
  
  .last-checked {
    color: #666;
    font-size: 0.9rem;
    margin-top: 1rem;
  }
  
  /* Data Grid */
  .data-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  
  .data-card {
    background: white;
    padding: 1.5rem;
    border-radius: 6px;
    border: 1px solid #ddd;
  }
  
  .data-card h3 {
    margin-top: 0;
    color: #0066cc;
  }
  
  .session-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.75rem;
    margin: 0.5rem 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .session-item:hover {
    border-color: #0066cc;
    background: #f8f9fa;
  }
  
  .session-item.selected {
    border-color: #0066cc;
    background: #e3f2fd;
  }
  
  .document-item {
    padding: 1rem;
    margin: 0.75rem 0;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: white;
  }
  
  .doc-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: #666;
  }
  
  .doc-type {
    background: #e3f2fd;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.8rem;
    text-transform: uppercase;
  }
  
  .key-terms {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  
  .term {
    background: #f0f0f0;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.85rem;
    color: #555;
  }
  
  .empty-state {
    color: #999;
    font-style: italic;
    text-align: center;
    padding: 2rem;
  }
  
  /* Test Controls */
  .test-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin: 1.5rem 0;
  }
  
  .test-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .test-btn.primary {
    background: #0066cc;
    color: white;
  }
  
  .test-btn.danger {
    background: #dc3545;
    color: white;
  }
  
  .test-btn.secondary {
    background: #6c757d;
    color: white;
  }
  
  .test-btn:not(.primary):not(.danger):not(.secondary) {
    background: #f8f9fa;
    border: 1px solid #ddd;
    color: #333;
  }
  
  .test-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  
  .test-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  /* Processing State */
  .processing-state {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: #e3f2fd;
    border-radius: 6px;
    margin: 1rem 0;
  }
  
  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #0066cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .progress-bar {
    flex: 1;
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: #0066cc;
    transition: width 0.3s ease;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Results Display */
  .result-display {
    background: white;
    padding: 2rem;
    border-radius: 6px;
    border: 1px solid #ddd;
    margin: 1.5rem 0;
  }
  
  .result-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }
  
  .result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 4px;
  }
  
  .result-item label {
    font-weight: 600;
    color: #555;
  }
  
  .result-item code {
    background: #e9ecef;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9rem;
  }
  
  .cache-status.hit {
    color: #28a745;
    font-weight: 600;
  }
  
  .result-content {
    margin-top: 2rem;
  }
  
  .result-content h4 {
    color: #0066cc;
    margin: 1.5rem 0 0.75rem 0;
  }
  
  .entities-list {
    columns: 2;
    column-gap: 2rem;
  }
  
  /* Error Display */
  .error-display {
    background: #ffebee;
    border: 1px solid #f44336;
    border-radius: 6px;
    padding: 1rem;
    color: #c62828;
    margin: 1rem 0;
  }
  
  /* Test Log */
  .log-container {
    background: #1e1e1e;
    color: #f0f0f0;
    padding: 1.5rem;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .log-entry {
    margin: 0.25rem 0;
    padding: 0.25rem 0;
    border-bottom: 1px solid #333;
  }
  
  .empty-log {
    color: #888;
    text-align: center;
    font-style: italic;
  }
  
  /* Sample Document */
  .document-editor {
    width: 100%;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
    resize: vertical;
    background: white;
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .data-grid {
      grid-template-columns: 1fr;
    }
    
    .test-actions {
      flex-direction: column;
    }
    
    .test-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>