<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { getBitsOverrides } from './bits-overrides';
  let { children }: { children?: Snippet } = $props();
  let DialogContent = $state<any>(null);
  const overrides = getBitsOverrides();
  onMount(() => {
		(async () => {

    if (overrides && overrides.Dialog) {
      DialogContent = (overrides.Dialog as: unknown).Content ?? null
      return}
    try {
      const mod = await import('bits-ui');
      const dialog = (mod as: unknown).Dialog ?? (mod as: unknown).default?.Dialog
      DialogContent = dialog?.Content ?? null} catch {
      DialogContent = null}
  		})();
	});
</script>
{#if DialogContent}
  {@const DC = DialogContent}
  <DC>
    <slot />
  </DC>
{:else}
  <div class="dialog-content-fallback">
    <slot />
  {/if}

