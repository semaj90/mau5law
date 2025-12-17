<script lang="ts">
  import PatchCard from '$lib/components/error-brain/PatchCard.svelte';
  import { Button } from '$lib/components/ui/button';
  import { onMount } from 'svelte';

  interface Patch {
    id: number;
    runId: string;
    filePath: string;
    diffText: string;
    reason: string;
    confidence: number;
    applied: boolean;
    appliedAt: Date | null;
    createdAt: Date;
  }

  let patches = $state<Patch[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let filter = $state<'all' | 'applied' | 'pending'>('all');

  async function fetchPatches() {
    loading = true;
    error = null;

    try {
      const params = new URLSearchParams();
      if (filter === 'applied') params.set('applied', 'true');
      if (filter === 'pending') params.set('applied', 'false');

      const response = await fetch(`/api/internal/error-brain/patches?${params}`);
      if (!response.ok) throw new Error('Failed to fetch patches');

      const data = await response.json();
      patches = data.patches;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  async function applyPatch(id: number) {
    try {
      const response = await fetch(`/api/internal/error-brain/patches/${id}/apply`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to apply patch');
      }

      // Refresh list
      await fetchPatches();
    } catch (err) {
      alert(`Error applying patch: ${err instanceof Error ? err.message : err}`);
    }
  }

  async function rollbackPatch(id: number) {
    if (!confirm('Are you sure you want to rollback this patch?')) return;

    try {
      const response = await fetch(`/api/internal/error-brain/patches/${id}/apply`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rollback patch');
      }

      // Refresh list
      await fetchPatches();
    } catch (err) {
      alert(`Error rolling back patch: ${err instanceof Error ? err.message : err}`);
    }
  }

  onMount(fetchPatches);
</script>

<svelte:head>
  <title>Error Brain - Patches</title>
</svelte:head>

<div class="container mx-auto p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-3xl font-bold">Error Brain Patches</h1>
      <p class="text-muted-foreground">Review and apply AI-generated code fixes</p>
    </div>
    <Button onclick={fetchPatches}>Refresh</Button>
  </div>

  <!-- Filter Tabs -->
  <div class="flex gap-2 mb-6">
    <Button
      variant={filter === 'all' ? 'default' : 'outline'}
      onclick={() => { filter = 'all'; fetchPatches(); }}
    >
      All Patches
    </Button>
    <Button
      variant={filter === 'pending' ? 'default' : 'outline'}
      onclick={() => { filter = 'pending'; fetchPatches(); }}
    >
      Pending
    </Button>
    <Button
      variant={filter === 'applied' ? 'default' : 'outline'}
      onclick={() => { filter = 'applied'; fetchPatches(); }}
    >
      Applied
    </Button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4 mb-6">
    <div class="panel p-4">
      <div class="text-2xl font-bold">{patches.length}</div>
      <div class="text-sm text-muted-foreground">Total Patches</div>
    </div>
    <div class="panel p-4">
      <div class="text-2xl font-bold text-green-600">
        {patches.filter(p => p.applied).length}
      </div>
      <div class="text-sm text-muted-foreground">Applied</div>
    </div>
    <div class="panel p-4">
      <div class="text-2xl font-bold text-yellow-600">
        {patches.filter(p => !p.applied).length}
      </div>
      <div class="text-sm text-muted-foreground">Pending</div>
    </div>
  </div>

  <!-- Content -->
  {#if loading}
    <div class="text-center py-12">
      <div class="text-muted-foreground">Loading patches...</div>
    </div>
  {:else if error}
    <div class="panel panel-error p-4">
      <strong>Error:</strong> {error}
    </div>
  {:else if patches.length === 0}
    <div class="text-center py-12 text-muted-foreground">
      No patches found. Run the Error Brain agent to generate fixes.
    </div>
  {:else}
    <div class="space-y-4">
      {#each patches as patch (patch.id)}
        <PatchCard
          {...patch}
          onApply={applyPatch}
          onRollback={rollbackPatch}
        />
      {/each}
    </div>
  {/if}
</div>
