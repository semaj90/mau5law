<script lang="ts">
  export let className: string = '';
</script>

<h3 {...$$restProps} class={`ui-card-title ${className}`}>
  <slot />
</h3>

<style>
  .ui-card-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }
</style>
