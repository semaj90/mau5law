<script lang="ts">
  import { onMount } from 'svelte';
  import type { CaseFile } from '$lib/core/logic/case-logic';

  let hydrated = false;
  let caseFiles: CaseFile[] = [];

  // Client-only component reference
  let Intelligent: any = null;

  onMount(async () => {
    // generate mock data on the client only
    caseFiles = Array.from({ length: 120 }).map((_, i) => ({
      id: `case-${i + 1}`,
      title: `Case ${i + 1} - Example Title${i % 5 === 0 ? ' - extended' : ''}`,
      summary: `Summary for case ${i + 1}`,
      pages: Math.floor(Math.random() * 400) + 1,
      attachments: Math.floor(Math.random() * 10)
    }));

    // Dynamically import the renderer to avoid SSR errors
    const mod = await import('$lib/components/IntelligentEvidenceList.svelte');
    Intelligent = mod.default;
    hydrated = true;
  });
</script>

<svelte:head>
  <title>Evidence Hybrid Demo</title>
</svelte:head>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-4">Evidence Hybrid Demo</h1>
  {#if hydrated && Intelligent}
    <svelte:component this={Intelligent} {caseFiles} threshold={100} />
  {:else}
    <div class="text-gray-400">Loading demo (client-only)...</div>
  {/if}
</div>
