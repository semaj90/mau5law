<!-- @migration-task Error while migrating Svelte code: Identifier 'children' has already been declared
https://svelte.dev/e/js_parse_error -->
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

