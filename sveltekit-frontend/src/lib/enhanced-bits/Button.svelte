<script lang="ts">
  // Compatibility shim: forward to real Button implementation
  import RealButton from '$lib/components/ui/enhanced-bits/Button.svelte';
  export let type: string = 'button';
  export let disabled: boolean = false;
  // forward any other props via $$restProps
</script>

<!-- cast RealButton to any to bypass strict prop checks from sveltets -->
<svelte:component this={RealButton as any} {type} {disabled} {...$$restProps}>
  <slot />
</svelte:component>

<style>
  /* shim - no styles */
</style>
