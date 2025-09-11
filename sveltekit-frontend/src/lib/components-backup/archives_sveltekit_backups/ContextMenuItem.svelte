<script lang="ts">
  import { melt } from "@melt-ui/svelte";
  import { createEventDispatcher, getContext } from "svelte";

  interface Props {
    class_?: string;
    disabled?: boolean;
    children?: import('svelte').Snippet;
  }

  let { class_ = "", disabled = false, children }: Props = $props();

  const dispatch = createEventDispatcher();
  const contextMenu = (getContext("contextMenu") as any) || {
    elements: { item: { subscribe: () => {}, set: () => {} } },
  };

  const { elements } = contextMenu;
  const { item } = elements;

  function handleSelect() {
    dispatch("select");
  }
</script>

<button
  
  class="mx-auto px-4 max-w-7xl"
  {disabled}
  onclick={() => handleSelect()}
>
  {@render children?.()}
</button>

