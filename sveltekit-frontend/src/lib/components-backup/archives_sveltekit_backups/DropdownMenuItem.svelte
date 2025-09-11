<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
    [key: string]: any
  }

  let { children, ...rest }: Props = $props();
  // Menu item component
</script>

<button 
  className="${1}"
  {...rest}
>
  {@render children?.()}
</button>

