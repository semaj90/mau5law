<script lang="ts">
  interface Props {
    orientation?: 'horizontal' | 'vertical';
    class?: string;
    [key: string]: any;
  }

  let {
    orientation = 'horizontal',
    class: className = '',
    ...rest
  }: Props = $props // TODO: Verify store subscription is correct for Svelte 5();
</script>

<div
  class={`
    shrink-0 bg-border
    ${orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]'}
    ${className}
  `}
  {...rest}
></div>
