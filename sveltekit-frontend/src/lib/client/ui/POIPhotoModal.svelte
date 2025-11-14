<script lang="ts">
  import Badge from '$lib/components/ui/badge';
  import Button from '$lib/components/ui/button';
  import Card from '$lib/components/ui/card';
  import CardContent from '$lib/components/ui/card-content';
  import CardHeader from '$lib/components/ui/card-header';
  import CardTitle from '$lib/components/ui/card-title';
  import Tabs from '$lib/components/ui/tabs/Tabs.svelte';
  import TabsContent from '$lib/components/ui/tabs/TabsContent.svelte';
  import TabsList from '$lib/components/ui/tabs/TabsList.svelte';
  import TabsTrigger from '$lib/components/ui/tabs/TabsTrigger.svelte';
  import {
    Brain,
    Calendar,
    Camera,
    Download,
    Eye,
    MapPin,
    RotateCcw,
    Tag,
    X,
    ZoomIn,
    ZoomOut
  } from 'lucide-svelte';

  let {
    open,
    photo,
    onClose
  } = $props<{
    open: boolean;
    photo: {
      url: string;
      thumbnailUrl?: string;
      metadata?: {
        exif?: Record<string, any>;
        gps?: { lat: number; lng: number } | null;
        timestamp?: string | null;
        device?: string | null;
        ai?: {
          caption?: string;
          tags?: string[];
          qualityScore?: number;
          faceEmbedding?: number[];
        };
      };
    } | null;
    onClose: () => void;
  }>();

  let zoom = 1;
  let rotation = 0;
  let imageElement: HTMLImageElement;

  $effect(() => {
    if (!open) {
      zoom = 1;
      rotation = 0;
    }
  });

  function handleClose() {
    onClose();
  }

  function zoomIn() {
    zoom = Math.min(zoom * 1.2, 5);
  }

  function zoomOut() {
    zoom = Math.max(zoom / 1.2, 0.1);
  }

  function resetView() {
    zoom = 1;
    rotation = 0;
  }

  function downloadImage() {
    if (!photo) return;
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `poi-photo-${Date.now()}.jpg`;
    link.click();
  }

  function formatTimestamp(timestamp: string | null) {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  }

  function formatGPS(gps: { lat: number; lng: number } | null) {
    if (!gps) return 'Not available';
    return `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`;
  }
</script>

{#if open && photo}
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-xl font-semibold flex items-center gap-2">
          <Eye class="w-5 h-5" />
          POI Photo Analysis
        </h2>
        <div class="flex items-center gap-2">
          <!-- Zoom Controls -->
          <Button variant="outline" size="sm" on:click={zoomOut}>
            <ZoomOut class="w-4 h-4" />
          </Button>
          <span class="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" on:click={zoomIn}>
            <ZoomIn class="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" on:click={resetView}>
            <RotateCcw class="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" on:click={downloadImage}>
            <Download class="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" on:click={handleClose}>
            <X class="w-4 h-4" />
          </Button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex h-[600px]">
        <!-- Image Viewer -->
        <div class="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
          <div
            class="relative"
            style="transform: scale({zoom}) rotate({rotation}deg); transition: transform 0.2s ease;"
          >
            <img
              bind:this={imageElement}
              src={photo.url}
              alt="POI"
              class="max-w-full max-h-full object-contain"
              draggable="false"
            />
          </div>
        </div>

        <!-- Analysis Panel -->
        <div class="w-80 border-l bg-gray-50 overflow-y-auto">
          <Tabs defaultValue="overview" class="h-full">
            <TabsList class="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" class="p-4 space-y-4">
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-lg">Photo Overview</CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                  {#if photo.metadata?.timestamp}
                    <div class="flex items-center gap-2">
                      <Calendar class="w-4 h-4 text-gray-500" />
                      <span class="text-sm">{formatTimestamp(photo.metadata.timestamp)}</span>
                    </div>
                  {/if}

                  {#if photo.metadata?.gps}
                    <div class="flex items-center gap-2">
                      <MapPin class="w-4 h-4 text-gray-500" />
                      <span class="text-sm">{formatGPS(photo.metadata.gps)}</span>
                    </div>
                  {/if}

                  {#if photo.metadata?.device}
                    <div class="flex items-center gap-2">
                      <Camera class="w-4 h-4 text-gray-500" />
                      <span class="text-sm">{photo.metadata.device}</span>
                    </div>
                  {/if}

                  {#if photo.metadata?.ai?.qualityScore}
                    <div class="flex items-center justify-between">
                      <span class="text-sm">Quality Score</span>
                      <Badge variant={photo.metadata.ai.qualityScore > 0.8 ? 'default' : 'secondary'}>
                        {Math.round(photo.metadata.ai.qualityScore * 100)}%
                      </Badge>
                    </div>
                  {/if}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metadata" class="p-4">
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-lg flex items-center gap-2">
                    <Tag class="w-4 h-4" />
                    EXIF Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {#if photo.metadata?.exif}
                    <div class="space-y-2 text-sm">
                      {#each Object.entries(photo.metadata.exif) as [key, value]}
                        <div class="flex justify-between">
                          <span class="font-medium text-gray-600">{key}:</span>
                          <span class="text-gray-800">{String(value)}</span>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="text-gray-500 text-sm">No EXIF data available</p>
                  {/if}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" class="p-4">
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-lg flex items-center gap-2">
                    <Brain class="w-4 h-4" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                  {#if photo.metadata?.ai?.caption}
                    <div>
                      <h4 class="font-medium text-sm mb-2">AI Caption</h4>
                      <p class="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                        {photo.metadata.ai.caption}
                      </p>
                    </div>
                  {/if}

                  {#if photo.metadata?.ai?.tags && photo.metadata.ai.tags.length > 0}
                    <div>
                      <h4 class="font-medium text-sm mb-2">AI Tags</h4>
                      <div class="flex flex-wrap gap-1">
                        {#each photo.metadata.ai.tags as tag}
                          <Badge variant="outline" class="text-xs">
                            {tag}
                          </Badge>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if photo.metadata?.ai?.faceEmbedding}
                    <div class="flex items-center gap-2">
                      <Badge variant="secondary" class="text-xs">
                        Face Detected
                      </Badge>
                      <span class="text-xs text-gray-500">
                        {photo.metadata.ai.faceEmbedding.length}D embedding
                      </span>
                    </div>
                  {/if}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  </div>
{/if}