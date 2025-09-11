<script>
  /** @type {{children?: import('svelte').Snippet}} */
  let { children } = $props();
</script>

<div className="${1}">
  {@render children?.()}
</div>

