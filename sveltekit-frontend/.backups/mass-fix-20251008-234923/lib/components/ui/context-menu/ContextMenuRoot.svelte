<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();
</script>

<div role="menu">
  {@render children?.()}
</div>
