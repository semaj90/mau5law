<script lang="ts">
  import { ContextMenu } from "bits-ui";
  import type {     Snippet     } from 'svelte';
  import type { WithoutChild } from "bits-ui";
  interface Props extends ContextMenu.RootProps {
    trigger: Snippet;
    items: Array;
    contentProps?: WithoutChild<ContextMenu.ContentProps>;
  }
  let { open = $bindable(false),
    trigger,
    items,
    contentProps,
    children,
    ...restProps
   }: Props = $props();
</script>
<ContextMenu.Root bind:open {...restProps}>
  <ContextMenu.Trigger>
    {@render trigger()}
  </ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content {...contentProps}>
      {#each items as item}
        {#if (item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).type === 'separator'}
          <ContextMenu.Separator />
        {:else if (item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).type === 'checkbox'}
          <ContextMenu.CheckboxItem
            value={(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).value}
            disabled={(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).disabled}
            select={(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).onSelect}
          >
            {#snippet children({ checked })}
              {#if checked}✓{/if}
              {(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).label}
            {/snippet}
          </ContextMenu.CheckboxItem>
        {:else if (item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).type === 'radio'}
          <ContextMenu.RadioItem
            value={(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).value}
            disabled={(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).disabled}
            select={(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).onSelect}
          >
            {#snippet children({ checked })}
              {#if checked}●{/if}
              {(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).label}
            {/snippet}
          </ContextMenu.RadioItem>
        {:else if (item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).type === 'sub' && (item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).items}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger>{(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).label}</ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent>
                {#each (item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).items as subItem}
                  <ContextMenu.Item
                    textValue={subItem.label}
                    disabled={subItem.disabled}
                    select={subItem.onSelect}
                  >
                    {subItem.label}
                  </ContextMenu.Item>
                {/each}
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>
        {:else}
          <ContextMenu.Item
            textValue={(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).label}
            disabled={(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).disabled}
            select={(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).onSelect}
          >
            {(item as { type?: unknown; value?: unknown; disabled?: unknown; onSelect?: unknown; label?: unknown; items?: unknown }).label}
          </ContextMenu.Item>
        {/if}
      {/each}
      {@render children?.()}
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>