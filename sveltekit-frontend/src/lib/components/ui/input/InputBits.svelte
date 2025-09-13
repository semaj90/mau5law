<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props extends HTMLInputAttributes {
    variant?: 'default' | 'filled' | 'outlined';
    inputSize?: 'sm' | 'md' | 'lg';
    error?: boolean;
    success?: boolean;
    leftIcon?: Snippet;
    rightIcon?: Snippet;
    label?: string;
    description?: string;
    errorMessage?: string;
    class?: string;
  }

  let {
    variant = 'default',
    inputSize = 'md',
    error = false,
    success = false,
    leftIcon,
    rightIcon,
    label,
    description,
    errorMessage,
    class: className = '',
    ...restProps
  }: Props = $props();

  const baseClasses = "legal-ai-input w-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    default: "bg-slate-800/60 border border-slate-600/50 focus:border-amber-500 focus:ring-amber-500/20",
    filled: "bg-slate-800/80 border-0 focus:ring-amber-500/30",
    outlined: "bg-transparent border-2 border-slate-600/50 focus:border-amber-500"
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm rounded-md",
    md: "px-4 py-3 text-base rounded-lg",
    lg: "px-6 py-4 text-lg rounded-xl"
  };

  const stateClasses = error
    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
    : success
    ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
    : "";

  let computedClasses = $derived(cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[inputSize],
    stateClasses,
    leftIcon && "pl-10",
    rightIcon && "pr-10",
    className
  ));

  // Generate unique IDs for accessibility
  const inputId = `input-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = errorMessage ? `${inputId}-error` : undefined;
</script>

<div class="legal-ai-input-group space-y-2">
  {#if label}
    <label for={inputId} class="block text-sm font-semibold text-slate-300">
      {label}
    </label>
  {/if}

  <div class="relative">
    {#if leftIcon}
      <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        {@render leftIcon()}
      </div>
    {/if}

    <input
      id={inputId}
      class={computedClasses}
      aria-describedby={cn(descriptionId, errorId)}
      aria-invalid={error}
      {...restProps}
    />

    {#if rightIcon}
      <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        {@render rightIcon()}
      </div>
    {/if}
  </div>

  {#if description && !error}
    <p id={descriptionId} class="text-sm text-slate-500">
      {description}
    </p>
  {/if}

  {#if error && errorMessage}
    <p id={errorId} class="text-sm text-red-400 flex items-center gap-1">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      {errorMessage}
    </p>
  {/if}

  {#if success}
    <p class="text-sm text-green-400 flex items-center gap-1">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>
      Input is valid
    </p>
  {/if}
</div>

<style>
  :global(.legal-ai-input) {
    font-family: var(--legal-ai-font-family-sans);
    color: var(--legal-ai-text-primary);
  }

  :global(.legal-ai-input::placeholder) {
    color: var(--legal-ai-text-muted);
  }

  :global(.legal-ai-input:focus) {
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }

  :global(.legal-ai-input-group) {
    font-family: var(--legal-ai-font-family-sans);
  }
</style>