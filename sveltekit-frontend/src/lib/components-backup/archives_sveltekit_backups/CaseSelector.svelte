<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script>
  import 'nes.css/css/nes.min.css';
</script>
  import { user } from "$lib/stores/user";
  import Button from '$lib/components/ui/nes-button.svelte';
  import Modal from "$lib/components/ui/Modal.svelte";

  let cases = [
    { id: "case-1", name: "State v. John Doe" },
    { id: "case-2", name: "People v. Jane Smith" },
  ];

  let showModal = false;

  function selectCase(caseId) {
    user.selectCase(caseId);
    showModal = false;
  }
</script>

<button class="nes-btn" onclick={() => showModal = true}>Select Case</button>

<Modal bind:open={showModal} title="Select a Case">
  <div slot="description">
    Choose a case to view its details and evidence.
  </div>
  
  <div class="mx-auto px-4 max-w-7xl">
    {#each cases as caseItem}
      <button class="nes-btn" onclick={() => selectCase(caseItem.id)} variant="secondary">
        {caseItem.name}
      </button>
    {/each}
  </div>
</Modal>

