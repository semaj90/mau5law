<!--
  NESTextureStreamingExample.svelte
  
  Demonstrates NES-inspired texture chunking and streaming
  Shows how to integrate N64LODManager with CHR-ROM caching and WebGPU
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import SSRWebGPULoader from '$lib/components/ui/enhanced-bits/SSRWebGPULoader.svelte';
  import Button from '$lib/components/ui/enhanced-bits/Button.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { lodManager, type LODContext } from '$lib/services/N64LODManager.ts';
  
  // Demo state
  let selectedDocument = 'legal_contract_2024_001';
  let viewportDistance = 50;
  let scrollVelocity = 0;
  let memoryPressure = 0.2;
  let documentComplexity = 0.7;
  let enableGPU = true;
  let memoryStats: any = {};
  let processingTime = 0;
  
  // Demo documents (legal AI context)
  const demoDocuments = [
    {
      id: 'legal_contract_2024_001',
      title: 'Commercial Lease Agreement',
      complexity: 0.7,
      size: { width: 1920, height: 2560 },
      type: 'contract'
    },
    {
      id: 'evidence_email_2024_042',
      title: 'Email Evidence Chain',
      complexity: 0.4,
      size: { width: 1024, height: 768 },
      type: 'evidence'
    },
    {
      id: 'motion_summary_judgment',
      title: 'Motion for Summary Judgment',
      complexity: 0.9,
      size: { width: 2048, height: 3200 },
      type: 'motion'
    }
  ];
  
  let currentDoc = demoDocuments[0];
  $: currentDoc = demoDocuments.find(d => d.id === selectedDocument) || demoDocuments[0];
  
  // Reactive LOD calculation
  $: lodContext = {
    viewportDistance,
    scrollVelocity: scrollVelocity > 0 ? scrollVelocity : undefined,
    memoryPressure: memoryPressure > 0 ? memoryPressure : undefined,
    documentComplexity
  } satisfies LODContext;
  
  $: calculatedLOD = lodManager.calculateLOD(lodContext);
  $: lodInfo = lodManager.LOD_LEVELS[calculatedLOD];
  
  onMount(() => {
    // Update memory stats periodically
    const interval = setInterval(() => {
      memoryStats = lodManager.getMemoryStats();
    }, 1000);
    
    return () => clearInterval(interval);
  });
  
  async function processDocument() {
    const startTime = performance.now();
    
    try {
      // Simulate document processing through the pipeline
      console.log(`🎮 Processing ${currentDoc.title} through NES pipeline...`);
      
      // Stream texture at optimal LOD
      const textureChunk = await lodManager.streamTexture(currentDoc.id, calculatedLOD);
      
      processingTime = performance.now() - startTime;
      
      if (textureChunk) {
        console.log(`✅ Document processed in ${processingTime.toFixed(2)}ms`);
      } else {
        console.warn('❌ Document processing failed');
      }
    } catch (error) {
      console.error('❌ Processing error:', error);
      processingTime = performance.now() - startTime;
    }
  }
  
  async function preloadAllLODs() {
    console.log(`🎮 Preloading all LOD levels for ${currentDoc.title}...`);
    
    const startTime = performance.now();
    const promises = [];
    
    for (let lod = 0; lod <= 3; lod++) {
      promises.push(lodManager.streamTexture(currentDoc.id, lod as any));
    }
    
    try {
      await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      console.log(`✅ All LOD levels preloaded in ${totalTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Preload failed:', error);
    }
  }
  
  function updateScrollVelocity() {
    // Simulate scroll velocity for demo
    scrollVelocity = Math.random() * 200;
    setTimeout(() => scrollVelocity = 0, 1000);
  }
</script>

<div class="nes-container with-title">
  <p class="title">🎮 NES Texture Streaming Demo</p>
  
  <!-- Document Selection -->
  <div class="demo-section">
    <div>
      <divHeader>
        <divTitle>Legal Document Selection</h3>
      </div>
      <divContent>
        <div class="nes-field">
          <label for="doc-select" class="nes-text">Document:</label>
          <div class="nes-select">
            <select id="doc-select" bind:value={selectedDocument}>
              {#each demoDocuments as doc}
                <option value={doc.id}>{doc.title}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <div class="document-info">
          <p><strong>Type:</strong> {currentDoc.type}</p>
          <p><strong>Complexity:</strong> {(currentDoc.complexity * 100).toFixed(0)}%</p>
          <p><strong>Size:</strong> {currentDoc.size.width}×{currentDoc.size.height}</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- LOD Controls -->
  <div class="demo-section">
    <div>
      <divHeader>
        <divTitle>N64-Style LOD Controls</h3>
      </div>
      <divContent>
        <div class="controls-grid">
          <div class="nes-field">
            <label for="distance" class="nes-text">Viewport Distance: {viewportDistance}</label>
            <input 
              type="range" 
              id="distance"
              class="nes-input" 
              min="0" 
              max="100" 
              bind:value={viewportDistance}
            />
          </div>
          
          <div class="nes-field">
            <label for="memory" class="nes-text">Memory Pressure: {(memoryPressure * 100).toFixed(0)}%</label>
            <input 
              type="range" 
              id="memory"
              class="nes-input" 
              min="0" 
              max="1" 
              step="0.1" 
              bind:value={memoryPressure}
            />
          </div>
          
          <div class="nes-field">
            <label for="complexity" class="nes-text">Doc Complexity: {(documentComplexity * 100).toFixed(0)}%</label>
            <input 
              type="range" 
              id="complexity"
              class="nes-input" 
              min="0" 
              max="1" 
              step="0.1" 
              bind:value={documentComplexity}
            />
          </div>
        </div>
        
        <div class="action-buttons">
          <Button on:click={processDocument}>Process Document</Button>
          <Button on:click={preloadAllLODs}>Preload All LODs</Button>
          <Button on:click={updateScrollVelocity}>Simulate Scroll</Button>
        </div>
        
        <div class="nes-field">
          <label class="nes-checkbox">
            <input type="checkbox" bind:checked={enableGPU} />
            <span>Enable WebGPU Acceleration</span>
          </label>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Texture Display -->
  <div class="demo-section">
    <div>
      <divHeader>
        <divTitle>NES Texture Streaming Result</h3>
      </div>
      <divContent>
        <div class="texture-display">
          <div class="texture-info">
            <p><strong>Calculated LOD:</strong> Level {calculatedLOD}</p>
            <p><strong>Resolution:</strong> {lodInfo.resolution.width}×{lodInfo.resolution.height}</p>
            <p><strong>Memory Budget:</strong> {(lodInfo.memoryBudget / 1024).toFixed(1)}KB</p>
            <p><strong>Description:</strong> {lodInfo.description}</p>
          </div>
          
          <!-- SSR-safe WebGPU texture streaming -->
          <div class="texture-container">
            <SSRWebGPULoader
              assetId={selectedDocument}
              width={Math.min(lodInfo.resolution.width * 4, 256)}
              height={Math.min(lodInfo.resolution.height * 4, 256)}
              {viewportDistance}
              {enableGPU}
              fallbackContent="<div class='nes-fallback'>Document Preview</div>"
            >
              <svelte:fragment slot="overlay" let:currentLOD let:webgpuSupported>
                <div class="texture-overlay">
                  LOD{currentLOD} | GPU:{webgpuSupported ? '✅' : '❌'}
                </div>
              </svelte:fragment>
              
              <svelte:fragment slot="debug" let:memoryStats let:currentLOD let:webgpuSupported>
                <div class="debug-info">
                  <small>
                    Cache: {memoryStats.cacheSize || 0} items |
                    L1: {(memoryStats.utilizationPercent?.L1 || 0).toFixed(1)}%
                  </small>
                </div>
              </svelte:fragment>
            </SSRWebGPULoader>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Performance Stats -->
  <div class="demo-section">
    <div>
      <divHeader>
        <divTitle>🚀 Performance Metrics</h3>
      </div>
      <divContent>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">Processing Time</div>
            <div class="stat-value">{processingTime.toFixed(2)}ms</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-label">Cache Size</div>
            <div class="stat-value">{memoryStats.cacheSize || 0}</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-label">L1 Memory</div>
            <div class="stat-value">{(memoryStats.utilizationPercent?.L1 || 0).toFixed(1)}%</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-label">Scroll Velocity</div>
            <div class="stat-value">{scrollVelocity.toFixed(0)}px/s</div>
          </div>
        </div>
        
        <div class="memory-breakdown">
          <h4>Nintendo-Style Memory Budget:</h4>
          <div class="memory-bars">
            <div class="memory-bar">
              <span>L1 CHR-ROM (1MB):</span>
              <div class="bar">
                <div 
                  class="bar-fill l1" 
                  style:width="{Math.min(100, memoryStats.utilizationPercent?.L1 || 0)}%"
                ></div>
              </div>
            </div>
            
            <div class="memory-bar">
              <span>L2 System RAM (2MB):</span>
              <div class="bar">
                <div 
                  class="bar-fill l2" 
                  style:width="{Math.min(100, memoryStats.utilizationPercent?.L2 || 0)}%"
                ></div>
              </div>
            </div>
            
            <div class="memory-bar">
              <span>L3 Expansion (1MB):</span>
              <div class="bar">
                <div 
                  class="bar-fill l3" 
                  style:width="{Math.min(100, memoryStats.utilizationPercent?.L3 || 0)}%"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .nes-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .demo-section {
    margin-bottom: 20px;
  }
  
  .controls-grid {
    display: grid;
    gap: 15px;
    margin-bottom: 15px;
  }
  
  .action-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin: 15px 0;
  }
  
  .document-info {
    margin-top: 15px;
    font-family: monospace;
    font-size: 12px;
  }
  
  .document-info p {
    margin: 5px 0;
  }
  
  .texture-display {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 20px;
    align-items: start;
  }
  
  .texture-info {
    font-family: monospace;
    font-size: 12px;
  }
  
  .texture-info p {
    margin: 8px 0;
  }
  
  .texture-container {
    position: relative;
    border: 2px solid #000;
  }
  
  .texture-overlay {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 2px 6px;
    font-size: 10px;
    font-family: monospace;
  }
  
  .debug-info {
    position: absolute;
    bottom: 2px;
    left: 2px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 2px 6px;
    font-size: 8px;
    font-family: monospace;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
  }
  
  .stat-box {
    text-align: center;
    padding: 10px;
    border: 2px solid #000;
    background: #f8f8f8;
  }
  
  .stat-label {
    font-size: 10px;
    text-transform: uppercase;
    margin-bottom: 5px;
    color: #666;
  }
  
  .stat-value {
    font-size: 16px;
    font-weight: bold;
    font-family: monospace;
  }
  
  .memory-breakdown h4 {
    margin-bottom: 10px;
    font-size: 14px;
  }
  
  .memory-bars {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .memory-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    font-family: monospace;
  }
  
  .memory-bar span {
    min-width: 160px;
  }
  
  .bar {
    flex: 1;
    height: 16px;
    border: 1px solid #000;
    background: #f0f0f0;
    position: relative;
  }
  
  .bar-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .bar-fill.l1 { background: #00d800; }
  .bar-fill.l2 { background: #3cbcfc; }
  .bar-fill.l3 { background: #fc9838; }
  
  @media (max-width: 640px) {
    .texture-display {
      grid-template-columns: 1fr;
    }
    
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>