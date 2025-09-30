<script lang="ts">
  import { onMount } from 'svelte';
  import { getRoutes, type Route } from '$lib/utils/routes';

  let navItems: Route[] = [];
  let searchOpen = false;
  let searchQuery = '';

  onMount(() => {
    navItems = getRoutes();
  });

  function toggleSearch() {
    searchOpen = !searchOpen;
    if (searchOpen) {
      searchQuery = '';
    }
  }
</script>

<nav class="nes-container is-rounded bg-gray-800 p-4 shadow-md flex flex-wrap items-center justify-between relative">
  <div class="flex flex-wrap gap-2">
    {#each navItems as item}
      <li class="relative list-none">
        <a href={item.href} class="nes-btn is-primary">{item.name}</a>
      </li>
    {/each}
  </div>

  <!-- Search -->
  <div class="relative">
    <button class="nes-btn is-warning" on:click={toggleSearch}>Search</button>
  </div>
</nav>

<!-- Search Modal -->
{#if searchOpen}
  <div class="search-modal-overlay" on:click={toggleSearch}>
    <div class="search-modal" on:click|stopPropagation>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-white text-lg font-bold">Search</h2>
        <button class="nes-btn is-error" on:click={toggleSearch}>X</button>
      </div>
      <input
        type="text"
        placeholder="Type to search..."
        bind:value={searchQuery}
        class="nes-input w-full mb-2"
      />
      <ul class="max-h-64 overflow-y-auto">
        {#each navItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())) as result}
          <li>
            <a href={result.href} class="text-yellow-400 hover:underline">{result.name}</a>
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style lang="postcss">
  nav { @apply relative; }
  ul { @apply list-none m-0 p-0; }
  li { @apply inline-block; }
  .search-modal-overlay {
    @apply fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-start justify-center pt-24 z-50;
  }
  .search-modal {
    @apply bg-gray-900 w-11/12 md:w-2/3 max-h-4/5 overflow-y-auto rounded-lg p-6 shadow-lg;
  }
  @media (max-width: 768px) {
    nav > div:first-child { @apply flex flex-col gap-2 w-full; }
    li { @apply w-full; }
    .nes-container > ul > li > button,
    .nes-container > ul > li > a { @apply w-full; }
  }
</style>