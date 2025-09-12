<!--
Enhanced-Bits Alert Component
NES-styled alert with legal AI theming
-->
<script lang="ts">
  import { cn } from '$lib/utils';
  
  interface AlertProps {
    variant?: 'default' | 'destructive' | 'warning' | 'success' | 'info';
    class?: string;
    children?: import('svelte').Snippet;
  }
  
  let {
    variant = 'default',
    class: className = '',
    children
  }: AlertProps = $props();
  
  // NES-style alert classes
  const alertClasses = $derived(
    cn(
      // Base styles
      'bits-alert',
      'relative w-full rounded-lg border-2 p-4',
      'font-mono text-sm',
      'transition-all duration-300',
      
      // Variant styles
      {
        'bg-white border-gray-300 text-gray-900': variant === 'default',
        'bg-red-50 border-red-300 text-red-900': variant === 'destructive',
        'bg-yellow-50 border-yellow-300 text-yellow-900': variant === 'warning',
        'bg-green-50 border-green-300 text-green-900': variant === 'success',
        'bg-blue-50 border-blue-300 text-blue-900': variant === 'info',
      },
      
      // NES styling
      'shadow-lg',
      'image-rendering: pixelated',
      
      className
    )
  );
  
  // Get emoji for variant
  const variantEmoji = $derived(() => {
    switch (variant) {
      case 'destructive': return '⚠️';
      case 'warning': return '⚡';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  });
</script>

<div 
  class={alertClasses}
  role="alert"
  aria-live="polite"
>
  <div class="flex items-start gap-3">
    <span class="text-lg flex-shrink-0">{variantEmoji()}</span>
    <div class="flex-1">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
</div>

<style>
  .bits-alert {
    font-family: 'Courier New', monospace;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }
/* NES-style borders with inset effect */ {}
  .bits-alert {
box-shadow: {}
inset -2px -2px 0px rgba(0, 0, 0, 0.2), {}
      inset 2px 2px 0px rgba(255, 255, 255, 0.8);
  }
/* Hover effect for interactive alerts */ {}
  .bits-alert:hover {
    transform: translateY(-1px);
box-shadow: {}
inset -2px -2px 0px rgba(0, 0, 0, 0.3), {}
inset 2px 2px 0px rgba(255, 255, 255, 0.9), {}
      0 4px 8px rgba(0, 0, 0, 0.1);
  }
/* Destructive variant animation */ {}
  .bits-alert[data-variant="destructive"] {
    animation: alert-pulse 2s ease-in-out infinite;
  }
  
  @keyframes alert-pulse {
    0%, 100% {
      border-color: rgb(252, 165, 165);
    }
    50% {
      border-color: rgb(239, 68, 68);
    }
  }
/* Success variant animation */ {}
  .bits-alert[data-variant="success"] {
    animation: alert-success 0.5s ease-out;
  }
  
  @keyframes alert-success {
    0% {
      transform: scale(0.95);
      opacity: 0;
    }
    50% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>