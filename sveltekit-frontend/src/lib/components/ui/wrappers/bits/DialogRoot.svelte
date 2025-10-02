<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { getBitsOverrides } from './bits-overrides';

  let { open = $bindable(false), onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children?: Snippet } = $props();

  // Use $state for reactivity in Svelte 5
  let DialogRoot = $state<any>(null);
  let isLoading = $state(true);

  // SvelteKit 2 compatible: Check for overrides first
  const overrides = getBitsOverrides();

  if (overrides && overrides.Dialog) {
    DialogRoot = overrides.Dialog.Root ?? overrides.Dialog;
    isLoading = false;
  } else if (browser) {
    // Only attempt dynamic import in browser
    onMount(async () => {
      try {
        // @ts-ignore - dynamic module shape may vary
        const mod = await import('bits-ui');
        const anyMod = mod as any;
        DialogRoot = anyMod.Dialog?.Root ?? anyMod.Dialog ?? null;
      } catch (err) {
        console.warn('Failed to load bits-ui Dialog, using fallback:', err);
        DialogRoot = null;
      } finally {
        isLoading = false;
      }
    });
  } else {
    // SSR fallback
    isLoading = false;
  }

  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen);
  }
</script>

{#if !isLoading}
  {#if DialogRoot}
    {@const DR = DialogRoot}
    <DR bind:open onOpenChange={handleOpenChange}>
      {@render children?.()}
    </DR>
  {:else}
    <!-- SvelteKit 2 Fallback: simple dialog markup for SSR/browser compatibility -->
    {#if open}
      <div class="fallback-dialog-overlay" onclick={() => handleOpenChange(false)} role="presentation">
        <div class="fallback-dialog" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          {@render children?.()}
        </div>
      </div>
    {/if}
  {/if}
{/if}

<style>
  .fallback-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  }

  .fallback-dialog {
    background: #1a1a1a;
    border: 2px solid #ffd700;
    border-radius: 12px;
    padding: 2rem;
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
