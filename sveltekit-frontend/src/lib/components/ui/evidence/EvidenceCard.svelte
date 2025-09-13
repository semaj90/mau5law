<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { CaseLogic, type CaseFile } from '$lib/core/logic/case-logic';

  export let caseFile: CaseFile;

  const displayStatus = CaseLogic.getDisplayStatus(caseFile);
  const riskScore = CaseLogic.calculateRiskScore(caseFile);

  function handleAnalyzeClick() {
    // placeholder for integration
    console.log(`Analyzing case ${caseFile.id} risk ${riskScore}`);
  }
</script>

<Card.Root class="nes-container is-dark with-title">
  <Card.Header>
    <Card.Title class="title">{caseFile.title}</Card.Title>
    <Card.Description>{displayStatus}</Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    <p>{caseFile.summary}</p>
    <div class="flex justify-end">
      <Button class="nes-btn is-primary" on:click={handleAnalyzeClick}>
        Analyze
      </Button>
    </div>
  </Card.Content>
</Card.Root>
