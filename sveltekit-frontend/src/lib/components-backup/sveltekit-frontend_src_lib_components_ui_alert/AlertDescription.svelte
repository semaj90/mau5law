<!-- @migration-task Error while migrating Svelte code: Identifier 'children' has already been declared
https://svelte.dev/e/js_parse_error -->
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

