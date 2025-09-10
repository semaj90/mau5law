<script lang="ts">
</script>
  import { onMount } from 'svelte';
  import { diagnoseWebGPU, checkBrowserCompatibility } from '$lib/webgpu/webgpu-diagnostics';
  import { webgpuPolyfill } from '$lib/webgpu/webgpu-polyfill';
  import type { WebGPUDiagnostics } from '$lib/webgpu/webgpu-diagnostics';
  import { browser } from '$app/environment';

  let diagnosticsResults: WebGPUDiagnostics | null = $state(null);
  let browserCheck = $state({ compatible: false, message: '' });
  let isRunning = $state(false);
  let testResults = $state<{ cpu: number; webgpu?: number; webgl?: number; error?: string } | null>(null);
  let performanceStats = $state<any>(null);

  onMount(async () => {
    if (!browser) return;
    
    // Check browser compatibility
    browserCheck = checkBrowserCompatibility();
    
    // Run full diagnostics
    await runDiagnostics();
  });

  async function runDiagnostics() {
    isRunning = true;
    try {
      diagnosticsResults = await diagnoseWebGPU();
      console.log('WebGPU Diagnostics:', diagnosticsResults);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      isRunning = false;
    }
  }

  async function testVectorSimilarity() {
    isRunning = true;
    testResults = null;
    
    try {
      // Initialize WebGPU polyfill
      const initialized = await webgpuPolyfill.initialize();
      console.log('WebGPU polyfill initialized:', initialized);
      
      // Create test vectors
      const vector1 = Array.from({ length: 768 }, () => Math.random() - 0.5);
      const vector2 = Array.from({ length: 768 }, () => Math.random() - 0.5);
      
      console.log('Testing vector similarity with 768-dimensional vectors');
      
      // Test CPU implementation
      const startCPU = performance.now();
      const cpuResult = webgpuPolyfill['computeSimilarityCPU'](vector1, vector2);
      const cpuTime = performance.now() - startCPU;
      
      testResults = { cpu: cpuResult };
      
      // Test WebGPU if available
      try {
        const startGPU = performance.now();
        const webgpuResult = await webgpuPolyfill.computeSimilarity(vector1, vector2);
        const gpuTime = performance.now() - startGPU;
        
        testResults.webgpu = webgpuResult;
        
        console.log(`CPU similarity: ${cpuResult} (${cpuTime.toFixed(2)}ms)`);
        console.log(`WebGPU similarity: ${webgpuResult} (${gpuTime.toFixed(2)}ms)`);
        console.log(`Difference: ${Math.abs(cpuResult - webgpuResult)}`);
        
      } catch (error) {
        console.warn('WebGPU test failed:', error);
        testResults.error = error instanceof Error ? error.message : 'Unknown WebGPU error';
      }
      
      // Get performance stats
      performanceStats = webgpuPolyfill.getPerformanceStats();
      
    } catch (error) {
      console.error('Vector similarity test failed:', error);
      testResults = { 
        cpu: 0, 
        error: error instanceof Error ? error.message : 'Test failed' 
      };
    } finally {
      isRunning = false;
    }
  }
</script>

<svelte:head>
  <title>WebGPU Vector Similarity Test</title>
  <meta name="description" content="Test and diagnose WebGPU vector similarity computation for legal AI platform" />
</svelte:head>

