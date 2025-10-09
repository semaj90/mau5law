<!-- Portal component for rendering modals outside the component tree -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';
  let portal: HTMLDivElement;
  let target: HTMLElement;
  // children snippet for Svelte 5 runes
  export let children: Snippet | undefined = undefined;
  onMount(() => {
    // Create portal target if it doesn't exist
    target = document.getElementById('portal-target') as HTMLElement;
    if (!target) {
      target = document.createElement('div');
      target.id = 'portal-target';
      document.body.appendChild(target);
    }
    target.appendChild(portal);
  });
  onDestroy(() => {
    if (portal && portal.parentNode) {
      portal.parentNode.removeChild(portal);
    }
  });
</script>
<div bind:this={portal} style="display: contents;">
  {@render children?.()}
</div>