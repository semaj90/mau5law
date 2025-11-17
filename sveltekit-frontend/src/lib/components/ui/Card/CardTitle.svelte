<script lang="ts">
  interface Props {
    class?: string;
    children?: any;
    [key: string]: any;
  }

  let { class: className = '', children, ...rest }: Props = $props // TODO: Verify store subscription is correct for Svelte 5();
</script>

<h3
  class={`
    text-2xl font-semibold leading-none tracking-tight
    ${className}
  `}
  {...rest}
>
  {@render children?.()}
</h3>
