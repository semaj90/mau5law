<script lang="ts">
  // forward any props and events to the native button
  export let $$restProps: Record<string, any>;
</script>

<button {...$$restProps}>
  <slot />
</button>
