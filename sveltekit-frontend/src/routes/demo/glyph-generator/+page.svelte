<!-- @migration-task Error while migrating Svelte code: Attributes need to be unique -->
<script lang="ts">
  import GlyphGenerator from '$lib/components/glyph/GlyphGenerator.svelte';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  // Demo state
  let selectedEvidenceId = $state(12345);
  let recentGlyphs = $state([]);
  let showAdvanced = $state(false);
  let tensorSearchQuery = $state('');
  let tensorSearchResults = $state([]);
  let searching = $state(false);

  function onGlyphGenerated(result: any) {
    // Add to recent glyphs list
    recentGlyphs = [
      {
        id: Date.now(),
        ...result,
        generated_at: new Date().toISOString()
      },
      ...recentGlyphs.slice(0, 9) // Keep last 10
    ];
    console.log('New glyph generated:', result);
  }

  async function searchTensors() {
    if (!tensorSearchQuery.trim()) return;
    searching = true;
    try {
      const response = await fetch(`/api/glyph/search?q=${encodeURIComponent(tensorSearchQuery)}&limit=10`);
      const data = await response.json();
      if (data.success) {
        tensorSearchResults = data.data.results;
      } else {
        console.error('Tensor search failed:', data.error);
        tensorSearchResults = [];
      }
    } catch (error) {
      console.error('Tensor search error:', error);
      tensorSearchResults = [];
    } finally {
      searching = false;
    }
  }

  function clearRecentGlyphs() {
    recentGlyphs = [];
  }
</script>

<svelte:head>
  <title>Glyph Generator - Legal Evidence Visualization</title>
  <meta name="description" content="Generate stylized legal evidence glyphs using GPU-cached tensor diffusion" />
</svelte:head>

