<script lang="ts">
  import { Dialog as DialogPrimitive } from "bits-ui";
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';
  import { fade, scale } from 'svelte/transition';

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnEscape?: boolean;
    closeOnOutsideClick?: boolean;
    class?: string;
    children?: Snippet;
    trigger?: Snippet;
    title?: string;
    description?: string;
  }

  let {
    open = $bindable(false),
    onOpenChange,
    size = 'md',
    closeOnEscape = true,
    closeOnOutsideClick = true,
    class: className = '',
    children,
    trigger,
    title,
    description
  }: Props = $props();

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw] max-h-[95vh]"
  };

  let dialogClasses = $derived(cn(
    "legal-ai-dialog fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 gap-4 border border-amber-500/20 bg-slate-900/95 backdrop-blur-md p-6 shadow-2xl shadow-amber-500/10 rounded-2xl",
    sizeClasses[size],
    className
  ));

  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen);
  }
</script>

<DialogPrimitive.Root bind:open onOpenChange={handleOpenChange}>
  {#if trigger}
    <DialogPrimitive.Trigger class="legal-ai-dialog-trigger">
      {@render trigger()}
    </DialogPrimitive.Trigger>
  {/if}

  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      class="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
      transition={fade}
      transitionConfig={{ duration: 200 }}
    />

    <DialogPrimitive.Content
      class={dialogClasses}
      transition={scale}
      transitionConfig={{ duration: 200, start: 0.95 }}
      {closeOnEscape}
      {closeOnOutsideClick}
    >
      {#if title || description}
        <div class="legal-ai-dialog-header space-y-2 mb-6">
          {#if title}
            <DialogPrimitive.Title class="text-2xl font-bold text-amber-400 tracking-tight">
              {title}
            </DialogPrimitive.Title>
          {/if}

          {#if description}
            <DialogPrimitive.Description class="text-slate-400 text-base">
              {description}
            </DialogPrimitive.Description>
          {/if}
        </div>
      {/if}

      <div class="legal-ai-dialog-content">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <!-- Close Button -->
      <DialogPrimitive.Close
        class="absolute right-4 top-4 p-2 text-slate-400 hover:text-amber-400 transition-colors rounded-lg hover:bg-slate-800/50"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <span class="sr-only">Close dialog</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
</DialogPrimitive.Root>

<style>
  :global(.legal-ai-dialog) {
    font-family: var(--legal-ai-font-family-sans);
  }

  :global(.legal-ai-dialog-trigger) {
    cursor: pointer;
  }

  :global(.legal-ai-dialog-header) {
    border-bottom: 1px solid rgba(245, 158, 11, 0.2);
    padding-bottom: 1rem;
  }

  :global(.legal-ai-dialog-content) {
    color: var(--legal-ai-text-secondary);
  }

  /* Custom scrollbar for dialog content */
  :global(.legal-ai-dialog *::-webkit-scrollbar) {
    width: 8px;
  }

  :global(.legal-ai-dialog *::-webkit-scrollbar-track) {
    background: rgba(15, 23, 42, 0.8);
    border-radius: 4px;
  }

  :global(.legal-ai-dialog *::-webkit-scrollbar-thumb) {
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.6), rgba(217, 119, 6, 0.6));
    border-radius: 4px;
  }
</style>