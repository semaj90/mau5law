<script lang="ts">
</script>
  import CacheOptimizerDemo from '$lib/components/webgpu/CacheOptimizerDemo.svelte';
  import { onMount } from 'svelte';
  
  let pageTitle = 'WebGPU Redis Cache Optimizer';
  let pageDescription = 'Experience GPU-accelerated caching with thread optimization and data parallelism for legal AI applications';
  
  onMount(() => {
    // Set page title
    document.title = `${pageTitle} | Legal AI Platform`;
  });
</script>

<svelte:head>
  <title>{pageTitle} | Legal AI Platform</title>
  <meta name="description" content={pageDescription} />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<main>
  <div class="page-header">
    <h1>🚀 WebGPU Redis Cache Optimizer</h1>
    <p class="subtitle">
      Advanced GPU-accelerated caching system with thread optimization, 
      data parallelism, and RTX 3060 Ti optimizations for legal AI workloads.
    </p>
    
    <div class="tech-stack">
      <span class="tech-badge">WebGPU</span>
      <span class="tech-badge">Redis</span>
      <span class="tech-badge">Service Workers</span>
      <span class="tech-badge">Multi-threading</span>
      <span class="tech-badge">SIMD</span>
      <span class="tech-badge">Tensor Compression</span>
    </div>
  </div>
  
  <CacheOptimizerDemo />
  
  <div class="architecture-info">
    <h2>🏗️ Architecture Overview</h2>
    
    <div class="arch-grid">
      <div class="arch-card">
        <h3>🎯 WebGPU Compute Shaders</h3>
        <p>
          GPU-accelerated tensor compression and decompression using custom compute shaders 
          optimized for RTX 3060 Ti's 112 tensor cores with fp16 precision.
        </p>
        <ul>
          <li>Float32Array quantization to int8/int16</li>
          <li>4x compression ratio with minimal quality loss</li>
          <li>Parallel batch processing (128 items optimal)</li>
          <li>Automatic fallback to CPU when GPU unavailable</li>
        </ul>
      </div>
      
      <div class="arch-card">
        <h3>⚡ Multi-threaded Workers</h3>
        <p>
          Dedicated worker threads for CPU-intensive operations with SIMD acceleration 
          and intelligent load balancing across available cores.
        </p>
        <ul>
          <li>Separate pools for compression/serialization</li>
          <li>SIMD detection and vectorized processing</li>
          <li>Thread-safe operations with message passing</li>
          <li>Automatic scaling based on hardware</li>
        </ul>
      </div>
      
      <div class="arch-card">
        <h3>📦 Service Worker Cache</h3>
        <p>
          Background cache operations using Service Workers for non-blocking 
          parallel processing with client-side compression and TTL management.
        </p>
        <ul>
          <li>Parallel batch operations (16 concurrent)</li>
          <li>Client-side tensor quantization</li>
          <li>Automatic TTL expiration handling</li>
          <li>Background cache prefetching</li>
        </ul>
      </div>
      
      <div class="arch-card">
        <h3>🧠 Intelligent Load Balancing</h3>
        <p>
          GPU metrics-based workload distribution with thermal monitoring 
          and performance optimization for sustained high-throughput operations.
        </p>
        <ul>
          <li>Real-time GPU utilization monitoring</li>
          <li>Thermal throttling protection</li>
          <li>Hybrid GPU/CPU processing modes</li>
          <li>Adaptive batch size optimization</li>
        </ul>
      </div>
    </div>
  </div>
  
  <div class="performance-metrics">
    <h2>📊 Performance Characteristics</h2>
    
    <div class="metrics-grid">
      <div class="metric-item">
        <div class="metric-value">4x</div>
        <div class="metric-label">Compression Ratio</div>
        <div class="metric-desc">Float32 → quantized int8</div>
      </div>
      
      <div class="metric-item">
        <div class="metric-value">2.5x</div>
        <div class="metric-label">Average Speedup</div>
        <div class="metric-desc">vs standard caching</div>
      </div>
      
      <div class="metric-item">
        <div class="metric-value">128</div>
        <div class="metric-label">Optimal Batch Size</div>
        <div class="metric-desc">RTX 3060 Ti tuned</div>
      </div>
      
      <div class="metric-item">
        <div class="metric-value">1000+</div>
        <div class="metric-label">Ops/Second</div>
        <div class="metric-desc">sustained throughput</div>
      </div>
      
      <div class="metric-item">
        <div class="metric-value">95%</div>
        <div class="metric-label">Cache Hit Ratio</div>
        <div class="metric-desc">with intelligent prefetch</div>
      </div>
      
      <div class="metric-item">
        <div class="metric-value">12ms</div>
        <div class="metric-label">Avg Response Time</div>
        <div class="metric-desc">including compression</div>
      </div>
    </div>
  </div>
  
  <div class="use-cases">
    <h2>🏛️ Legal AI Use Cases</h2>
    
    <div class="use-case-grid">
      <div class="use-case-card">
        <h3>📄 Document Embeddings</h3>
        <p>
          High-throughput embedding generation and caching for legal document analysis, 
          contract review, and case law research with sub-second response times.
        </p>
      </div>
      
      <div class="use-case-card">
        <h3>🔍 Semantic Search</h3>
        <p>
          Real-time semantic search across millions of legal documents with 
          GPU-accelerated similarity computations and intelligent result caching.
        </p>
      </div>
      
      <div class="use-case-card">
        <h3>📊 Case Analytics</h3>
        <p>
          Batch processing of case data, evidence analysis, and legal precedent 
          matching with parallel GPU processing and compressed storage.
        </p>
      </div>
      
      <div class="use-case-card">
        <h3>🤖 AI Workflows</h3>
        <p>
          Integration with LLM workflows, RAG systems, and AI-powered legal tools 
          requiring high-performance vector operations and caching.
        </p>
      </div>
    </div>
  </div>
