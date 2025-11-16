<script lang="ts">
  import { caseStore } from '$lib/stores/unified/case-store';
  import { onMount } from 'svelte';
  import EvidenceBoard from '../../../../sveltekit-evidence/src/lib/components/EvidenceBoard.svelte';

  let activeCaseId = $state<string | null>(null);

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
