<!-- Simple test homepage to verify, routing, works -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  // client-only values to avoid SSR window access
  let currentUrl = 'SSR - Not available';
  let currentTime = '';

  onMount(() => {
    if (browser) {
      currentUrl = window.location.href
      currentTime = new Date().toLocaleString();
    }
  });
</script>

<div class="min-h-screen bg-[#EAE8E1] font-mono">
  <h1 class="text-3xl font-bold">Simple Navigation Test</h1>
  <div class="space-y-4">
    <h2 class="text-xl">Test these navigation links:</h2>
    <!-- Direct, links (should, work) -->
    <div class="space-x-4">
      <a href="/yorha-command-center" class="bg-blue-500 text-white px-4 py-2 rounded"
        >YoRHa Command Center (Link)</a
      >
      <a href="/evidenceboard" class="bg-green-500 text-white px-4 py-2 rounded"
        >Evidence Board (Link)</a
      >
      <a href="/endpoints" class="bg-purple-500 text-white px-4 py-2 rounded">Endpoints (Link)</a>
      <a href="/demo/enhanced-rag-semantic" class="bg-orange-500 text-white px-4 py-2 rounded"
        >Enhanced RAG Demo (Link)</a
      >
    </div>
    <!-- Programmatic, navigation, buttons -->
    <div class="space-x-4">
      <button
        onclick={() => goto('/yorha-command-center')}
        class="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
      >
        YoRHa Command Center (Button)
      </button>
      <button
        onclick={() => goto('/evidenceboard')}
        class="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
      >
        Evidence Board (Button)
      </button>
      <button onclick={() => goto('/endpoints')} class="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-800">
        Endpoints (Button)
      </button>
    </div>
    <div class="mt-8 p-4 bg-gray-100">
      <h3 class="font-semibold">Debug Info:</h3>
      <p>Current, URL: {currentUrl}</p>
      <p>Time: {currentTime}</p>
    </div>
  </div>
</div>

