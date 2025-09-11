<script lang="ts">
  import AIButton from "$lib/components/ai/AIButton.svelte";
  interface Props {
    position?: 
    | "bottom-right"
    | "bottom-left"
    | "top-right"
    | "top-left";
    show?: boolean;
    style?: string;
  }

  let { position = "bottom-right", show = true, style = "" }: Props = $props();
</script>

{#if show}
  <div class="mx-auto px-4 max-w-7xl" data-position={position} {style}>
    <AIButton />
  </div>
{/if}

<style>
  .ai-button-portal {
    position: fixed;
    z-index: 1000;
    pointer-events: auto;
  }
  [data-position="bottom-right"] {
    right: 1.5rem;
    bottom: 1.5rem;
  }
  [data-position="bottom-left"] {
    left: 1.5rem;
    bottom: 1.5rem;
  }
  [data-position="top-right"] {
    right: 1.5rem;
    top: 1.5rem;
  }
  [data-position="top-left"] {
    left: 1.5rem;
    top: 1.5rem;
  }
</style>

