<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script>
</script>
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/enhanced-bits';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  
  let isProcessing = $state(false);
  let results = $state([]);
  let selectedMode = $state('langchain-simd');
  let compressionTarget = $state(109);
  let qualityTier = $state('nes');
  let batchMode = $state(false);
  let enableInstantUI = $state(true);
  
  const sampleTexts = [
    {
      title: 'Legal Contract Analysis',
      text: 'Software License Agreement grants licensee non-exclusive rights to use proprietary software. The license fee is $50,000 annually with maintenance support included. Reverse engineering and redistribution are prohibited without written consent. This agreement includes confidentiality clauses and performance guarantees.',
      type: 'legal'
    },
    {
      title: 'Technical Documentation',
      text: 'The SIMD GPU tiling engine processes text embeddings using 7-bit NES-style compression, achieving ratios of 109:1. WebGPU compute shaders enable parallel processing across multiple GPU cores, with vertex buffer caching for instantaneous UI component generation.',
      type: 'technical'
    },
    {
      title: 'Medical Report Extract',
      text: 'Patient presents with acute symptoms including elevated blood pressure (150/90 mmHg), irregular heartbeat, and chest pain. Recommended treatment includes beta-blockers, lifestyle modifications, and follow-up examination in 2 weeks. Laboratory results show elevated troponin levels.',
      type: 'medical'
    },
    {
      title: 'Financial Analysis',
      text: 'Quarterly revenue increased 23% to $45.2M, driven by strong software license sales and recurring subscription revenue. Operating margin improved to 18.5%, with EBITDA of $8.3M. Cash flow from operations was $12.1M, supporting continued investment in R&D and market expansion.',
      type: 'financial'
    }
  ];
  
  let systemStats = $state({
    totalProcessed: 0,
    averageCompressionRatio: 0,
    averageProcessingTime: 0,
    instantComponentsGenerated: 0,
    gpuUtilizationAverage: 0,
    memoryEfficiencyAverage: 0
  });
  
  let liveRenderedComponents = $state([]);
  let processingLogs = $state([]);
  
  async function processSingleText(sampleIndex = 0) {
    try {
      isProcessing = true;
      const sample = sampleTexts[sampleIndex];
      
      addLog(`🚀 Starting ${selectedMode} processing: "${sample.title}"`);
      addLog(`📊 Target compression: ${compressionTarget}:1, Quality: ${qualityTier.toUpperCase()}`);
      
      const requestData = {
        text: sample.text,
        model: 'nomic-embed-text',
        type: sample.type,
        simd_config: {
          compressionRatio: compressionTarget,
          qualityTier: qualityTier,
          enableGPUAcceleration: true,
          semanticClustering: true
        },
        ui_target: 'component',
        enable_vertex_caching: true,
        compression_target: compressionTarget
      };
      
      const apiEndpoint = selectedMode === 'direct-simd' 
        ? '/api/ocr/simd-langextract'
        : '/api/v1/webgpu/langextract';
      
      const startTime = Date.now();
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      const processingTime = Date.now() - startTime;
      
      if (result.success || result.simd_results) {
        const simdData = result.simd_results || result.result?.simd_results;
        
        if (simdData) {
          const newResult = {
            id: `result-${Date.now()}`,
            timestamp: new Date().toISOString(),
            title: sample.title,
            type: sample.type,
            originalText: sample.text,
            processingMode: selectedMode,
            compressionTarget: compressionTarget,
            qualityTier: qualityTier,
            processingTime,
            
            // SIMD results
            compressedTiles: simdData.compressed_tiles || [],
            totalCompressionRatio: simdData.processing_stats?.total_compression_ratio || 0,
            gpuUtilization: simdData.processing_stats?.gpu_utilization || 0,
            semanticPreservation: simdData.processing_stats?.semantic_preservation_score || 0,
            
            // UI components
            instantComponents: simdData.ui_components?.instant_render || false,
            componentCount: simdData.ui_components?.instant_render ? simdData.compressed_tiles?.length || 0 : 0,
            renderingInstructions: simdData.ui_components?.rendering_instructions || '',
            cssOptimized: simdData.ui_components?.css_optimized || '',
            
            // Performance stats
            memoryEfficiency: calculateMemoryEfficiency(sample.text.length, simdData),
            cacheHits: simdData.processing_stats?.cache_hits || 0
          };
          
          results = [newResult, ...results.slice(0, 9)]; // Keep last 10 results
          updateSystemStats(newResult);
          
          if (enableInstantUI && simdData.ui_components?.instant_render) {
            await renderLiveComponents(newResult);
          }
          
          addLog(`✅ Processing complete: ${processingTime}ms, ${newResult.totalCompressionRatio.toFixed(1)}:1 compression`);
          addLog(`📱 Generated ${newResult.componentCount} instant UI components`);
          
        } else {
          throw new Error('No SIMD results in response');
        }
      } else {
        throw new Error(result.error || 'Processing failed');
      }
      
    } catch (error) {
      console.error('Text processing failed:', error);
      addLog(`❌ Error: ${error.message}`);
      alert(`Processing failed: ${error.message}`);
    } finally {
      isProcessing = false;
    }
  }
  
  async function processBatchTexts() {
    try {
      isProcessing = true;
      batchMode = true;
      
      addLog(`🚀 Starting batch processing: ${sampleTexts.length} texts`);
      
      const batchResults = [];
      
      for (let i = 0; i < sampleTexts.length; i++) {
        await processSingleText(i);
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between requests
        
        if (!isProcessing) break; // Allow cancellation
      }
      
      addLog(`✅ Batch processing complete: ${results.length} texts processed`);
      
    } finally {
      batchMode = false;
      isProcessing = false;
    }
  }
  
  async function benchmarkCompressionLevels() {
    try {
      isProcessing = true;
      addLog('🧪 Starting compression benchmark...');
      
      const compressionLevels = [10, 25, 50, 109, 200];
      const originalTarget = compressionTarget;
      const sampleText = sampleTexts[0];
      
      for (const level of compressionLevels) {
        compressionTarget = level;
        addLog(`📊 Testing ${level}:1 compression...`);
        
        await processSingleText(0);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!isProcessing) break;
      }
      
      compressionTarget = originalTarget;
      addLog('✅ Compression benchmark complete');
      
    } finally {
      isProcessing = false;
    }
  }
  
  function updateSystemStats(result) {
    systemStats.totalProcessed++;
    
    // Rolling averages
    systemStats.averageCompressionRatio = 
      (systemStats.averageCompressionRatio * (systemStats.totalProcessed - 1) + result.totalCompressionRatio) / systemStats.totalProcessed;
    
    systemStats.averageProcessingTime =
      (systemStats.averageProcessingTime * (systemStats.totalProcessed - 1) + result.processingTime) / systemStats.totalProcessed;
    
    systemStats.gpuUtilizationAverage =
      (systemStats.gpuUtilizationAverage * (systemStats.totalProcessed - 1) + result.gpuUtilization) / systemStats.totalProcessed;
    
    systemStats.memoryEfficiencyAverage =
      (systemStats.memoryEfficiencyAverage * (systemStats.totalProcessed - 1) + result.memoryEfficiency) / systemStats.totalProcessed;
    
    systemStats.instantComponentsGenerated += result.componentCount;
  }
  
  async function renderLiveComponents(result) {
    if (!result.cssOptimized || !result.renderingInstructions) return;
    
    try {
      // Create live rendered component
      const liveComponent = {
        id: `live-${result.id}`,
        title: result.title,
        css: result.cssOptimized,
        html: generateLiveHTML(result),
        timestamp: Date.now()
      };
      
      liveRenderedComponents = [liveComponent, ...liveRenderedComponents.slice(0, 4)]; // Keep last 5
      
      // Inject CSS dynamically
      injectCSS(liveComponent.css, liveComponent.id);
      
    } catch (error) {
      console.warn('Live component rendering failed:', error);
    }
  }
  
  function generateLiveHTML(result) {
    const tiles = result.compressedTiles || [];
    
    return tiles.slice(0, 10).map((tile, index) => { // Show first 10 tiles
      const tileId = `tile-${result.id}-${index}`;
      return `<div class="text-tile-${tileId} inline-block p-2 m-1 rounded border">
        <span class="text-xs">${tile.metadata?.categories?.join(' ') || 'tile'}</span>
        <div class="text-xs opacity-70">${(tile.compression_ratio || 1).toFixed(1)}:1</div>
      </div>`;
    }).join('');
  }
  
  function injectCSS(css, componentId) {
    const existingStyle = document.getElementById(`style-${componentId}`);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = `style-${componentId}`;
    style.textContent = css;
    document.head.appendChild(style);
  }
  
  function calculateMemoryEfficiency(originalSize, simdData) {
    if (!simdData.compressed_tiles) return 0;
    
    const compressedSize = simdData.compressed_tiles.reduce((sum, tile) => 
      sum + (tile.compressed_data?.length || 7), 0
    );
    
    return Math.max(0, 1 - (compressedSize / (originalSize * 4)));
  }
  
  function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    processingLogs = [`[${timestamp}] ${message}`, ...processingLogs.slice(0, 19)]; // Keep last 20 logs
  }
  
  function getCompressionColor(ratio) {
    if (ratio > 100) return 'text-purple-600 font-bold';
    if (ratio > 50) return 'text-green-600 font-bold';
    if (ratio > 25) return 'text-blue-600 font-semibold';
    if (ratio > 10) return 'text-orange-600';
    return 'text-red-600';
  }
  
  function getQualityTierColor(tier) {
    switch (tier) {
      case 'nes': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'snes': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'n64': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }
  
  function clearAll() {
    results = [];
    liveRenderedComponents = [];
    processingLogs = [];
    systemStats = {
      totalProcessed: 0,
      averageCompressionRatio: 0,
      averageProcessingTime: 0,
      instantComponentsGenerated: 0,
      gpuUtilizationAverage: 0,
      memoryEfficiencyAverage: 0
    };
  }
  
  onMount(() => {
    addLog('🧬 SIMD Text Tiling Demo initialized');
    addLog('💡 Select processing mode and compression target, then click "Process Sample"');
  });
</script>

<div class="p-6 max-w-7xl mx-auto space-y-6 simd-text-demo">
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        🧬 SIMD Text Tiling Demo
        <span class="text-sm font-normal text-gray-500">
          7-bit NES-style Compression with Instantaneous UI Generation
        </span>
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-6">
      <!-- Configuration Panel -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2" for="processing-mode">Processing Mode</label><select id="processing-mode" bind:value={selectedMode} class="w-full p-2 border rounded-md text-sm">
            <option value="direct-simd">Direct SIMD API</option>
            <option value="langchain-simd">LangChain + SIMD Bridge</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2" for="compression-target">Compression Target</label><select id="compression-target" bind:value={compressionTarget} class="w-full p-2 border rounded-md text-sm">
            <option value={10}>10:1 (High Quality)</option>
            <option value={25}>25:1 (Balanced)</option>
            <option value={50}>50:1 (Compressed)</option>
            <option value={109}>109:1 (7-bit NES)</option>
            <option value={200}>200:1 (Ultra)</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2" for="quality-tier">Quality Tier</label><select id="quality-tier" bind:value={qualityTier} class="w-full p-2 border rounded-md text-sm">
            <option value="nes">NES (8-bit)</option>
            <option value="snes">SNES (16-bit)</option>
            <option value="n64">N64 (64-bit)</option>
          </select>
        </div>
        
        <div class="flex flex-col">
          <label class="block text-sm font-medium text-gray-700 mb-2">Options</label>
          <div class="flex items-center space-x-2">
            <input type="checkbox" bind:checked={enableInstantUI} id="instant-ui" class="rounded" />
            <label for="instant-ui" class="text-xs">Instant UI</label>
          </div>
        </div>
        
        <div class="flex items-end">
          <Button class="bits-btn" 
            onclick={() => processSingleText(Math.floor(Math.random() * sampleTexts.length))}
            disabled={isProcessing}
            class="w-full text-sm"
          >
            {isProcessing ? '🔄 Processing...' : '🚀 Process Sample'}
          </Button>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-2">
        <Button class="bits-btn" onclick={processBatchTexts} disabled={isProcessing} variant="outline" size="sm">
          📦 Batch Process ({sampleTexts.length})
        </Button>
        <Button class="bits-btn" onclick={benchmarkCompressionLevels} disabled={isProcessing} variant="outline" size="sm">
          🧪 Compression Benchmark
        </Button>
        <Button class="bits-btn" onclick={clearAll} variant="outline" size="sm">
          🗑️ Clear All
        </Button>
      </div>
      
      <!-- System Statistics -->
      {#if systemStats.totalProcessed > 0}
        <div class="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-blue-50 rounded-lg">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{systemStats.totalProcessed}</div>
            <div class="text-xs text-gray-600">Processed</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">
              {systemStats.averageCompressionRatio.toFixed(1)}:1
            </div>
            <div class="text-xs text-gray-600">Avg Compression</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">
              {systemStats.averageProcessingTime.toFixed(0)}ms
            </div>
            <div class="text-xs text-gray-600">Avg Time</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">
              {systemStats.instantComponentsGenerated}
            </div>
            <div class="text-xs text-gray-600">UI Components</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600">
              {(systemStats.gpuUtilizationAverage * 100).toFixed(0)}%
            </div>
            <div class="text-xs text-gray-600">GPU Usage</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-teal-600">
              {(systemStats.memoryEfficiencyAverage * 100).toFixed(0)}%
            </div>
            <div class="text-xs text-gray-600">Memory Eff</div>
          </div>
        </div>
      {/if}
    </CardContent>
  </Card>
  
  <!-- Live Rendered Components -->
  {#if liveRenderedComponents.length > 0}
    <Card>
      <CardHeader>
        <CardTitle>🎮 Live Rendered Components (NES-style)</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          {#each liveRenderedComponents as component (component.id)}
            <div class="border rounded-lg p-4 bg-gray-900 text-white">
              <div class="text-sm text-gray-300 mb-2">{component.title}</div>
              <div class="rendered-component">
                {@html component.html}
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}
  
  <!-- Processing Results -->
  {#if results.length > 0}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {#each results as result (result.id)}
        <Card class="overflow-hidden">
          <CardHeader class="pb-2">
            <CardTitle class="text-lg flex items-center justify-between">
              <span class="truncate">{result.title}</span>
              <div class="flex items-center gap-2">
                <span class={`px-2 py-1 rounded-full text-xs border ${getQualityTierColor(result.qualityTier)}`}>
                  {result.qualityTier.toUpperCase()}
                </span>
                <span class="text-xs text-gray-500">{result.processingMode}</span>
              </div>
            </CardTitle>
            <div class="text-sm text-gray-500">
              {result.type} • {new Date(result.timestamp).toLocaleTimeString()}
            </div>
          </CardHeader>
          
          <CardContent class="space-y-4">
            <!-- Original Text Preview -->
            <div class="text-xs bg-gray-100 p-2 rounded">
              <strong>Original ({result.originalText.length} chars):</strong>
              <div class="mt-1 text-gray-700">
                {result.originalText.substring(0, 150)}{result.originalText.length > 150 ? '...' : ''}
              </div>
            </div>
            
            <!-- SIMD Compression Stats -->
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium">Compression:</span>
                <span class={getCompressionColor(result.totalCompressionRatio)}>
                  {result.totalCompressionRatio.toFixed(1)}:1
                </span>
              </div>
              <div>
                <span class="font-medium">Tiles:</span>
                <span class="text-blue-600">{result.compressedTiles.length}</span>
              </div>
              <div>
                <span class="font-medium">Processing:</span>
                <span class="text-purple-600">{result.processingTime}ms</span>
              </div>
              <div>
                <span class="font-medium">Components:</span>
                <span class="text-green-600">{result.componentCount}</span>
              </div>
              <div>
                <span class="font-medium">GPU Usage:</span>
                <span class="text-indigo-600">{(result.gpuUtilization * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span class="font-medium">Semantic:</span>
                <span class="text-teal-600">{(result.semanticPreservation * 100).toFixed(0)}%</span>
              </div>
            </div>
            
            <!-- Tile Visualization -->
            {#if result.compressedTiles.length > 0}
              <div class="space-y-2">
                <div class="text-sm font-medium text-gray-700">Compressed Tiles (showing first 8):</div>
                <div class="grid grid-cols-4 gap-2">
                  {#each result.compressedTiles.slice(0, 8) as tile, index}
                    <div class="bg-gray-800 text-white p-2 rounded text-xs">
                      <div class="flex justify-between items-center mb-1">
                        <span>#{index + 1}</span>
                        <span class="text-green-400">{(tile.compression_ratio || 0).toFixed(0)}:1</span>
                      </div>
                      <div class="text-gray-300 truncate">
                        {tile.metadata?.categories?.join(',') || tile.id.slice(-8)}
                      </div>
                      <div class="text-gray-500 text-xs">
                        {tile.compressed_data?.length || 7}B
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            
            <!-- Performance Metrics -->
            <div class="bg-gray-50 p-3 rounded text-xs space-y-1">
              <div><strong>Memory Efficiency:</strong> {(result.memoryEfficiency * 100).toFixed(1)}%</div>
              <div><strong>Cache Hits:</strong> {result.cacheHits}</div>
              {#if result.instantComponents}
                <div><strong>Instant UI:</strong> <span class="text-green-600">✓ Enabled</span></div>
              {/if}
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  {:else}
    <Card>
      <CardContent class="text-center py-12 text-gray-500">
        <div class="text-6xl mb-4">🧬</div>
        <h3 class="text-lg font-medium mb-2">No SIMD Text Processing Results Yet</h3>
        <p class="mb-4">Process your first text with ultra-compressed 7-bit tiling!</p>
        <Button class="bits-btn" 
          onclick={() => processSingleText(0)}
          disabled={isProcessing}
        >
          🚀 Process Sample Text
        </Button>
      </CardContent>
    </Card>
  {/if}
  
  <!-- Processing Logs -->
  {#if processingLogs.length > 0}
    <Card>
      <CardHeader>
        <CardTitle class="flex justify-between items-center">
          📝 Processing Logs
          <Button class="bits-btn" onclick={() => processingLogs = []} variant="outline" size="sm">
            Clear Logs
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-64 overflow-y-auto">
          {#each processingLogs as log}
            <div class="mb-1">{log}</div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}
</div>

<style>
  .simd-text-demo {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  /* NES-style rendering for live components */
  :global(.rendered-component) {
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }
  
  /* Enhance tile visualizations */
  .grid > div {
    transition: transform 0.2s ease-in-out;
  }
  
  .grid > div:hover {
    transform: scale(1.05);
  }
  
  /* Processing animation */
  @keyframes processing-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  .processing {
    animation: processing-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  /* Log terminal styling */
  .bg-black {
    scrollbar-width: thin;
    scrollbar-color: #22c55e #000;
  }
  
  .bg-black::-webkit-scrollbar {
    width: 8px;
  }
  
  .bg-black::-webkit-scrollbar-track {
    background: #000;
  }
  
  .bg-black::-webkit-scrollbar-thumb {
    background: #22c55e;
    border-radius: 4px;
  }
</style>
