<script lang="ts">
  import { createDialog } from '@melt-ui/svelte';
  import { writable } from 'svelte/store';
  interface Props {
    open?: boolean;
    onOpenChange?: ((open: boolean) => void) | undefined;
    children?: import('svelte').Snippet<[any]>;
  }

  let { open = $bindable(false), onOpenChange = undefined, children }: Props = $props();
  const openWritable = writable(open);
  // Keep the writable in sync with the prop
  // TODO: Convert to $derived: openWritable.set(open)
  const {
    elements: { trigger, overlay, content, title, description, close },
    states: { open: openState }
  } = createDialog({
    open: openWritable,
    onOpenChange: ({ next }) => {
      open = next;
      onOpenChange?.(next);
      return next;
    }
  });
  export { trigger, overlay, content, title, description, close, openState };
</script>

{@render children?.({ trigger, overlay, content, title, description, close, openState, })}

