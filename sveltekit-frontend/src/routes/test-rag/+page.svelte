<script lang="ts">
  import { onMount } from 'svelte';
  import EnhancedDocumentUpload from '$lib/components/EnhancedDocumentUpload.svelte';
  import RAGSearchComponent from '$lib/components/RAGSearchComponent.svelte';
  import ModernButton from '$lib/components/ui/button/Button.svelte';

  let activeTab = $state('upload');
  let systemStatus = $state<any>(null);
  let integrationTests = $state<any[]>([]);
  let testRunning = $state(false);

  onMount(async () => {
    await loadSystemStatus();
  });

  async function loadSystemStatus() {
    try {
      // Test all enhanced endpoints
      const tests = [
        { name: 'Enhanced Semantic Search API', endpoint: '/api/rag/semantic-search' },
        { name: 'Enhanced Upload API', endpoint: '/api/documents/upload-enhanced' },
        { name: 'LangChain RAG Service', endpoint: '/api/rag/langchain' },
        { name: 'Vector Search Service', endpoint: '/api/rag/vector-search' }
      ];

      const results = await Promise.allSettled(
        tests.map(async (test) => {
          const start = Date.now();
          const response = await fetch(test.endpoint);
          const time = Date.now() - start;
          const data = await response.json();

          return {
            ...test,
            status: response.ok ? 'online' : 'error',
            responseTime: time,
            data: data
          };
        })
      );

      systemStatus = results.map((result, index) => ({
        ...tests[index],
        ...(result.status === 'fulfilled' ? result.value : { status: 'error', error: result.reason })
      }));

    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  }

  async function runIntegrationTests() {
    testRunning = true;
    integrationTests = [];

    const tests = [
      {
        name: 'Test Enhanced Semantic Search',
        description: 'Query enhanced semantic search API with sample legal query',
        test: async () => {
          const response = await fetch('/api/rag/semantic-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'contract law liability',
              useEnhancedSemanticSearch: true,
              maxResults: 5
            })
          });
          const data = await response.json();
          return { success: response.ok, data };
        }
      },
      {
        name: 'Test Vector Search Integration',
        description: 'Test vector search with enhanced features',
        test: async () => {
          const response = await fetch('/api/rag/vector-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'intellectual property rights',
              useEnhancedFeatures: true
            })
          });
          const data = await response.json();
          return { success: response.ok, data };
        }
      },
      {
        name: 'Test LangChain RAG Service',
        description: 'Test LangChain RAG service with enhanced processing',
        test: async () => {
          const response = await fetch('/api/rag/langchain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'employment law discrimination',
              includeEnhancedSearch: true
            })
          });
          const data = await response.json();
          return { success: response.ok, data };
        }
      },
      {
        name: 'Test Upload Configuration',
        description: 'Verify enhanced upload endpoint configuration',
        test: async () => {
          const response = await fetch('/api/documents/upload-enhanced');
          const data = await response.json();
          return {
            success: response.ok && data.enhancedFeatures && data.supportedFormats,
            data
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const start = Date.now();
        const result = await test.test();
        const duration = Date.now() - start;

        integrationTests = [...integrationTests, {
          ...test,
          ...result,
          duration,
          timestamp: new Date().toISOString()
        }];
      } catch (error: any) {
        integrationTests = [...integrationTests, {
          ...test,
          success: false,
          error: error.message,
          duration: 0,
          timestamp: new Date().toISOString()
        }];
      }
    }

    testRunning = false;
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'online': return '#00ff41';
      case 'error': return '#ff4444';
      default: return '#ffaa00';
    }
  }
</script>

<svelte:head>
  <title>Enhanced RAG System Testing</title>
</svelte:head>

