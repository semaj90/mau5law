<script lang="ts">
  import type { goto  } from '$app/navigation';
  import type { AlertTriangle,
    Camera,
    Grid,
    List,
    Plus,
    Search,
    Users
   } from 'lucide-svelte';
  import type { onMount  } from 'svelte';

  import type { Button  } from '$lib/components/ui/button';
  import type { Card, CardContent  } from '$lib/components/ui/card';
  import type { Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
   } from '$lib/components/ui/dialog';
  import type { Input  } from '$lib/components/ui/input';

  import POICard from '$lib/components/poi/POICard.svelte';
  import POIEditor from '$lib/components/poi/POIEditor.svelte';
  import POIFaceMatchDialog from '$lib/components/poi/POIFaceMatchDialog.svelte';
  import POIPhotoModal from '$lib/components/poi/POIPhotoModal.svelte';

  // State
  let pois = $state ([]);
  let searchQuery = $state ('');
  let viewMode = $state <'grid' | 'list'>('grid');
  let showFilters = $state (false);
  let selectedThreatLevels = $state (['low', 'medium', 'high', 'critical']);
  let loading = $state (true);
  let error = $state ('');

  // Dialog states
  let showCreateDialog = $state (false);
  let showEditDialog = $state (false);
  let showPhotoModal = $state (false);
  let showFaceMatchDialog = $state (false);
  let editingPOI = $state (null);
  let selectedPhoto = $state (null);
  let faceMatches = $state ([]);

  // Filtered POIs
  let filteredPOIs = $derived (
    pois.filter(poi => {
      const matchesSearch = !searchQuery ||
        poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (poi.alias && poi.alias.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (poi.notes && poi.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesThreat = selectedThreatLevels.includes(poi.threatLevel);

      return matchesSearch && matchesThreat;
    })
  );

  // Load POIs
  async function loadPOIs() {
    try {
      loading = true;
      const response = await fetch('/api/poi');
      if (!response.ok) throw new Error('Failed to load POIs');
      pois = await response.json();
    } catch (err) {
      error = err.message;
      console.error('Error loading POIs:', err);
    } finally {
      loading = false;
    }
  }

  // Create POI
  async function handleCreatePOI(poiData) {
    try {
      const response = await fetch('/api/poi/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poiData)
      });

      if (!response.ok) throw new Error('Failed to create POI');

      await loadPOIs();
      showCreateDialog = false;
    } catch (err) {
      error = err.message;
      console.error('Error creating POI:', err);
    }
  }

  // Update POI
  async function handleUpdatePOI(poiData) {
    try {
      const response = await fetch(`/api/poi/${poiData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poiData)
      });

      if (!response.ok) throw new Error('Failed to update POI');

      await loadPOIs();
      showEditDialog = false;
      editingPOI = null;
    } catch (err) {
      error = err.message;
      console.error('Error updating POI:', err);
    }
  }

  // Delete POI
  async function handleDeletePOI(poi) {
    if (!confirm(`Are you sure you want to delete ${poi.name}?`)) return;

    try {
      const response = await fetch(`/api/poi/${poi.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete POI');

      await loadPOIs();
    } catch (err) {
      error = err.message;
      console.error('Error deleting POI:', err);
    }
  }

  // Face match
  async function handleFaceMatch(file) {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/poi/face-match', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Face matching failed');

      faceMatches = await response.json();
      showFaceMatchDialog = true;
    } catch (err) {
      error = err.message;
      console.error('Error matching faces:', err);
    }
  }

  // Event handlers
  function handleCreate() {
    showCreateDialog = true;
  }

  function handleView(event) {
    const poi = event.detail;
    goto(`/poi/${poi.id}`);
  }

  function handleEdit(event) {
    editingPOI = event.detail;
    showEditDialog = true;
  }

  function handlePhotoView(event) {
    selectedPhoto = event.detail.photo;
    showPhotoModal = true;
  }

  function handlePhotoUpload() {
    // Trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFaceMatch(file);
      }
    };
    input.click();
  }

  function toggleThreatFilter(level) {
    if (selectedThreatLevels.includes(level)) {
      selectedThreatLevels = selectedThreatLevels.filter(l => l !== level);
    } else {
      selectedThreatLevels = [...selectedThreatLevels, level];
    }
  }

  onMount(() => {
    loadPOIs();
  });
</script>

