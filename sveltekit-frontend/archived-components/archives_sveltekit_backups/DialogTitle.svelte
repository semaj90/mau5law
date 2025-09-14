<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    title: unknown;
    children?: import('svelte').Snippet;
  }

  let { title, children }: Props = $props();
</script>

<h2 use:title className="${1}">
  {@render children?.()}
</h2>

