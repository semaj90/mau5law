<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    children?: Snippet;
    asChild?: boolean;
  }
  let { children, asChild = false }: Props = $props();
</script>

{#if asChild}
  {@render children?.()}
{:else}
  <button type="button" class="drawer-trigger">
    {@render children?.()}
  </button>
{/if}
