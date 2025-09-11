<!--
  Cached RAG Demo Component
  Demonstrates the new caching functionality with embeddinggemma and gemma3:legal-latest
-->

<script lang="ts">
  let query = $state('What constitutes breach of contract?');
  let loading = $state(false);
  let result = $state<any>(null);
  let error = $state('');
  let cacheMetrics = $state<any>(null);

  // Sample queries for testing
  const sampleQueries = [
    'What constitutes breach of contract?',
    'Elements of negligence in tort law',
    'Requirements for valid contract formation',
    'Due process rights under the 14th Amendment',
    'Corporate liability for employee actions'
  ];

  async function runCachedQuery() {
    if (!query.trim()) return;

    loading = true;
    error = '';
    result = null;

    try {
      console.log('🚀 Running cached RAG query...');

      const response = await fetch('/api/v1/rag/cached', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query',
          query: {
            query: query.trim(),
            semantic: {
              useEmbeddings: true,
              expandConcepts: true,
              includeRelated: true
            },
            filters: {
              confidenceThreshold: 0.7,
              legalCategories: ['CONTRACT', 'TORT']
            }
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        result = data.data;
        console.log('✅ Cached RAG query successful:', data.data);
      } else {
        error = data.error || 'Query failed';
      }

    } catch (err: any) {
      error = `Request failed: ${err.message}`;
      console.error('❌ Cached RAG query failed:', err);
    } finally {
      loading = false;
    }
  }

  async function loadCacheMetrics() {
    try {
      const response = await fetch('/api/v1/rag/cached?action=metrics');
      const data = await response.json();

      if (data.success) {
        cacheMetrics = data.data.metrics;
      }
    } catch (err: any) {
      console.error('Failed to load cache metrics:', err);
    }
  }

  async function runCacheTest() {
    loading = true;
    try {
      const response = await fetch('/api/v1/rag/cached?action=test&type=smoke');
      const data = await response.json();
      
      if (data.success) {
        alert('Cache test passed! ✅');
      } else {
        alert('Cache test failed! ❌');
      }
    } catch (err: any) {
      alert(`Cache test error: ${err.message}`);
    } finally {
      loading = false;
    }
  }

  async function warmupCache() {
    loading = true;
    try {
      const response = await fetch('/api/v1/rag/cached', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'warmup' })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Cache warmup completed! 🔥');
        await loadCacheMetrics();
      } else {
        alert('Cache warmup failed! ❌');
      }
    } catch (err: any) {
      alert(`Cache warmup error: ${err.message}`);
    } finally {
      loading = false;
    }
  }

  // Load metrics on component mount
  $effect(() => {
    loadCacheMetrics();
  });
</script>

