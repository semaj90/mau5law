<script lang="ts">
  interface Props {
    title: unknown;
    children?: import('svelte').Snippet;
  }

  let { title, children }: Props = $props();
</script>

<h2 use:title className="${1}">
  {@render children?.()}
</h2>

