<script lang="ts">
  import createDropdownMenu from 'bits-ui'; // Use named import if not default
  // import type { Snippet } from 'svelte';
  // Use a generic function type for renderable children
  type Renderable = (() => any) | undefined;

  // Destructure the Root component from the createDropdownMenu object (do not call it)
  const { Root } = createDropdownMenu;

  /**
   * Props for DropdownMenuRoot.
   * Usage (Svelte 5 runes):
   * <DropdownMenuRoot open={$bindable(false)} onOpenChange={fn}>{...}</DropdownMenuRoot>
   * - `open` is bindable and controls menu state.
   * - `onOpenChange` is called with the new open state.
   * - `children` should be a render function.
   */
  interface Props {
    children?: Renderable;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  // Destructure directly from $props() so $bindable() is used in the declaration
  let { children, open = $bindable(false), onOpenChange }: Props = $props<Props>();

  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen as boolean);
  }
</script>

<Root bind:open onOpenChange={handleOpenChange}>
  {@render children?.()}
</Root>