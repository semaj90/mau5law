<script lang="ts">
  import { findSimilar, getClientEmbeddingGemma, type ClientEmbeddingGemma } from '$lib/ClientEmbeddingGemma';
  import { onMount } from 'svelte';

  let service: ClientEmbeddingGemma;
  let isInitializing = $state(true);
  let isReady = $state(false);
  let error = $state<string | null>(null);

  // Test data - legal documents
  let testTexts = $state([
    'This contract establishes binding legal obligations between the parties with consideration exchanged.',
    'The plaintiff alleges breach of fiduciary duty and seeks compensatory damages in excess of jurisdictional minimum.',
    'Legal precedent from appellate court decisions supports this interpretation of statutory language.',
    'The defendant moves for summary judgment claiming insufficient evidence of causation.',
    'Contractual terms regarding force majeure clauses are interpreted according to plain meaning doctrine.',
    'Discovery disputes arise from claims of attorney-client privilege over internal communications.',
    'Statutory construction requires examining legislative intent through committee reports and contemporaneous documents.',
    'Class certification requires showing commonality of legal and factual issues among putative class members.'
  ]);

  let queryText = $state('Breach of contract lawsuit seeking damages');
  let embeddings = $state<any>(null);
  let queryEmbedding = $state<number[] | null>(null);
  let similarities = $state<any[]>([]);
  let isGenerating = $state(false);

  onMount(async () => {
    try {
      service = getClientEmbeddingGemma();
      await service.initialize();
      isReady = service.isReady();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Initialization failed';
    } finally {
      isInitializing = false;
    }
  });

  async function generateEmbeddings() {
    if (!isReady || !service) return;

    isGenerating = true;
    error = null;

    try {
      console.log('🎯 Generating embeddings for', testTexts.length, 'legal documents...');
      embeddings = await service.generateEmbeddings(testTexts, {
        normalize: true,
        maxLength: 512
      });

      console.log('✅ Generated embeddings:', embeddings);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Embedding generation failed';
      console.error('❌ Embedding error:', err);
    } finally {
      isGenerating = false;
    }
  }

  async function findSimilarDocuments() {
    if (!embeddings || !service) return;

    try {
      console.log('🔍 Finding similar legal documents for query:', queryText);

      // Generate embedding for query
      const queryResult = await service.generateEmbeddings([queryText], {
        normalize: true
      });
      queryEmbedding = queryResult.embeddings[0];

      // Find similarities
      similarities = findSimilar(
        queryEmbedding,
        embeddings.embeddings,
        5
      );

      console.log('✅ Found similarities:', similarities);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Similarity search failed';
      console.error('❌ Similarity error:', err);
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
  <title>Client-Side EmbeddingGemma Demo</title>
</svelte:head>

<div class="client-embedding-gemma-demo">
  <h1>🧠 Client-Side EmbeddingGemma Demo</h1>
  <p class="subtitle">Legal Document Semantic Search in the Browser</p>

  <!-- Service Status -->
  <section class="status-section">
    <h2>Service Status</h2>
    {#if isInitializing}
      <div class="status-card initializing">
        <h3>Initializing...</h3>
        <p>Loading EmbeddingGemma 300M ONNX model (~291MB) with WebGPU acceleration</p>
        <div class="spinner"></div>
      </div>
    {:else if isReady}
      <div class="status-card ready">
        <h3>✅ Ready</h3>
        <p>EmbeddingGemma 300M ONNX model loaded in browser</p>
        <div class="model-info">
          <strong>Model:</strong> {service?.getModelInfo().model}<br>
          <strong>Format:</strong> {service?.getModelInfo().format}<br>
          <strong>Dimension:</strong> {service?.getModelInfo().dimension}<br>
          <strong>Size:</strong> {service?.getModelInfo().size}<br>
          <strong>Providers:</strong> {service?.getModelInfo().providers?.join(', ') || 'WebGPU, WASM'}
        </div>
      </div>
    {:else}
      <div class="status-card error">
        <h3>❌ Error</h3>
        <p>{error}</p>
      </div>
    {/if}
  </section>

  {#if isReady}
    <!-- Document Collection -->
    <section class="documents-section">
      <h2>Legal Document Collection</h2>
      <p class="section-desc">Sample legal documents for semantic similarity testing</p>

      <div class="documents">
        {#each testTexts as text, index}
          <div class="document-item">
            <div class="document-header">
              <strong>Document {index + 1}</strong>
              {#if testTexts.length > 5}
                <button onclick={() => removeTestText(index)} class="remove-btn">✕</button>
              {/if}
            </div>
            <textarea
              bind:value={text}
              placeholder="Enter legal text..."
              rows="2"
              class="document-text"
            ></textarea>
          </div>
        {/each}
        <button onclick={addTestText} class="add-btn">➕ Add Document</button>
      </div>

      <div class="actions">
        <button
          onclick={generateEmbeddings}
          disabled={isGenerating}
          class="generate-btn"
        >
          {#if isGenerating}
            🔄 Generating Embeddings...
          {:else}
            🎯 Generate Embeddings
          {/if}
        </button>
      </div>
    </section>

    <!-- Embeddings Results -->
    {#if embeddings}
      <section class="results-section">
        <h2>Embeddings Generated</h2>
        <div class="results-summary">
          <p><strong>Model:</strong> {embeddings.model}</p>
          <p><strong>Dimension:</strong> {embeddings.dimension}</p>
          <p><strong>Documents:</strong> {embeddings.count}</p>
        </div>

        <div class="embeddings-list">
          {#each embeddings.embeddings as embedding, i}
            <div class="embedding-item">
              <h4>Document {i + 1}</h4>
              <div class="embedding-preview">
                <strong>Vector preview (first 8 values):</strong>
                <code>{embedding.slice(0, 8).map((v: number) => v.toFixed(4)).join(', ')}...</code>
              </div>
              <div class="embedding-norm">
                <strong>L2 Norm:</strong> {Math.sqrt(embedding.reduce((sum: number, val: number) => sum + val * val, 0)).toFixed(4)}
              </div>
              <div class="document-text-preview">
                <strong>Text:</strong> {testTexts[i].slice(0, 100)}...
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Semantic Search -->
      <section class="search-section">
        <h2>Semantic Legal Search</h2>
        <p class="section-desc">Find similar legal documents using vector similarity</p>

        <div class="search-input">
          <label for="query">Legal Query:</label>
          <textarea
            id="query"
            bind:value={queryText}
            placeholder="Enter legal search query..."
            rows="2"
            class="query-text"
          ></textarea>
          <button onclick={findSimilarDocuments} class="search-btn">🔍 Find Similar Documents</button>
        </div>

        {#if similarities.length > 0}
          <div class="similarities">
            <h3>Most Similar Legal Documents</h3>
            {#each similarities as sim}
              <div class="similarity-item">
                <div class="similarity-header">
                  <strong>Document {sim.index + 1}</strong>
                  <span class="similarity-score">{(sim.similarity * 100).toFixed(1)}% similar</span>
                </div>
                <div class="document-text">{testTexts[sim.index]}</div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  {/if}

  {#if error}
    <div class="error-message">
      ❌ Error: {error}
    </div>
  {/if}
</div>

<style>
  .client-embedding-gemma-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .subtitle {
    text-align: center;
    color: #666;
    margin-bottom: 30px;
    font-size: 16px;
  }

  .section-desc {
    color: #666;
    font-size: 14px;
    margin-bottom: 15px;
  }

  .status-section, .documents-section, .results-section, .search-section {
    margin-bottom: 30px;
    padding: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
  }

  .status-card {
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid;
  }

  .status-card.initializing {
    background: #fff3cd;
    border-left-color: #ffc107;
  }

  .status-card.ready {
    background: #d4edda;
    border-left-color: #28a745;
  }

  .status-card.error {
    background: #f8d7da;
    border-left-color: #dc3545;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 10px auto;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .model-info {
    margin-top: 10px;
    font-size: 14px;
    color: #666;
  }

  .documents {
    display: grid;
    gap: 15px;
  }

  .document-item {
    background: white;
    padding: 15px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
  }

  .document-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .document-text {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    resize: vertical;
  }

  .add-btn {
    padding: 10px 20px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .remove-btn {
    padding: 4px 8px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .actions {
    margin-top: 20px;
    text-align: center;
  }

  .generate-btn, .search-btn {
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

  .search-btn {
    background: #17a2b8;
    color: white;
  }

  .results-summary {
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

  .document-text-preview {
    margin-top: 10px;
    font-size: 14px;
    color: #666;
  }

  .search-input {
    margin-bottom: 20px;
  }

  .query-text {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    resize: vertical;
    margin: 5px 0;
  }

  .similarities {
    margin-top: 20px;
  }

  .similarity-item {
    background: white;
    padding: 15px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    margin-bottom: 10px;
  }

  .similarity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .similarity-score {
    background: #28a745;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
  }

  .error-message {
    padding: 15px;
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    margin-bottom: 20px;
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
    margin-bottom: 10px;
  }

  label {
    font-weight: bold;
  }
</style>