<div class="container mx-auto p-6 space-y-8">
  <div class="text-center">
    <h1 class="text-4xl font-bold text-gray-900 mb-2">🎨 Legal Evidence Glyph Generator</h1>
    <p class="text-gray-600 max-w-2xl mx-auto">
      Transform legal evidence into stylized visual representations using advanced tensor-cached diffusion models. 
      Generate professional glyphs with GPU acceleration and intelligent caching for lightning-fast results.
    </p>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
    <!-- Main Generator -->
    <div class="xl:col-span-2">
      <GlyphGenerator 
        evidenceId={selectedEvidenceId}
        onGlyphGenerated={onGlyphGenerated}
      />
    </div>

    <!-- Sidebar -->
    <div class="space-y-6">
      <!-- Evidence Selection -->
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">📁 Evidence Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1" for="evidence-id">Evidence ID</label><input id="evidence-id" 
                type="number" 
                bind:value={selectedEvidenceId}
                class="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter evidence ID"
                min="1"
              />
            </div>
            <p class="text-xs text-gray-500">
              Select an evidence file to generate a glyph for. The system will use evidence metadata for enhanced context.
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- Tensor Search -->
      <Card>
        <CardHeader>
          <CardTitle class="text-lg flex items-center justify-between">
            🔍 Tensor Search
            <Button class="bits-btn"
              variant="outline"
              onclick={() => showAdvanced = !showAdvanced}
              class="text-xs px-2 py-1"
            >
              {showAdvanced ? 'Hide' : 'Advanced'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <div class="flex gap-2">
              <input 
                type="text" 
                bind:value={tensorSearchQuery}
                class="flex-1 px-3 py-2 border rounded-lg text-sm"
                placeholder="Search cached tensors..."
                onkeydown={(e) => e.key === 'Enter' && searchTensors()}
              />
              <Button
                onclick={searchTensors}
                disabled={searching || !tensorSearchQuery.trim()}
                class="px-3 py-2 text-sm bits-btn bits-btn"
              >
                {searching ? '...' : 'Search'}
              </Button>
            </div>

            {#if tensorSearchResults.length > 0}
              <div class="space-y-2 max-h-48 overflow-y-auto">
                {#each tensorSearchResults as tensor}
                  <div class="p-2 bg-gray-50 rounded text-xs">
                    <div class="font-mono text-blue-600">{tensor.id}</div>
                    {#if tensor.prompt}
                      <div class="text-gray-700 mt-1">{tensor.prompt}</div>
                    {/if}
                    {#if tensor.style}
                      <div class="text-gray-500 capitalize">Style: {tensor.style}</div>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else if tensorSearchQuery && !searching}
              <p class="text-xs text-gray-500 italic">No tensors found for "{tensorSearchQuery}"</p>
            {/if}
          </div>
        </CardContent>
      </Card>

      <!-- System Performance -->
      {#if showAdvanced}
        <Card>
          <CardHeader>
            <CardTitle class="text-lg">⚡ Performance Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>GPU Cache:</span>
                <span class="text-green-600">Active</span>
              </div>
              <div class="flex justify-between">
                <span>Tensor Storage:</span>
                <span class="text-blue-600">MinIO</span>
              </div>
              <div class="flex justify-between">
                <span>Vector Search:</span>
                <span class="text-purple-600">PostgreSQL</span>
              </div>
              <div class="flex justify-between">
                <span>PNG Embedding:</span>
                <span class="text-orange-600">Enabled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      {/if}
    </div>
  </div>

  <!-- Recent Glyphs Gallery -->
  {#if recentGlyphs.length > 0}
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          🖼️ Recent Glyphs ({recentGlyphs.length})
          <Button
            variant="outline"
            onclick={clearRecentGlyphs}
            class="text-sm px-3 py-1 bits-btn bits-btn"
          >
            Clear All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {#each recentGlyphs as glyph}
            <div class="group relative">
              <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                <img 
                  src={glyph.glyph_url} 
                  alt="Generated glyph"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              
              <!-- Overlay with stats -->
              <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div class="text-white text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2">
                  <div class="font-medium">{glyph.metadata?.style}</div>
                  <div class="mt-1">{glyph.metadata?.dimensions?.join('×')}</div>
                  <div class="mt-1">{glyph.generation_time_ms}ms</div>
                  <div class="text-green-300">{glyph.cache_hits} cache hits</div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Features Overview -->
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">🚀 Glyph Diffusion Features</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="text-center p-4 border rounded-lg">
          <div class="text-2xl mb-2">⚡</div>
          <div class="font-medium">GPU Acceleration</div>
          <div class="text-xs text-gray-600 mt-1">VRAM tensor caching for sub-second generation</div>
        </div>
        
        <div class="text-center p-4 border rounded-lg">
          <div class="text-2xl mb-2">📦</div>
          <div class="font-medium">PNG Embedding</div>
          <div class="text-xs text-gray-600 mt-1">Tensors embedded directly in image files</div>
        </div>
        
        <div class="text-center p-4 border rounded-lg">
          <div class="text-2xl mb-2">🔍</div>
          <div class="font-medium">Vector Search</div>
          <div class="text-xs text-gray-600 mt-1">Find similar tensors and reuse conditioning</div>
        </div>
        
        <div class="text-center p-4 border rounded-lg">
          <div class="text-2xl mb-2">🎨</div>
          <div class="font-medium">Legal Styles</div>
          <div class="text-xs text-gray-600 mt-1">Detective, corporate, forensic, and legal themes</div>
        </div>
      </div>
      
      <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 class="font-medium text-blue-900 mb-2">💡 Pro Tips</h3>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>• Use specific, descriptive prompts for better results</li>
          <li>• Reuse conditioning tensors for consistent styling across multiple glyphs</li>
          <li>• Start with 512×512 dimensions for optimal speed/quality balance</li>
          <li>• Download PNG files with embedded tensors for portable AI workflows</li>
        </ul>
      </div>
    </CardContent>
  </Card>
</div>

<style>
  .container {
    max-width: 1400px;
  }
  
  /* Custom scrollbar for recent glyphs */
  .overflow-y-auto::-webkit-scrollbar {
    width: 4px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>
