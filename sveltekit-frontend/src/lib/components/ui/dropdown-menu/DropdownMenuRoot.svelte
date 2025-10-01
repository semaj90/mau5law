<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';
  interface Props {
    children?: Snippet;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
  let { children, open = $bindable(false), onOpenChange }: Props = $props();
  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen as boolean);
  }
</script>

<DropdownMenu.Root bind:open onOpenChange={handleOpenChange}>
  {@render children?.()}
</DropdownMenu.Root>