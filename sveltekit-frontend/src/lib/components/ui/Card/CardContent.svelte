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
    p-6 pt-0
    ${className}
  `}
  {...rest}
>
  {@render children?.()}
</div>
