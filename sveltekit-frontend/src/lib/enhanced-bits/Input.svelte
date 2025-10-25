<script lang="ts">
  // Compatibility shim: forward to real Input implementation
  import RealInput from '$lib/components/ui/Input.svelte';
  export let value: string | number | undefined;
  export let placeholder: string | undefined;
  export let disabled: boolean = false;
</script>

<svelte:component this={RealInput} {value} {placeholder} {disabled} {...$$restProps}>
  <slot />
</svelte:component>

<style>
  /* shim - no styles */
</style>
