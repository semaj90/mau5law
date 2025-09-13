<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { user } from "$lib/stores/user";
  import Button from '$lib/components/ui/nes-button.svelte';
  import Modal from "$lib/components/ui/Modal.svelte";

  let cases = [
    { id: "case-1", name: "State v. John Doe" },
    { id: "case-2", name: "People v. Jane Smith" },
  ];

  let showModal = $state(false);

  function selectCase(caseId: string) {
    user.selectCase(caseId);
    showModal = false;
  }
</script>

<button class="nes-btn" onclick={() => showModal = true}>Select Case</button>

<Modal bind:open={showModal} title="Select a Case">
  {#snippet description()}
    <div >
      Choose a case to view its details and evidence.
    </div>
  {/snippet}

  <div class="space-y-4">
    {#each cases as caseItem}
      <button class="nes-btn" onclick={() => selectCase(caseItem.id)} variant="secondary">
        {caseItem.name}
      </button>
    {/each}
  </div>
</Modal>

