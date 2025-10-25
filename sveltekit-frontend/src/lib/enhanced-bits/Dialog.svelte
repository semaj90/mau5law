<script lang="ts">
  // Compatibility shim: forward to real Dialog implementation
  import RealDialog from '$lib/components/ui/Dialog.svelte';
  export let open: boolean = false;
  export let onClose: (() => void) | undefined;
</script>

<svelte:component this={RealDialog} {open} on:close={onClose} {...$$restProps}>
  <slot />
</svelte:component>

<style>
  /* shim - no styles */
</style>
