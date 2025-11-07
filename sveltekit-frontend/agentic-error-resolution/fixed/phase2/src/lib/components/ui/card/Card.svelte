<script lang="ts">
  export let className = '';
</script>

<article {...$$restProps} class={`ui-card ${className}`}>
  <slot />
</article>

<style>
  .ui-card {
    background: var(--card-bg, #0b1220);
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: 8px;
    padding: 0;
  }
</style>
