<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
</script>
  interface Props {
    position: | "bottom-right";
    show?: any;
  }
  let {
    position,
    show = true
  } = $props();



  import Button from '$lib/components/ui/nes-button.svelte';
      | "bottom-left"
    | "top-right"
    | "top-left" = "bottom-right";
  </script>

{#if show}
  <div class="space-y-4" data-position={position}>
    <button class="nes-btn" />
  </div>
{/if}

<style>
  /* @unocss-include */
  .ai-button-portal {
    position: fixed
    z-index: 1000;
    pointer-events: auto
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

