<script lang="ts">
  import { onMount } from 'svelte';

  export let evidenceId: string;
  export let fileName: string;
  export let documentType: string;
  export let confidence: number;
  export let metadata: Record<string, unknown>;
  export let onGenerateSummary: () => void;
  export let onReject: () => void;
  export let isGenerating = false;

  let extractedText = '';
  let showFullText = false;

  onMount(async () => {
    // Extract preview from metadata
    if (metadata?.extractedText) {
      extractedText = metadata.extractedText as string;
    }
  });

  const confidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-green-600';
    if (conf >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const truncateText = (text: string, length = 300) => {
    return text.length > length ? text.substring(0, length) + '...' : text;
  };
</script>

<div class="border rounded-lg p-6 bg-white shadow-sm">
  <!-- Header -->
  <div class="flex items-start justify-between mb-4">
    <div>
      <h3 class="text-lg font-semibold text-gray-900">{fileName}</h3>
      <p class="text-sm text-gray-500 mt-1">
        Uploaded • Pending Review
      </p>
    </div>
    <div class="text-right">
      <div class="text-sm font-medium text-gray-700">Classification</div>
      <div class="text-lg font-semibold text-blue-600">{documentType}</div>
      <div class={`text-sm font-medium ${confidenceColor(confidence)}`}>
        {(confidence * 100).toFixed(0)}% confidence
      </div>
    </div>
  </div>

  <!-- Extracted Text Preview -->
  <div class="mb-6">
    <h4 class="text-sm font-semibold text-gray-700 mb-2">Extracted Text Preview</h4>
    <div class="bg-gray-50 rounded p-4 max-h-48 overflow-y-auto border border-gray-200">
      <p class="text-sm text-gray-700 whitespace-pre-wrap font-mono">
        {showFullText ? extractedText : truncateText(extractedText)}
      </p>
    </div>
    {#if extractedText.length > 300}
      <button
        on:click={() => (showFullText = !showFullText)}
        class="text-sm text-blue-600 hover:text-blue-700 mt-2"
      >
        {showFullText ? 'Show less' : 'Show more'}
      </button>
    {/if}
  </div>

  <!-- Metadata -->
  <div class="grid grid-cols-2 gap-4 mb-6 text-sm">
    <div>
      <span class="text-gray-600">File Size:</span>
      <span class="font-medium text-gray-900 ml-2">
        {((metadata?.fileSize as number) / 1024 / 1024).toFixed(2)} MB
      </span>
    </div>
    <div>
      <span class="text-gray-600">Pages:</span>
      <span class="font-medium text-gray-900 ml-2">
        {metadata?.pageCount || 'N/A'}
      </span>
    </div>
  </div>

  <!-- Actions -->
  <div class="flex gap-3">
    <button
      on:click={onGenerateSummary}
      disabled={isGenerating}
      class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition"
    >
      {isGenerating ? 'Generating...' : 'Generate Suggested Summary'}
    </button>
    <button
      on:click={onReject}
      class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition"
    >
      Reject
    </button>
  </div>
</div>

<style>
  /* Additional styles if needed */
</style>
