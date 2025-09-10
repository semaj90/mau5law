<script>
  import { onMount } from 'svelte';
  
  let demoResults = $state(null);
  let loading = $state(false);
  let selectedOperation = $state('benchmark');
  let systemCapabilities = $state(null);
  let errorMessage = $state('');
  
  // Demo configuration
  let config = $state({
    batchSize: 64,
    iterations: 10,
    concurrency: 25,
    tensorSize: 512,
    textSamples: [
      'Legal contract analysis requires careful attention to detail and comprehensive review.',
      'Evidence processing in litigation cases demands accuracy and systematic documentation.',
      'Case management systems enhance legal workflow efficiency and client communication.',
      'AI-powered legal research accelerates document review and case preparation processes.'
    ]
  });
  
  onMount(async () => {
    await loadSystemCapabilities();
  });
  
  async function loadSystemCapabilities() {
    try {
      const response = await fetch('/api/v1/webgpu/cache-demo');
      const data = await response.json();
      
      if (data.success) {
        systemCapabilities = data.capabilities;
      } else {
        errorMessage = data.error || 'Failed to load system capabilities';
      }
    } catch (error) {
      errorMessage = `System check failed: ${error.message}`;
    }
  }
  
  async function runDemo() {
    if (loading) return;
    
    loading = true;
    errorMessage = '';
    demoResults = null;
    
    try {
      const requestData = {
        operation: selectedOperation,
        data: {
          batchSize: config.batchSize,
          iterations: config.iterations,
          concurrency: config.concurrency,
          tensorSize: config.tensorSize,
          textSamples: config.textSamples
        },
        options: {
          useWebGPU: true,
          enableCompression: true,
          parallelProcessing: true
        }
      };
      
      const response = await fetch('/api/v1/webgpu/cache-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        demoResults = data.result;
      } else {
        errorMessage = data.error || 'Demo execution failed';
      }
    } catch (error) {
      errorMessage = `Demo failed: ${error.message}`;
    } finally {
      loading = false;
    }
  }
  
  function formatDuration(ms) {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
  
  function formatThroughput(ops) {
    if (ops > 1000) return `${(ops / 1000).toFixed(1)}K ops/s`;
    return `${ops.toFixed(0)} ops/s`;
  }
</script>

<div class="webgpu-cache-demo">
  <div class="demo-header">
    <h2>🚀 WebGPU Redis Cache Optimizer Demo</h2>
    <p>Experience GPU-accelerated caching with thread optimization and data parallelism</p>
  </div>
  
  {#if systemCapabilities}
    <div class="system-status">
      <h3>📊 System Capabilities</h3>
      <div class="status-grid">
        <div class="status-item" class:enabled={systemCapabilities.webgpuAvailable}>
          <span class="icon">{systemCapabilities.webgpuAvailable ? '✅' : '⚠️'}</span>
          <span>WebGPU: {systemCapabilities.webgpuAvailable ? 'Available' : 'Unavailable'}</span>
        </div>
        <div class="status-item">
          <span class="icon">🎯</span>
          <span>Tensor Cores: {systemCapabilities.tensorCores}</span>
        </div>
        <div class="status-item">
          <span class="icon">⚡</span>
          <span>Thread Pools: {systemCapabilities.threadPools}</span>
        </div>
        <div class="status-item">
          <span class="icon">🚀</span>
          <span>Workers: {systemCapabilities.activeWorkers}</span>
        </div>
        <div class="status-item">
          <span class="icon">📦</span>
          <span>Cache Hit: {(systemCapabilities.cacheHitRatio * 100).toFixed(1)}%</span>
        </div>
        <div class="status-item">
          <span class="icon">⏱️</span>
          <span>Response: {systemCapabilities.avgResponseTime.toFixed(1)}ms</span>
        </div>
      </div>
    </div>
  {/if}
  
  <div class="demo-controls">
    <h3>🎮 Demo Controls</h3>
    
    <div class="control-group">
      <label>
        <span>Operation Type:</span>
        <select bind:value={selectedOperation}>
          <option value="benchmark">Performance Benchmark</option>
          <option value="tensor">Tensor Operations</option>
          <option value="batch">Batch Processing</option>
          <option value="stress-test">Stress Test</option>
          <option value="stats">System Statistics</option>
        </select>
      </label>
    </div>
    
    {#if selectedOperation === 'benchmark' || selectedOperation === 'batch'}
      <div class="config-row">
        <label>
          <span>Batch Size:</span>
          <input type="number" bind:value={config.batchSize} min="16" max="256" step="16" />
        </label>
        <label>
          <span>Iterations:</span>
          <input type="number" bind:value={config.iterations} min="1" max="100" />
        </label>
      </div>
    {/if}
    
    {#if selectedOperation === 'stress-test'}
      <div class="config-row">
        <label>
          <span>Concurrency:</span>
          <input type="number" bind:value={config.concurrency} min="5" max="100" step="5" />
        </label>
        <label>
          <span>Tensor Size:</span>
          <input type="number" bind:value={config.tensorSize} min="128" max="2048" step="128" />
        </label>
      </div>
    {/if}
    
    {#if selectedOperation === 'tensor'}
      <div class="text-samples">
        <label>Text Samples for Embedding:</label>
        {#each config.textSamples as sample, i}
          <input 
            type="text" 
            bind:value={config.textSamples[i]}
            placeholder="Enter legal text sample..."
          />
        {/each}
      </div>
    {/if}
    
    <button 
      class="run-demo-btn" 
      onclick={runDemo} 
      disabled={loading}
    >
      {loading ? '🔄 Running Demo...' : '🚀 Run Demo'}
    </button>
  </div>
  
  {#if errorMessage}
    <div class="error-message">
      <h3>❌ Error</h3>
      <p>{errorMessage}</p>
    </div>
  {/if}
  
  {#if demoResults}
    <div class="demo-results">
      <h3>📊 Demo Results</h3>
      
      {#if selectedOperation === 'benchmark'}
        <div class="benchmark-results">
          <h4>Performance Benchmarks</h4>
          {#each demoResults.benchmarks as benchmark}
            <div class="benchmark-item">
              <h5>{benchmark.operation.replace('-', ' ').toUpperCase()}</h5>
              <div class="benchmark-stats">
                <div class="stat">
                  <span class="label">WebGPU Time:</span>
                  <span class="value">{formatDuration(benchmark.webgpuTime)}</span>
                </div>
                <div class="stat">
                  <span class="label">Standard Time:</span>
                  <span class="value">{formatDuration(benchmark.standardTime)}</span>
                </div>
                <div class="stat speedup" class:positive={benchmark.speedupRatio > 1}>
                  <span class="label">Speedup:</span>
                  <span class="value">{benchmark.speedupRatio.toFixed(2)}x</span>
                </div>
                <div class="stat">
                  <span class="label">Throughput:</span>
                  <span class="value">{formatThroughput(benchmark.throughput.opsPerSecond)}</span>
                </div>
              </div>
            </div>
          {/each}
          
          <div class="summary">
            <h5>Summary</h5>
            <p><strong>Average Speedup:</strong> {demoResults.summary.averageSpeedupRatio.toFixed(2)}x</p>
            <p><strong>Performance Gain:</strong> {demoResults.summary.performanceGain}</p>
            <p><strong>Recommended:</strong> {demoResults.summary.recommendedConfiguration}</p>
          </div>
        </div>
      {/if}
      
      {#if selectedOperation === 'tensor'}
        <div class="tensor-results">
          <h4>Tensor Processing Results</h4>
          <div class="embedding-stats">
            <div class="stat">
              <span class="label">Embeddings Generated:</span>
              <span class="value">{demoResults.embeddingStats.count}</span>
            </div>
            <div class="stat">
              <span class="label">Dimensions:</span>
              <span class="value">{demoResults.embeddingStats.dimensions}</span>
            </div>
            <div class="stat">
              <span class="label">Processing Time:</span>
              <span class="value">{formatDuration(demoResults.performance.processingTime)}</span>
            </div>
            <div class="stat">
              <span class="label">Throughput:</span>
              <span class="value">{demoResults.performance.throughput.toFixed(1)} embeddings/s</span>
            </div>
          </div>
          
          <div class="similarities">
            <h5>Top Similarities</h5>
            {#each demoResults.similarities.slice(0, 3) as sim}
              <div class="similarity-item">
                <span class="similarity-score">{(sim.similarity * 100).toFixed(1)}%</span>
                <span class="similarity-texts">Text {sim.text1 + 1} ↔ Text {sim.text2 + 1}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      
      {#if selectedOperation === 'batch'}
        <div class="batch-results">
          <h4>Batch Processing Results</h4>
          <div class="batch-summary">
            <div class="stat">
              <span class="label">Total Operations:</span>
              <span class="value">{demoResults.batchConfiguration.totalOperations.toLocaleString()}</span>
            </div>
            <div class="stat">
              <span class="label">Success Rate:</span>
              <span class="value">{demoResults.summary.successRate.toFixed(1)}%</span>
            </div>
            <div class="stat">
              <span class="label">Average Throughput:</span>
              <span class="value">{formatThroughput(demoResults.summary.avgThroughput)}</span>
            </div>
            <div class="stat">
              <span class="label">Total Time:</span>
              <span class="value">{formatDuration(demoResults.summary.totalTime)}</span>
            </div>
          </div>
        </div>
      {/if}
      
      {#if selectedOperation === 'stress-test'}
        <div class="stress-results">
          <h4>Stress Test Results</h4>
          <div class="stress-summary">
            <div class="stat">
              <span class="label">Completed Operations:</span>
              <span class="value">{demoResults.results.completedOperations.toLocaleString()}</span>
            </div>
            <div class="stat">
              <span class="label">Success Rate:</span>
              <span class="value">{demoResults.results.successRate.toFixed(1)}%</span>
            </div>
            <div class="stat">
              <span class="label">Operations/Second:</span>
              <span class="value">{formatThroughput(demoResults.results.opsPerSecond)}</span>
            </div>
            <div class="stat">
              <span class="label">System Stability:</span>
              <span class="value">{demoResults.recommendations.systemStability}</span>
            </div>
          </div>
        </div>
      {/if}
      
      {#if selectedOperation === 'stats'}
        <div class="stats-results">
          <h4>System Statistics</h4>
          <pre>{JSON.stringify(demoResults, null, 2)}</pre>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .webgpu-cache-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .demo-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .demo-header h2 {
    color: #2563eb;
    margin: 0 0 0.5rem 0;
  }
  
  .demo-header p {
    color: #6b7280;
    margin: 0;
  }
  
  .system-status {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .system-status h3 {
    margin: 0 0 1rem 0;
    color: #374151;
  }
  
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: white;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }
  
  .status-item.enabled .icon {
    color: #10b981;
  }
  
  .demo-controls {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .demo-controls h3 {
    margin: 0 0 1rem 0;
    color: #374151;
  }
  
  .control-group, .config-row {
    margin-bottom: 1rem;
  }
  
  .config-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .control-group label, .config-row label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .control-group label span, .config-row label span {
    font-weight: 500;
    color: #374151;
  }
  
  select, input[type="number"], input[type="text"] {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  
  .text-samples {
    margin: 1rem 0;
  }
  
  .text-samples label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }
  
  .text-samples input {
    width: 100%;
    margin-bottom: 0.5rem;
  }
  
  .run-demo-btn {
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .run-demo-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }
  
  .run-demo-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
  
  .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 2rem;
  }
  
  .error-message h3 {
    margin: 0 0 0.5rem 0;
  }
  
  .demo-results {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
  }
  
  .demo-results h3 {
    margin: 0 0 1.5rem 0;
    color: #374151;
  }
  
  .benchmark-item {
    margin-bottom: 2rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 1rem;
  }
  
  .benchmark-item h5 {
    margin: 0 0 1rem 0;
    color: #374151;
    text-transform: capitalize;
  }
  
  .benchmark-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .stat {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .stat.speedup.positive .value {
    color: #10b981;
    font-weight: 600;
  }
  
  .stat .label {
    color: #6b7280;
    font-weight: 500;
  }
  
  .stat .value {
    font-weight: 600;
    color: #374151;
  }
  
  .summary {
    background: #f9fafb;
    border-radius: 0.375rem;
    padding: 1rem;
    margin-top: 1rem;
  }
  
  .summary h5 {
    margin: 0 0 0.5rem 0;
    color: #374151;
  }
  
  .summary p {
    margin: 0.25rem 0;
    color: #6b7280;
  }
  
  .similarities {
    margin-top: 1rem;
  }
  
  .similarity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .similarity-score {
    font-weight: 600;
    color: #2563eb;
    min-width: 60px;
  }
  
  .stats-results pre {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 1rem;
    overflow-x: auto;
    font-size: 0.75rem;
    line-height: 1.4;
  }
  
  @media (max-width: 768px) {
    .webgpu-cache-demo {
      padding: 1rem;
    }
    
    .config-row {
      grid-template-columns: 1fr;
    }
    
    .status-grid {
      grid-template-columns: 1fr;
    }
    
    .benchmark-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
