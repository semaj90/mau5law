<script lang="ts">
  interface Props {
    class_?: string;
    children?: import('svelte').Snippet;
  }

  let { class_ = '', children }: Props = $props();
</script>

<div class="mx-auto px-4 max-w-7xl">
  {@render children?.()}
</div>

<style>
  .select-group {
    padding: 4px 0;
  }
</style>

