<script lang="ts">
</script>
  import '../../app.css';
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<main>
  {@render children?.()}
</main>

