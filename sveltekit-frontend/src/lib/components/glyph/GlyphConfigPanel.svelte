<script lang="ts">
  import { GLYPH_PRESETS, type GlyphEmbedRequest, type SIMDGlyphConfig } from '$lib/api/glyph-embeds-client.js';
  
  interface Props {
    onGenerate: (request: GlyphEmbedRequest) => void;
    onGenerateVariations: (baseRequest: GlyphEmbedRequest) => void;
    isLoading?: boolean;
    initialConfig?: Partial<GlyphEmbedRequest>;
  }
  
  let { onGenerate, onGenerateVariations, isLoading = false, initialConfig = {} }: Props = $props();
  
  // Form state
  let evidenceId = $state(initialConfig.evidence_id?.toString() || 'demo_evidence_001');
  let prompt = $state(initialConfig.prompt || 'Legal evidence visualization showing document authenticity');
  let customStyle = $state('');
  let useCustomStyle = $state(false);
  let selectedPreset = $state<keyof typeof GLYPH_PRESETS>('detective');
  
  // Advanced options
  let showAdvanced = $state(false);
  let dimensions = $state<[number, number]>(initialConfig.dimensions || [512, 512]);
  let seed = $state<number | undefined>(initialConfig.seed);
  
  // SIMD Configuration
  let simdConfig = $state<SIMDGlyphConfig>({
    enable_tiling: true,
    tile_size: 16,
    compression_target: 50,
    shader_format: 'webgpu',
    adaptive_quality: true,
    performance_tier: 'n64',
    ...initialConfig.simd_config
  });
  
  // Neural Sprite Configuration
  let neuralSpriteConfig = $state({
    enable_compression: true,
    target_ratio: 2.0,
    predictive_frames: 4,
    ...initialConfig.neural_sprite_config
  });
  
  // Validation
  let validationErrors = $state<string[]>([]);
  
  function validateForm(): boolean {
    validationErrors = [];
    
    if (!evidenceId.trim()) {
      validationErrors.push('Evidence ID is required');
    }
    
    if (!prompt.trim()) {
      validationErrors.push('Prompt is required');
    }
    
    if (useCustomStyle && !customStyle.trim()) {
      validationErrors.push('Custom style cannot be empty');
    }
    
    if (dimensions[0] < 64 || dimensions[1] < 64) {
      validationErrors.push('Dimensions must be at least 64x64');
    }
    
    if (dimensions[0] > 2048 || dimensions[1] > 2048) {
      validationErrors.push('Dimensions cannot exceed 2048x2048');
    }
    
    return validationErrors.length === 0;
  }
  
  function buildRequest(): GlyphEmbedRequest {
    return {
      evidence_id: evidenceId.trim(),
      prompt: prompt.trim(),
      style: useCustomStyle ? customStyle.trim() : GLYPH_PRESETS[selectedPreset].style,
      dimensions,
      seed: seed || undefined,
      simd_config: simdConfig,
      neural_sprite_config: neuralSpriteConfig
    };
  }
  
  function handleGenerate() {
    if (!validateForm()) return;
    onGenerate(buildRequest());
  }
  
  function handleGenerateVariations() {
    if (!validateForm()) return;
    onGenerateVariations(buildRequest());
  }
  
  function loadPreset(preset: keyof typeof GLYPH_PRESETS) {
    selectedPreset = preset;
    const presetConfig = GLYPH_PRESETS[preset];
    simdConfig = { ...simdConfig, ...presetConfig.simd_config };
    useCustomStyle = false;
  }
  
  function resetToDefaults() {
    evidenceId = 'demo_evidence_001';
    prompt = 'Legal evidence visualization showing document authenticity';
    useCustomStyle = false;
    selectedPreset = 'detective';
    dimensions = [512, 512];
    seed = undefined;
    
    simdConfig = {
      enable_tiling: true,
      tile_size: 16,
      compression_target: 50,
      shader_format: 'webgpu',
      adaptive_quality: true,
      performance_tier: 'n64'
    };
    
    neuralSpriteConfig = {
      enable_compression: true,
      target_ratio: 2.0,
      predictive_frames: 4
    };
  }
  
  function exportConfig() {
    const config = buildRequest();
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
  }
  
  function importConfig() {
    const input = prompt('Paste configuration JSON:');
    if (!input) return;
    
    try {
      const config = JSON.parse(input);
      evidenceId = config.evidence_id?.toString() || evidenceId;
      prompt = config.prompt || prompt;
      dimensions = config.dimensions || dimensions;
      seed = config.seed;
      if (config.simd_config) simdConfig = { ...simdConfig, ...config.simd_config };
      if (config.neural_sprite_config) neuralSpriteConfig = { ...neuralSpriteConfig, ...config.neural_sprite_config };
    } catch (error) {
      alert('Invalid JSON configuration');
    }
  }
</script>

