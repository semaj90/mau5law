<script lang="ts">
  import type { Snippet } from 'svelte';

  let { className = '' }: { className?: string } = $props();
  let { children }: { children?: Snippet } = $props();
</script>
+
<div class={`dropdown-menu ${className}`} role="menu">
  {@render children?.()}
</div>
