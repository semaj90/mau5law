<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script>
</script>
  import { onMount } from 'svelte';
  import { useMachine } from '@xstate/svelte';
  import { aiAssistantMachine } from '$lib/machines/aiAssistantMachine.js';
  import { Button } from '$lib/components/ui/enhanced-bits';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  
  interface Props {
    initialContext?: any;
    enableSIMD?: boolean;
    useWebWorker?: boolean;
  }
  
  let {
    initialContext = {},
    enableSIMD = true,
    useWebWorker = true
  }: Props = $props();
  
  // XState machine with SIMD enhancement
  const machineWithSIMD = aiAssistantMachine.provide({
    context: {
      currentQuery: '',
      response: '',
      conversationHistory: [],
      sessionId: `simd-session-${Date.now()}`,
      isProcessing: false,
      model: 'gemma3-legal:latest',
      temperature: 0.7,
      maxTokens: 2048,
      
      // SIMD-specific context
      simdEnabled: enableSIMD,
      compressionTarget: 109,
      qualityTier: 'nes',
      instantUIEnabled: true,
      webWorkerEnabled: useWebWorker,
      
      // Enhanced tracking
      processingStats: {
        totalQueries: 0,
        avgCompressionRatio: 0,
        avgProcessingTime: 0,
        instantComponentsGenerated: 0
      },
      
      ...initialContext
    }
  });
  
  const { state, send } = useMachine(machineWithSIMD);
  
  let queryInput = $state('');
  let compressionTarget = $state(109);
  let qualityTier = $state('nes');
  let useWorker = $state(useWebWorker);
  let simdResults = $state(null);
  let liveComponents = $state([]);
  let processingLogs = $state([]);
  
  // Sample queries for legal AI testing
  const sampleQueries = [
    'Analyze the key terms in a software license agreement for potential risks.',
    'What are the essential elements of a valid contract under common law?',
    'Explain the difference between trademark and copyright protection.',
    'Draft a brief summary of employment law compliance requirements.',
    'What are the legal implications of data privacy regulations?'
  ];
  
  // Reactive state tracking
  let currentState = $derived(state.value);
  let context = $derived(state.context);
  let isProcessing = $derived(state.value === 'processing' || context.isProcessing);
  let hasResponse = $derived(!!context.response);
  
  async function submitQuery() {
    if (!queryInput.trim() || isProcessing) return;
    
    try {
      addLog(`🚀 Processing query with SIMD: "${queryInput.slice(0, 50)}..."`);
      
      // Send to XState machine
      send({ 
        type: 'QUERY', 
        query: queryInput.trim(),
        simdConfig: {
          compressionTarget,
          qualityTier,
          useWebWorker: useWorker
        }
      });
      
      // Call our enhanced Ollama-SIMD API
      const response = await fetch('/api/ai/ollama-simd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryInput.trim(),
          model: context.model,
          temperature: context.temperature,
          enable_simd: enableSIMD,
          compression_target: compressionTarget,
          quality_tier: qualityTier,
          generate_ui_components: true,
          use_web_worker: useWorker,
          session_id: context.sessionId,
          task_type: 'legal-analysis'
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Update machine state with results
      send({
        type: 'RESPONSE_RECEIVED',
        response: result.response,
        metadata: {
          model: result.model,
          tokensPerSecond: result.performance_metrics.tokens_per_second,
          totalDuration: result.total_duration,
          simdResults: result.simd_results
        }
      });
      
      // Store SIMD results for visualization
      if (result.simd_results?.enabled) {
        simdResults = result.simd_results;
        await generateLiveComponents(result.simd_results);
        addLog(`✅ SIMD compression: ${result.simd_results.total_compression_ratio.toFixed(1)}:1 ratio`);
        addLog(`🎨 Generated ${result.simd_results.instant_ui_components.length} UI components`);
      }
      
      addLog(`⚡ Response generated: ${result.performance_metrics.tokens_per_second?.toFixed(1)} tokens/sec`);
      
      queryInput = '';
      
    } catch (error) {
      console.error('Query processing failed:', error);
      addLog(`❌ Error: ${error.message}`);
      
      send({
        type: 'ERROR',
        error: error.message
      });
    }
  }
  
  async function generateLiveComponents(simdData) {
    if (!simdData.instant_ui_components) return;
    
    const components = simdData.instant_ui_components.map(comp => ({
      ...comp,
      timestamp: Date.now(),
      animated: qualityTier === 'nes'
    }));
    
    liveComponents = [
      ...components,
      ...liveComponents.slice(0, 10) // Keep last 10
    ];
    
    // Inject CSS dynamically
    components.forEach(comp => {
      injectComponentCSS(comp.css_styles, comp.id);
    });
  }
  
  function injectComponentCSS(css, componentId) {
    const existingStyle = document.getElementById(`style-${componentId}`);
    if (existingStyle) existingStyle.remove();
    
    const style = document.createElement('style');
    style.id = `style-${componentId}`;
    style.textContent = css;
    document.head.appendChild(style);
  }
  
  function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    processingLogs = [`[${timestamp}] ${message}`, ...processingLogs.slice(0, 19)];
  }
  
  function loadSampleQuery(index) {
    if (isProcessing) return;
    queryInput = sampleQueries[index];
  }
  
  function clearConversation() {
    send({ type: 'CLEAR_HISTORY' });
    simdResults = null;
    liveComponents = [];
    processingLogs = [];
    addLog('🧹 Conversation cleared');
  }
  
  function toggleSIMD() {
    enableSIMD = !enableSIMD;
    send({ type: 'UPDATE_CONFIG', config: { simdEnabled: enableSIMD } });
    addLog(`🔧 SIMD ${enableSIMD ? 'enabled' : 'disabled'}`);
  }
  
  function getStateColor(state) {
    switch (state) {
      case 'idle': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'streaming': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }
  
  function getCompressionColor(ratio) {
    if (ratio > 100) return 'text-purple-600 font-bold';
    if (ratio > 50) return 'text-green-600 font-bold';
    if (ratio > 25) return 'text-blue-600 font-semibold';
    return 'text-orange-600';
  }
  
  function getQualityBadgeColor(tier) {
    switch (tier) {
      case 'nes': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'snes': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'n64': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }
  
  onMount(() => {
    addLog('🧬 SIMD AI Assistant initialized with XState machine');
    addLog(`💡 SIMD: ${enableSIMD ? 'enabled' : 'disabled'}, WebWorker: ${useWorker ? 'enabled' : 'disabled'}`);
  });
</script>

<div class="simd-ai-assistant max-w-6xl mx-auto p-6 space-y-6">
  <!-- Enhanced Status Header with SIMD Info -->
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center justify-between">
        <span class="flex items-center gap-3">
          🧬 SIMD AI Assistant
          <span class="text-sm font-normal text-gray-500">XState + Ollama + 7-bit Compression</span>
        </span>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class={`w-3 h-3 rounded-full ${getStateColor(currentState)}`}></div>
            <span class="text-sm font-mono uppercase">{currentState}</span>
          </div>
          <span class={`px-2 py-1 rounded-full text-xs border ${getQualityBadgeColor(qualityTier)}`}>
            {qualityTier.toUpperCase()}
          </span>
          <div class="text-sm">
            Session: <span class="font-mono text-blue-600">{context.sessionId?.slice(-8)}</span>
          </div>
        </div>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <!-- System Status Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div class="bg-gray-50 p-3 rounded">
          <div class="font-semibold mb-1">Ollama Status</div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Connected</span>
          </div>
          <div class="text-gray-600 mt-1">Model: {context.model?.slice(0, 15)}...</div>
        </div>
        
        <div class="bg-gray-50 p-3 rounded">
          <div class="font-semibold mb-1">SIMD Compression</div>
          <div class="flex items-center gap-2">
            <div class={`w-2 h-2 rounded-full ${enableSIMD ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span>{enableSIMD ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div class="text-gray-600 mt-1">Target: {compressionTarget}:1</div>
        </div>
        
        <div class="bg-gray-50 p-3 rounded">
          <div class="font-semibold mb-1">Web Worker</div>
          <div class="flex items-center gap-2">
            <div class={`w-2 h-2 rounded-full ${useWorker ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span>{useWorker ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div class="text-gray-600 mt-1">Non-blocking processing</div>
        </div>
        
        <div class="bg-gray-50 p-3 rounded">
          <div class="font-semibold mb-1">UI Components</div>
          <div class="flex items-center gap-2">
            <div class={`w-2 h-2 rounded-full ${liveComponents.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span>{liveComponents.length} Active</span>
          </div>
          <div class="text-gray-600 mt-1">Instant rendering</div>
        </div>
      </div>
    </CardContent>
  </Card>
  
  <!-- Query Interface -->
  <Card>
    <CardHeader>
      <CardTitle>Legal AI Query Interface</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Configuration Controls -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2" for="compression-target">Compression Target</label><select id="compression-target" bind:value={compressionTarget} class="w-full p-2 border rounded-md text-sm">
            <option value={7}>7:1 (Ultra Quality)</option>
            <option value={25}>25:1 (High Quality)</option>
            <option value={50}>50:1 (Balanced)</option>
            <option value={109}>109:1 (7-bit NES)</option>
            <option value={200}>200:1 (Maximum)</option>
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
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="checkbox" bind:checked={useWorker} class="rounded mr-2" />
              <span class="text-sm">Web Worker</span>
            </label>
          </div>
        </div>
        
        <div class="flex items-end">
          <Button onclick={toggleSIMD} variant="outline" class="w-full text-sm bits-btn bits-btn">
            {enableSIMD ? '🔧 Disable SIMD' : '⚡ Enable SIMD'}
          </Button>
        </div>
      </div>
      
      <!-- Query Input -->
      <div class="space-y-2">
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={queryInput}
            placeholder="Enter your legal AI query..."
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isProcessing}
            onkeydown={(e) => e.key === 'Enter' && submitQuery()}
          />
          <Button
            onclick={submitQuery}
            disabled={isProcessing || !queryInput.trim()}
            class={isProcessing ? 'processing' : ''}
          >
            {isProcessing ? 'Processing...' : 'Submit'}
          </Button>
        </div>
        
        <!-- Sample Queries -->
        <div class="flex flex-wrap gap-2">
          {#each sampleQueries as sample, index}
            <Button class="bits-btn"
              onclick={() => loadSampleQuery(index)}
              variant="outline"
              size="sm"
              disabled={isProcessing}
              class="text-xs"
            >
              Sample {index + 1}
            </Button>
          {/each}
          <Button class="bits-btn" onclick={clearConversation} variant="outline" size="sm">
            Clear All
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
  
  <!-- SIMD Processing Results -->
  {#if simdResults?.enabled}
    <Card>
      <CardHeader>
        <CardTitle>🧬 SIMD Compression Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div class="text-center">
            <div class={`text-2xl font-bold ${getCompressionColor(simdResults.total_compression_ratio)}`}>
              {simdResults.total_compression_ratio.toFixed(1)}:1
            </div>
            <div class="text-sm text-gray-600">Compression</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{simdResults.compressed_tiles.length}</div>
            <div class="text-sm text-gray-600">Tiles</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{simdResults.instant_ui_components.length}</div>
            <div class="text-sm text-gray-600">Components</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">
              {simdResults.processing_stats.simd_compression_time}ms
            </div>
            <div class="text-sm text-gray-600">SIMD Time</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">
              {simdResults.processing_stats.total_pipeline_time}ms
            </div>
            <div class="text-sm text-gray-600">Total Time</div>
          </div>
        </div>
        
        <!-- Compressed Tiles Visualization -->
        {#if simdResults.compressed_tiles.length > 0}
          <div class="space-y-2">
            <h4 class="font-medium text-gray-700">Compressed Tiles (7-bit encoding):</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {#each simdResults.compressed_tiles.slice(0, 12) as tile, index}
                <div class="bg-gray-800 text-white p-2 rounded text-xs">
                  <div class="flex justify-between items-center mb-1">
                    <span>#{index + 1}</span>
                    <span class="text-green-400">{tile.compression_ratio.toFixed(0)}:1</span>
                  </div>
                  <div class="text-gray-300 text-xs">
                    {tile.compressed_bytes}B
                  </div>
                  <div class="text-gray-500 text-xs">
                    {(tile.semantic_preservation * 100).toFixed(0)}% semantic
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>
  {/if}
  
  <!-- Live Rendered Components -->
  {#if liveComponents.length > 0}
    <Card>
      <CardHeader>
        <CardTitle>🎮 Live SIMD Components</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="bg-gray-900 p-4 rounded-lg text-white">
          <div class="text-sm text-gray-300 mb-3">
            Instant UI components generated from compressed tiles ({qualityTier.toUpperCase()} quality):
          </div>
          <div class="space-y-2">
            {#each liveComponents.slice(0, 8) as component (component.id)}
              <div class="live-component p-2 rounded border border-gray-700">
                <div class="text-xs text-gray-400 mb-1">
                  {component.type} • Render: {component.render_time}ms
                </div>
                <div class="rendered-content">
                  {@html component.dom_structure}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </CardContent>
    </Card>
  {/if}
  
  <!-- AI Response -->
  {#if hasResponse}
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          🤖 AI Response
          {#if context.metadata?.simdResults?.enabled}
            <span class="text-sm font-normal text-green-600">
              SIMD Enhanced • {context.metadata.simdResults.total_compression_ratio.toFixed(1)}:1
            </span>
          {/if}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="prose max-w-none">
          <div class="whitespace-pre-wrap bg-white p-4 rounded border">
            {context.response}
          </div>
        </div>
        
        {#if context.metadata}
          <div class="mt-4 text-sm text-gray-600 space-y-1">
            <div><strong>Model:</strong> {context.metadata.model}</div>
            <div><strong>Speed:</strong> {context.metadata.tokensPerSecond?.toFixed(1)} tokens/sec</div>
            <div><strong>Duration:</strong> {(context.metadata.totalDuration / 1000000).toFixed(0)}ms</div>
            {#if context.metadata.simdResults?.enabled}
              <div><strong>SIMD Worker:</strong> {context.metadata.simdResults.processing_stats.web_worker_used ? 'Yes' : 'No'}</div>
            {/if}
          </div>
        {/if}
      </CardContent>
    </Card>
  {/if}
  
  <!-- Conversation History -->
  {#if context.conversationHistory && context.conversationHistory.length > 0}
    <Card>
      <CardHeader>
        <CardTitle>📜 Conversation History</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3 max-h-96 overflow-y-auto">
          {#each context.conversationHistory as entry}
            <div class="flex gap-3 p-3 rounded-lg {entry.type === 'user' ? 'bg-blue-50' : 'bg-green-50'}">
              <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center {entry.type === 'user' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}">
                {entry.type === 'user' ? 'U' : 'AI'}
              </div>
              <div class="flex-1">
                <div class="text-sm text-gray-500 mb-1">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                  {#if entry.metadata?.simd_enabled}
                    <span class="ml-2 px-1 py-0 bg-purple-100 text-purple-800 rounded text-xs">
                      SIMD {entry.metadata.compression_ratio?.toFixed(1)}:1
                    </span>
                  {/if}
                </div>
                <div class="text-gray-900">{entry.content}</div>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}
  
  <!-- Processing Logs -->
  {#if processingLogs.length > 0}
    <Card>
      <CardHeader>
        <CardTitle class="flex justify-between items-center">
          📝 System Logs
          <Button class="bits-btn" onclick={() => processingLogs = []} variant="outline" size="sm">
            Clear Logs
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-48 overflow-y-auto">
          {#each processingLogs as log}
            <div class="mb-1">{log}</div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}
</div>

<style>
  .simd-ai-assistant {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  /* NES-style rendering for live components */
  :global(.rendered-content) {
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    font-family: 'Courier New', monospace;
  }
  
  /* Processing animation */
  @keyframes processing-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  .processing {
    animation: processing-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  /* Live component animations */
  .live-component {
    transition: all 0.3s ease-in-out;
  }
  
  .live-component:hover {
    transform: scale(1.02);
    background-color: rgba(59, 130, 246, 0.1);
  }
  
  /* Enhanced scrollbars */
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
  
  /* Quality tier specific effects */
  :global(.tile-nes) {
    filter: contrast(1.2) saturate(1.3);
  }
  
  :global(.tile-snes) {
    filter: contrast(1.1) saturate(1.1);
  }
  
  :global(.tile-n64) {
    filter: contrast(1.0) saturate(1.0);
  }
</style>
