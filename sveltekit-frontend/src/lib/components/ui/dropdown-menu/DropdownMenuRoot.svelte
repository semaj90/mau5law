<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let {
    children,
    open = $bindable(false),
    onOpenChange
  }: Props = $props();

  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen);
  }
</script>

<DropdownMenu.Root bind:open onOpenChange={handleOpenChange}>
  {@render children?.()}
</DropdownMenu.Root>

