<script lang="ts">
  import type { Snippet } from 'svelte';

  // Accept an optional children snippet in Svelte 5
  export let children: Snippet | undefined = undefined;

  // No-op snippet fallback
  const _noop: Snippet = (() => '') as Snippet;
</script>

<!-- Prefer explicit `children` prop; use optional chaining and a noop to avoid invalid_snippet -->
{@render (children ?? _noop)?.()}
