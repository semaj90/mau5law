<script lang="ts">
  import { cva, type VariantProps } from 'class-variance-authority';
  import { cn } from '$lib/utils';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { searchableButtonIndex } from '$lib/services/fuse-search';
  import type { UIJsonSSRConfig } from '$lib/types/ui-json-ssr';
  import type { Snippet } from 'svelte';

  const buttonVariants = cva('inline-flex items-center justify-center font-medium transition-all duration-200', {
    variants: {
      variant: { default: 'btn-nes-primary' },
      size: { default: 'h-10 px-4 py-2' }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  });

  interface Props {
    variant?: VariantProps<typeof buttonVariants>['variant'];
    size?: VariantProps<typeof buttonVariants>['size'];
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    href?: string;
    target?: string;
    loading?: boolean;
    loadingText?: string;
    className?: string;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
    id?: string;
    analyticsCategory?: string;
    analyticsAction?: string;
    analyticsLabel?: string;
    xstateContext?: any;
    uiJsonConfig?: UIJsonSSRConfig;
    searchKeywords?: string[];
    cacheKey?: string;
    role?: string;
    dataTestid?: string;
  }

  // Svelte 5 runes
  let {
    variant = 'default',
    size = 'default',
    disabled = false,
    type = 'button',
    href = undefined,
    target = undefined,
    loading = false,
    loadingText = 'Loading...',
    className = '',
    children,
    onclick = undefined,
    id = `btn-${Math.random().toString(36).slice(2, 9)}`,
    analyticsCategory = 'ui',
    analyticsAction = 'click',
    analyticsLabel = '',
    xstateContext = undefined,
    uiJsonConfig = undefined,
    searchKeywords = [],
    cacheKey = undefined,
    role = 'button',
    dataTestid = undefined
  }: Props = $props();

  // Reactive computations using $derived
  let buttonClass = $derived(cn(buttonVariants({ variant, size }), className));

  function handleClick(e: MouseEvent) {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onclick?.(e);
  }

  onMount(() => {
    if (browser && searchKeywords?.length) {
      searchableButtonIndex.addButton({ id, keywords: searchKeywords } as any);
    }
  });
</script>

{#if href}
  <a
    {href}
    {target}
    {id}
    class={buttonClass}
    {role}
    tabindex="0"
    aria-disabled={disabled}
    data-testid={dataTestid || 'button'}
    onclick={handleClick}
  >
    {#if loading}
      <span class="mr-2">⏳</span>
      {loadingText}
    {:else if children}
      {@render children()}
    {/if}
  </a>
{:else}
  <button
    {id}
    {type}
    {disabled}
    class={buttonClass}
    data-testid={dataTestid || 'button'}
    onclick={handleClick}
  >
    {#if loading}
      <span class="mr-2">⏳</span>
      {loadingText}
    {:else if children}
      {@render children()}
    {/if}
  </button>
{/if}
