<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { cn } from '$lib/utils';

  export let open: boolean = false;
  export let onOpenChange: ((open: boolean) => void) | undefined;
  export let size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
  export let closeOnEscape: boolean = true;
  export let closeOnOutsideClick: boolean = true;
  export let className: string = '';
  export let title: string | undefined = undefined;
  export let description: string | undefined = undefined;

  const sizeClasses: Record<'sm'|'md'|'lg'|'xl'|'full', string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-[95vw] max-h-[95vh]"
  };

  // stable id used for aria-controls / referencing the dialog
  let dialogId = `dialog-${Math.random().toString(36).slice(2,9)}`;

  $: dialogClasses = cn(
    "relative z-50 w-full max-h-[95vh] overflow-auto rounded-lg border bg-white p-6 shadow-lg dark:bg-slate-950",
    sizeClasses[size],
    className
  );

  let _prevOpen = open;
  $: if (_prevOpen !== open) {
    _prevOpen = open;
    onOpenChange?.(open);
  }

  function close() {
    open = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (closeOnEscape && event.key === "Escape") {
      close();
    }
  }

  function handleOutsideClick(event: MouseEvent) {
    if (closeOnOutsideClick && event.target === event.currentTarget) {
      close();
    }
  }

  function handleOverlayKeydown(event: KeyboardEvent) {
    // Activate overlay (close) with Enter or Space for keyboard users
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      close();
    }
  }

  // Ensure the dialog content (a visible non-interactive element that has a click
  // handler) also responds to keyboard events to satisfy a11y rules.
  function handleContentKeydown(event: KeyboardEvent) {
    // Prevent Enter/Space from triggering outer handlers and stop propagation
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
    }
    event.stopPropagation();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $$slots.trigger}
  <!-- accessible trigger: use native button (keyboard support + role handled) -->
  <button
    type="button"
    class="inline-block"
    aria-expanded={open}
    aria-controls={dialogId}
    onclick={() => (open = !open)}
  >
    <slot name="trigger" />
  </button>
{/if}

{#if open}
  <div
    class="fixed inset-0 z-40 flex items-center justify-center"
    role="presentation"
  >
    <!-- overlay -->
    <div
      class="fixed inset-0 bg-black/50"
      transition:fade={{ duration: 200 }}
      role="button"
      tabindex="0"
      aria-label="Close dialog"
      onclick={handleOutsideClick}
      onkeydown={handleOverlayKeydown}
    ></div>

    <!-- content -->
    <div
      id={dialogId}
      class={dialogClasses}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-desc" : undefined}
      tabindex="0"
      onclick={(event) => event.stopPropagation()}
      onkeydown={handleContentKeydown}
      transition:scale={{ duration: 180, start: 0.96 }}
    >
      <!-- header -->
      {#if title || description}
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            {#if title}
              <h2 id="dialog-title" class="text-lg font-semibold">
                {title}
              </h2>
            {/if}
            {#if description}
              <p id="dialog-desc" class="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {description}
              </p>
            {/if}
          </div>

          <!-- close button -->
          <button
            type="button"
            class="ml-4 inline-flex items-center justify-center rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
            onclick={close}
            aria-label="Close dialog"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      {/if}

      <!-- body -->
      <div class="dialog-body">
        <slot />
      </div>

      <!-- footer -->
      {#if $$slots.footer}
        <div class="mt-4">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* minimal, component-scoped adjustments */
  :global(.dialog-body) {
    color: var(--text-color, #0f172a);
  }

  /* Global scrollbar styling for dialogs (properly inside the same <style> block) */
  :global(.legal-ai-dialog *::-webkit-scrollbar-thumb) {
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.6), rgba(217, 119, 6, 0.6));
    border-radius: 4px;
  }
</style>
