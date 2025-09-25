<!-- tabs-bits-content.svelte -->
<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils';
  let { value, forceMount = false, class: className = undefined, children = undefined, ...restProps } = $props();
</script>

<TabsPrimitive.Content
  {value}
  {forceMount}
  class={cn(
    'mt-2 ring-offset-background',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'data-[orientation=vertical]:mt-0 data-[orientation=vertical]:border-l data-[orientation=vertical]:border-border data-[orientation=vertical]:pl-4',
    className,
  )}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</TabsPrimitive.Content>;