<div class="cached-rag-demo">
  <div class="header">
    <h2>🚀 Enhanced RAG with Caching Demo</h2>
    <p>Powered by <strong>embeddinggemma</strong> + <strong>gemma3:legal-latest</strong> + Redis caching</p>
  </div>

  <div class="query-section">
    <div class="input-group">
      <label for="query-input">Legal Query:</label>
      <textarea
        id="query-input"
        bind:value={query}
        placeholder="Enter your legal question here..."
        rows="3"
        disabled={loading}
      ></textarea>
    </div>

    <div class="sample-queries">
      <p>Sample queries:</p>
      <div class="query-buttons">
        {#each sampleQueries as sampleQuery}
          <button
            type="button"
            onclick={() => { query = sampleQuery; }}
            disabled={loading}
            class="sample-btn"
          >
            {sampleQuery}
          </button>
        {/each}
      </div>
    </div>

    <div class="actions">
      <button
        onclick={runCachedQuery}
        disabled={loading || !query.trim()}
        class="primary-btn"
      >
        {loading ? '🔄 Processing...' : '🔍 Run Cached Query'}
      </button>

      <button
        onclick={runCacheTest}
        disabled={loading}
        class="secondary-btn"
      >
        🧪 Test Cache
      </button>

      <button
        onclick={warmupCache}
        disabled={loading}
        class="secondary-btn"
      >
        🔥 Warmup Cache
      </button>

      <button
        onclick={loadCacheMetrics}
        disabled={loading}
        class="secondary-btn"
      >
        📊 Refresh Metrics
      </button>
    </div>
  </div>

  {#if error}
    <div class="error">
      <h3>❌ Error</h3>
      <p>{error}</p>
    </div>
  {/if}

  {#if result}
    <div class="results">
      <h3>✅ Query Results</h3>
      
      {#if result.cacheStats}
        <div class="cache-stats">
          <h4>🎯 Cache Performance</h4>
          <div class="stats-grid">
            <div class="stat">
              <span class="label">Embedding Cache:</span>
              <span class="value {result.cacheStats.embeddingCacheHit ? 'hit' : 'miss'}">
                {result.cacheStats.embeddingCacheHit ? '✅ HIT' : '🔄 MISS'}
              </span>
            </div>
            <div class="stat">
              <span class="label">Query Cache:</span>
              <span class="value {result.cacheStats.queryCacheHit ? 'hit' : 'miss'}">
                {result.cacheStats.queryCacheHit ? '✅ HIT' : '🔄 MISS'}
              </span>
            </div>
            <div class="stat">
              <span class="label">Response Cache:</span>
              <span class="value {result.cacheStats.responseCacheHit ? 'hit' : 'miss'}">
                {result.cacheStats.responseCacheHit ? '✅ HIT' : '🔄 MISS'}
              </span>
            </div>
            <div class="stat">
              <span class="label">GPU Time Saved:</span>
              <span class="value">{result.cacheStats.gpuTimeSaved}ms</span>
            </div>
            <div class="stat">
              <span class="label">Total Time:</span>
              <span class="value">{result.cacheStats.totalProcessingTime}ms</span>
            </div>
          </div>
        </div>
      {/if}

      <div class="query-results">
        <h4>📄 Document Results ({result.totalFound})</h4>
        {#if result.results && result.results.length > 0}
          <div class="results-list">
            {#each result.results.slice(0, 3) as docResult}
              <div class="result-item">
                <div class="result-header">
                  <h5>{docResult.title}</h5>
                  <span class="score">Score: {docResult.relevanceScore.toFixed(3)}</span>
                </div>
                <p class="excerpt">{docResult.excerpt.substring(0, 200)}...</p>
                <div class="metadata">
                  <span>Document ID: {docResult.documentId}</span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p>No documents found.</p>
        {/if}
      </div>

      {#if result.responseText}
        <div class="ai-response">
          <h4>🤖 AI Response (gemma3:legal-latest)</h4>
          <div class="response-text">
            {result.responseText}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#if cacheMetrics}
    <div class="metrics-section">
      <h3>📊 Cache Metrics</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <h4>🧠 Embeddings</h4>
          <div class="metric-stats">
            <div>Total Requests: {cacheMetrics.embeddings.totalRequests}</div>
            <div>Cache Hits: {cacheMetrics.embeddings.hits}</div>
            <div>Cache Misses: {cacheMetrics.embeddings.misses}</div>
            <div class="hit-rate">Hit Rate: {(cacheMetrics.embeddings.hitRate * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div class="metric-card">
          <h4>🔍 Queries</h4>
          <div class="metric-stats">
            <div>Total Requests: {cacheMetrics.queries.totalRequests}</div>
            <div>Cache Hits: {cacheMetrics.queries.hits}</div>
            <div>Cache Misses: {cacheMetrics.queries.misses}</div>
            <div class="hit-rate">Hit Rate: {(cacheMetrics.queries.hitRate * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .cached-rag-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 30px;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 20px;
  }

  .header h2 {
    color: #2d3748;
    margin-bottom: 10px;
  }

  .header p {
    color: #718096;
    font-size: 14px;
  }

  .query-section {
    background: #f7fafc;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .input-group {
    margin-bottom: 15px;
  }

  .input-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #4a5568;
  }

  .input-group textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    resize: vertical;
  }

  .sample-queries p {
    margin-bottom: 10px;
    font-weight: 600;
    color: #4a5568;
  }

  .query-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }

  .sample-btn {
    padding: 6px 12px;
    background: #e2e8f0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s;
  }

  .sample-btn:hover:not(:disabled) {
    background: #cbd5e0;
  }

  .sample-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .primary-btn {
    background: #4299e1;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s;
  }

  .primary-btn:hover:not(:disabled) {
    background: #3182ce;
  }

  .secondary-btn {
    background: #e2e8f0;
    color: #4a5568;
    border: none;
    padding: 12px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .secondary-btn:hover:not(:disabled) {
    background: #cbd5e0;
  }

  .primary-btn:disabled,
  .secondary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error {
    background: #fed7d7;
    border: 1px solid #fc8181;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 20px;
  }

  .error h3 {
    color: #c53030;
    margin-bottom: 10px;
  }

  .error p {
    color: #742a2a;
  }

  .results {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .cache-stats {
    background: #f0fff4;
    border: 1px solid #9ae6b4;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 20px;
  }

  .cache-stats h4 {
    color: #22543d;
    margin-bottom: 15px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .stat {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: white;
    border-radius: 4px;
    border: 1px solid #c6f6d5;
  }

  .stat .label {
    font-weight: 600;
    color: #2f855a;
  }

  .stat .value.hit {
    color: #38a169;
    font-weight: 600;
  }

  .stat .value.miss {
    color: #e53e3e;
    font-weight: 600;
  }

  .query-results h4 {
    color: #2d3748;
    margin-bottom: 15px;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .result-item {
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 15px;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .result-header h5 {
    color: #2d3748;
    margin: 0;
  }

  .score {
    background: #e2e8f0;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: #4a5568;
  }

  .excerpt {
    color: #718096;
    line-height: 1.5;
    margin-bottom: 10px;
  }

  .metadata {
    font-size: 12px;
    color: #a0aec0;
  }

  .ai-response {
    background: #edf2f7;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    padding: 15px;
    margin-top: 20px;
  }

  .ai-response h4 {
    color: #2d3748;
    margin-bottom: 15px;
  }

  .response-text {
    background: white;
    padding: 15px;
    border-radius: 4px;
    line-height: 1.6;
    color: #2d3748;
  }

  .metrics-section {
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
  }

  .metrics-section h3 {
    color: #2d3748;
    margin-bottom: 20px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
  }

  .metric-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 15px;
  }

  .metric-card h4 {
    color: #2d3748;
    margin-bottom: 15px;
  }

  .metric-stats {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .metric-stats > div {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid #f1f5f9;
  }

  .hit-rate {
    font-weight: 600;
    color: #38a169;
  }
</style>