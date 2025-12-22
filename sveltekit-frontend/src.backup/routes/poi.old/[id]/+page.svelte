<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import POIPhotoModal from '$lib/client/ui/POIPhotoModal.svelte';
  import POIPhotoUploader from '$lib/client/ui/POIPhotoUploader.svelte';
  import POIThreatBadge from '$lib/components/poi/POIThreatBadge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import CardContent from '$lib/components/ui/card-content.svelte';
  import CardHeader from '$lib/components/ui/card-header.svelte';
  import CardTitle from '$lib/components/ui/card-title.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Separator from '$lib/components/ui/separator.svelte';
  import { ArrowLeft } from "lucide-svelte";
import { Camera } from "lucide-svelte";
import { FileText } from "lucide-svelte";
import { MapPin } from "lucide-svelte";
import { Pencil } from "lucide-svelte";
import { TriangleAlert } from "lucide-svelte";
import { User } from "lucide-svelte";;
  import { onMount } from 'svelte';

  interface Photo {
    url: string;
    thumbnailUrl?: string;
  }

  interface POI {
    id: string;
    name: string;
    alias?: string;
    threatLevel: string;
    createdAt: string;
    caseId?: string;
    notes?: string;
  }

  let poi: POI | null = $state(null);
  let photos: Photo[] = $state([]);
  let selectedPhoto: Photo | null = $state(null);
  let showPhotoModal = $state(false);
  let loading = $state(false);

  // Load POI data
  async function loadPOI() {
    try {
      loading = true;
      const poiId = page.params.id;

      // Load POI details - use persons-of-interest API with search
      const poiResponse = await fetch(`/api/persons-of-interest?search=${encodeURIComponent(poiId)}&limit=1`);
      if (!poiResponse.ok) throw new Error('Failed to load POI');
      const poiData = await poiResponse.json();

      if (poiData.success && poiData.data.length > 0) {
        poi = {
          id: poiData.data[0].id.toString(),
          name: poiData.data[0].name,
          alias: poiData.data[0].aliases?.[0] || null,
          threatLevel: poiData.data[0].threatLevel,
          createdAt: poiData.data[0].createdAt,
          caseId: poiData.data[0].caseId?.toString() || null,
          notes: poiData.data[0].profileData?.notes || null
        };
      } else {
        throw new Error('POI not found');
      }

      // Load POI photos
      const photosResponse = await fetch(`/api/poi/${poiId}/photos`);
      if (photosResponse.ok) {
        photos = await photosResponse.json();
      }
    } catch (error) {
      console.error('Error loading POI:', error);
    } finally {
      loading = false;
    }
  }

  function handlePhotoClick(photo: Photo) {
    selectedPhoto = photo;
    showPhotoModal = true;
  }

  function handlePhotoUpload() {
    // Refresh photos after upload
    loadPOI();
  }

  function handlePhotoError(error: unknown) {
    console.error('Photo upload error:', error);
  }

  function handleEdit() {
    goto(`/poi/${poi!.id}/edit`);
  }

  function handleBack() {
    goto('/poi');
  }

  onMount(() => {
    loadPOI();
  });
</script>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-6xl mx-auto p-6">
    <!-- Header -->
    <div class="mb-6">
      <Button variant="ghost" onclick={handleBack} class="mb-4">
        <ArrowLeft class="w-4 h-4 mr-2" />
        Back to POI List
      </Button>

      {#if loading}
        <div class="animate-pulse space-y-4">
          <div class="h-8 bg-gray-200 rounded w-1/3"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      {:else if poi}
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-4">
            {#if photos.length > 0}
              <img
                src={photos[0].thumbnailUrl || photos[0].url}
                alt={poi.name}
                class="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
              />
            {:else}
              <div class="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                <User class="w-8 h-8 text-gray-500" />
              </div>
            {/if}

            <div>
              <h1 class="text-3xl font-bold text-gray-900">{poi.name}</h1>
              {#if poi.alias}
                <p class="text-xl text-gray-600">"{poi.alias}"</p>
              {/if}
              <div class="flex items-center gap-2 mt-2">
                <POIThreatBadge level={poi.threatLevel} />
                <span class="text-sm text-gray-500">
                  Created {new Date(poi.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <Button onclick={handleEdit}>
            <Pencil class="w-4 h-4 mr-2" />
            Edit POI
          </Button>
        </div>
      {/if}
    </div>

    {#if poi}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Photos Section -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Camera class="w-5 h-5" />
                Photos ({photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {#if photos.length === 0}
                <div class="text-center py-8 text-gray-500">
                  <Camera class="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No photos uploaded yet</p>
                </div>
              {:else}
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {#each photos as photo}
                    <button
                      type="button"
                      class="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onclick={() => handlePhotoClick(photo)}
                      aria-label="View POI photo"
                    >
                      <img
                        src={photo.thumbnailUrl || photo.url}
                        alt=""
                        class="w-full h-full object-cover"
                      />
                    </button>
                  {/each}
                </div>
              {/if}

              <Separator class="my-6" />

              <POIPhotoUploader
                poiId={parseInt(poi.id)}
                onUpload={handlePhotoUpload}
                onError={handlePhotoError}
              />
            </CardContent>
          </Card>

          <!-- Notes Section -->
          {#if poi.notes}
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center gap-2">
                  <FileText class="w-5 h-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p class="text-gray-700 whitespace-pre-wrap">{poi.notes}</p>
              </CardContent>
            </Card>
          {/if}
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- POI Details -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <TriangleAlert class="w-5 h-5" />
                POI Details
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div>
                <p class="text-sm font-medium text-gray-600">Threat Level</p>
                <div class="mt-1">
                  <POIThreatBadge level={poi.threatLevel} />
                </div>
              </div>

              <div>
                <p class="text-sm font-medium text-gray-600">Created</p>
                <p class="text-sm text-gray-800 mt-1">
                  {new Date(poi.createdAt).toLocaleDateString()}
                </p>
              </div>

              {#if poi.caseId}
                <div>
                  <p class="text-sm font-medium text-gray-600">Case</p>
                  <p class="text-sm text-gray-800 mt-1">
                    Case #{poi.caseId}
                  </p>
                </div>
              {/if}
            </CardContent>
          </Card>

          <!-- Quick Actions -->
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2">
              <Button variant="outline" class="w-full justify-start">
                <MapPin class="w-4 h-4 mr-2" />
                View on Map
              </Button>
              <Button variant="outline" class="w-full justify-start">
                <FileText class="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <Button variant="outline" class="w-full justify-start">
                <TriangleAlert class="w-4 h-4 mr-2" />
                Face Match Search
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Photo Modal -->
{#if selectedPhoto}
  <POIPhotoModal
    open={showPhotoModal}
    photo={selectedPhoto}
    onClose={() => { showPhotoModal = false; selectedPhoto = null; }}
  />
{/if}