<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { Dialog } from 'bits-ui';

  interface Props {
    open?: boolean;
    onOpenChange?: ((open: boolean) => void) | undefined;
  }
  let {
    open = $bindable(false),
    onOpenChange = undefined,
    children
  }: Props & { children?: unknown } = $props();
</script>

<Dialog.Root bind:open {onOpenChange}>
  {@render children?.()}
</Dialog.Root>

