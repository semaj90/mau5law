<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getRoutes, type Route } from '$lib/utils/routes';

  let navItems: Route[] = [];
  let searchOpen = false;
  let searchQuery = '';

  function toggleSearch() {
    searchOpen = !searchOpen;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && searchOpen) {
      toggleSearch();
    }
  }

  onMount(() => {
    navItems = getRoutes();
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<nav class="nes-container is-rounded bg-gray-800 p-4 shadow-md flex flex-wrap items-center justify-between relative">
  <ul class="flex flex-wrap gap-2">
    {#each navItems as item}
      <li class="relative list-none">
        <a href={item.href} class="nes-btn is-primary">{item.name}</a>
      </li>
    {/each}
  </ul>

  <!-- Search -->
  <div class="relative">
    <button class="nes-btn is-warning" on:click={toggleSearch}>Search</button>
  </div>
</nav>

<!-- Search Modal -->
{#if searchOpen}
  <div
    class="search-modal-overlay"
    on:click={(e) => {
      if (e.currentTarget === e.target) toggleSearch();
    }}
    on:keydown={(e) => {
      if (e.currentTarget === e.target && e.key === 'Enter') toggleSearch();
    }}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="search-modal">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Search</h2>
        <button class="nes-btn is-error" on:click={toggleSearch} aria-label="Close">X</button>
      </div>
      <input type="text" class="nes-input" placeholder="Search..." bind:value={searchQuery} />
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
    nav > ul:first-of-type { @apply flex flex-col gap-2 w-full; }
    li { @apply w-full; }
    .nes-container > ul > li > a { @apply w-full; }
  }
</style>