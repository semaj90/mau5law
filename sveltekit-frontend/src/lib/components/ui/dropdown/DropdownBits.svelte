<script lang="ts">
  import { DropdownMenu as DropdownPrimitive } from "bits-ui";
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

  let {
    open = $bindable(false),
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

<DropdownPrimitive.Root bind:open onOpenChange={handleOpenChange}>
  {#if trigger}
    <DropdownPrimitive.Trigger class="legal-ai-dropdown-trigger">
      {@render trigger()}
    </DropdownPrimitive.Trigger>
  {/if}

  <DropdownPrimitive.Content
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
  </DropdownPrimitive.Content>
</DropdownPrimitive.Root>

<!-- Dropdown Item Component -->
<script lang="ts" context="module">
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
  <DropdownPrimitive.Item
    class={cn(
      "legal-ai-dropdown-item flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer",
      destructive
        ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
        : "text-slate-300 hover:text-amber-400 hover:bg-slate-800/60",
      disabled && "opacity-50 cursor-not-allowed pointer-events-none",
      className
    )}
    {disabled}
    on:click={onclick}
  >
    {#if children}
      {@render children()}
    {/if}
  </DropdownPrimitive.Item>
{/snippet}

{#snippet DropdownSeparator({ class: className = '' }: { class?: string })}
  <DropdownPrimitive.Separator
    class={cn("h-px bg-amber-500/20 my-2", className)}
  />
{/snippet}

{#snippet DropdownLabel({ class: className = '', children }: { class?: string; children?: Snippet })}
  <DropdownPrimitive.Label
    class={cn("px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500", className)}
  >
    {#if children}
      {@render children()}
    {/if}
  </DropdownPrimitive.Label>
{/snippet}

<style>
  :global(.legal-ai-dropdown) {
    font-family: var(--legal-ai-font-family-sans);
    animation: legal-ai-fade-in 150ms ease-out;
  }

  :global(.legal-ai-dropdown-trigger) {
    cursor: pointer;
  }

  :global(.legal-ai-dropdown-item) {
    font-family: var(--legal-ai-font-family-sans);
  }

  :global(.legal-ai-dropdown-item:focus) {
    outline: 2px solid var(--legal-ai-primary);
    outline-offset: 2px;
  }

  @keyframes legal-ai-fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>