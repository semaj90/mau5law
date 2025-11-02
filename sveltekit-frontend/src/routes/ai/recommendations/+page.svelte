<script lang="ts">
  import { onMount } from 'svelte';

  let recommendations = $state<any[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      const response = await fetch('/api/recommendations');
      if (response.ok) {
        recommendations = await response.json();
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      loading = false;
    }
  });
</script>

<div class="container mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6">AI Recommendations</h1>

  {#if loading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if recommendations.length > 0}
    <div class="grid gap-4">
      {#each Array.isArray(recommendations) ? recommendations : [] as rec}
        <div class="p-4 border rounded-lg hover:shadow-lg transition-shadow">
          <h3 class="font-semibold text-lg">{rec.title}</h3>
          <p class="text-gray-600 mt-2">{rec.description}</p>
          {#if rec.confidence}
            <div class="mt-3">
              <span class="text-sm text-gray-500">Confidence: {(rec.confidence * 100).toFixed(1)}%</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class="text-gray-500 text-center py-12">No recommendations available</p>
  {/if}
</div>
