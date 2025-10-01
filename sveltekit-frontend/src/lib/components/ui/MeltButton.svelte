<script lang="ts">
  import { cva, type VariantProps } from 'class-variance-authority';
  import { cn } from '$lib/utils';
  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { Snippet } from 'svelte';

  // Optional runtime melt action; resolved dynamically in browser but not required at build time
  let melt: any;

  // analytics + indexing stubs
  import { userAnalyticsStore } from '$lib/stores/analytics';
  import { lokiButtonCache } from '$lib/services/loki-cache';
  import { searchableButtonIndex } from '$lib/services/fuse-search';
  import type { UIJsonSSRConfig, ButtonAnalyticsEvent } from '$lib/types/ui-json-ssr';

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
    children?: Snippet | string;
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
    meltElement?: any;
  }

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
    children = undefined,
    onclick = undefined,
    id = `melt-btn-${Math.random().toString(36).slice(2, 9)}`,
    analyticsCategory = 'ui',
    analyticsAction = 'click',
    analyticsLabel = '',
    xstateContext = undefined,
    uiJsonConfig = undefined,
    searchKeywords = [],
    cacheKey = undefined,
    role = 'button',
    dataTestid = undefined,
    meltElement = undefined
  }: Props = $props();

  let isDisabled = $state(false);
  let buttonClass = $derived(cn(buttonVariants({ variant, size }), className));
  let finalMeltElement = $derived(meltElement || {});

  function maybeMelt(node: HTMLElement, params: any) {
    let cleanup: any;
    if (browser && typeof melt === 'function') cleanup = melt(node, params);
    return {
      update(newParams: any) { if (cleanup && typeof cleanup.update === 'function') cleanup.update(newParams); },
      destroy() { if (cleanup) { if (typeof cleanup.destroy === 'function') cleanup.destroy(); if (typeof cleanup === 'function') cleanup(); } }
    };
  }

  const dispatch = createEventDispatcher();

  function handleClick(e: MouseEvent) {
    if (disabled || loading) { e.preventDefault(); return; }
    dispatch('click', e);
    onclick?.(e);
  }

  onMount(async () => {
    if (browser) {
      try {
        const mod = await import('@melt-ui/svelte');
        melt = (mod as any)?.melt ?? (mod as any)?.default ?? undefined;
      } catch {
        melt = undefined;
      }
      if (searchKeywords?.length) searchableButtonIndex.addButton({ id, keywords: searchKeywords });
    }
  });
</script>

{#if href}
  <a href={href} target={target} id={id} class={buttonClass} role={role} tabindex="0" aria-disabled={disabled} data-testid={dataTestid || 'melt-button'} use:maybeMelt={finalMeltElement} on:click={handleClick}>
    {#if loading}
      <span class="mr-2">⏳</span>
      {loadingText}
    {:else}
      {@render children?.()}
    {/if}
  </a>
{:else}
  <button id={id} type={type} disabled={disabled} class={buttonClass} data-testid={dataTestid || 'melt-button'} use:maybeMelt={finalMeltElement} on:click={handleClick}>
    {#if loading}
      <span class="mr-2">⏳</span>
      {loadingText}
    {:else}
      {@render children?.()}
    {/if}
  </button>
{/if}
