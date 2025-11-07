<script lang="ts">
  export let className = '';
</script>

<section {...$$restProps} class={`ui-card-content ${className}`}>
  <slot />
</section>

<style>
  .ui-card-content {
    padding: 1rem;
  }
</style>
