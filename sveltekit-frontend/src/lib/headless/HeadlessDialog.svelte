<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { tick } from 'svelte';
  // Props - Svelte 5 runes
  let {
    open,
    initialFocus = null,
    restoreFocus = true,
    closeOnEsc = true,
    closeOnBackdrop = true,
    ariaLabelledby,
    ariaDescribedby
  }: {
    open?: boolean;
    initialFocus?: (() => HTMLElement | null) | null;
    restoreFocus?: boolean;
    closeOnEsc?: boolean;
    closeOnBackdrop?: boolean;
    ariaLabelledby?: string;
    ariaDescribedby?: string;
  } = $props();
  let internal = $state(false);
  let container: HTMLElement | null = null;
  let previousActive: HTMLElement | null = null;

  let isOpen = $derived(open ?? internal);

  function setOpen(v: boolean) {
    if (open === undefined) internal = v;
  }

  function handleKey(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'Escape' && closeOnEsc) {
      e.stopPropagation();
      setOpen(false);
      dispatchClose();
    }
  }

  function dispatchOpen() {
    const ev = new CustomEvent('open');
    container?.dispatchEvent(ev);
  }
  function dispatchClose() {
    const ev = new CustomEvent('close');
    container?.dispatchEvent(ev);
  }

  async function trapFocus() {
    if (!isOpen || !container) return;
    await tick();
    const target = initialFocus?.() || container.querySelector<HTMLElement>('[data-autofocus]') || container.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    target?.focus();
  }

  $effect(() => {
    if (isOpen) {
      previousActive = (document.activeElement as HTMLElement) ?? null;
      dispatchOpen();
      trapFocus();
      document.addEventListener('keydown', handleKey, true);
    } else {
      document.removeEventListener('keydown', handleKey, true);
      if (restoreFocus) previousActive?.focus?.();
      dispatchClose();
    }
  });

  function backdropClick(e: MouseEvent) {
    if (!closeOnBackdrop) return;
    if (e.target === container) {
      setOpen(false);
    }
  }

  onMount(() => {
    // SSR safety already handled (no DOM access top-level)
  });
  onDestroy(() => {
    document.removeEventListener('keydown', handleKey, true);
  });
</script>

{#if isOpen}
  <div
    bind:this={container}
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    role="dialog"
    aria-modal="true"
    {ariaLabelledby}
    {ariaDescribedby}
    onclick={backdropClick}
  >
    <div class="bg-background shadow-lg rounded-md max-h-[90vh] overflow-auto w-full max-w-lg p-4 relative">
      <slot name="title" />
      <slot />
      <slot name="footer" />
      <button
        type="button"
        class="absolute top-2 right-2 text-sm opacity-70 hover:opacity-100"
        aria-label="Close"
        onclick={() => setOpen(false)}
      >✕</button>
    </div>
  </div>
{/if}
