<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
</script>
  interface Props {
    class_: string ;
  }
  let {
    class_ = '',
    children
  }: Props & { children?: unknown } = $props();

  </script>

<div class="space-y-4">
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  /* @unocss-include */
  .select-group {
    padding: 4px 0;
}
</style>

