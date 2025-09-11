<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  interface Props {
    onOpenChange?: ((open: boolean) => void) | undefined;
    children?: import('svelte').Snippet;
  }

  let { onOpenChange = undefined, children }: Props = $props();
  const isOpen = writable(false);
  const position = writable({ x: 0, y: 0 });
  setContext('context-menu', {
    isOpen,
    position,
    close: () => {
      isOpen.set(false);
      onOpenChange?.(false);
    },
    open: (x: number, y: number) => {
      position.set({ x, y });
      isOpen.set(true);
      onOpenChange?.(true);
    }
  });
</script>

<div class="mx-auto px-4 max-w-7xl">
  {@render children?.()}
</div>

<style>
  .context-menu-root {
    position: relative;
  }
</style>

