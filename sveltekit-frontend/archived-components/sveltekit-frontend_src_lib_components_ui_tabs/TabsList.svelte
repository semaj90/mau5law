<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
  let className: string = '';

</script>

<div class="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 nes-text is-disabled {className}">
  {@render children?.()}
</div>