<div class="glyph-config-panel bg-gray-800 rounded-lg p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-semibold text-blue-400">Glyph Configuration</h2>
    <div class="flex gap-2">
      <button 
        onclick={exportConfig}
        class="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
        title="Export config to clipboard"
      >
        Export
      </button>
      <button 
        onclick={importConfig}
        class="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
        title="Import config from clipboard"
      >
        Import
      </button>
      <button 
        onclick={resetToDefaults}
        class="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
        title="Reset to defaults"
      >
        Reset
      </button>
    </div>
  </div>
  
  <!-- Validation Errors -->
  {#if validationErrors.length > 0}
    <div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
      <ul class="list-disc list-inside space-y-1">
        {#each validationErrors as error}
          <li class="text-sm">{error}</li>
        {/each}
      </ul>
    </div>
  {/if}
  
  <!-- Basic Configuration -->
  <div class="space-y-4 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Evidence ID</label>
        <input 
          bind:value={evidenceId}
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="evidence_001"
          required
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Dimensions</label>
        <div class="flex gap-2">
          <input 
            bind:value={dimensions[0]}
            type="number"
            min="64"
            max="2048"
            step="64"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span class="text-gray-400 self-center">×</span>
          <input 
            bind:value={dimensions[1]}
            type="number"
            min="64"
            max="2048"
            step="64"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
      <textarea 
        bind:value={prompt}
        rows="3"
        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Describe the legal evidence visualization..."
        required
      ></textarea>
    </div>
  </div>
  
  <!-- Style Selection -->
  <div class="mb-6">
    <label class="block text-sm font-medium text-gray-300 mb-3">Style Presets</label>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      {#each Object.entries(GLYPH_PRESETS) as [key, preset]}
        <button 
          onclick={() => loadPreset(key as keyof typeof GLYPH_PRESETS)}
          class="px-3 py-2 text-sm rounded transition-colors {selectedPreset === key && !useCustomStyle ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
        >
          {key}
        </button>
      {/each}
    </div>
    
    <div class="space-y-2">
      <label class="flex items-center">
        <input 
          type="radio" 
          bind:group={useCustomStyle} 
          value={false}
          class="mr-2"
        />
        <span>Use preset: {selectedPreset}</span>
      </label>
      
      <label class="flex items-center">
        <input 
          type="radio" 
          bind:group={useCustomStyle} 
          value={true}
          class="mr-2"
        />
        <span>Custom style:</span>
        <input 
          bind:value={customStyle}
          disabled={!useCustomStyle}
          class="ml-2 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white disabled:opacity-50 text-sm"
          placeholder="custom style"
        />
      </label>
    </div>
  </div>
  
  <!-- SIMD Configuration -->
  <div class="border-t border-gray-700 pt-6 mb-6">
    <h3 class="text-lg font-medium text-yellow-400 mb-4">SIMD Optimization</h3>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="flex items-center mb-3">
          <input 
            type="checkbox" 
            bind:checked={simdConfig.enable_tiling}
            class="mr-2"
          />
          <span class="text-sm">Enable SIMD Tiling</span>
        </label>
        
        <label class="flex items-center mb-3">
          <input 
            type="checkbox" 
            bind:checked={simdConfig.adaptive_quality}
            class="mr-2"
          />
          <span class="text-sm">Adaptive Quality</span>
        </label>
      </div>
      
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-gray-300 mb-1">Tile Size: {simdConfig.tile_size}px</label>
          <input 
            type="range" 
            bind:value={simdConfig.tile_size}
            min="8" 
            max="64" 
            step="8"
            class="w-full"
            disabled={!simdConfig.enable_tiling}
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
            disabled={!simdConfig.enable_tiling}
          />
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div>
        <label class="block text-sm text-gray-300 mb-1">Shader Format</label>
        <select 
          bind:value={simdConfig.shader_format}
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
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
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
        >
          <option value="nes">NES (Low Quality, High Compression)</option>
          <option value="snes">SNES (Medium Quality)</option>
          <option value="n64">N64 (High Quality, Low Compression)</option>
        </select>
      </div>
    </div>
  </div>
  
  <!-- Advanced Options -->
  <div class="border-t border-gray-700 pt-6">
    <button 
      onclick={() => showAdvanced = !showAdvanced}
      class="flex items-center text-sm text-gray-400 hover:text-white transition-colors mb-4"
    >
      <span class="mr-2">{showAdvanced ? '▼' : '▶'}</span>
      Advanced Options
    </button>
    
    {#if showAdvanced}
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Seed (Optional)</label>
          <input 
            bind:value={seed}
            type="number"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Random seed for reproducible results"
          />
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="flex items-center mb-2">
              <input 
                type="checkbox" 
                bind:checked={neuralSpriteConfig.enable_compression}
                class="mr-2"
              />
              <span class="text-sm">Neural Sprite Compression</span>
            </label>
          </div>
          
          <div>
            <label class="block text-sm text-gray-300 mb-1">Target Ratio: {neuralSpriteConfig.target_ratio.toFixed(1)}:1</label>
            <input 
              type="range" 
              bind:value={neuralSpriteConfig.target_ratio}
              min="1.5" 
              max="5.0" 
              step="0.1"
              class="w-full"
              disabled={!neuralSpriteConfig.enable_compression}
            />
          </div>
          
          <div>
            <label class="block text-sm text-gray-300 mb-1">Predictive Frames: {neuralSpriteConfig.predictive_frames}</label>
            <input 
              type="range" 
              bind:value={neuralSpriteConfig.predictive_frames}
              min="0" 
              max="16" 
              step="1"
              class="w-full"
              disabled={!neuralSpriteConfig.enable_compression}
            />
          </div>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Action Buttons -->
  <div class="border-t border-gray-700 pt-6 space-y-3">
    <button 
      onclick={handleGenerate}
      disabled={isLoading}
      class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-md transition-colors"
    >
      {isLoading ? 'Generating...' : 'Generate SIMD Glyph'}
    </button>
    
    <button 
      onclick={handleGenerateVariations}
      disabled={isLoading}
      class="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
    >
      {isLoading ? 'Generating...' : 'Generate All Style Variations'}
    </button>
  </div>
</div>

<style>
  .glyph-config-panel {
    @apply max-w-none;
  }
  
  input[type="range"] {
    @apply accent-blue-500;
  }
  
  input[type="range"]:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
</style>