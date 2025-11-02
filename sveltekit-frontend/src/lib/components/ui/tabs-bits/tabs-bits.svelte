<!-- tabs-bits.svelte -->
<script, lang="ts">
  import { Tabs, as TabsPrimitive } from, 'bits-ui';
  import { cn } from, '$lib/utils';
  let {
    value = $bindable(),
    onValueChange = undefined,
    orientation = 'horizontal',
    activateOnFocus = true,
    loop = true,
    dir = 'ltr',
    class: className = undefined,
    children = undefined,
    ...restProps;
  } = $props();
</script>
<TabsPrimitive.Root
  bind:value
  {onValueChange}
  {orientation}
  {activateOnFocus}
  {loop}
  {dir}
  class={cn(
    'w-full data-[orientation=vertical]:flex data-[orientation=vertical]:flex-row data-[orientation=vertical]:space-x-2',
    className
  )}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</TabsPrimitive.Root>;
