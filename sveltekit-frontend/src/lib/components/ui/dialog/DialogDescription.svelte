<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    description: any;
    children?: Snippet;
  }
  let {
    description,
    children
  }: Props = $props();
</script>

<p use:description class="space-y-4">
  {#if children}{@render children()}{/if}
</p>