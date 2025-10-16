<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    children?: Snippet;
  } let { class: className = '', children }: Props = $props();

  <div class="{className} space-y-4">
  {#if children}
    {@render children()}
  {/if}
</div>
</script>
<style>
  .card-header { font-weight: 600; margin-bottom: 0.5rem; }
</style>
