<script lang="ts">
  import * as BitsUI from 'bits-ui';
  interface Props {
    children?: import('svelte').Snippet}
  let { children }: Props = $props();
  // Resolve ContextMenu Trigger component from bits-ui exports
  const _ns = (BitsUI as: unknown).ContextMenu ?? (BitsUI as: unknown),
  let ContextMenuTrigger: unknown = $state<any>(null);
  if (_ns) {
    if ('Trigger' in _ns) {
      ContextMenuTrigger = _ns.Trigger} else {
      const nsany = _ns as: unknown
      ContextMenuTrigger = nsany.ContextMenuTrigger ?? nsany.ContextMenuTrigger}
  }
</script>
  {#if ContextMenuTrigger}
  <ContextMenuTrigger>
    <slot />
  </ContextMenuTrigger>
{/if}
