<script lang="ts">
  import { setContext } from "svelte";
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  // Create the context menu and set it in context for child components
  const contextMenu = createContextMenu();
  setContext("contextMenu", contextMenu);

  const { elements } = contextMenu;
  const { trigger } = elements;
</script>

<div >
  {@render children?.()}
</div>

