<script lang="ts">
  // Svelte 5 runes are auto-imported
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
    default: "legal-card bg-legal-surface/60 border border-legal-primary/20",
    elevated: "legal-card-elevated bg-legal-surface/80 border border-legal-accent/20 shadow-2xl shadow-legal-accent/10",
    outlined: "legal-card-outlined bg-transparent border-2 border-legal-accent/30",
    filled: "legal-card bg-legal-surface/90 border border-legal-primary/30",
  }
  const paddingClasses = {
    none: "p-0",
    sm: "p-3",
    md: "p-6",
    lg: "p-8",
    xl: "p-10",
  }
  const hoverClasses = hover ? "hover:border-legal-accent/50 hover:shadow-lg hover:shadow-legal-accent/20 hover:-translate-y-1" : "";
  let computedClasses = $derived(cn(
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    hoverClasses,
    className
  ));
</script>

<div class={computedClasses} {...restProps}>
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
