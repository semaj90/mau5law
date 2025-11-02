<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

  interface Props {
    evidenceId?: number;
    onGlyphGenerated?: (result: any) => void;
  }

  let { evidenceId = 0, onGlyphGenerated } = $props<Props>();

  // Generation state
  let generating = $state(false);
  let prompt = $state('Legal evidence visualization with professional styling');
  let style = $state('detective');
  let dimensions = $state([512, 512]);
  let conditioningTensors = $state<string[]>([]);
  let result = $state<any>(null);
  let error = $state<string | null>(null);

  // Neural Sprite configuration
  let enableNeuralSprite = $state(false);
  let enableCompression = $state(true);
  let predictiveFrames = $state(3);
  let enableUILayoutCompression = $state(false);
  let targetCompressionRatio = $state(50);

  // Available styles
  const styles = [
    { value: 'detective', label: '🔍 Detective', description: 'Dark, investigative theme' },
    { value: 'corporate', label: '🏢 Corporate', description: 'Professional business theme' },
    { value: 'forensic', label: '🧪 Forensic', description: 'Scientific analysis theme' },
    { value: 'legal', label: '⚖️ Legal', description: 'Court and legal documentation theme' }
  ];

  // Dimension presets
  const dimensionPresets = [
    { value: [256, 256], label: '256×256', description: 'Small (fast)' },
    { value: [512, 512], label: '512×512', description: 'Medium (balanced)' },
    { value: [768, 768], label: '768×768', description: 'Large (detailed)' },
    { value: [1024, 1024], label: '1024×1024', description: 'Extra large (slow)' }
  ];

  async function generateGlyph() {
    if (!prompt.trim()) {
      error = 'Please enter a prompt';
      return;
    }

    generating = true;
    error = null;
    result = null;

    try {
      const response = await fetch('/api/glyph/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_id: evidenceId,
          prompt: prompt.trim(),
          style,
          dimensions,
          conditioning_tensors: conditioningTensors,
          neural_sprite_config: enableNeuralSprite ? {
            enable_compression: enableCompression,
            predictive_frames: predictiveFrames,
            ui_layout_compression: enableUILayoutCompression,
            target_compression_ratio: targetCompressionRatio
          } : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        result = data.data;
        onGlyphGenerated?.(data.data);
      } else {
        error = data.error || 'Generation failed';
      }
    } catch (err) {
      console.error('Glyph generation error:', err);
      error = 'Network error occurred';
    } finally {
      generating = false;
    }
  }

  function setDimensionPreset(preset: [number, number]) {
    dimensions = [...preset];
  }

  function addConditioningTensor() {
    const tensorId = prompt(`Enter tensor ID to use for conditioning:`);
    if (tensorId?.trim()) {
      conditioningTensors = [...conditioningTensors, tensorId.trim()];
    }
  }

  function removeConditioningTensor(index: number) {
    conditioningTensors = conditioningTensors.filter((_, i) => i !== index);
  }
</script>

