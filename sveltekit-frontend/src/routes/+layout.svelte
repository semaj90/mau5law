<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import '../app.css';
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<!-- Minimal SSR-safe layout -->
<div class="min-h-screen bg-gray-900 text-white">
  <main class="container mx-auto p-4">
    {#if children}
      {@render children()}
    {/if}
  </main>
</div>

<style>
/* Minimal global styles */
:global(body) {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  background: #0f0f23;
  color: #e2e8f0;
  line-height: 1.5;
  margin: 0;
  padding: 0;
}

:global(.container) {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}
</style>