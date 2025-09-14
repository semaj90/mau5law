<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { ContextMenu } from "bits-ui";
  import type {     Snippet     } from 'svelte';
  import type { WithoutChild } from "bits-ui";

  interface Props extends ContextMenu.RootProps {
    trigger: Snippet;
    items: Array;
    contentProps?: WithoutChild<ContextMenu.ContentProps>;
  }

  let {
    open = $bindable(false),
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
        {#if (item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).type === 'separator'}
          <ContextMenu.Separator />
        {:else if (item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).type === 'checkbox'}
          <ContextMenu.CheckboxItem 
            value={(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).value} 
            disabled={(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).disabled}
            select={(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).onSelect}
          >
            {#snippet children({ checked })}
              {#if checked}✓{/if}
              {(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).label}
            {/snippet}
          </ContextMenu.CheckboxItem>
        {:else if (item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).type === 'radio'}
          <ContextMenu.RadioItem 
            value={(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).value} 
            disabled={(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).disabled}
            select={(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).onSelect}
          >
            {#snippet children({ checked })}
              {#if checked}●{/if}
              {(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).label}
            {/snippet}
          </ContextMenu.RadioItem>
        {:else if (item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).type === 'sub' && (item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).items}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger>{(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).label}</ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent>
                {#each (item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).items as subItem}
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
            textValue={(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).label}
            disabled={(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).disabled}
            select={(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).onSelect}
          >
            {(item as { type?: any; value?: any; disabled?: any; onSelect?: any; label?: any; items?: any }).label}
          </ContextMenu.Item>
        {/if}
      {/each}
      {@render children?.()}
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>