<div class="container">
  <header>
    <h1>🔥 WebGPU Vector Similarity Test</h1>
    <p>Diagnose WebGPU support and test vector similarity computation performance</p>
  </header>

  <section class="browser-check">
    <h2>Browser Compatibility</h2>
    <div class="status-card" class:success={browserCheck.compatible} class:error={!browserCheck.compatible}>
      <div class="status-icon">
        {browserCheck.compatible ? '✅' : '❌'}
      </div>
      <div>
        <strong>{browserCheck.compatible ? 'Compatible' : 'Incompatible'}</strong>
        <p>{browserCheck.message}</p>
      </div>
    </div>
  </section>

  <section class="diagnostics">
    <h2>WebGPU Diagnostics</h2>
    <button onclick={runDiagnostics} disabled={isRunning}>
      {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
    </button>

    {#if diagnosticsResults}
      <div class="diagnostics-results">
        <div class="status-card" class:success={diagnosticsResults.isSupported} class:error={!diagnosticsResults.isSupported}>
          <div class="status-icon">
            {diagnosticsResults.isSupported ? '🚀' : '⚠️'}
          </div>
          <div>
            <strong>{diagnosticsResults.isSupported ? 'WebGPU Supported' : 'WebGPU Not Available'}</strong>
          </div>
        </div>

        <div class="details">
          <h3>Browser Information</h3>
          <ul>
            <li>Browser: {diagnosticsResults.browserSupport.browserName} {diagnosticsResults.browserSupport.browserVersion}</li>
            <li>Navigator GPU: {diagnosticsResults.browserSupport.hasNavigatorGPU ? 'Available' : 'Not Available'}</li>
          </ul>

          {#if diagnosticsResults.adapterInfo}
            <h3>GPU Adapter</h3>
            <ul>
              <li>Vendor: {diagnosticsResults.adapterInfo.vendor}</li>
              <li>Device: {diagnosticsResults.adapterInfo.device}</li>
              <li>Architecture: {diagnosticsResults.adapterInfo.architecture}</li>
              <li>Description: {diagnosticsResults.adapterInfo.description}</li>
            </ul>
          {/if}

          {#if diagnosticsResults.deviceInfo}
            <h3>Device Features</h3>
            <ul>
              <li>Features: {diagnosticsResults.deviceInfo.features.join(', ') || 'None'}</li>
              <li>Max Buffer Size: {(diagnosticsResults.deviceInfo.maxBufferSize / 1024 / 1024).toFixed(1)} MB</li>
              <li>Max Workgroup Size: {diagnosticsResults.deviceInfo.maxComputeWorkgroupSize}</li>
            </ul>
          {/if}

          {#if diagnosticsResults.errors.length > 0}
            <h3>Errors</h3>
            <ul class="error-list">
              {#each diagnosticsResults.errors as error}
                <li>❌ {error}</li>
              {/each}
            </ul>
          {/if}

          {#if diagnosticsResults.recommendations.length > 0}
            <h3>Recommendations</h3>
            <ul class="recommendation-list">
              {#each diagnosticsResults.recommendations as recommendation}
                <li>💡 {recommendation}</li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    {/if}
  </section>

  <section class="performance-test">
    <h2>Vector Similarity Performance Test</h2>
    <button onclick={testVectorSimilarity} disabled={isRunning}>
      {isRunning ? 'Running Test...' : 'Test Vector Similarity'}
    </button>

    {#if testResults}
      <div class="test-results">
        <h3>Results</h3>
        <div class="result-grid">
          <div class="result-card">
            <h4>CPU Implementation</h4>
            <div class="result-value">{testResults.cpu.toFixed(6)}</div>
          </div>

          {#if testResults.webgpu !== undefined}
            <div class="result-card success">
              <h4>WebGPU Implementation</h4>
              <div class="result-value">{testResults.webgpu.toFixed(6)}</div>
              <div class="diff">
                Δ: {Math.abs(testResults.cpu - testResults.webgpu).toExponential(2)}
              </div>
            </div>
          {/if}

          {#if testResults.error}
            <div class="result-card error">
              <h4>Error</h4>
              <div class="error-text">{testResults.error}</div>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if performanceStats}
      <div class="performance-stats">
        <h3>Performance Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="label">Operations Completed:</span>
            <span class="value">{performanceStats.operationsCompleted}</span>
          </div>
          <div class="stat-item">
            <span class="label">Average Processing Time:</span>
            <span class="value">{performanceStats.averageProcessingTime.toFixed(2)}ms</span>
          </div>
          <div class="stat-item">
            <span class="label">WebGPU Usage:</span>
            <span class="value">{performanceStats.webgpuPercentage.toFixed(1)}%</span>
          </div>
          <div class="stat-item">
            <span class="label">WebGL Usage:</span>
            <span class="value">{performanceStats.webglPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  header {
    text-align: center;
    margin-bottom: 3rem;
  }

  h1 {
    color: #2563eb;
    margin-bottom: 0.5rem;
  }

  section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  h2 {
    color: #1f2937;
    margin-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 0.5rem;
  }

  .status-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: 8px;
    border: 2px solid;
  }

  .status-card.success {
    border-color: #10b981;
    background-color: #ecfdf5;
  }

  .status-card.error {
    border-color: #ef4444;
    background-color: #fef2f2;
  }

  .status-icon {
    font-size: 1.5rem;
  }

  button {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 1.5rem;
  }

  button:hover:not(:disabled) {
    background: #1d4ed8;
  }

  button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .details h3 {
    color: #374151;
    margin: 1.5rem 0 0.5rem 0;
    font-size: 1.1rem;
  }

  .details ul {
    list-style: none;
    padding: 0;
  }

  .details li {
    padding: 0.25rem 0;
    color: #4b5563;
  }

  .error-list li {
    color: #dc2626;
  }

  .recommendation-list li {
    color: #059669;
  }

  .result-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr);
    gap: 1rem;
    margin-top: 1rem;
  }

  .result-card {
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .result-card.success {
    border-color: #10b981;
    background-color: #f0fdf4;
  }

  .result-card.error {
    border-color: #ef4444;
    background-color: #fef2f2;
  }

  .result-card h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
  }

  .result-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
  }

  .diff {
    font-size: 0.9rem;
    color: #6b7280;
    margin-top: 0.5rem;
  }

  .error-text {
    color: #dc2626;
    font-size: 0.9rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr);
    gap: 1rem;
    margin-top: 1rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 6px;
  }

  .label {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .value {
    font-weight: 600;
    color: #1f2937;
  }
</style>
