<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getBitsOverrides } from './bits-overrides';
  let { open = $bindable(false), onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children?: Snippet } = $props();

  let DialogRoot: any = null;
  const overrides = getBitsOverrides();
  if (overrides && overrides.Dialog) {
    DialogRoot = overrides.Dialog.Root ?? overrides.Dialog;
  } else {
    try {
      // @ts-ignore
      const mod = await import('bits-ui');
      DialogRoot = mod.Dialog?.Root ?? mod.Dialog ?? null;
    } catch {
      DialogRoot = null;
    }
  }

  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen);
  }
</script>

{#if DialogRoot}
  {@const DR = DialogRoot}
  <DR bind:open onOpenChange={handleOpenChange}>
    {@render children?.()}
  </DR>
{:else}
  <!-- Fallback: simple dialog markup -->
  {#if open}
    <div class="fallback-dialog-overlay">
      <div class="fallback-dialog">
        {@render children?.()}
      </div>
    </div>
  {/if}
{/if}
