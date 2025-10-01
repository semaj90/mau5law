<script lang="ts">
  // In Svelte 5, this component simply passes through its children
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  // In Svelte 5, this component accepts a children snippet
  let { children }: { children?: Snippet } = $props();
</script>

{@render children?.()}
