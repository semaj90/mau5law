<script lang="ts">
  import { tick } from 'svelte';

  interface HeadlessDialogProps {
    open?: boolean;
    initialFocus?: (() => HTMLElement | null) | null;
    restoreFocus?: boolean;
    closeOnEsc?: boolean;
    closeOnBackdrop?: boolean;
    ariaLabelledby?: string;
    ariaDescribedby?: string;
    onOpen?: () => void;
    onClose?: () => void;
  }

  let {
    open = $bindable(),
    initialFocus = null,
    restoreFocus = true,
    closeOnEsc = true,
    closeOnBackdrop = true,
    ariaLabelledby,
    ariaDescribedby,
    onOpen,
    onClose
  }: HeadlessDialogProps = $props();

  let container = $state<HTMLElement | null>(null);
  let previousActive = $state<HTMLElement | null>(null);
  let mounted = $state(false);

  function setOpen(v: boolean) {
    open = v;
    if (v && onOpen) onOpen();
    if (!v && onClose) onClose();
  }

  function handleKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape' && closeOnEsc) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  }

  function handleTabKey(e: KeyboardEvent) {
    if (!open || !container) return;
    if (e.key !== 'Tab') return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement) return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  async function trapFocus() {
    if (!open || !container || !mounted) return;
    await tick();

    const target = initialFocus?.()
      || container.querySelector<HTMLElement>('[data-autofocus]')
      || container.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');

    target?.focus();
  }

  // Handle dialog open/close effects
  $effect(() => {
    if (!mounted) return;

    if (open) {
      // Store current focus
      previousActive = document.activeElement as HTMLElement;

      // Add event listeners
      document.addEventListener('keydown', handleKey, true);
      document.addEventListener('keydown', handleTabKey, true);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Focus management
      trapFocus();
    } else {
      // Remove event listeners
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('keydown', handleTabKey, true);

      // Restore body scroll
      document.body.style.overflow = '';

      // Restore focus
      if (restoreFocus && previousActive) {
        previousActive.focus();
      }
    }

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('keydown', handleTabKey, true);
      document.body.style.overflow = '';
    };
  });

  // Mount effect
  $effect(() => {
    mounted = true;
    return () => {
      mounted = false;
    };
  });

  function backdropClick(e: MouseEvent) {
    if (!closeOnBackdrop) return;
    if (e.target === container) {
      setOpen(false);
    }
  }

  function handleContentClick(e: MouseEvent) {
    // Prevent backdrop click when clicking inside dialog content
    e.stopPropagation();
  }
</script>

{#if open && mounted}
  <!-- Portal to body for proper z-index stacking -->
  <div
    bind:this={container}
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby={ariaLabelledby}
    aria-describedby={ariaDescribedby}
    onclick={backdropClick}
    style="animation: fadeIn 0.2s ease-out;"
  >
    <div class="flex min-h-full items-center justify-center p-4">
      <div
        class="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white shadow-xl transition-all"
        onclick={handleContentClick}
        style="animation: slideIn 0.2s ease-out;"
      >
        <!-- Dialog header -->
        <div class="px-6 pt-6">
          <slot name="title" />
        </div>

        <!-- Dialog content -->
        <div class="px-6 py-4">
          <slot />
        </div>

        <!-- Dialog footer -->
        <div class="px-6 pb-6">
          <slot name="footer" />
        </div>

        <!-- Close button -->
        <button
          type="button"
          class="absolute right-4 top-4 rounded-md bg-transparent p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close dialog"
          onclick={() => setOpen(false)}
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
