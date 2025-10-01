<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getBitsOverrides } from './bits-overrides';
  let { asChild = false, children }: { asChild?: boolean; children?: Snippet } = $props();

  let DialogTrigger: any = null;
  const overrides = getBitsOverrides();
  if (overrides && overrides.Dialog) {
    DialogTrigger = overrides.Dialog.Trigger ?? null;
  } else {
    try {
      // @ts-ignore
      const mod = await import('bits-ui');
      DialogTrigger = mod.Dialog?.Trigger ?? null;
    } catch {
      DialogTrigger = null;
    }
  }
</script>

{#if DialogTrigger}
  {@const DT = DialogTrigger}
  <DT>
    {@render children?.()}
  </DT>
{:else}
  {#if asChild}
    {@render children?.()}
  {:else}
    <button type="button">{@render children?.()}</button>
  {/if}
{/if}
