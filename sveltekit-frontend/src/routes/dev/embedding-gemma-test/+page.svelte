<script lang="ts">
  import type { onMount  } from 'svelte';

  let serviceStatus = $state <any>(null);
  let testTexts = $state([
    'This contract establishes binding legal obligations between the parties.',
    'The plaintiff alleges breach of fiduciary duty and seeks damages.',
    'Legal precedent from similar cases supports this interpretation.'
  ]);
  let embeddings = $state <any>(null);
  let isLoading = $state(false);
  let error = $state <string | null>(null);

  onMount(async () => {
    await checkServiceStatus();
  });

  async function checkServiceStatus() {
    try {
      const response = await fetch('/api/embeddings/gemma');
      const result = await response.json();
      serviceStatus = result;
    } catch (err) {
      serviceStatus = { success: false, error: 'Service unavailable' };
    }
  }

  async function generateEmbeddings() {
    isLoading = true;
    error = null;
    embeddings = null;

    try {
      const response = await fetch('/api/embeddings/gemma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          texts: testTexts,
          normalize: true
        })
      });

      const result = await response.json();

      if (result.success) {
        embeddings = result.data;
      } else {
        error = result.error;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  }

  function addTestText() {
    testTexts = [...testTexts, ''];
  }

  function removeTestText(index: number) {
    testTexts = testTexts.filter((_, i) => i !== index);
  }
</script>

<svelte:head>
  <title>EmbeddingGemma Service Test</title>
</svelte:head>

<div class="embedding-test">
  <h1>🧠 EmbeddingGemma ONNX Service Test</h1>

  <!-- Service Status -->
  <section class="status-section">
    <h2>Service Status</h2>
    {#if serviceStatus}
      <div class="status-card {serviceStatus.success ? 'healthy' : 'unhealthy'}">
        <h3>EmbeddingGemma Service</h3>
        {#if serviceStatus.success}
          <p><strong>Status:</strong> ✅ {serviceStatus.data.status}</p>
          <p><strong>Model Loaded:</strong> {serviceStatus.data.model_loaded ? '✅' : '❌'}</p>
          <p><strong>Tokenizer Loaded:</strong> {serviceStatus.data.tokenizer_loaded ? '✅' : '❌'}</p>
          <p><strong>Embedding Dimension:</strong> {serviceStatus.data.embedding_dimension}</p>
          {#if serviceStatus.data.model_info}
            <p><strong>Providers:</strong> {serviceStatus.data.model_info.providers?.join(', ')}</p>
          {/if}
        {:else}
          <p><strong>Status:</strong> ❌ {serviceStatus.error}</p>
        {/if}
      </div>
    {:else}
      <p>Checking service status...</p>
    {/if}
  </section>

  <!-- Embedding Generation -->
  <section class="test-section">
    <h2>Generate Embeddings</h2>

    <div class="text-inputs">
      {#each testTexts as text, index}
        <div class="text-input-group">
          <textarea
            bind:value={testTexts[index]}
            placeholder="Enter legal text to embed..."
            rows="2"
            class="text-input"
          ></textarea>
          {#if testTexts.length > 1}
            <button
              onclick={() => removeTestText(index)}
              class="remove-btn"
              type="button"
            >
              ✕
            </button>
          {/if}
        </div>
      {/each}
      <button onclick={addTestText} class="add-btn" type="button">
        ➕ Add Text
      </button>
    </div>

    <div class="actions">
      <button
        onclick={generateEmbeddings}
        disabled={isLoading || !serviceStatus?.success}
        class="generate-btn"
      >
        {#if isLoading}
          🔄 Generating...
        {:else}
          🎯 Generate Embeddings
        {/if}
      </button>

      <button onclick={checkServiceStatus} class="refresh-btn" type="button">
        🔄 Refresh Status
      </button>
    </div>

    {#if error}
      <div class="error-message">
        ❌ Error: {error}
      </div>
    {/if}

    {#if embeddings}
      <div class="results">
        <h3>Results</h3>
        <div class="result-summary">
          <p><strong>Model:</strong> {embeddings.model}</p>
          <p><strong>Dimension:</strong> {embeddings.dimension}</p>
          <p><strong>Count:</strong> {embeddings.count}</p>
        </div>

        <div class="embeddings-list">
          {#each embeddings.embeddings as embedding, i}
            <div class="embedding-item">
              <h4>Text {i + 1}</h4>
              <div class="embedding-preview">
                <strong>Vector (first 8 values):</strong>
                <code>{embedding.slice(0, 8).map((v: number) => v.toFixed(4)).join(', ')}...</code>
              </div>
              <div class="embedding-norm">
                <strong>Norm:</strong> {Math.sqrt(embedding.reduce((sum: number, val: number) => sum + val * val, 0)).toFixed(4)}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .embedding-test {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .status-section, .test-section {
    margin-bottom: 30px;
    padding: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
  }

  .status-card {
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid;
  }

  .status-card.healthy {
    background: #e8f5e8;
    border-left-color: #2e7d32;
  }

  .status-card.unhealthy {
    background: #ffebee;
    border-left-color: #c62828;
  }

  .text-inputs {
    margin-bottom: 20px;
  }

  .text-input-group {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 10px;
  }

  .text-input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    resize: vertical;
  }

  .remove-btn {
    padding: 10px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .add-btn {
    padding: 10px 20px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .generate-btn, .refresh-btn {
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
  }

  .generate-btn {
    background: #007bff;
    color: white;
  }

  .generate-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .refresh-btn {
    background: #6c757d;
    color: white;
  }

  .error-message {
    padding: 10px;
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .results {
    margin-top: 20px;
  }

  .result-summary {
    background: white;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
    border: 1px solid #e0e0e0;
  }

  .embeddings-list {
    display: grid;
    gap: 15px;
  }

  .embedding-item {
    background: white;
    padding: 15px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }

  .embedding-preview {
    margin: 10px 0;
  }

  .embedding-norm {
    margin-top: 5px;
    font-size: 14px;
    color: #666;
  }

  code {
    background: #f4f4f4;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
  }

  h1, h2, h3, h4 {
    color: #333;
  }

  h1 {
    text-align: center;
    margin-bottom: 30px;
  }
</style>