<script lang="ts">
</script>
  import { onMount } from 'svelte';
  import { glyphEmbedsClient, GLYPH_PRESETS, type GlyphEmbedResult, type GlyphEmbedRequest } from '$lib/api/glyph-embeds-client.js';
  
  // State
  let isLoading = false;
  let healthStatus = $state(null);
  let glyphResults = $state<GlyphEmbedResult[]>([]);
  let selectedPreset = $state<keyof typeof GLYPH_PRESETS>('detective');
  let errorMessage = $state('');
  let successMessage = $state('');
  
  // Form data
  let evidenceId = $state('demo_evidence_001');
  let prompt = $state('Legal evidence visualization showing document authenticity');
  let customStyle = $state('');
  let useCustomStyle = $state(false);
  
  // SIMD Configuration
  let simdConfig = $state({
    enable_tiling: true,
    tile_size: 16,
    compression_target: 50,
    shader_format: 'webgpu' as const,
    adaptive_quality: true,
    performance_tier: 'n64' as const
  });
  
  // Check service health on mount
  onMount(async () => {
    try {
      const health = await glyphEmbedsClient.getHealthStatus();
      healthStatus = health.data || null;
    } catch (error) {
      console.warn('Health check failed:', error);
    }
  });
  
  async function generateGlyph() {
    if (!prompt.trim() || !evidenceId.trim()) {
      errorMessage = 'Evidence ID and prompt are required';
      return;
    }
    
    isLoading = true;
    errorMessage = '';
    successMessage = '';
    
    try {
      const request: GlyphEmbedRequest = {
        evidence_id: evidenceId,
        prompt: prompt.trim(),
        style: useCustomStyle ? customStyle : GLYPH_PRESETS[selectedPreset].style,
        dimensions: [512, 512],
        simd_config: simdConfig,
        neural_sprite_config: {
          enable_compression: true,
          target_ratio: 2.0,
          predictive_frames: 4
        }
      };
      
      const result = await glyphEmbedsClient.generateGlyph(request);
      
      if (result.success && result.data) {
        glyphResults = [result.data, ...glyphResults];
        successMessage = `Generated in ${result.data.generation_time_ms}ms with ${result.data.cache_hits} cache hits`;
      } else {
        errorMessage = result.error || 'Generation failed';
      }
      
    } catch (error) {
      errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    } finally {
      isLoading = false;
    }
  }
  
  async function generateVariations() {
    if (!prompt.trim() || !evidenceId.trim()) {
      errorMessage = 'Evidence ID and prompt are required';
      return;
    }
    
    isLoading = true;
    errorMessage = '';
    successMessage = '';
    
    try {
      const baseRequest: GlyphEmbedRequest = {
        evidence_id: evidenceId,
        prompt: prompt.trim(),
        dimensions: [512, 512]
      };
      
      const variations = Object.entries(GLYPH_PRESETS).map(([key, preset]) => ({
        style: preset.style,
        simd_config: preset.simd_config
      });
      const results = await glyphEmbedsClient.generateGlyphVariations(baseRequest, variations);
      const successful = results.filter(r => r.success && r.data).map(r => r.data!);
      
      if (successful.length > 0) {
        glyphResults = [...successful, ...glyphResults];
        successMessage = `Generated ${successful.length} variations`;
      } else {
        errorMessage = 'All variations failed to generate';
      }
      
    } catch (error) {
      errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    } finally {
      isLoading = false;
    }
  }
  
  async function downloadArtifact(result: GlyphEmbedResult) {
    const download = await glyphEmbedsClient.downloadEnhancedArtifact(
      result, 
      `glyph_${evidenceId}_${Date.now()}.png`
    );
    
    if (!download.success) {
      errorMessage = download.error || 'Download failed';
    }
  }
  
  function clearMessages() {
    errorMessage = '';
    successMessage = '';
  }
  
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
</script>

<div class="min-h-screen bg-gray-900 text-white p-6">
  <div class="max-w-6xl mx-auto">
    <header class="mb-8">
      <h1 class="text-4xl font-bold mb-4 text-blue-400">SIMD Glyph Generator</h1>
      <p class="text-gray-300 mb-4">
        Generate WebGL/WebGPU-optimized legal evidence visualizations with SIMD tiling compression
      </p>
      
      <!-- Health Status -->
      {#if healthStatus}
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 class="text-lg font-semibold mb-2 text-green-400">Service Status</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span class="text-gray-400">Status:</span>
              <span class="ml-2 text-green-400">{healthStatus.status}</span>
            </div>
            <div>
              <span class="text-gray-400">SIMD Tiling:</span>
              <span class="ml-2">{healthStatus.features.simd_gpu_tiling ? '✅' : '❌'}</span>
            </div>
            <div>
              <span class="text-gray-400">Formats:</span>
              <span class="ml-2 text-blue-400">{healthStatus.supported_formats.join(', ')}</span>
            </div>
            <div>
              <span class="text-gray-400">Tiers:</span>
              <span class="ml-2 text-yellow-400">{healthStatus.performance_tiers.join(', ')}</span>
            </div>
          </div>
        </div>
      {/if}
      
      <!-- Messages -->
      {#if errorMessage}
        <div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          <span>{errorMessage}</span>
          <button onclick={clearMessages} class="float-right text-red-400 hover:text-red-200">✕</button>
        </div>
      {/if}
      
      {#if successMessage}
        <div class="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded mb-4">
          <span>{successMessage}</span>
          <button onclick={clearMessages} class="float-right text-green-400 hover:text-green-200">✕</button>
        </div>
      {/if}
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Configuration Panel -->
      <div class="lg:col-span-1">
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold mb-4 text-blue-400">Configuration</h2>
          
          <!-- Basic Settings -->
          <div class="space-y-4 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Evidence ID</label>
              <input 
                bind:value={evidenceId}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="evidence_001"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
              <textarea 
                bind:value={prompt}
                rows="3"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the legal evidence visualization..."
              ></textarea>
            </div>
            
            <!-- Style Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Style</label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input 
                    type="radio" 
                    bind:group={useCustomStyle} 
                    value={false}
                    class="mr-2"
                  />
                  <span>Preset:</span>
                  <select 
                    bind:value={selectedPreset}
                    disabled={useCustomStyle}
                    class="ml-2 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50"
                  >
                    {#each Object.keys(GLYPH_PRESETS) as preset}
                      <option value={preset}>{preset}</option>
                    {/each}
                  </select>
                </label>
                
                <label class="flex items-center">
                  <input 
                    type="radio" 
                    bind:group={useCustomStyle} 
                    value={true}
                    class="mr-2"
                  />
                  <span>Custom:</span>
                  <input 
                    bind:value={customStyle}
                    disabled={!useCustomStyle}
                    class="ml-2 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50"
                    placeholder="custom style"
                  />
                </label>
              </div>
            </div>
          </div>
          
          <!-- SIMD Configuration -->
          <div class="border-t border-gray-700 pt-4 space-y-4">
            <h3 class="text-lg font-medium text-yellow-400">SIMD Options</h3>
            
            <label class="flex items-center">
              <input 
                type="checkbox" 
                bind:checked={simdConfig.enable_tiling}
                class="mr-2"
              />
              <span class="text-sm">Enable SIMD Tiling</span>
            </label>
            
            <div>
              <label class="block text-sm text-gray-300 mb-1">Tile Size: {simdConfig.tile_size}px</label>
              <input 
                type="range" 
                bind:value={simdConfig.tile_size}
                min="8" 
                max="64" 
                step="8"
                class="w-full"
              />
            </div>
            
            <div>
              <label class="block text-sm text-gray-300 mb-1">Compression: {simdConfig.compression_target}:1</label>
              <input 
                type="range" 
                bind:value={simdConfig.compression_target}
                min="10" 
                max="100" 
                step="10"
                class="w-full"
              />
            </div>
            
            <div>
              <label class="block text-sm text-gray-300 mb-1">Shader Format</label>
              <select 
                bind:value={simdConfig.shader_format}
                class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="webgpu">WebGPU</option>
                <option value="webgl">WebGL</option>
                <option value="css">CSS</option>
                <option value="svg">SVG</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-gray-300 mb-1">Performance Tier</label>
              <select 
                bind:value={simdConfig.performance_tier}
                class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="nes">NES (Low)</option>
                <option value="snes">SNES (Medium)</option>
                <option value="n64">N64 (High)</option>
              </select>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="border-t border-gray-700 pt-4 space-y-3">
            <button 
              onclick={generateGlyph}
              disabled={isLoading}
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? 'Generating...' : 'Generate Glyph'}
            </button>
            
            <button 
              onclick={generateVariations}
              disabled={isLoading}
              class="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? 'Generating...' : 'Generate All Presets'}
            </button>
          </div>
        </div>
      </div>

      <!-- Results Panel -->
      <div class="lg:col-span-2">
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold mb-4 text-blue-400">Generated Glyphs</h2>
          
          {#if glyphResults.length === 0}
            <div class="text-center text-gray-400 py-8">
              <p>No glyphs generated yet. Configure your settings and click "Generate Glyph".</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {#each glyphResults as result, index}
                <div class="bg-gray-700 rounded-lg p-4">
                  <!-- Glyph Image -->
                  <div class="mb-4">
                    <img 
                      src={result.glyph_url} 
                      alt="Generated glyph"
                      class="w-full h-48 object-cover rounded-lg bg-gray-600"
                      loading="lazy"
                    />
                  </div>
                  
                  <!-- Metadata -->
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-400">Generation Time:</span>
                      <span class="text-white">{result.generation_time_ms}ms</span>
                    </div>
                    
                    <div class="flex justify-between">
                      <span class="text-gray-400">Cache Hits:</span>
                      <span class="text-white">{result.cache_hits}</span>
                    </div>
                    
                    <div class="flex justify-between">
                      <span class="text-gray-400">Tensors:</span>
                      <span class="text-white">{result.tensor_ids.length}</span>
                    </div>
                    
                    {#if result.simd_shader_data}
                      <div class="border-t border-gray-600 pt-2 mt-2">
                        <div class="flex justify-between">
                          <span class="text-yellow-400">SIMD Compression:</span>
                          <span class="text-white">{result.simd_shader_data.compression_ratio.toFixed(1)}:1</span>
                        </div>
                        
                        <div class="flex justify-between">
                          <span class="text-yellow-400">Tiles:</span>
                          <span class="text-white">{result.simd_shader_data.tile_map.length}</span>
                        </div>
                        
                        <div class="flex justify-between">
                          <span class="text-yellow-400">Processing:</span>
                          <span class="text-white">{result.simd_shader_data.performance_stats.total_optimization_time_ms}ms</span>
                        </div>
                      </div>
                    {/if}
                  </div>
                  
                  <!-- Actions -->
                  <div class="mt-4 space-y-2">
                    {#if result.enhanced_artifact_url}
                      <button 
                        onclick={() => downloadArtifact(result)}
                        class="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
                      >
                        Download Enhanced PNG
                      </button>
                    {/if}
                    
                    {#if result.simd_shader_data}
                      <button 
                        onclick={() => navigator.clipboard.writeText(result.simd_shader_data.shader_code)}
                        class="w-full bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
                      >
                        Copy Shader Code
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar for better UX */
  :global(html) {
    scrollbar-width: thin;
    scrollbar-color: #4a5568 #2d3748;
  }
  
  :global(::-webkit-scrollbar) {
    width: 8px;
  }
  
  :global(::-webkit-scrollbar-track) {
    background: #2d3748;
  }
  
  :global(::-webkit-scrollbar-thumb) {
    background: #4a5568;
    border-radius: 4px;
  }
  
  :global(::-webkit-scrollbar-thumb:hover) {
    background: #718096;
  }
</style>