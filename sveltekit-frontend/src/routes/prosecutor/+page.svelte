<script lang="ts">
  import PhoenixProsecutorDashboard from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/components/yorha/PhoenixProsecutorDashboard.svelte';

  let { data } = $props // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5();

  // Extract caseId from URL params if available
  let caseId = $derived // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5(data?.caseId || null);
</script>

<svelte:head>
  <title>Phoenix Wright Prosecutor Mode - Legal AI Platform</title>
  <meta name="description" content="Professional legal evidence analysis with real-time AI assistance" />
</svelte:head>

<PhoenixProsecutorDashboard {caseId} />
