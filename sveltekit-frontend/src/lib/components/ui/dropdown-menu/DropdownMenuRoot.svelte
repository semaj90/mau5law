<script lang="ts">
  import createDropdownMenu from 'bits-ui';
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

<createDropdownMenu.Root bind:open onOpenChange={handleOpenChange}>
  {@render children?.()}
</createDropdownMenu.Root>