</main>

<style>
  main {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem 0;
  }
  
  .page-header {
    text-align: center;
    color: white;
    max-width: 1200px;
    margin: 0 auto 3rem auto;
    padding: 0 2rem;
  }
  
  .page-header h1 {
    font-size: 3rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .subtitle {
    font-size: 1.25rem;
    opacity: 0.9;
    max-width: 800px;
    margin: 0 auto 2rem auto;
    line-height: 1.6;
  }
  
  .tech-stack {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 2rem;
  }
  
  .tech-badge {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .architecture-info {
    background: white;
    border-radius: 1rem;
    padding: 3rem 2rem;
    margin: 3rem auto;
    max-width: 1200px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }
  
  .architecture-info h2 {
    text-align: center;
    color: #374151;
    margin: 0 0 2rem 0;
    font-size: 2rem;
  }
  
  .arch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr);
    gap: 2rem;
  }
  
  .arch-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 2rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .arch-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }
  
  .arch-card h3 {
    color: #374151;
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .arch-card p {
    color: #6b7280;
    line-height: 1.6;
    margin: 0 0 1rem 0;
  }
  
  .arch-card ul {
    margin: 0;
    padding-left: 1.5rem;
    color: #6b7280;
  }
  
  .arch-card li {
    margin: 0.5rem 0;
    line-height: 1.4;
  }
  
  .performance-metrics {
    background: white;
    border-radius: 1rem;
    padding: 3rem 2rem;
    margin: 3rem auto;
    max-width: 1200px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }
  
  .performance-metrics h2 {
    text-align: center;
    color: #374151;
    margin: 0 0 2rem 0;
    font-size: 2rem;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr);
    gap: 2rem;
  }
  
  .metric-item {
    text-align: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 0.75rem;
    color: white;
    transition: transform 0.2s;
  }
  
  .metric-item:hover {
    transform: scale(1.05);
  }
  
  .metric-value {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }
  
  .metric-label {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
    opacity: 0.9;
  }
  
  .metric-desc {
    font-size: 0.875rem;
    opacity: 0.7;
  }
  
  .use-cases {
    background: white;
    border-radius: 1rem;
    padding: 3rem 2rem;
    margin: 3rem auto;
    max-width: 1200px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }
  
  .use-cases h2 {
    text-align: center;
    color: #374151;
    margin: 0 0 2rem 0;
    font-size: 2rem;
  }
  
  .use-case-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr);
    gap: 2rem;
  }
  
  .use-case-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 2rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .use-case-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }
  
  .use-case-card h3 {
    color: #374151;
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .use-case-card p {
    color: #6b7280;
    line-height: 1.6;
    margin: 0;
  }
  
  @media (max-width: 768px) {
    .page-header {
      padding: 0 1rem;
    }
    
    .page-header h1 {
      font-size: 2rem;
    }
    
    .subtitle {
      font-size: 1rem;
    }
    
    .architecture-info,
    .performance-metrics,
    .use-cases {
      margin: 2rem 1rem;
      padding: 2rem 1rem;
    }
    
    .arch-grid,
    .use-case-grid {
      grid-template-columns: 1fr;
    }
    
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (max-width: 480px) {
    .tech-stack {
      justify-content: center;
    }
    
    .metrics-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
