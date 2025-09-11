<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet<[any]>;
  }

  let { children }: Props = $props();
  const { elements, states } = createContextMenu();
  const { menu, trigger } = elements;
  export { menu, trigger, states };
</script>

{@render children?.({ menu, trigger, states, })}

