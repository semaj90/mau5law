<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  interface Props {
    asChild?: any;
  }
  let {
    asChild = false
  } = $props();



  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  interface BuilderAction {
    action: (node: HTMLElement) => void;
  }
  const { open } = getContext<{
    isOpen: Writable<boolean>
    position: Writable<{ x: number y: number }>;
    open: (x: number, y: number) => void;
    close: () => void;
  }>('context-menu');
  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    open(event.clientX, event.clientY);
  }
  const builder: BuilderAction = {
    action: (node: HTMLElement) => {
      node.addEventListener('contextmenu', handleContextMenu);
      return {
        destroy() {
          node.removeEventListener('contextmenu', handleContextMenu);
  }
      };
  }
  };
</script>

{#if asChild}
  <slot {builder} />
{:else}
  <div use:builder.action>
    <slot></slot>
  </div>
{/if}

