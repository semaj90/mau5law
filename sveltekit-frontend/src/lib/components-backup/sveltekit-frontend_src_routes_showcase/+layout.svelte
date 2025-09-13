<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import '../../app.css';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<main>
  {@render children?.()}
</main>

