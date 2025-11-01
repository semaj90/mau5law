<script lang="ts">
  // Compatibility shim: forward to real Button implementation
  import { RealButton } from '$lib/components/ui/enhanced-bits/Button.svelte';
  let { type = 'button', disabled = false, ...rest } = $props<{
    type?: string;
    disabled?: boolean;
  }>();
  // forward any other props via rest
</script>
<!-- cast RealButton to any to bypass strict prop checks from sveltets -->
<svelte:component this={RealButton as any} {type} {disabled} {...rest}>
  <slot />
</svelte:component>
<style>
  /* shim - no styles */
</style>
