<script lang="ts">
  let { children,
    class: className = '',
    children,
    ...restProps
  } = $props();
</script>

<h5 class="mb-1 font-medium leading-none tracking-tight {className}" {...restProps}>
  {@render children?.()}
</h5>

