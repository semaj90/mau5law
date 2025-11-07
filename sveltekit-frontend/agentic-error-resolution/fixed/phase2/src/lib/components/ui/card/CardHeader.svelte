<script lang="ts">
  export let className = '';
</script>

<header {...$$restProps} class={`ui-card-header ${className}`}>
  <slot />
</header>

<style>
  .ui-card-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.03);
  }
</style>
