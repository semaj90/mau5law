<script>
  /** @type {{children?: import('svelte').Snippet}} */
  let { children } = $props();
</script>

<div class="space-y-4">
  {@render children?.()}
</div>

