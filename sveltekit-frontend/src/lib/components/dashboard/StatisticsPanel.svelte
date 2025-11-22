<script lang="ts">
  export interface Stats {
    activeCases: number;
    pendingEvidence: number;
    approvedEvidence: number;
    personsOfInterest: number;
  }

  export let stats: Stats = {
    activeCases: 0,
    pendingEvidence: 0,
    approvedEvidence: 0,
    personsOfInterest: 0,
  };

  export let isLoading = false;
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Active Cases -->
  <div class="bg-white border-2 border-gray-300 p-6 rounded hover:border-[#9E0000] transition">
    <p class="text-gray-600 text-sm font-mono uppercase">Active Cases</p>
    {#if isLoading}
      <div class="h-10 bg-gray-200 rounded mt-2 animate-pulse" />
    {:else}
      <p class="text-4xl font-bold text-[#9E0000] mt-2">{stats.activeCases}</p>
    {/if}
  </div>

  <!-- Pending Evidence -->
  <div class="bg-white border-2 border-gray-300 p-6 rounded hover:border-[#FFA500] transition">
    <p class="text-gray-600 text-sm font-mono uppercase">Pending Evidence</p>
    {#if isLoading}
      <div class="h-10 bg-gray-200 rounded mt-2 animate-pulse" />
    {:else}
      <p class="text-4xl font-bold text-[#FFA500] mt-2">{stats.pendingEvidence}</p>
    {/if}
  </div>

  <!-- Approved Evidence -->
  <div class="bg-white border-2 border-gray-300 p-6 rounded hover:border-[#00AA00] transition">
    <p class="text-gray-600 text-sm font-mono uppercase">Approved Evidence</p>
    {#if isLoading}
      <div class="h-10 bg-gray-200 rounded mt-2 animate-pulse" />
    {:else}
      <p class="text-4xl font-bold text-[#00AA00] mt-2">{stats.approvedEvidence}</p>
    {/if}
  </div>

  <!-- Persons of Interest -->
  <div class="bg-white border-2 border-gray-300 p-6 rounded hover:border-gray-500 transition">
    <p class="text-gray-600 text-sm font-mono uppercase">Persons of Interest</p>
    {#if isLoading}
      <div class="h-10 bg-gray-200 rounded mt-2 animate-pulse" />
    {:else}
      <p class="text-4xl font-bold text-gray-700 mt-2">{stats.personsOfInterest}</p>
    {/if}
  </div>
</div>

<style>
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  :global(.animate-pulse) {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>
