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

<span class="space-y-4">
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  /* @unocss-include */
  .select-label {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 4px;
    display: block;
}
</style>

