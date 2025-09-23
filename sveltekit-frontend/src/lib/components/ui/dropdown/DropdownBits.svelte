<script lang="ts">
  // Svelte 5 runes are auto-imported

  import 'nes.css/css/nes.min.css';
  import '$lib/styles/dropdown-global.css';
  import * as Popover from "bits-ui/popover";
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';
  import { fade, scale } from 'svelte/transition';

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    placement?: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end';
    closeOnEscape?: boolean;
    closeOnOutsideClick?: boolean;
    class?: string;
    children?: Snippet;
    trigger?: Snippet;
  }

  let { open = $bindable(false),
    onOpenChange,
    placement = 'bottom-start',
    closeOnEscape = true,
    closeOnOutsideClick = true,
    class: className = '',
    children,
    trigger
   }: Props = $props();

  let contentClasses = $derived(cn(
    "legal-ai-dropdown z-50 min-w-48 bg-slate-900/95 backdrop-blur-md border border-amber-500/20 rounded-xl shadow-2xl shadow-amber-500/10 p-2",
    className
  ));

  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen);
  }
</script>

<Popover.Root bind:open onOpenChange={handleOpenChange}>
  {#if trigger}
    <Popover.Trigger class="legal-ai-dropdown-trigger">
      {@render trigger()}
    </Popover.Trigger>
  {/if}

  <Popover.Content
    class={contentClasses}
    side={placement}
    align="start"
    transition={scale}
    transitionConfig={{ duration: 150, start: 0.95 }}
    {closeOnEscape}
    {closeOnOutsideClick}
  >
    {#if children}
      {@render children()}
    {/if}
  </Popover.Content>
</Popover.Root>

<!-- Dropdown Item Component -->
<script lang="ts" module>
  export interface DropdownItemProps {
    class?: string;
    disabled?: boolean;
    destructive?: boolean;
    children?: Snippet;
    onclick?: () => void;
  }
</script>

<!-- Export helper components for easier usage -->
{#snippet DropdownItem({ class: className = '', disabled = false, destructive = false, children, onclick }: DropdownItemProps)}
  <button
    class={cn(
      "legal-ai-dropdown-item flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer w-full text-left",
      destructive
        ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
        : "text-slate-300 hover:text-amber-400 hover:bg-slate-800/60",
      disabled && "opacity-50 cursor-not-allowed pointer-events-none",
      className
    )}
    {disabled}
    onclick={onclick}
  >
    {#if children}
      {@render children()}
    {/if}
  </button>
{/snippet}

{#snippet DropdownSeparator({ class: className = '' }: { class?: string })}
  <hr
    class={cn("h-px bg-amber-500/20 my-2 border-0", className)}
  />
{/snippet}

{#snippet DropdownLabel({ class: className = '', children }: { class?: string; children?: Snippet })}
  <div
    class={cn("px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500", className)}
  >
    {#if children}
      {@render children()}
    {/if}
  </div>
{/snippet}