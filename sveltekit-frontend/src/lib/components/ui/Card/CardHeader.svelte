<script lang="ts">
  interface Props {
    class?: string;
    children?: any;
    [key: string]: any;
  }

  let { class: className = '', children, ...rest }: Props = $props // TODO: Verify store subscription is correct for Svelte 5();
</script>

<div
  class={`
    flex flex-col space-y-1.5 p-6
    ${className}
  `}
  {...rest}
>
  {@render children?.()}
</div>
