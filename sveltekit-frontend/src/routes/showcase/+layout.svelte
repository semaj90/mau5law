<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import '../../app.css';
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<main>
  {#if children}
    {@render children()}
  {/if}
</main>

