<script lang="ts">
  import { Button as ButtonPrimitive } from "bits-ui";
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'success' | 'warning' | 'info';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    class?: string;
    to?: string;
    children?: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    class: className = '',
    to = undefined,
    children,
    ...restProps
  }: Props = $props();

  // Professional Legal AI Button Classes using CSS variables
  const baseClasses = "legal-ai-btn inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: "legal-ai-btn-primary",
    secondary: "legal-ai-btn-secondary",
    ghost: "legal-ai-btn-ghost",
    outline: "legal-ai-btn-secondary",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
    warning: "bg-yellow-600 text-black hover:bg-yellow-700 focus:ring-yellow-500",
    info: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
  };

  const sizeClasses = {
    xs: "text-xs px-2 py-1 rounded-md",
    sm: "text-sm px-3 py-1.5 rounded-md",
    md: "text-base px-4 py-2 rounded-lg",
    lg: "text-lg px-6 py-3 rounded-lg",
    xl: "text-xl px-8 py-4 rounded-xl"
  };

  let computedClasses = $derived(cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className
  ));

  let isDisabled = $derived(disabled || loading);
</script>

{#if to}
  <!-- Navigation Link Button -->
  <a
    href={to}
    class={computedClasses}
    aria-disabled={isDisabled}
    {...restProps}
  >
    {#if loading}
      <div class="legal-ai-spinner w-4 h-4"></div>
    {/if}

    {#if children}
      {@render children()}
    {/if}
  </a>
{:else}
  <!-- Interactive Button using bits-ui -->
  <ButtonPrimitive.Root
    class={computedClasses}
    disabled={isDisabled}
    {...restProps}
  >
    {#if loading}
      <div class="legal-ai-spinner w-4 h-4"></div>
    {/if}

    {#if children}
      {@render children()}
    {/if}
  </ButtonPrimitive.Root>
{/if}

<style>
  /* Professional Legal AI Button Styles using CSS Variables */
  :global(.legal-ai-btn) {
    font-family: var(--legal-ai-font-family-sans);
    border: 1px solid transparent;
    cursor: pointer;
  }

  :global(.legal-ai-btn-primary) {
    background: linear-gradient(135deg, var(--legal-ai-primary), var(--legal-ai-primary-dark));
    color: var(--legal-ai-bg-primary);
    box-shadow: var(--legal-ai-shadow-amber);
  }

  :global(.legal-ai-btn-primary:hover) {
    background: linear-gradient(135deg, var(--legal-ai-primary-dark), #b45309);
    transform: translateY(-1px);
    box-shadow: 0 15px 35px -5px rgba(245, 158, 11, 0.4);
  }

  :global(.legal-ai-btn-secondary) {
    background: rgba(245, 158, 11, 0.1);
    color: var(--legal-ai-primary);
    border-color: var(--legal-ai-border-primary);
  }

  :global(.legal-ai-btn-secondary:hover) {
    background: rgba(245, 158, 11, 0.2);
    border-color: var(--legal-ai-primary);
    color: var(--legal-ai-primary-light);
  }

  :global(.legal-ai-btn-ghost) {
    background: transparent;
    color: var(--legal-ai-text-secondary);
  }

  :global(.legal-ai-btn-ghost:hover) {
    background: rgba(245, 158, 11, 0.1);
    color: var(--legal-ai-primary);
  }

  /* Professional Spinner */
  :global(.legal-ai-spinner) {
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: legal-ai-spin 0.75s linear infinite;
    display: inline-block;
  }

  @keyframes legal-ai-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Focus states for accessibility */
  :global(.legal-ai-btn:focus-visible) {
    outline: 2px solid var(--legal-ai-primary);
    outline-offset: 2px;
  }

  /* Disabled state */
  :global(.legal-ai-btn:disabled),
  :global(.legal-ai-btn[aria-disabled="true"]) {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
</style>