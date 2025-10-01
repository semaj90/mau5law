<!-- DropdownMenu component combining dropdown-menu parts -->
<script lang="ts">
  import DropdownMenuRoot from './dropdown-menu/DropdownMenuRoot.svelte';
  import DropdownMenuTrigger from './dropdown-menu/DropdownMenuTrigger.svelte';
  import DropdownMenuContent from './dropdown-menu/DropdownMenuContent.svelte';
  import DropdownMenuItem from './dropdown-menu/DropdownMenuItem.svelte';
  import DropdownMenuSeparator from './dropdown-menu/DropdownMenuSeparator.svelte';
  // Component props
  let { items = [] as unknown[],
    trigger = 'Menu',
    ...props
   }: { items?: unknown[];
    trigger?: string | import('svelte').Snippet;
    ...props: unknown } = $props();
</script>

<DropdownMenuRoot {...props}>
  <DropdownMenuTrigger>
    {#if typeof trigger === 'string'}
      {trigger}
    {:else}
      {@render (trigger as import('svelte').Snippet)?.()}
    {/if}
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {#each items as item, index}
      {#if (item as { separator?: unknown; value?: unknown; disabled?: unknown; onClick?: unknown; label?: unknown }).separator}
        <DropdownMenuSeparator />
      {:else}
        <DropdownMenuItem
          value={(
            item as { separator?: unknown; value?: unknown; disabled?: unknown; onClick?: unknown; label?: unknown }
          ).value}
          disabled={(
            item as { separator?: unknown; value?: unknown; disabled?: unknown; onClick?: unknown; label?: unknown }
          ).disabled || false}
          onclick={() =>
            (
              item as { separator?: unknown; value?: unknown; disabled?: unknown; onClick?: unknown; label?: unknown }
            ).onClick?.(
              (item as { separator?: unknown; value?: unknown; disabled?: unknown; onClick?: unknown; label?: unknown })
                .value,
            )}
        >
          {(item as { separator?: unknown; value?: unknown; disabled?: unknown; onClick?: unknown; label?: unknown })
            .label}
        </DropdownMenuItem>
      {/if}
    {/each}
  </DropdownMenuContent>
</DropdownMenuRoot>
