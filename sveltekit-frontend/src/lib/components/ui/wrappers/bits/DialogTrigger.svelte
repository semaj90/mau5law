<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ComponentType } from 'svelte';
  import { getBitsOverrides } from './bits-overrides';

  let { asChild = false, children }: { asChild?: boolean; children?: Snippet } = $props();

  // Initialize DialogTrigger to null, make it reactive with $state
  let DialogTrigger: ComponentType | null = $state(null);
  const overrides = getBitsOverrides();

  // Use a reactive effect to handle the asynchronous import
  $effect(() => {
    if (overrides && overrides.Dialog && overrides.Dialog.Trigger) {
      DialogTrigger = overrides.Dialog.Trigger;
    } else {
      // bits-ui uses namespace exports, import as namespace
      import('bits-ui')
        .then(mod => {
          // Access the Dialog.Trigger component from the module
          DialogTrigger = (mod as any).Dialog?.Trigger ?? null;
        })
        .catch(() => {
          DialogTrigger = null;
        });
    }
  });
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
