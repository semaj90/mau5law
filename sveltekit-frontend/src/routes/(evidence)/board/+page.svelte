<script lang="ts">
  import { caseStore } from '$lib/stores/unified/case-store';
  import EvidenceBoard from '../../../../sveltekit-evidence/src/lib/components/EvidenceBoard.svelte';
  import { onMount } from 'svelte';

  let activeCaseId: string | null = null;

  onMount(() => {
    const unsubscribe = caseStore.subscribe(store => {
      if (store.activeCase) {
        activeCaseId = store.activeCase.id;
      }
    });
    return unsubscribe;
  });
</script>

<main>
  {#if activeCaseId}
    <EvidenceBoard caseId={activeCaseId} />
  {:else}
    <p>Please select a case to view the evidence board.</p>
  {/if}
</main>
