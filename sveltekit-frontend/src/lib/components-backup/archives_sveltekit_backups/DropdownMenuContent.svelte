<script lang="ts">
</script>
  export let menu: unknown;
</script>

<div 
  use:menu 
  className="${1}"
  {...$$restProps}
>
  <slot />
</div>

