<script lang="ts">
  interface Props {
    class_?: string;
    children?: import('svelte').Snippet;
  }

  let { class_ = '', children }: Props = $props();
</script>

<span class="mx-auto px-4 max-w-7xl">
  {@render children?.()}
</span>

<style>
  .select-label {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 4px;
    display: block;
  }
</style>

