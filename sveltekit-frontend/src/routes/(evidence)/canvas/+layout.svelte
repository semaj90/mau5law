<script lang="ts">
  // Svelte, 5 runes are auto-imported
  import type { onMount  } from 'svelte';
  // Use runes-style local state for mount flag
  let mounted = $state <boolean>(false);

  onMount(() => {
    mounted = true;
  });
</script>

<main class="evidence-canvas-layout" class:mounted>
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>

  <!-- render child routes/content (Svelte 5) -->
  <slot />
</main>

<style>
  .evidence-canvas-layout {
    min-height: 100vh;
    width: 100%;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }
  .evidence-canvas-layout.mounted {
    opacity: 1;
  }
  :global(body) {
    margin: 0;
    padding: 0;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
      'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>
