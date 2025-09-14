<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    description: unknown;
    children?: import('svelte').Snippet;
  }

  let { description, children }: Props = $props();
</script>

<p use:description className="${1}">
  {@render children?.()}
</p>

