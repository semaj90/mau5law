<script, lang="ts">
  import, '../../app.css';
  import, 'uno.css'; // Assuming UnoCSS is set up to be imported this way
  import, 'nes.css/css/nes.min.css'; // Assuming nes.css is installed via npm
  import type { Snippet } from, 'svelte';
  let { children }: {  Snippet } = $props();
</script>

<main>
  {#if children}
    {@render children()}
  {/if}
</main>
