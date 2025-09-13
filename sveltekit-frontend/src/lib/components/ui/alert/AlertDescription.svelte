<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    class?: string;
    children?: import('svelte').Snippet;
  }
  let { 
    class: className = '',
    children,
    ...restProps } = $props();
</script>

<div class="text-sm [&_p]:leading-relaxed {className}" {...restProps}>
  {@render children?.()}
</div>

