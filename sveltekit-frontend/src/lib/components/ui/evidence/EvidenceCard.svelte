<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/enhanced-bits';
  import Button from '$lib/components/ui/nes-button.svelte';
  import { CaseLogic, type CaseFile } from '$lib/core/logic/case-logic';

  let { caseFile }: { caseFile: CaseFile } = $props();

  const displayStatus = CaseLogic.getDisplayStatus(caseFile);
  const riskScore = CaseLogic.calculateRiskScore(caseFile);

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
    <div class="flex justify-end">
      <Button class="nes-btn is-primary" onclick={handleAnalyzeClick}>
        Analyze
      </Button>
    </div>
  </CardContent>
</Card>
