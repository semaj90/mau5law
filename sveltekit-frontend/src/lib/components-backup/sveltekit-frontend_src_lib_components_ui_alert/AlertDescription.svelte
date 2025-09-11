<script lang="ts">
  let { children,
    class: className = '',
    children,
    ...restProps
  } = $props();
</script>

<div class="text-sm [&_p]:leading-relaxed {className}" {...restProps}>
  {@render children?.()}
</div>

