<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getBitsOverrides } from './bits-overrides';
  let { children }: { children?: Snippet } = $props();

  let DialogContent: any = null;
  const overrides = getBitsOverrides();
  if (overrides && overrides.Dialog) {
    DialogContent = overrides.Dialog.Content ?? null;
  } else {
    try {
      // @ts-ignore
      const mod = await import('bits-ui');
      DialogContent = mod.Dialog?.Content ?? null;
    } catch {
      DialogContent = null;
    }
  }
</script>

{#if DialogContent}
  {@const DC = DialogContent}
  <DC>
    {@render children?.()}
  </DC>
{:else}
  <div class="dialog-content-fallback">
    {@render children?.()}
  </div>
{/if}
