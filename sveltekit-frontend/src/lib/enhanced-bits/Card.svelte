<script lang="ts">
  // Compatibility shim: forward to real Card implementation
  import RealCard from '$lib/components/ui/Card.svelte';
  export let className: string | undefined;
  export let style: string | undefined;
</script>

<svelte:component this={RealCard} class={className} style={style} {...$$restProps}>
  <slot />
</svelte:component>

<style>
  /* shim - no styles */
</style>
