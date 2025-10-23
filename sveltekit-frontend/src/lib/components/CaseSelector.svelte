<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { user } from '$lib/stores/unified';
  import Button from '$lib/components/ui/Button.svelte';
  import * as Dialog from '$lib/components/ui/dialog';

  let cases = $state([
    { id: 'case-1', name: 'State v. John Doe' },
    { id: 'case-2', name: 'People v. Jane Smith' },
  ]);
  let showModal = $state(false);
  function selectCase(caseId: string) {
    // assume user has a selectCase method
    (user as any).selectCase?.(caseId);
    showModal = false;
  }
</script>

<Button class="bits-btn" onclick={() => (showModal = true)}>Select Case</Button>

<Dialog.Root bind:open={showModal}>
  <Dialog.Content>
    <Dialog.Title>Select a Case</Dialog.Title>
    <div>
      <p>Choose a case to view its details and evidence.</p>
      <div class="space-y-4 mt-4">
        {#each cases as caseItem}
          <Button class="bits-btn" variant="secondary" onclick={() => selectCase(caseItem.id)}>
            {caseItem.name}
          </Button>
        {/each}
      </div>
    </div>
    <Dialog.Close />
  </Dialog.Content>
</Dialog.Root>