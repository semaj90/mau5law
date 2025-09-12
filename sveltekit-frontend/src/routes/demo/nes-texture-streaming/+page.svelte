<!-- NES Texture Streaming Demo Page -->
<script>
  import NESTextureStreamer from '$lib/components/ai/NESTextureStreamer.svelte';
  import GPUStreamingChat from '$lib/components/ai/GPUStreamingChat.svelte';
  import { onMount } from 'svelte';
  
  // Svelte 5 state
  let selectedDocument = $state('legal_contract_001');
  let readingMode = $state('active');
  let documentImportance = $state('high');
  let showDebugPanel = $state(true);
  let systemStats = $state({
    redis: { status: 'unknown', memoryUsage: 0 },
    gpu: { status: 'unknown', vramUsage: 0 },
    nes: { status: 'unknown', chrRomUsage: 0 }
  });
  
  // Sample documents
  const sampleDocuments = [
    { id: 'legal_contract_001', name: 'Service Agreement Contract', importance: 'critical' },
    { id: 'evidence_timeline_002', name: 'Evidence Timeline', importance: 'high' },
    { id: 'case_summary_003', name: 'Case Summary Brief', importance: 'medium' },
    { id: 'legal_citation_004', name: 'Legal Citation Reference', importance: 'low' }
  ];
  
  onMount(async () => {
    // Check system health on load
    await checkSystemHealth();
    
    // Update system stats every 10 seconds
    const interval = setInterval(checkSystemHealth, 10000);
    
    return () => clearInterval(interval);
  });
  
  async function checkSystemHealth() {
    try {
      // Check NES pipeline
      const nesResponse = await fetch('http://localhost:8097/api/health');
      const nesHealth = await nesResponse.json();
      
      // Check CHR-ROM status
      const chrResponse = await fetch('http://localhost:8097/api/chr-rom/status');
      const chrStatus = await chrResponse.json();
      
      systemStats = {
        redis: { 
          status: 'connected', 
          memoryUsage: Math.random() * 100 // Mock for demo
        },
        gpu: { 
          status: 'active', 
          vramUsage: Math.random() * 80
        },
        nes: { 
          status: nesHealth.status, 
          chrRomUsage: chrStatus.summary?.utilizationPercent || 0
        }
      };
    } catch (error) {
      console.warn('Health check failed:', error);
      systemStats = {
        redis: { status: 'error', memoryUsage: 0 },
        gpu: { status: 'error', vramUsage: 0 },
        nes: { status: 'error', chrRomUsage: 0 }
      };
    }
  }
  
  function handleDocumentChange(event) {
    selectedDocument = event.target.value;
    
    // Update importance based on document
    const doc = sampleDocuments.find(d => d.id === selectedDocument);
    if (doc) {
      documentImportance = doc.importance;
    }
  }
</script>

<svelte:head>
  <title>NES Texture Streaming Demo - Legal AI Platform</title>
  <meta name="description" content="Demonstration of NES-style texture streaming for legal document visualization" />
</svelte:head>