<div class="test-container">
  <div class="test-header">
    <h1>🧪 Enhanced RAG System Testing</h1>
    <p class="subtitle">Test and validate the integrated AI-powered legal document processing system</p>
  </div>

  <!-- System Status Dashboard -->
  <div class="status-dashboard">
    <h2>🌐 System Status</h2>
    {#if systemStatus}
      <div class="status-grid">
        {#each systemStatus as service}
          <div class="status-card" style="border-color: {getStatusColor(service.status)}">
            <div class="status-header">
              <span class="status-name">{service.name}</span>
              <span class="status-indicator" style="color: {getStatusColor(service.status)}">
                {service.status === 'online' ? '✅' : '❌'}
              </span>
            </div>
            <div class="status-details">
              <div class="status-endpoint">{service.endpoint}</div>
              {#if service.responseTime}
                <div class="status-time">{service.responseTime}ms</div>
              {/if}
              {#if service.data && service.data.enhancedFeatures}
                <div class="status-features">
                  Enhanced Features: {service.data.enhancedFeatures.length}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="status-actions">
        <ModernButton onclick={loadSystemStatus} variant="secondary">
          🔄 Refresh Status
        </ModernButton>
        <ModernButton onclick={runIntegrationTests} disabled={testRunning} variant="primary">
          {testRunning ? '🔄 Running Tests...' : '🧪 Run Integration Tests'}
        </ModernButton>
      </div>
    {:else}
      <div class="loading">Loading system status...</div>
    {/if}
  </div>

  <!-- Integration Test Results -->
  {#if integrationTests.length > 0}
    <div class="test-results">
      <h2>📊 Integration Test Results</h2>
      <div class="test-summary">
        <span class="test-stat success">
          ✅ Passed: {integrationTests.filter(t => t.success).length}
        </span>
        <span class="test-stat error">
          ❌ Failed: {integrationTests.filter(t => !t.success).length}
        </span>
        <span class="test-stat total">
          📝 Total: {integrationTests.length}
        </span>
      </div>

      <div class="test-list">
        {#each integrationTests as test}
          <div class="test-item" class:success={test.success} class:error={!test.success}>
            <div class="test-header">
              <span class="test-status">
                {test.success ? '✅' : '❌'}
              </span>
              <span class="test-name">{test.name}</span>
              <span class="test-duration">{test.duration}ms</span>
            </div>
            <div class="test-description">{test.description}</div>
            {#if test.error}
              <div class="test-error">Error: {test.error}</div>
            {/if}
            {#if test.data}
              <details class="test-data">
                <summary>View Response Data</summary>
                <pre>{JSON.stringify(test.data, null, 2)}</pre>
              </details>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Tab Navigation -->
  <div class="tab-navigation">
    <button
      class="tab-button"
      class:active={activeTab === 'upload'}
      onclick={() => activeTab = 'upload'}
    >
      📄 Document Upload Testing
    </button>
    <button
      class="tab-button"
      class:active={activeTab === 'search'}
      onclick={() => activeTab = 'search'}
    >
      🔍 Enhanced Search Testing
    </button>
  </div>

  <!-- Tab Content -->
  <div class="tab-content">
    {#if activeTab === 'upload'}
      <div class="upload-testing">
        <h2>📄 Enhanced Document Upload Testing</h2>
        <p class="tab-description">
          Test the enhanced document upload functionality with AI-powered processing,
          multi-format support, and automatic semantic indexing.
        </p>
        <EnhancedDocumentUpload />
      </div>
    {:else if activeTab === 'search'}
      <div class="search-testing">
        <h2>🔍 Enhanced Semantic Search Testing</h2>
        <p class="tab-description">
          Test the enhanced semantic search with improved accuracy, practice area detection,
          and integrated vector search capabilities.
        </p>
        <RAGSearchComponent />
      </div>
    {/if}
  </div>
</div>

<style>
  .test-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Courier New', monospace;
    background: #0a0a0a;
    min-height: 100vh;
    color: #fff;
  }

  .test-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .test-header h1 {
    color: #00ff41;
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #aaa;
    font-size: 1rem;
  }

  .status-dashboard {
    background: #111;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .status-dashboard h2 {
    color: #00ff41;
    margin-bottom: 1.5rem;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .status-card {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1rem;
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .status-name {
    font-weight: bold;
    color: #fff;
  }

  .status-indicator {
    font-size: 1.2rem;
  }

  .status-details {
    font-size: 0.8rem;
    color: #888;
  }

  .status-endpoint {
    font-family: monospace;
    color: #ccc;
    margin-bottom: 0.25rem;
  }

  .status-time, .status-features {
    color: #aaa;
  }

  .status-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .loading {
    text-align: center;
    color: #888;
    padding: 2rem;
  }

  .test-results {
    background: #111;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .test-results h2 {
    color: #00ff41;
    margin-bottom: 1rem;
  }

  .test-summary {
    display: flex;
    gap: 2rem;
    margin-bottom: 1.5rem;
    justify-content: center;
  }

  .test-stat {
    font-weight: bold;
  }

  .test-stat.success {
    color: #00ff41;
  }

  .test-stat.error {
    color: #ff4444;
  }

  .test-stat.total {
    color: #ffaa00;
  }

  .test-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .test-item {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1rem;
  }

  .test-item.success {
    border-color: #00ff41;
  }

  .test-item.error {
    border-color: #ff4444;
  }

  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .test-status {
    font-size: 1.2rem;
  }

  .test-name {
    font-weight: bold;
    color: #fff;
  }

  .test-duration {
    color: #888;
    font-size: 0.8rem;
  }

  .test-description {
    color: #ccc;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .test-error {
    color: #ff6666;
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .test-data {
    margin-top: 0.5rem;
  }

  .test-data summary {
    color: #00ff41;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .test-data pre {
    background: #0a0a0a;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
    font-size: 0.7rem;
    color: #ccc;
    margin-top: 0.5rem;
  }

  .tab-navigation {
    display: flex;
    background: #111;
    border-radius: 12px 12px 0 0;
    border: 1px solid #333;
    border-bottom: none;
    overflow: hidden;
  }

  .tab-button {
    flex: 1;
    padding: 1rem 2rem;
    background: #1a1a1a;
    border: none;
    color: #888;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: inherit;
    font-size: 0.9rem;
  }

  .tab-button:hover {
    background: #222;
    color: #ccc;
  }

  .tab-button.active {
    background: #00ff41;
    color: #000;
    font-weight: bold;
  }

  .tab-content {
    background: #111;
    border: 1px solid #333;
    border-radius: 0 0 12px 12px;
    padding: 2rem;
  }

  .tab-content h2 {
    color: #00ff41;
    margin-bottom: 1rem;
  }

  .tab-description {
    color: #ccc;
    margin-bottom: 2rem;
    line-height: 1.5;
  }
</style>