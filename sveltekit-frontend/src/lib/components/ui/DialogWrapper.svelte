<!-- Dialog Wrapper: Svelte 5, Bits UI, UnoCSS, analytics logging -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Dialog from 'bits-ui';
  interface Props {
    open?: boolean;
    title?: string;
    description?: string;
    analyticsLog?: (_event: unknown) => void;
    onClose?: () => void;
    children?: Snippet;
  }
  let {
    children,
    open = $bindable(false),
    title = '',
    description = '',
    analyticsLog = () => {},
    onClose = () => {},
  }: Props = $props();
  $effect(() => {
    if (open) {
      analyticsLog({ event: 'dialog_opened', title, timestamp: Date.now() });
    } else {
      analyticsLog({ event: 'dialog_closed', timestamp: Date.now() });
    }
  });
  function handleClose() {
    open = false;
    onClose();
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="modal-overlay" />
    <Dialog.Content class="modal-content">
      {#if title}
        <Dialog.Title class="modal-title">{title}</Dialog.Title>
      {/if}
      {#if description}
        <Dialog.Description class="modal-description">{description}</Dialog.Description>
      {/if}
      <div class="modal-body">
        {#if children}
          {@render children()}
        {/if}
      </div>
      <Dialog.Close class="modal-close" onclick={handleClose}>×</Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.modal-overlay) {
    @apply fixed inset-0 bg-black/60 z-40;
  }
  :global(.modal-content) {
    @apply fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2;
    @apply bg-nier-surface border border-nier-border rounded-lg p-6 shadow-2xl;
  }
  :global(.modal-title) {
    @apply text-xl font-bold text-nier-accent mb-2;
  }
  :global(.modal-description) {
    @apply text-nier-text-muted mb-4;
  }
  :global(.modal-close) {
    @apply absolute top-4 right-4 w-8 h-8 rounded-full bg-nier-surface-light;
    @apply hover:bg-nier-surface-lighter transition-color;
    @apply flex items-center justify-center text-nier-text-muted hover:text-nier-white;
  }
</style>
