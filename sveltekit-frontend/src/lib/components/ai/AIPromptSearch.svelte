<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  // Svelte 5 runes are auto-imported

  import { , onMount } from 'svelte';

  

  import { aiHistory } from "$lib/stores/aiHistoryStore";
  import Fuse from "fuse.js";
  
  let query = $state("");
  let fuse: Fuse<any>;

  let history = $derived($aiHistory);

  $effect(() => {
    fuse = new Fuse(history, {
      keys: ["prompt", "response"],
      threshold: 0.3,
    });
  });

  let results = $derived(query && fuse ? fuse.search.map((r) => r.item) : history);
</script>

<div class="container mx-auto px-4">
  <input aria-label="Search AI history..."
    type="text"
    bind:value={query}
    placeholder="Search AI history..."
    class="container mx-auto px-4"
  />
  <ul class="container mx-auto px-4">
    {#each results as item}
      <li class="container mx-auto px-4">
        <div class="container mx-auto px-4">{(item as { prompt?: unknown; response?: unknown; timestamp?: unknown }).prompt}</div>
        <div class="container mx-auto px-4">{(item as { prompt?: unknown; response?: unknown; timestamp?: unknown }).response}</div>
        <div class="container mx-auto px-4">{(item as { prompt?: unknown; response?: unknown; timestamp?: unknown }).timestamp}</div>
      </li>
    {/each}
  </ul>
</div>



