<script lang="ts">
  import { EvidenceGrid, EvidenceUpload, PhoenixWrightSearch, SimilarityHeatmap, ZoomEnhanceViewer } from '$lib/components/vision';

  // Evidence items state
  let evidenceItems = $state<Array<{
    embeddingId: string;
    thumbUrl: string;
    embedding?: number[] | null;
    frameIndex?: number;
    timestamp?: number;
  }>>([]);

  // Selected item for zoom view
  let selectedZoomSrc = $state<string | null>(null);

  // Similarity data for heatmap
  let similarityData = $state<Array<{
    id: string;
    score: number;
    thumbUrl: string;
  }>>([]);

  // Handle new evidence uploads
  function handleEvidenceUpdated(event: CustomEvent) {
    const newItems = event.detail;
    evidenceItems.push(...newItems);

    // Generate mock similarity data for demonstration
    if (newItems.length > 0) {
      similarityData = evidenceItems.map((item, index) => ({
        id: item.embeddingId,
        score: Math.random() * 0.5 + 0.3, // Random similarity 0.3-0.8
        thumbUrl: item.thumbUrl
      }));
    }
  }

  // Handle grid selection
  function handleGridSelect(event: CustomEvent) {
    selectedZoomSrc = event.detail.src;
  }

  // Handle Phoenix Wright search events
  function handlePhoenixWrightSearch(event: CustomEvent) {
    console.log('Phoenix Wright search initiated:', event.detail);
  }

  function handlePhoenixWrightResult(event: CustomEvent) {
    const result = event.detail;
    console.log('Phoenix Wright search completed:', result);

    // Update similarity data based on search results if needed
    if (result.evidenceMatches && result.evidenceMatches.length > 0) {
      // Generate similarity data from evidence matches
      similarityData = result.evidenceMatches.map((match, index) => ({
        id: match.evidenceId,
        score: match.relevanceScore,
        thumbUrl: `evidence_${index}.jpg` // Placeholder - would need actual evidence URLs
      }));
    }
  }
</script>

<svelte:head>
  <title>Detective Vision - Evidence Analysis</title>
  <meta name="description" content="AI-powered visual evidence analysis and similarity detection" />
</svelte:head>

<div class="min-h-screen bg-[#2a2a2a] text-white p-4">
  <div class="max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-center">Detective Vision Mode</h1>

    <!-- Upload Section -->
    <div class="mb-6">
      <EvidenceUpload onupdated={handleEvidenceUpdated} />
    </div>

    <!-- Main Analysis Grid -->
    <div class="grid grid-cols-12 gap-4 h-[600px]">
      <!-- Evidence Grid -->
      <div class="col-span-3">
        <EvidenceGrid
          selectedThumbs={evidenceItems.map(item => item.thumbUrl)}
          onselect={handleGridSelect}
        />
      </div>

      <!-- Zoom Viewer -->
      <div class="col-span-4">
        <ZoomEnhanceViewer bind:zoomSrc={selectedZoomSrc} />
      </div>

      <!-- Phoenix Wright AI Search -->
      <div class="col-span-5">
        <PhoenixWrightSearch
          onsearch={handlePhoenixWrightSearch}
          onresult={handlePhoenixWrightResult}
        />
      </div>
    </div>

    <!-- Similarity Heatmap (moved below) -->
    <div class="mt-6">
      <SimilarityHeatmap
        similarities={similarityData}
        selectedId={selectedZoomSrc ? evidenceItems.find(item => item.thumbUrl === selectedZoomSrc)?.embeddingId : null}
      />
    </div>

    <!-- Status Bar -->
    <div class="mt-6 p-4 bg-[#1a1a1a] rounded border border-gray-700">
      <div class="flex justify-between items-center text-sm">
        <div>
          <span class="font-semibold">Evidence Items:</span> {evidenceItems.length}
        </div>
        <div>
          <span class="font-semibold">Selected:</span> {selectedZoomSrc ? 'Yes' : 'None'}
        </div>
        <div>
          <span class="font-semibold">Similarity Matches:</span> {similarityData.length}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Detective mode dark theme overrides */
  :global(.dark) {
    --bg-primary: #2a2a2a;
    --bg-secondary: #1a1a1a;
    --text-primary: #ffffff;
    --border-color: #404040;
  }
</style>
