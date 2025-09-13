<script lang="ts">
  import 'nes.css/css/nes.min.css';
  // Simple typed prop for dialog description
  interface Props {
    description: any;
    children?: import('svelte').Snippet;
  }

  let { description, children }: Props = $props();
</script>

<p class="space-y-4">
  {#if description}
    {@html description}
  {:else}
    {@render children?.()}
  {/if}
</p>

