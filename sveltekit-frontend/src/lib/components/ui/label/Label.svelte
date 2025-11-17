<script lang="ts">
  interface Props {
    htmlFor?: string;
    class?: string;
    children?: any;
    [key: string]: any;
  }

  let { htmlFor, class: className = '', children, ...rest }: Props = $props // TODO: Verify store subscription is correct for Svelte 5();
</script>

<label
  for={htmlFor}
  class={`
    text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70
    ${className}
  `}
  {...rest}
>
  {@render children?.()}
</label>