<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    children?: import('svelte').Snippet;
    class?: string;
  }

  let { 
    children, 
    class: className = ''
  }: Props = $props();
</script>

<div class="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 nes-text is-disabled {className}">
  {@render children?.()}
</div>
