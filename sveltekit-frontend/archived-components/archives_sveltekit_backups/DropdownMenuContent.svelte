<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    menu: unknown;
    children?: import('svelte').Snippet;
    [key: string]: any
  }

  let { menu, children, ...rest }: Props = $props();
</script>

<div 
  use:menu 
  className="${1}"
  {...rest}
>
  {@render children?.()}
</div>

