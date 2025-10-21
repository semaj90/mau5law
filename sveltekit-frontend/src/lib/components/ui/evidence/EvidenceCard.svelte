<script lang="ts">
  import { CaseLogic } from '$lib/core/logic/case-logic';
  import type { CaseFile } from '$lib/core/logic/case-logic';

  // Replace unsupported optional prop syntax with an explicit union + default
  export let caseFile: CaseFile | undefined = undefined;

  // Reactive derived values (recompute when caseFile changes)
  let displayStatus: string = 'Unknown';
  let riskScore = 0;

  $: {
    if (caseFile) {
      displayStatus = CaseLogic.getDisplayStatus(caseFile);
      riskScore = CaseLogic.calculateRiskScore(caseFile);
    }
  }

  function handleAnalyzeClick() {
    console.log(`Analyzing case ${caseFile?.id ?? 'unknown'} risk ${riskScore}`);
  }
</script>

{#if caseFile}
  <div class="nes-container is-dark with-title evidence-card">
    <header class="card-header">
      <h3 class="card-title title">{caseFile.title}</h3>
      <p class="card-description">{displayStatus}</p>
    </header>
    <div class="card-content space-y-4">
      <p>{caseFile.summary}</p>

      <!-- slot for children/content -->
      <slot />

      <div class="flex justify-end">
        <button class="nes-btn is-primary" onclick={handleAnalyzeClick} type="button">Analyze</button>
      </div>
    </div>
  </div>
{:else}
  <!-- graceful fallback while props are not yet present -->
  <div class="nes-container is-dark with-title evidence-card">
    <header class="card-header">
      <h3 class="card-title title">Loading…</h3>
      <p class="card-description">{displayStatus}</p>
    </header>
    <div class="card-content space-y-4">
      <p>No case data available.</p>
    </div>
  </div>
{/if}
