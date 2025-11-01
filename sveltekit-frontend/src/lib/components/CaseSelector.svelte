<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { user } from '$lib/stores/unified';
  import { ContextService } from '$lib/services/context-service'; // Import ContextService

  let cases = $state([
    { id: 'case-1', name: 'State v. John Doe' },
    { id: 'case-2', name: 'People v. Jane Smith' },
  ]);
  let showModal = $state(false);
  async function selectCase(caseId: string) {
    // Update the application context with the selected case
    console.log(`Selected case ${caseId}`);
    // cast the payload to the expected Partial<ContextData> to satisfy TS
    await ContextService.updateCaseContext({ caseId } as unknown as Partial<any>);
    showModal = $state(false);
  }
</script>

<!-- trigger -->
<button class="bits-btn" onclick={() => (showModal = true)}>Select Case</button>

<!-- simple local modal to avoid third-party typing/API issues -->
{#if showModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" onclick={() => (showModal = false)} />
    <div class="relative bg-white dark:bg-slate-900 p-6 rounded-md w-full max-w-lg z-10">
      <h2 class="text-lg font-semibold mb-2">Select a Case</h2>
      <p class="text-sm text-slate-600 dark:text-slate-300">Choose a case to view its details and evidence.</p>
      <div class="mt-4 space-y-3">
        {#each Array.isArray(cases) ? cases : [] as caseItem}
          <button class="w-full text-left px-4 py-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            onclick={() => selectCase(caseItem.id)}>
            {caseItem.name}
          </button>
        {/each}
      </div>
      <div class="mt-4 text-right">
        <button class="px-3 py-1 border rounded" onclick={() => (showModal = false)}>Close</button>
      </div>
    </div>
  {/if}