<script lang="ts">
  interface Props {
    src?: string;
    alt?: string;
    class?: string;
    [key: string]: any;
  }

  let { src = '', alt = '', class: className = '', ...rest }: Props = $props // TODO: Verify store subscription is correct for Svelte 5();
</script>

<img
  {src}
  {alt}
  class={`
    aspect-square h-full w-full
    ${className}
  `}
  {...rest}
/>