<div class="min-h-screen bg-gray-50 p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users class="w-8 h-8 text-blue-600" />
            Persons of Interest
          </h1>
          <p class="text-gray-600 mt-1">
            Manage and analyze persons of interest with AI-powered facial recognition
          </p>
        </div>

        <div class="flex gap-3">
          <Button onclick={handlePhotoUpload} variant="outline">
            <Camera class="w-4 h-4 mr-2" />
            Face Match
          </Button>
          <Button onclick={handleCreate}>
            <Plus class="w-4 h-4 mr-2" />
            Add POI
          </Button>
        </div>
      </div>

      <!-- Search and Filters -->
      <Card>
        <CardContent class="p-4">
          <div class="flex flex-col lg:flex-row gap-4">
            <!-- Search -->
            <div class="flex-1">
              <div class="relative">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  bind:value={searchQuery}
                  placeholder="Search by name, alias, or notes..."
                  class="pl-10"
                />
              </div>
            </div>

            <!-- View Mode -->
            <div class="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onclick={() => viewMode = 'grid'}
              >
                <Grid class="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onclick={() => viewMode = 'list'}
              >
                <List class="w-4 h-4" />
              </Button>
            </div>

            <!-- Threat Filters -->
            <div class="flex gap-2">
              {#each ['low', 'medium', 'high', 'critical'] as level}
                <Button
                  variant={selectedThreatLevels.includes(level) ? 'default' : 'outline'}
                  size="sm"
                  onclick={() => toggleThreatFilter(level)}
                  class={level === 'critical' ? 'bg-red-500 hover:bg-red-600' :
                         level === 'high' ? 'bg-orange-500 hover:bg-orange-600' :
                         level === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' :
                         'bg-green-500 hover:bg-green-600'}
                >
                  {level.toUpperCase()}
                </Button>
              {/each}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Content -->
    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-500 mt-4">Loading persons of interest...</p>
      </div>
    {:else if error}
      <Card class="border-red-200">
        <CardContent class="p-6 text-center">
          <AlertTriangle class="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-red-700 mb-2">Error Loading POIs</h3>
          <p class="text-red-600">{error}</p>
          <Button onclick={loadPOIs} class="mt-4" variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    {:else if filteredPOIs.length === 0}
      <Card>
        <CardContent class="p-12 text-center">
          <Users class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-xl font-semibold text-gray-700 mb-2">
            {searchQuery ? 'No POIs match your search' : 'No persons of interest yet'}
          </h3>
          <p class="text-gray-500 mb-6">
            {searchQuery ? 'Try adjusting your search terms or filters' : 'Start by adding your first person of interest'}
          </p>
          <Button onclick={handleCreate}>
            <Plus class="w-4 h-4 mr-2" />
            Add First POI
          </Button>
        </CardContent>
      </Card>
    {:else}
      <!-- POI Grid/List -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {#each filteredPOIs as poi (poi.id)}
          <POICard
            {poi}
            on:view={handleView}
            on:edit={handleEdit}
            on:delete={() => handleDeletePOI(poi)}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Create POI Dialog -->
<Dialog bind:open={showCreateDialog}>
  <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Create Person of Interest</DialogTitle>
    </DialogHeader>
    <POIEditor
      isNew={true}
      on:save={(e) => handleCreatePOI(e.detail)}
      on:cancel={() => showCreateDialog = false}
      on:uploadPhoto={handlePhotoUpload}
      on:viewPhoto={handlePhotoView}
    />
  </DialogContent>
</Dialog>

<!-- Edit POI Dialog -->
<Dialog bind:open={showEditDialog}>
  <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Edit Person of Interest</DialogTitle>
    </DialogHeader>
    {#if editingPOI}
      <POIEditor
        poi={editingPOI}
        isNew={false}
        on:save={(e) => handleUpdatePOI(e.detail)}
        on:cancel={() => { showEditDialog = false; editingPOI = null; }}
        on:uploadPhoto={handlePhotoUpload}
        on:viewPhoto={handlePhotoView}
      />
    {/if}
  </DialogContent>
</Dialog>

<!-- Photo Modal -->
{#if selectedPhoto}
  <POIPhotoModal
    bind:open={showPhotoModal}
    photo={selectedPhoto}
    on:close={() => { showPhotoModal = false; selectedPhoto = null; }}
  />
{/if}

<!-- Face Match Dialog -->
<POIFaceMatchDialog
  bind:open={showFaceMatchDialog}
  matches={faceMatches}
  on:close={() => showFaceMatchDialog = false}
  on:select={(e) => goto(`/poi/${e.detail.id}`)}
/>
