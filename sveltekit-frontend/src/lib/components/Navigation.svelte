<script lang="ts">
  import { browser } from '$app/environment';

  interface Route {
    name: string;
    href: string;
  }

  // Svelte 5 runes with static nav items for production
  let navItems = $state<Route[]>([
    { name: 'Home', href: '/' },
    { name: 'Cases', href: '/cases' },
    { name: 'Evidence', href: '/evidence' },
    // Use public-facing URLs without SvelteKit route-group parentheses
    { name: 'AI Chat', href: '/ai/chat' },
    { name: 'RAG Search', href: '/ai/rag' },
    { name: 'YoRHa', href: '/yorha' },
  ]);
  let searchOpen = $state(false);
  let searchQuery = $state('');

  function toggleSearch() {
    searchOpen = !searchOpen;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && searchOpen) {
      toggleSearch();
    }
  }

  // SvelteKit 2 compatible - keyboard listener only in browser
  $effect(() => {
    if (browser) {
      window.addEventListener('keydown', handleKeydown);

      return () => {
        window.removeEventListener('keydown', handleKeydown);
      };
    }
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
    <button class="nes-btn is-warning" onclick={toggleSearch}>Search</button>
  </div>
</nav>

<!-- Search Modal - Svelte 5 syntax -->
{#if searchOpen}
  <div
    class="search-modal-overlay"
    onclick={(e) => {
      if (e.currentTarget === e.target) toggleSearch();
    }}
    onkeydown={(e) => {
      if (e.currentTarget === e.target && e.key === 'Enter') toggleSearch();
    }}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="search-modal">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Search</h2>
        <button class="nes-btn is-error" onclick={toggleSearch} aria-label="Close">X</button>
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