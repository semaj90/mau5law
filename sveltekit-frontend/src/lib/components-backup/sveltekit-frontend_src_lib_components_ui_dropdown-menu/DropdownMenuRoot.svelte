<script lang="ts">
  import 'nes.css/css/nes.min.css';
  interface Props {
    children?: import('svelte').Snippet<[any]>;
  }

  let { children }: Props = $props();
  const { elements, states } = createDropdownMenu();
  const { menu, trigger } = elements;
  export { menu, trigger, states };
</script>

{@render children?.({ menu, trigger, states, })}

