<!--
  OCR + Tensor Processing Demo
  Complete pipeline: Image → OCR.js → Embeddings → WebGPU Tensors → Database Storage
  Uses Svelte 5 runes and Service Workers for optimal performance
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { ocrTensorProcessor, type ProcessingResult } from '$lib/client/ocr-tensor-processor.js';

  // Svelte 5 runes for reactive state
  let initialized = $state(false);
  let processing = $state(false);
  let uploadedFile: File | null = $state(null);
  let results: ProcessingResult[] = $state([]);
  let logs: string[] = $state([]);
  let cacheStats = $state({
    hits: 0,
    misses: 0,
    totalProcessingTime: 0
  });

  // Performance metrics
  let performanceMetrics = $state({
    ocrTime: 0,
    embeddingTime: 0,
    tensorTime: 0,
    storageTime: 0
  });

  // File input reference
  let fileInput: HTMLInputElement;

  onMount(async () => {
    try {
      addLog('🚀 Initializing OCR + Tensor Processing...');
      await ocrTensorProcessor.initialize();
      initialized = true;
      addLog('✅ OCR Tensor Processor ready');
    } catch (error: any) {
      addLog(`❌ Initialization failed: ${error.message}`);
    }
  });

  /**
   * Handle file selection
   */
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        addLog('❌ Please select an image file');
        return;
      }
      
      uploadedFile = file;
      addLog(`📁 Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }
  }

  /**
   * Process uploaded image
   */
  async function processImage() {
    if (!uploadedFile || !initialized) return;
    
    processing = true;
    addLog('🔄 Starting image processing...');
    
    try {
      const startTime = performance.now();
      
      // Process the image
      const result = await ocrTensorProcessor.processImage(uploadedFile, {
        language: 'eng',
        useCache: true
      });
      
      results = [result, ...results];
      
      // Update performance metrics
      performanceMetrics = {
        ocrTime: result.processingTime * 0.4, // Estimated OCR portion
        embeddingTime: result.processingTime * 0.3, // Estimated embedding portion
        tensorTime: result.processingTime * 0.2, // Estimated tensor portion
        storageTime: result.processingTime * 0.1 // Estimated storage portion
      };
      
      // Update cache stats
      if (result.cacheHit) {
        cacheStats.hits++;
      } else {
        cacheStats.misses++;
      }
      cacheStats.totalProcessingTime += result.processingTime;
      
      addLog(`✅ Processing completed in ${result.processingTime.toFixed(2)}ms`);
      addLog(`📝 Extracted ${result.ocr.text.length} characters with ${result.ocr.confidence.toFixed(1)}% confidence`);
      addLog(`🧮 Generated ${result.embeddings.dimensions}-dimensional tensor`);
      
      // Store results in database
      await storeResults([result]);
      
    } catch (error: any) {
      addLog(`❌ Processing failed: ${error.message}`);
    } finally {
      processing = false;
    }
  }

  /**
   * Store results in database
   */
  async function storeResults(resultsToStore: ProcessingResult[]) {
    try {
      addLog('💾 Storing results in database...');
      
      await ocrTensorProcessor.storeResults(resultsToStore, {
        source: 'ocr_demo',
        user_id: 'demo_user',
        session_id: crypto.randomUUID()
      });
      
      addLog('✅ Results stored successfully');
      
    } catch (error: any) {
      addLog(`❌ Storage failed: ${error.message}`);
    }
  }

  /**
   * Process batch of sample images
   */
  async function processBatchDemo() {
    if (!initialized) return;
    
    processing = true;
    addLog('🔄 Running batch processing demo...');
    
    try {
      // Create sample canvas images for demo
      const sampleImages = createSampleImages();
      
      const batchResults = await ocrTensorProcessor.batchProcessImages(sampleImages);
      
      results = [...batchResults, ...results];
      
      // Update stats
      batchResults.forEach(result => {
        if (result.cacheHit) cacheStats.hits++;
        else cacheStats.misses++;
        cacheStats.totalProcessingTime += result.processingTime;
      });
      
      addLog(`✅ Batch processing completed: ${batchResults.length} images processed`);
      
      // Store batch results
      await storeResults(batchResults);
      
    } catch (error: any) {
      addLog(`❌ Batch processing failed: ${error.message}`);
    } finally {
      processing = false;
    }
  }

  /**
   * Create sample canvas images for demo
   */
  function createSampleImages(): HTMLCanvasElement[] {
    const samples = [
      'Contract Agreement',
      'Legal Document',
      'Evidence Photo',
      'Court Filing'
    ];
    
    return samples.map(text => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      
      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Black text
      ctx.fillStyle = 'black';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      
      return canvas;
    });
  }

  /**
   * Clear all results and logs
   */
  function clearResults() {
    results = [];
    logs = [];
    cacheStats = { hits: 0, misses: 0, totalProcessingTime: 0 };
    performanceMetrics = { ocrTime: 0, embeddingTime: 0, tensorTime: 0, storageTime: 0 };
    addLog('🗑️ Cleared all results');
  }

  /**
   * Add log entry
   */
  function addLog(message: string) {
    logs = [`[${new Date().toLocaleTimeString()}] ${message}`, ...logs.slice(0, 49)];
  }

  // Computed values using Svelte 5 $derived
  const averageProcessingTime = $derived(
    cacheStats.hits + cacheStats.misses > 0
      ? cacheStats.totalProcessingTime / (cacheStats.hits + cacheStats.misses)
      : 0
  );
  
  const cacheHitRate = $derived(
    cacheStats.hits + cacheStats.misses > 0
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100
      : 0
  );
</script>

<div class="ocr-tensor-demo">
  <div class="demo-header">
    <h2>🔬 OCR + Tensor Processing Demo</h2>
    <p>Complete pipeline: Image → OCR.js → Embeddings → WebGPU Tensors → Database Storage</p>
    
    <div class="status-bar" class:initialized class:processing>
      <span class="status-dot"></span>
      {#if processing}
        Processing...
      {:else if initialized}
        Ready
      {:else}
        Initializing...
      {/if}
    </div>
  </div>

  <div class="demo-content">
    <!-- File Upload Section -->
    <div class="upload-section">
      <h3>📁 Upload Image</h3>
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        onchange={handleFileSelect}
        disabled={!initialized || processing}
      />
      
      {#if uploadedFile}
        <div class="file-info">
          <strong>{uploadedFile.name}</strong>
          <span>({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
        </div>
      {/if}
      
      <div class="action-buttons">
        <button
          onclick={processImage}
          disabled={!uploadedFile || !initialized || processing}
        >
          {#if processing}
            🔄 Processing...
          {:else}
            🚀 Process Image
          {/if}
        </button>
        
        <button
          onclick={processBatchDemo}
          disabled={!initialized || processing}
        >
          📊 Batch Demo
        </button>
        
        <button
          onclick={clearResults}
          disabled={results.length === 0}
        >
          🗑️ Clear Results
        </button>
      </div>
    </div>

    <!-- Performance Metrics -->
    {#if Object.values(performanceMetrics).some(v => v > 0)}
      <div class="metrics-section">
        <h3>⚡ Performance Metrics</h3>
        <div class="metrics-grid">
          <div class="metric">
            <label>OCR Processing</label>
            <span>{performanceMetrics.ocrTime.toFixed(2)}ms</span>
          </div>
          <div class="metric">
            <label>Embedding Generation</label>
            <span>{performanceMetrics.embeddingTime.toFixed(2)}ms</span>
          </div>
          <div class="metric">
            <label>Tensor Processing</label>
            <span>{performanceMetrics.tensorTime.toFixed(2)}ms</span>
          </div>
          <div class="metric">
            <label>Database Storage</label>
            <span>{performanceMetrics.storageTime.toFixed(2)}ms</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Cache Statistics -->
    {#if cacheStats.hits + cacheStats.misses > 0}
      <div class="cache-stats">
        <h3>📦 Cache Performance</h3>
        <div class="stats-grid">
          <div class="stat">
            <label>Cache Hits</label>
            <span class="hits">{cacheStats.hits}</span>
          </div>
          <div class="stat">
            <label>Cache Misses</label>
            <span class="misses">{cacheStats.misses}</span>
          </div>
          <div class="stat">
            <label>Hit Rate</label>
            <span class="rate">{cacheHitRate.toFixed(1)}%</span>
          </div>
          <div class="stat">
            <label>Avg Time</label>
            <span>{averageProcessingTime.toFixed(2)}ms</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Results Display -->
    {#if results.length > 0}
      <div class="results-section">
        <h3>📋 Processing Results ({results.length})</h3>
        <div class="results-list">
          {#each results as result, i}
            <div class="result-card" class:cache-hit={result.cacheHit}>
              <div class="result-header">
                <span class="result-index">#{i + 1}</span>
                <span class="cache-indicator">
                  {result.cacheHit ? '📦 Cache Hit' : '🔥 Fresh'}
                </span>
                <span class="processing-time">
                  {result.processingTime.toFixed(2)}ms
                </span>
              </div>
              
              <div class="result-content">
                <div class="ocr-text">
                  <strong>OCR Text:</strong>
                  <p>{result.ocr.text.slice(0, 200)}{result.ocr.text.length > 200 ? '...' : ''}</p>
                  <small>Confidence: {result.ocr.confidence.toFixed(1)}%</small>
                </div>
                
                <div class="tensor-info">
                  <strong>Tensor Data:</strong>
                  <div class="tensor-stats">
                    <span>Dimensions: {result.embeddings.dimensions}</span>
                    <span>ID: {result.embeddings.metadata.tensor_id.slice(-8)}</span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Live Logs -->
    {#if logs.length > 0}
      <div class="logs-section">
        <h3>📜 Processing Logs</h3>
        <div class="logs-container">
          {#each logs as log}
            <div class="log-entry">{log}</div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .ocr-tensor-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Inter', sans-serif;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .demo-header h2 {
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .demo-header p {
    color: #6b7280;
    margin-bottom: 1rem;
  }

  .status-bar {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    background: #f3f4f6;
    color: #6b7280;
    font-weight: 500;
  }

  .status-bar.initialized {
    background: #d1fae5;
    color: #065f46;
  }

  .status-bar.processing {
    background: #fef3c7;
    color: #92400e;
    animation: pulse 2s infinite;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #9ca3af;
  }

  .initialized .status-dot {
    background: #10b981;
  }

  .processing .status-dot {
    background: #f59e0b;
  }

  .demo-content {
    display: grid;
    gap: 2rem;
  }

  .upload-section,
  .metrics-section,
  .cache-stats,
  .results-section,
  .logs-section {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .upload-section h3,
  .metrics-section h3,
  .cache-stats h3,
  .results-section h3,
  .logs-section h3 {
    margin-bottom: 1rem;
    color: #1f2937;
  }

  .file-info {
    margin: 1rem 0;
    padding: 0.75rem;
    background: #f3f4f6;
    border-radius: 0.5rem;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .action-buttons button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-buttons button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .action-buttons button:first-child {
    background: #3b82f6;
    color: white;
  }

  .action-buttons button:first-child:hover:not(:disabled) {
    background: #2563eb;
  }

  .metrics-grid,
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .metric,
  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .metric label,
  .stat label {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .metric span,
  .stat span {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }

  .hits {
    color: #059669 !important;
  }

  .misses {
    color: #dc2626 !important;
  }

  .rate {
    color: #7c3aed !important;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .result-card {
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1rem;
    background: #fafafa;
  }

  .result-card.cache-hit {
    border-color: #10b981;
    background: #f0fdf4;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .result-index {
    font-weight: 600;
    color: #1f2937;
  }

  .cache-indicator {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .processing-time {
    font-size: 0.875rem;
    color: #6b7280;
    font-family: 'JetBrains Mono', monospace;
  }

  .result-content {
    display: grid;
    gap: 1rem;
  }

  .ocr-text p {
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: white;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .tensor-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.5rem;
  }

  .logs-container {
    max-height: 300px;
    overflow-y: auto;
    background: #1f2937;
    border-radius: 0.5rem;
    padding: 1rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
  }

  .log-entry {
    color: #f3f4f6;
    margin-bottom: 0.25rem;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
