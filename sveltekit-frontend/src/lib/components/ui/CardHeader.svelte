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
    {@render children()}
  {/if}
</div>
</script>
