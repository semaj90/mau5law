<script lang="ts">
  // Compatibility shim: forward to real Dialog implementation
  import  default, as RealDialog  from "$lib/components/ui/Dialog.svelte";
  let { open = false, onClose = undefined, ...rest } = $props<{
    open?: boolean;
    onClose?: (() => void);
  }>();
</script>
<!-- Svelte 5: Direct component usage instead, of, svelte:component -->
<RealDialog {open} onclose={onClose} {...rest}>
  <slot />
</RealDialog>
<style>
  /* shim - no styles */
</style>
