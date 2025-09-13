<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'outlined' | 'filled';
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    hover?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    variant = 'default',
    padding = 'md',
    hover = false,
    class: className = '',
    children,
    ...restProps
  }: Props = $props();

  const baseClasses = "legal-ai-card transition-all duration-300";

  const variantClasses = {
    default: "bg-slate-800/60 border border-slate-700/50",
    elevated: "bg-slate-800/80 border border-amber-500/20 shadow-2xl shadow-amber-500/10",
    outlined: "bg-transparent border-2 border-amber-500/30",
    filled: "bg-slate-800/90 border border-slate-600/50"
  };

  const paddingClasses = {
    none: "p-0",
    sm: "p-3",
    md: "p-6",
    lg: "p-8",
    xl: "p-10"
  };

  const hoverClasses = hover ? "hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1" : "";

  let computedClasses = $derived(cn(
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    hoverClasses,
    className
  ));
</script>

<div
  class={computedClasses}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  :global(.legal-ai-card) {
    border-radius: var(--legal-ai-radius-xl);
    backdrop-filter: blur(12px);
    font-family: var(--legal-ai-font-family-sans);
  }
</style>