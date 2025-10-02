<script lang="ts">
  import {
    Dialog,
    DialogTrigger,
    <script lang="ts">
      import {
        Dialog,
        DialogTrigger,
        <script lang="ts">
          import {
            Dialog,
            DialogTrigger,
            DialogPortal,
            DialogOverlay,
            DialogContent,
            DialogTitle,
            DialogDescription,
            DialogClose
          } from "bits-ui";
          import { cn } from '$lib/utils';
          import { fade, scale } from 'svelte/transition';

          // Replace Svelte-runic props with normal Svelte props
          export let open: boolean = false;
          export let onOpenChange: ((open: boolean) => void) | undefined;
          export let size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
          export let closeOnEscape: boolean = true;
          export let closeOnOutsideClick: boolean = true;
          // renamed from `class` -> `className` to avoid parsing error
          export let className: string = '';
          export let title: string | undefined;
          export let description: string | undefined;

          // Tighten typing for sizeClasses to the known union keys
          const sizeClasses: Record<'sm'|'md'|'lg'|'xl'|'full', string> = {
            sm: "max-w-md",
            md: "max-w-lg",
            lg: "max-w-2xl",
            xl: "max-w-4xl",
            full: "max-w-[95vw] max-h-[95vh]"
          };

          // reactive class computation
          $: dialogClasses = cn(
            "legal-ai-dialog fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 gap-4 border border-legal-accent/20 bg-legal-background/95 backdrop-blur-md p-6 shadow-2xl shadow-legal-accent/10 rounded-2xl",
            sizeClasses[size],
            className
          );

          // call onOpenChange only when open actually changes
          let _prevOpen = open;
          $: if (_prevOpen !== open) {
            _prevOpen = open;
            onOpenChange?.(open);
          }
        </script>

        <Dialog bind:open={open}>
          {#if $$slots.trigger}
            <DialogTrigger class="legal-ai-dialog-trigger">
              <slot name="trigger" />
            </DialogTrigger>
          {/if}

          <DialogPortal>
            <DialogOverlay
              class="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
              transition:fade={{ duration: 200 }}
            />
            <DialogContent
              class={dialogClasses}
              transition:scale={{ duration: 200, start: 0.95 }}
              {closeOnEscape}
              {closeOnOutsideClick}
            >
              {#if title || description}
                <div class="legal-ai-dialog-header space-y-2 mb-6">
                  {#if title}
                    <DialogTitle class="text-2xl font-bold text-legal-accent tracking-tight">
                      {title}
                    </DialogTitle>
                  {/if}
                  {#if description}
                    <DialogDescription class="text-legal-secondary text-base">
                      {description}
                    </DialogDescription>
                  {/if}
                </div>
              {/if}

              <div class="legal-ai-dialog-content">
                <slot />
              </div>

              <!-- Close Button -->
              <DialogClose
                class="absolute right-4 top-4 p-2 text-legal-secondary hover:text-legal-accent transition-colors rounded-lg hover:bg-legal-surface/50"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <span class="sr-only">Close dialog</span>
              </DialogClose>
            </DialogContent>
          </DialogPortal>
        </Dialog>

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