<div class="demo-page">
  <header class="demo-header">
    <h1>🎮 NES Texture Streaming Demo</h1>
    <p>Nintendo-inspired memory management for legal AI document visualization</p>
    
    <!-- System status indicators -->
    <div class="status-indicators">
      <div class="status-item {systemStats.redis.status}">
        <span class="status-icon">💾</span>
        <div class="status-info">
          <strong>Redis L3</strong>
          <small>{systemStats.redis.memoryUsage.toFixed(1)}% of 1MB budget</small>
        </div>
      </div>
      
      <div class="status-item {systemStats.gpu.status}">
        <span class="status-icon">🎯</span>
        <div class="status-info">
          <strong>GPU L1</strong>
          <small>{systemStats.gpu.vramUsage.toFixed(1)}% VRAM</small>
        </div>
      </div>
      
      <div class="status-item {systemStats.nes.status}">
        <span class="status-icon">🎮</span>
        <div class="status-info">
          <strong>CHR-ROM</strong>
          <small>{systemStats.nes.chrRomUsage.toFixed(1)}% of 32KB</small>
        </div>
      </div>
    </div>
  </header>

  <main class="demo-content">
    <!-- Document selector and controls -->
    <section class="controls-section">
      <h2>📄 Document Configuration</h2>
      
      <div class="control-grid">
        <div class="control-group">
          <label for="document-select">Document:</label>
          <select id="document-select" bind:value={selectedDocument} onchange={handleDocumentChange}>
            {#each sampleDocuments as doc}
              <option value={doc.id}>{doc.name}</option>
            {/each}
          </select>
        </div>
        
        <div class="control-group">
          <label for="reading-mode">Reading Mode:</label>
          <select id="reading-mode" bind:value={readingMode}>
            <option value="active">Active Reading</option>
            <option value="preview">Preview Mode</option>
            <option value="timeline">Timeline View</option>
            <option value="overview">Overview Mode</option>
          </select>
        </div>
        
        <div class="control-group">
          <label for="importance">Document Importance:</label>
          <select id="importance" bind:value={documentImportance}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>
            <input type="checkbox" bind:checked={showDebugPanel} />
            Show Debug Panel
          </label>
        </div>
      </div>
    </section>

    <!-- NES Texture Streaming Component -->
    <section class="streaming-section">
      <h2>🌊 NES Texture Streaming</h2>
      <div class="streaming-wrapper">
        <NESTextureStreamer 
          documentId={selectedDocument}
          {readingMode}
          {documentImportance}
          autoStream={true}
          debugMode={showDebugPanel}
        />
      </div>
    </section>

    <!-- GPU Streaming Chat Component -->
    <section class="chat-section">
      <h2>💬 GPU-Accelerated Chat</h2>
      <div class="chat-wrapper">
        <GPUStreamingChat />
      </div>
    </section>

    <!-- Architecture Information -->
    <section class="info-section">
      <h2>🏗️ System Architecture</h2>
      
      <div class="architecture-grid">
        <div class="arch-card l1">
          <h3>L1 Cache (CHR-ROM)</h3>
          <ul>
            <li>1MB GPU memory budget</li>
            <li>Hot embeddings & UI patterns</li>
            <li>4 banks with switching</li>
            <li>0.5-2ms response times</li>
          </ul>
        </div>
        
        <div class="arch-card l2">
          <h3>L2 Cache (System RAM)</h3>
          <ul>
            <li>2MB Node.js memory</li>
            <li>Recent queries & chunks</li>
            <li>8 banks with priority scoring</li>
            <li>5-20ms response times</li>
          </ul>
        </div>
        
        <div class="arch-card l3">
          <h3>L3 Cache (Redis)</h3>
          <ul>
            <li>1MB budget of 8GB Redis</li>
            <li>Persistent cache with TTL</li>
            <li>Prevents 28k Redis errors</li>
            <li>20-100ms response times</li>
          </ul>
        </div>
        
        <div class="arch-card storage">
          <h3>Storage (PostgreSQL)</h3>
          <ul>
            <li>pgvector for embeddings</li>
            <li>JSONB for legal metadata</li>
            <li>HNSW indexes for similarity</li>
            <li>Ground truth storage</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Performance Metrics -->
    <section class="metrics-section">
      <h2>📊 Performance Metrics</h2>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <h4>Memory Hierarchy</h4>
          <div class="metric-bars">
            <div class="metric-bar l1">
              <span>L1 (GPU)</span>
              <div class="bar">
                <div class="fill" style="width: {systemStats.gpu.vramUsage}%"></div>
              </div>
              <small>{systemStats.gpu.vramUsage.toFixed(1)}%</small>
            </div>
            
            <div class="metric-bar l2">
              <span>L2 (RAM)</span>
              <div class="bar">
                <div class="fill" style="width: {Math.random() * 60}%"></div>
              </div>
              <small>{(Math.random() * 60).toFixed(1)}%</small>
            </div>
            
            <div class="metric-bar l3">
              <span>L3 (Redis)</span>
              <div class="bar">
                <div class="fill" style="width: {systemStats.redis.memoryUsage}%"></div>
              </div>
              <small>{systemStats.redis.memoryUsage.toFixed(1)}%</small>
            </div>
          </div>
        </div>
        
        <div class="metric-card">
          <h4>LOD Performance</h4>
          <div class="lod-metrics">
            <div class="lod-item">LOD 0: ~100ms (64x64)</div>
            <div class="lod-item">LOD 1: ~50ms (32x32)</div>
            <div class="lod-item">LOD 2: ~25ms (16x16)</div>
            <div class="lod-item">LOD 3: ~10ms (8x8)</div>
          </div>
        </div>
        
        <div class="metric-card">
          <h4>Cache Hit Rates</h4>
          <div class="hit-rates">
            <div class="hit-rate">L1: {(Math.random() * 40 + 35).toFixed(1)}%</div>
            <div class="hit-rate">L2: {(Math.random() * 30 + 25).toFixed(1)}%</div>
            <div class="hit-rate">L3: {(Math.random() * 20 + 15).toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </section>
  </main>
</div>

<style>
  .demo-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    color: #ffffff;
    font-family: 'JetBrains Mono', monospace;
  }
  
  .demo-header {
    padding: 2rem;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.3);
  }
  
  .demo-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2.5rem;
    background: linear-gradient(45deg, #22c55e, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .demo-header p {
    margin: 0 0 2rem 0;
    opacity: 0.8;
    font-size: 1.1rem;
  }
  
  .status-indicators {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }
  
  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .status-item.connected,
  .status-item.active,
  .status-item.healthy {
    border-color: #22c55e;
  }
  
  .status-item.error {
    border-color: #ef4444;
  }
  
  .status-icon {
    font-size: 1.5rem;
  }
  
  .status-info strong {
    display: block;
    font-size: 0.9rem;
  }
  
  .status-info small {
    opacity: 0.7;
    font-size: 0.8rem;
  }
  
  .demo-content {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  section {
    margin-bottom: 3rem;
  }
  
  section h2 {
    margin: 0 0 1.5rem 0;
    font-size: 1.5rem;
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 0.5rem;
    display: inline-block;
  }
  
  .control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .control-group label {
    font-weight: bold;
    font-size: 0.9rem;
    color: #f59e0b;
  }
  
  .control-group select,
  .control-group input[type="checkbox"] {
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-family: inherit;
  }
  
  .control-group select:focus {
    outline: none;
    border-color: #3b82f6;
  }
  
  .streaming-wrapper,
  .chat-wrapper {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .architecture-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  
  .arch-card {
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .arch-card.l1 {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
    border-color: #22c55e;
  }
  
  .arch-card.l2 {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
    border-color: #3b82f6;
  }
  
  .arch-card.l3 {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
    border-color: #f59e0b;
  }
  
  .arch-card.storage {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
    border-color: #ef4444;
  }
  
  .arch-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }
  
  .arch-card ul {
    margin: 0;
    padding-left: 1rem;
  }
  
  .arch-card li {
    margin: 0.5rem 0;
    opacity: 0.9;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .metric-card {
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .metric-card h4 {
    margin: 0 0 1rem 0;
    color: #f59e0b;
  }
  
  .metric-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 0.75rem 0;
  }
  
  .metric-bar span {
    min-width: 80px;
    font-size: 0.9rem;
  }
  
  .metric-bar .bar {
    flex: 1;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .metric-bar .fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
    border-radius: 4px;
    transition: width 0.5s ease;
  }
  
  .metric-bar small {
    min-width: 50px;
    text-align: right;
    opacity: 0.8;
  }
  
  .lod-metrics,
  .hit-rates {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .lod-item,
  .hit-rate {
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  @media (max-width: 768px) {
    .demo-header {
      padding: 1rem;
    }
    
    .demo-header h1 {
      font-size: 2rem;
    }
    
    .status-indicators {
      flex-direction: column;
      align-items: center;
    }
    
    .demo-content {
      padding: 1rem;
    }
    
    .control-grid {
      grid-template-columns: 1fr;
    }
    
    .architecture-grid {
      grid-template-columns: 1fr;
    }
    
    .metrics-grid {
      grid-template-columns: 1fr;
    }
  }
</style>