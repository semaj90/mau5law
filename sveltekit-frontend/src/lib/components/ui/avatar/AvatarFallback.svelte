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
    flex h-full w-full items-center justify-center rounded-full bg-muted
    ${className}
  `}
  {...rest}
>
  {@render children?.()}
</div>