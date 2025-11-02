<script lang="ts">
  // Compatibility shim: forward to real Card implementation
  import { Card as RealCard } from '$lib/components/ui/Card';
  let { className = undefined, style = undefined, ...rest } = $props<{
    className?: string;
    style?: string;
  }>();
</script>
<RealCard class={className} {style} {...rest}>
  <slot />
</RealCard>
<style>
  /* shim - no styles */
</style>
