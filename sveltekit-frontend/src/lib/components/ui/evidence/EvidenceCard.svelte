<script lang="ts">
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/enhanced-bits';
  import { CaseLogic } from '$lib/core/logic/case-logic';
  import type { CaseFile } from '$lib/core/logic/case-logic';

  // Svelte 5 props
  let { caseFile }: { caseFile: CaseFile } = $props();

  let displayStatus = $derived(CaseLogic.getDisplayStatus(caseFile));
  let riskScore = $derived(CaseLogic.calculateRiskScore(caseFile));

  function handleAnalyzeClick() {
    // placeholder for integration
    console.log(`Analyzing case ${caseFile.id} risk ${riskScore}`);
  }
</script>

<Card class="nes-container is-dark with-title">
  <CardHeader>
    <CardTitle class="title">{caseFile.title}</CardTitle>
    <CardDescription>{displayStatus}</CardDescription>
  </CardHeader>
  <CardContent class="space-y-4">
    <p>{caseFile.summary}</p>
    <slot />
    <div class="flex justify-end">
      <button class="nes-btn is-primary" onclick={handleAnalyzeClick} type="button">Analyze</button>
    </div>
  </CardContent>
</Card>
