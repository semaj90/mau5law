<script lang="ts">
  import EvidenceCard from '$lib/components/ui/evidence/EvidenceCard.svelte';
  import EvidenceCanvas from '$lib/components/canvas/EvidenceCanvas.svelte';
  import type { CaseFile } from '$lib/core/logic/case-logic';

  let { caseFiles = [], threshold = 100 }: { caseFiles: CaseFile[]; threshold?: number } = $props();

  const shouldUseCanvas = () => {
    if (caseFiles.length > threshold) return true;
    // also consider total text length
    const totalText = caseFiles.reduce((s, f) => s + (f.title || '').length + (f.summary || '').length, 0);
    if (totalText > 20000) return true;
    // device capability
    // @ts-ignore
    if (typeof navigator !== 'undefined' && (navigator as any).gpu) return false;
    return false;
  };
</script>

{#if shouldUseCanvas()}
  <EvidenceCanvas {caseFiles} />
{:else}
  <div class="grid grid-cols-3 gap-4">
    {#each caseFiles as file}
      <EvidenceCard caseFile={file} />
    {/each}
  </div>
{/if}
