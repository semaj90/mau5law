<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';
  import { fade, scale } from 'svelte/transition';

  interface Props {
    content: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    delayDuration?: number;
    sideOffset?: number;
    class?: string;
    children?: Snippet;
  }

  let {
    content,
    side = 'top',
    align = 'center',
    delayDuration = 700,
    sideOffset = 8,
    class: className = '',
    children
  }: Props = $props();

  let tooltipClasses = $derived(cn(
    "legal-ai-tooltip z-50 px-3 py-2 text-sm font-medium text-slate-900 bg-amber-400 rounded-lg shadow-lg shadow-amber-500/25 max-w-xs",
    className
  ));
</script>

<TooltipPrimitive.Root {delayDuration}>
  <TooltipPrimitive.Trigger class="legal-ai-tooltip-trigger">
    {#if children}
      {@render children()}
    {/if}
  </TooltipPrimitive.Trigger>

  <TooltipPrimitive.Content
    class={tooltipClasses}
    {side}
    {align}
    {sideOffset}
    transition={scale}
    transitionConfig={{ duration: 150, start: 0.95 }}
  >
    {content}
    <TooltipPrimitive.Arrow class="fill-amber-400" />
  </TooltipPrimitive.Content>
</TooltipPrimitive.Root>

<style>
  :global(.legal-ai-tooltip) {
    font-family: var(--legal-ai-font-family-sans);
    animation: legal-ai-fade-in 150ms ease-out;
  }

  :global(.legal-ai-tooltip-trigger) {
    cursor: help;
  }

  @keyframes legal-ai-fade-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>