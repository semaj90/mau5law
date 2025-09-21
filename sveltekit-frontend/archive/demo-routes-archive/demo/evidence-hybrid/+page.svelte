<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardContent, CardHeader, CardTitle, Alert } from '$lib/components/ui/enhanced-bits';
  import type { CaseFile } from '$lib/core/logic/case-logic';

  let hydrated = $state(false);
  let caseFiles = $state<CaseFile[]>([]);
  let isLoading = $state(true);
  let error = $state('');

  // Client-only component reference
  let Intelligent: unknown = null;

  onMount(async () => {
    try {
      isLoading = true;

      // Generate mock data on the client only
      caseFiles = Array.from.map((_, i) => ({
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
    } catch (err) {
      error = err instanceof Error ? err.message: 'Failed to load evidence list component';
      console.error('Evidence hybrid demo error:', err);
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Evidence Hybrid Demo</title>
</svelte:head>

<div class="container mx-auto p-6 max-w-6xl">
  <Card class="mb-8">
    <CardHeader>
      <CardTitle class="text-2xl">📊 Evidence Hybrid Demo</CardTitle>
      <p class="text-muted-foreground">
        Intelligent evidence management with client-side rendering and virtual scrolling
      </p>
    </CardHeader>
  </Card>

  {#if isLoading}
    <Alert>
      <div class="flex items-center space-x-2">
        <div class="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
        <span>Loading evidence demo (client-only)...</span>
      </div>
    </Alert>
  {:else if error}
    <Alert variant="destructive">
      <div class="flex items-center space-x-2">
        <span>❌</span>
        <span>Error: {error}</span>
      </div>
    </Alert>
  {:else if hydrated && Intelligent}
    <Card>
      <CardContent class="p-0">
        <svelte:component this={Intelligent} {caseFiles} threshold={100} />
      </CardContent>
    </Card>
  {:else}
    <Alert>
      <div class="flex items-center space-x-2">
        <span>⏳</span>
        <span>Initializing evidence component...</span>
      </div>
    </Alert>
  {/if}
</div>
