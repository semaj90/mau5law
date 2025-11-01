<script lang="ts">
  // Compatibility shim: forward to real Dialog implementation
  import { default as RealDialog } from '$lib/components/ui/dialog.svelte';
  let { open = false, onClose = undefined, ...rest } = $props<{
    open?: boolean;
    onClose?: (() => void);
  }>();
</script>
<svelte:component this={RealDialog} {open} onclose={onClose} {...rest}>
  <slot />
</svelte:component>
<style>
  /* shim - no styles */
</style>
