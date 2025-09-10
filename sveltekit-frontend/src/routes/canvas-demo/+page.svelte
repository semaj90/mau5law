<!--
  Canvas Integration Demo Page
  Showcases the complete Evidence Canvas with YoRHa integration
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import UnifiedCanvasIntegration from '$lib/components/canvas/UnifiedCanvasIntegration.svelte';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';
  
  let caseId = 'demo-case-001';
  let unifiedCanvas: any;
  let demoMode = $state('both');
  let eventLog = $state<string[]>([]);
  let showEventLog = $state(false);
  
  // Event handlers for demo
  function handleEvidenceUploaded(event: CustomEvent) {
    addToEventLog(`📁 Evidence uploaded: ${event.detail.file?.name || 'Unknown file'}`);
  }
  
  function handleAnalysisComplete(event: CustomEvent) {
    addToEventLog(`🔍 Analysis complete: ${event.detail.analysis?.detectedPatterns?.length || 0} patterns found`);
  }
  
  function handleDrawingUpdated(event: CustomEvent) {
    addToEventLog(`🎨 Drawing updated: ${event.detail.tool} at (${event.detail.x}, ${event.detail.y})`);
  }
  
  function handleCanvasSynced(event: CustomEvent) {
    addToEventLog(`🔄 Canvas synced: ${event.detail.totalObjects} total objects`);
  }
  
  function handleNeuralEngineReady(event: CustomEvent) {
    addToEventLog(`🧠 Neural engine ready: ${event.detail.engine ? 'Available' : 'Unavailable'}`);
  }
  
  function handleCanvasExported(event: CustomEvent) {
    addToEventLog(`💾 Canvas exported: ${event.detail.objectCount} objects`);
    
    // Create download
    const dataStr = JSON.stringify(event.detail, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `canvas-state-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }
  
  function addToEventLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    eventLog = [`[${timestamp}] ${message}`, ...eventLog.slice(0, 49)]; // Keep last 50 events
  }
  
  function clearEventLog() {
    eventLog = [];
  }
  
  function runDemoScenario() {
    addToEventLog('🚀 Starting demo scenario...');
    
    // Simulate a series of demo actions
    setTimeout(() => {
      addToEventLog('🎮 Demo: Switching to evidence mode');
      demoMode = 'evidence';
    }, 1000);
    
    setTimeout(() => {
      addToEventLog('🎮 Demo: Mock evidence upload started');
    }, 2000);
    
    setTimeout(() => {
      addToEventLog('🎮 Demo: Mock detective analysis started');
    }, 3000);
    
    setTimeout(() => {
      addToEventLog('🎮 Demo: Switching to drawing mode');
      demoMode = 'drawing';
    }, 4000);
    
    setTimeout(() => {
      addToEventLog('🎮 Demo: Switching back to unified mode');
      demoMode = 'both';
    }, 5000);
    
    setTimeout(() => {
      addToEventLog('✅ Demo scenario complete!');
    }, 6000);
  }
  
  onMount(() => {
    addToEventLog('🎮 Canvas Demo initialized');
    addToEventLog('📖 Check the integration guide for detailed usage instructions');
  });
</script>

<svelte:head>
  <title>Canvas Integration Demo - YoRHa Legal AI</title>
  <meta name="description" content="Interactive demo of the Enhanced Evidence Canvas with YoRHa integration" />
</svelte:head>

<div class="demo-page">
  <!-- Demo Header -->
  <div class="demo-header">
    <div class="demo-title">
      <h1>🎮 Canvas Integration Demo</h1>
      <p>Interactive demonstration of the Enhanced Evidence Canvas with YoRHa CanvasBoard integration</p>
    </div>
    
    <div class="demo-controls">
      <Button
        variant="outline"
        size="sm"
        onclick={runDemoScenario}
        class="demo-btn bits-btn bits-btn"
      >
        🚀 Run Demo Scenario
      </Button>
      
      <Button class="bits-btn"
        variant="outline"
        size="sm"
        onclick={() => showEventLog = !showEventLog}
        class="demo-btn"
      >
        {showEventLog ? '👁️ Hide' : '👁️ Show'} Event Log
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onclick={clearEventLog}
        class="demo-btn bits-btn bits-btn"
      >
        🗑️ Clear Log
      </Button>
    </div>
  </div>
  
  <!-- Event Log (Optional) -->
  {#if showEventLog}
    <div class="event-log">
      <div class="event-log-header">
        <h3>🔍 Real-time Event Log</h3>
        <span class="event-count">{eventLog.length} events</span>
      </div>
      <div class="event-log-content">
        {#each eventLog.slice(0, 10) as event}
          <div class="event-item">{event}</div>
        {/each}
        {#if eventLog.length === 0}
          <div class="no-events">No events yet. Start using the canvas to see activity!</div>
        {/if}
      </div>
    </div>
  {/if}
  
  <!-- Main Canvas Integration -->
  <div class="demo-canvas-container">
    <UnifiedCanvasIntegration
      bind:this={unifiedCanvas}
      {caseId}
      enableYoRHaBoard={true}
      enableEvidenceCanvas={true}
      splitView={true}
      syncCanvases={true}
      initialMode={demoMode}
      onevidenceUploaded={handleEvidenceUploaded}
      onanalysisComplete={handleAnalysisComplete}
      ondrawingUpdated={handleDrawingUpdated}
      oncanvasSynced={handleCanvasSynced}
      onneuralEngineReady={handleNeuralEngineReady}
      oncanvasExported={handleCanvasExported}
    />
  </div>
  
  <!-- Demo Features Info -->
  <div class="demo-features">
    <div class="feature-section">
      <h3>🎯 Demo Features</h3>
      <ul>
        <li><strong>Drag & Drop Upload:</strong> Try dragging images or documents onto the evidence canvas</li>
        <li><strong>CUDA Acceleration:</strong> Large files are automatically processed with GPU optimization</li>
        <li><strong>Detective Analysis:</strong> AI automatically analyzes uploaded evidence for patterns</li>
        <li><strong>YoRHa Drawing:</strong> Use the drawing tools to annotate evidence</li>
        <li><strong>Real-time Sync:</strong> Changes in one canvas sync to the unified state</li>
        <li><strong>Interactive Anchor Points:</strong> AI-generated anchor points highlight key evidence areas</li>
      </ul>
    </div>
    
    <div class="feature-section">
      <h3>🔧 Technical Features</h3>
      <ul>
        <li><strong>Fabric.js Integration:</strong> Professional canvas manipulation</li>
        <li><strong>Svelte 5 Runes:</strong> Modern reactive state management</li>
        <li><strong>N64 Aesthetics:</strong> Retro gaming-inspired UI design</li>
        <li><strong>WebGPU Processing:</strong> Advanced GPU-accelerated image processing</li>
        <li><strong>Neural Engine:</strong> AI-powered evidence analysis and insights</li>
        <li><strong>Memory Management:</strong> Efficient handling of large evidence files</li>
      </ul>
    </div>
    
    <div class="feature-section">
      <h3>📚 Usage Guide</h3>
      <ul>
        <li><strong>Evidence Mode:</strong> Focus on uploading and analyzing evidence files</li>
        <li><strong>Drawing Mode:</strong> Use YoRHa tools to draw and annotate</li>
        <li><strong>Both Mode:</strong> Split view showing both canvases simultaneously</li>
        <li><strong>Sync Button:</strong> Manually sync canvas states</li>
        <li><strong>Export Button:</strong> Download complete canvas state as JSON</li>
        <li><strong>Clear Button:</strong> Reset both canvases to clean state</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .demo-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0a0a, #1a1a1a);
    color: #00ff88;
    font-family: 'Courier New', monospace;
    display: flex;
    flex-direction: column;
  }
  
  .demo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2rem;
    background: rgba(0, 255, 136, 0.1);
    border-bottom: 2px solid #00ff88;
  }
  
  .demo-title h1 {
    font-size: 2rem;
    font-weight: bold;
    margin: 0 0 0.5rem 0;
    text-shadow: 0 0 15px #00ff88;
    letter-spacing: 2px;
  }
  
  .demo-title p {
    margin: 0;
    opacity: 0.7;
    font-size: 1rem;
    max-width: 500px;
  }
  
  .demo-controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .demo-btn {
    background: transparent;
    border: 2px solid #00ff88;
    color: #00ff88;
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .demo-btn:hover {
    background: rgba(0, 255, 136, 0.1);
    box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
    transform: translateY(-2px);
  }
  
  .event-log {
    background: rgba(0, 0, 0, 0.8);
    border-bottom: 2px solid #00ff88;
    max-height: 200px;
    overflow: hidden;
  }
  
  .event-log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: rgba(0, 255, 136, 0.05);
    border-bottom: 1px solid #00ff88;
  }
  
  .event-log-header h3 {
    margin: 0;
    font-size: 1.2rem;
  }
  
  .event-count {
    font-size: 0.9rem;
    opacity: 0.7;
  }
  
  .event-log-content {
    padding: 1rem 2rem;
    max-height: 140px;
    overflow-y: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
  }
  
  .event-item {
    padding: 0.25rem 0;
    border-bottom: 1px solid rgba(0, 255, 136, 0.1);
    color: #cccccc;
  }
  
  .no-events {
    color: #666666;
    font-style: italic;
    text-align: center;
    padding: 2rem;
  }
  
  .demo-canvas-container {
    flex: 1;
    min-height: 600px;
  }
  
  .demo-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    padding: 2rem;
    background: rgba(0, 0, 0, 0.5);
    border-top: 2px solid #00ff88;
  }
  
  .feature-section {
    background: rgba(0, 255, 136, 0.05);
    border: 1px solid rgba(0, 255, 136, 0.3);
    padding: 1.5rem;
    border-radius: 0;
  }
  
  .feature-section h3 {
    margin: 0 0 1rem 0;
    color: #FFD700;
    font-size: 1.3rem;
    text-shadow: 0 0 10px #FFD700;
  }
  
  .feature-section ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .feature-section li {
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(0, 255, 136, 0.1);
    font-size: 0.9rem;
    line-height: 1.4;
  }
  
  .feature-section li strong {
    color: #FFD700;
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .demo-header {
      flex-direction: column;
      gap: 1.5rem;
      text-align: center;
    }
    
    .demo-title h1 {
      font-size: 1.5rem;
    }
    
    .demo-controls {
      justify-content: center;
    }
    
    .demo-features {
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 1rem;
    }
    
    .event-log-content {
      font-size: 0.7rem;
    }
  }
  
  /* Scrollbar styling for event log */
  .event-log-content::-webkit-scrollbar {
    width: 8px;
  }
  
  .event-log-content::-webkit-scrollbar-track {
    background: #1a1a1a;
  }
  
  .event-log-content::-webkit-scrollbar-thumb {
    background: #00ff88;
    border-radius: 4px;
  }
  
  .event-log-content::-webkit-scrollbar-thumb:hover {
    background: #00cc77;
  }
</style>