<Card class="w-full max-w-4xl mx-auto">
  <CardHeader>
    <CardTitle class="flex items-center gap-2">
      🎨 Legal Evidence Glyph Generator
      <span class="text-sm font-normal text-gray-600">
        {evidenceId ? `Evidence #${evidenceId}` : 'No evidence selected'}
      </span>
    </CardTitle>
    <p class="text-sm text-gray-600">
      Generate stylized visual representations of legal evidence using GPU-cached tensor diffusion
    </p>
  </CardHeader>
  
  <CardContent class="space-y-6">
    <!-- Prompt Input -->
    <div>
      <label for="generation-prompt" class="block text-sm font-medium mb-2">Generation Prompt</label>
      <textarea 
        id="generation-prompt"
        bind:value={prompt}
        class="w-full p-3 border rounded-lg resize-vertical min-h-[80px]"
        placeholder="Describe the visual style and content you want to generate..."
        disabled={generating}
      ></textarea>
      <p class="text-xs text-gray-500 mt-1">
        Describe the visual elements, mood, and style for your legal evidence glyph
      </p>
    </div>

    <!-- Style Selection -->
    <div>
      <label class="block text-sm font-medium mb-2">Visual Style</label>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        {#each styles as styleOption}
          <button
            onclick={() => style = styleOption.value}
            class="p-3 border rounded-lg text-left transition-colors {style === styleOption.value ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
            disabled={generating}
          >
            <div class="font-medium text-sm">{styleOption.label}</div>
            <div class="text-xs text-gray-600">{styleOption.description}</div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Dimensions -->
    <div>
      <label class="block text-sm font-medium mb-2">Output Dimensions</label>
      <div class="flex flex-wrap gap-2 mb-3">
        {#each dimensionPresets as preset}
          <button
            onclick={() => setDimensionPreset(preset.value)}
            class="px-3 py-2 text-sm border rounded-lg transition-colors {dimensions[0] === preset.value[0] && dimensions[1] === preset.value[1] ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
            disabled={generating}
          >
            {preset.label}
            <span class="text-xs text-gray-500 block">{preset.description}</span>
          </button>
        {/each}
      </div>
      
      <!-- Custom dimensions -->
      <div class="flex gap-2 items-center">
        <label class="text-sm">Custom:</label>
        <input 
          type="number" 
          bind:value={dimensions[0]}
          min="64" 
          max="2048" 
          step="64"
          class="w-20 px-2 py-1 border rounded text-sm"
          disabled={generating}
        />
        <span class="text-sm">×</span>
        <input 
          type="number" 
          bind:value={dimensions[1]}
          min="64" 
          max="2048" 
          step="64"
          class="w-20 px-2 py-1 border rounded text-sm"
          disabled={generating}
        />
        <span class="text-xs text-gray-500">
          (64-2048px, powers of 64 recommended)
        </span>
      </div>
    </div>

    <!-- Conditioning Tensors (Advanced) -->
    <div>
      <label class="block text-sm font-medium mb-2">
        Conditioning Tensors 
        <span class="text-xs text-gray-500">(Advanced - Optional)</span>
      </label>
      
      {#if conditioningTensors.length > 0}
        <div class="space-y-2 mb-3">
          {#each conditioningTensors as tensorId, index}
            <div class="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <code class="text-sm flex-1">{tensorId}</code>
              <button
                onclick={() => removeConditioningTensor(index)}
                class="text-red-600 hover:text-red-800 text-sm"
                disabled={generating}
              >
                Remove
              </button>
            </div>
          {/each}
        </div>
      {/if}
      
      <Button
        variant="outline"
        onclick={addConditioningTensor}
        disabled={generating}
        class="text-sm"
      >
        + Add Conditioning Tensor
      </Button>
      
      <p class="text-xs text-gray-500 mt-1">
        Reuse cached tensors for consistent styling across generations
      </p>
    </div>

    <!-- Neural Sprite Configuration (Advanced) -->
    <div class="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
      <div class="flex items-center gap-2 mb-3">
        <input 
          type="checkbox" 
          id="enable-neural-sprite"
          bind:checked={enableNeuralSprite}
          disabled={generating}
          class="rounded"
        />
        <label for="enable-neural-sprite" class="text-sm font-medium">
          🧬 Enable Neural Sprite Compression
        </label>
        <span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
          EXPERIMENTAL
        </span>
      </div>
      
      {#if enableNeuralSprite}
        <div class="space-y-4 ml-6 border-l-2 border-purple-200 pl-4">
          <!-- Compression Settings -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <input 
                type="checkbox" 
                id="enable-compression"
                bind:checked={enableCompression}
                disabled={generating}
                class="rounded"
              />
              <label for="enable-compression" class="text-sm">
                Enable tensor compression
              </label>
            </div>
            
            {#if enableCompression}
              <div class="ml-6 flex items-center gap-2">
                <label class="text-sm text-gray-600">Target ratio:</label>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  bind:value={targetCompressionRatio}
                  disabled={generating}
                  class="flex-1"
                />
                <span class="text-sm font-mono w-12 text-center">{targetCompressionRatio}:1</span>
              </div>
            {/if}
          </div>

          <!-- Predictive Frames -->
          <div>
            <label class="block text-sm mb-2">
              Predictive frame generation:
            </label>
            <div class="flex items-center gap-2">
              <input 
                type="range" 
                min="0" 
                max="10" 
                bind:value={predictiveFrames}
                disabled={generating}
                class="flex-1"
              />
              <span class="text-sm font-mono w-8 text-center">{predictiveFrames}</span>
              <span class="text-xs text-gray-500">frames</span>
            </div>
          </div>

          <!-- UI Layout Compression -->
          <div>
            <div class="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="enable-ui-compression"
                bind:checked={enableUILayoutCompression}
                disabled={generating}
                class="rounded"
              />
              <label for="enable-ui-compression" class="text-sm">
                Enable UI layout compression demo
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1 ml-6">
              Demonstrates compression of UI layout states
            </p>
          </div>
        </div>
        
        <div class="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
          💡 Neural Sprite uses AI-powered compression to optimize tensor storage and generate predictive animation frames.
        </div>
      {/if}
    </div>

    <!-- Generate Button -->
    <div class="flex justify-end">
      <Button
        onclick={generateGlyph}
        disabled={generating || !prompt.trim()}
        class="px-6 py-2"
      >
        {#if generating}
          <div class="flex items-center gap-2">
            <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Generating...
          </div>
        {:else}
          🎨 Generate Glyph
        {/if}
      </Button>
    </div>

    <!-- Error Display -->
    {#if error}
      <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-center gap-2">
          <span class="text-red-600">⚠️</span>
          <span class="text-red-800 text-sm">{error}</span>
        </div>
      </div>
    {/if}

    <!-- Result Display -->
    {#if result}
      <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 class="font-medium text-green-800 mb-3">✅ Generation Complete!</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Generated Image -->
          <div>
            <h4 class="font-medium mb-2">Generated Glyph</h4>
            <div class="border rounded-lg overflow-hidden bg-white">
              <img 
                src={result.glyph_url} 
                alt="Generated glyph"
                class="w-full h-auto"
                style="max-height: 300px; object-fit: contain;"
              />
            </div>
            
            {#if result.preview_with_tensors}
              <div class="mt-2">
                <a 
                  href={result.preview_with_tensors}
                  target="_blank"
                  class="text-sm text-blue-600 hover:text-blue-800"
                >
                  📦 Download with embedded tensors
                </a>
              </div>
            {/if}
          </div>

          <!-- Generation Stats -->
          <div>
            <h4 class="font-medium mb-2">Generation Statistics</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Generation Time:</span>
                <span class="font-mono">{result.generation_time_ms}ms</span>
              </div>
              <div class="flex justify-between">
                <span>Cache Hits:</span>
                <span class="font-mono text-green-600">{result.cache_hits}</span>
              </div>
              <div class="flex justify-between">
                <span>Tensor Artifacts:</span>
                <span class="font-mono">{result.tensor_ids?.length || 0}</span>
              </div>
              <div class="flex justify-between">
                <span>Style:</span>
                <span class="capitalize">{result.metadata?.style}</span>
              </div>
              <div class="flex justify-between">
                <span>Dimensions:</span>
                <span class="font-mono">{result.metadata?.dimensions?.join('×')}</span>
              </div>
            </div>

            {#if result.tensor_ids?.length > 0}
              <div class="mt-3">
                <h5 class="font-medium text-sm mb-1">Cached Tensors:</h5>
                <div class="space-y-1">
                  {#each result.tensor_ids as tensorId}
                    <div class="text-xs font-mono bg-gray-100 p-1 rounded">
                      {tensorId}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Neural Sprite Results -->
            {#if result.neural_sprite_results}
              <div class="mt-4 p-3 border rounded-lg bg-purple-50">
                <h5 class="font-medium text-sm mb-2 flex items-center gap-2">
                  🧬 Neural Sprite Results
                  <span class="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                    EXPERIMENTAL
                  </span>
                </h5>
                
                <div class="space-y-2 text-sm">
                  {#if result.neural_sprite_results.compression_ratio}
                    <div class="flex justify-between">
                      <span>Compression Ratio:</span>
                      <span class="font-mono text-purple-600">
                        {result.neural_sprite_results.compression_ratio}:1
                      </span>
                    </div>
                  {/if}
                  
                  {#if result.neural_sprite_results.predictive_frames?.length > 0}
                    <div class="flex justify-between">
                      <span>Predictive Frames:</span>
                      <span class="font-mono">{result.neural_sprite_results.predictive_frames.length}</span>
                    </div>
                    
                    <div class="mt-2">
                      <h6 class="text-xs font-medium mb-1">Generated Frames:</h6>
                      <div class="flex gap-2 overflow-x-auto">
                        {#each result.neural_sprite_results.predictive_frames as frameUrl, index}
                          <div class="flex-shrink-0">
                            <img 
                              src={frameUrl} 
                              alt="Predictive frame {index + 1}"
                              class="w-16 h-16 object-cover border rounded"
                            />
                            <div class="text-xs text-center mt-1">Frame {index + 1}</div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                  
                  {#if result.neural_sprite_results.ui_layout_metrics}
                    <div class="mt-2 pt-2 border-t border-purple-200">
                      <h6 class="text-xs font-medium mb-1">UI Layout Compression:</h6>
                      <div class="space-y-1 text-xs">
                        <div class="flex justify-between">
                          <span>Original Size:</span>
                          <span class="font-mono">
                            {(result.neural_sprite_results.ui_layout_metrics.originalSize / 1024).toFixed(1)}KB
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span>Compressed Size:</span>
                          <span class="font-mono text-green-600">
                            {(result.neural_sprite_results.ui_layout_metrics.compressedSize / 1024).toFixed(1)}KB
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span>Ratio:</span>
                          <span class="font-mono text-purple-600">
                            {result.neural_sprite_results.ui_layout_metrics.compressionRatio.toFixed(1)}:1
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span>Accuracy:</span>
                          <span class="font-mono">
                            {(result.neural_sprite_results.ui_layout_metrics.accuracy * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  {/if}
                  
                  {#if result.neural_sprite_results.compressed_tensor_url}
                    <div class="mt-2 pt-2 border-t border-purple-200">
                      <a 
                        href={result.neural_sprite_results.compressed_tensor_url}
                        target="_blank"
                        class="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                      >
                        📦 Download compressed tensor data
                      </a>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </CardContent>
</Card>

<style>
  /* Custom scrollbar for textarea */
  textarea::-webkit-scrollbar {
    width: 4px;
  }
  
  textarea::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }
  
  textarea::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }
  
  textarea::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>