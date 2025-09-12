<script lang="ts">
  interface Props {
    class?: string;
    children?: import('svelte').Snippet;
  }
  import { Button as BitsButton } from 'bits-ui';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

  interface ButtonProps extends HTMLButtonAttributes {
    /** Button variant styling */
    variant?: 'default' | 'primary' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'yorha' | 'crimson' | 'gold';
    /** Button size */
    size?: 'sm' | 'md' | 'lg' | 'icon';
    /** Loading state */
    loading?: boolean;
    /** AI confidence level for legal analysis buttons */
    confidence?: 'high' | 'medium' | 'low';
    /** Legal context specific styling */
    legal?: boolean;
    /** Full width button */
    fullWidth?: boolean;
    /** Priority for evidence-related actions */
    priority?: 'critical' | 'high' | 'medium' | 'low';
    class?: string;
    
    // Accessibility props
    /** ARIA label for screen readers (especially important for icon-only buttons) */
    'aria-label'?: string;
    /** ID of element that describes this button */
    'aria-describedby'?: string;
    /** Whether button controls expanded state (for dropdowns, etc.) */
    'aria-expanded'?: boolean;
    /** ID of element controlled by this button */
    'aria-controls'?: string;
    /** Screen reader only text for additional context */
    srOnlyText?: string;
    /** Custom loading announcement text */
    loadingText?: string;
  }

  let {
    variant = 'default',
    size = 'md',
    loading = false,
    confidence,
    legal = false,
    fullWidth = false,
    priority,
    class: classNameVar = '',
    children,
    srOnlyText,
    loadingText,
    ...restProps
  }: ButtonProps = $props();

  // Extract accessibility props for explicit handling
  const ariaLabel = $$props['aria-label'];
  const ariaDescribedby = $$props['aria-describedby'];
  const ariaExpanded = $$props['aria-expanded'];
  const ariaControls = $$props['aria-controls'];

  // Generate unique ID for loading announcement
  const loadingAnnouncementId = `loading-${Math.random().toString(36).substr(2, 9)}`;

  // Reactive class computation using $derived
  let buttonClasses = $derived(cn(
    'bits-btn',
    {
      'bits-btn-default': variant === 'default',
      'yorha-button-primary': variant === 'primary',
      'bits-btn-destructive': variant === 'destructive',
      'bits-btn-outline yorha-button': variant === 'outline',
      'bits-btn-secondary': variant === 'secondary',
      'bits-btn-ghost': variant === 'ghost',
      'bits-btn-link': variant === 'link',
      'yorha-button': variant === 'yorha',
      'yorha-button bg-red-600 hover:bg-red-700 text-white border-red-600': variant === 'crimson',
      'yorha-button bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600': variant === 'gold',
      'bits-btn-sm h-8 px-3 text-xs': size === 'sm',
      'h-10 px-4 py-2': size === 'md',
      'bits-btn-lg h-12 px-6 text-base': size === 'lg',
      'bits-btn-icon': size === 'icon',
      'w-full': fullWidth,
      'opacity-50 cursor-not-allowed': loading,
      'nier-bits-button': legal,
      'animate-pulse': loading,
      'font-gothic tracking-wider': variant === 'yorha',
      'shadow-lg hover:shadow-xl transition-all duration-200': !loading,
      'ai-confidence-90 border-green-500 bg-green-50 hover:bg-green-100': confidence === 'high',
      'ai-confidence-70 border-yellow-500 bg-yellow-50 hover:bg-yellow-100': confidence === 'medium',
      'ai-confidence-40 border-red-500 bg-red-50 hover:bg-red-100': confidence === 'low',
      'yorha-priority-critical shadow-red-200': priority === 'critical',
      'yorha-priority-high shadow-orange-200': priority === 'high',
      'yorha-priority-medium shadow-yellow-200': priority === 'medium',
      'yorha-priority-low shadow-gray-200': priority === 'low'
    },
  classNameVar
  ));
</script>

<BitsButton.Root
  class={buttonClasses}
  disabled={loading}
  aria-label={ariaLabel}
  aria-describedby={ariaDescribedby ? `${ariaDescribedby} ${loading ? loadingAnnouncementId : ''}`.trim() : (loading ? loadingAnnouncementId : undefined)}
  aria-expanded={ariaExpanded}
  aria-controls={ariaControls}
  aria-busy={loading}
  {...restProps}
>
  {#if loading}
    <div class="ai-status-indicator ai-status-processing w-4 h-4 mr-2" aria-hidden="true"></div>
  {/if}
  {@render children?.()}
  
  {#if srOnlyText}
    <span class="sr-only">{srOnlyText}</span>
  {/if}
</BitsButton.Root>

<!-- Screen reader loading announcement -->
{#if loading}
  <div id={loadingAnnouncementId} class="sr-only" aria-live="polite">
    {loadingText || 'Loading, please wait...'}
  </div>
{/if}

<style>/* @unocss-include */ {}
/* Enhanced button animations for legal AI context */ {}
  :global(.bits-btn) {
    position: relative;
    overflow: hidden;
  }

  :global(.bits-btn::before) {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
background: linear-gradient( {}
90deg, {}
transparent, {}
rgba(255, 255, 255, 0.2), {}
transparent {}
    );
    transition: left 0.5s ease;
  }

  :global(.bits-btn:hover::before) {
    left: 100%;
  }
/* Legal AI specific styling */ {}
  :global(.nier-bits-button) {
    font-family: var(--font-gothic);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
/* Confidence indicators */ {}
  :global(.ai-confidence-90) {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  }

  :global(.ai-confidence-70) {
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
  }

  :global(.ai-confidence-40) {
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
  }

/* Screen reader only utility for accessibility */
  :global(.sr-only) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
