<script lang="ts">
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import {
    Camera,
    Edit3,
    Eye,
    Trash2,
    User
  } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';

  export let poi: {
    id: string;
    name: string;
    alias?: string;
    threatLevel: string;
    photos?: Array<{
      url: string;
      thumbnailUrl: string;
      metadata?: any;
      ai?: any;
    }>;
    notes?: string;
    createdAt: string;
  };

  const dispatch = createEventDispatcher();

  function getThreatColor(level: string) {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
</script>

<Card class="hover:shadow-lg transition-shadow cursor-pointer border-2" on:click={() => dispatch('view', poi)}>
  <CardHeader class="pb-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        {#if poi.photos && poi.photos.length > 0}
          <div class="relative">
            <Avatar class="w-12 h-12">
              <AvatarImage src={poi.photos[0].thumbnailUrl} alt={poi.name} />
              <AvatarFallback>{getInitials(poi.name)}</AvatarFallback>
            </Avatar>
            {#if poi.photos.length > 1}
              <div class="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                <Camera class="w-3 h-3" />
              </div>
            {/if}
          </div>
        {:else}
          <Avatar class="w-12 h-12">
            <AvatarFallback class="bg-gray-200">
              <User class="w-6 h-6 text-gray-500" />
            </AvatarFallback>
          </Avatar>
        {/if}
        <div>
          <CardTitle class="text-lg">{poi.name}</CardTitle>
          {#if poi.alias}
            <p class="text-sm text-gray-500">"{poi.alias}"</p>
          {/if}
        </div>
      </div>

      <div class="flex gap-1">
        <Badge class={getThreatColor(poi.threatLevel)}>
          {poi.threatLevel.toUpperCase()}
        </Badge>
      </div>
    </div>
  </CardHeader>

  <CardContent class="space-y-3">
    {#if poi.notes}
      <p class="text-sm text-gray-700 line-clamp-2">{poi.notes}</p>
    {/if}

    <div class="flex items-center justify-between text-xs text-gray-500">
      <span>Created {new Date(poi.createdAt).toLocaleDateString()}</span>
      {#if poi.photos && poi.photos.length > 0}
        <span>{poi.photos.length} photo{poi.photos.length !== 1 ? 's' : ''}</span>
      {/if}
    </div>

    <div class="flex gap-2 pt-2 border-t">
      <Button
        variant="ghost"
        size="sm"
        on:click|stopPropagation={() => dispatch('view', poi)}
        class="flex-1"
      >
        <Eye class="w-4 h-4 mr-1" />
        View
      </Button>
      <Button
        variant="ghost"
        size="sm"
        on:click|stopPropagation={() => dispatch('edit', poi)}
        class="flex-1"
      >
        <Edit3 class="w-4 h-4 mr-1" />
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        on:click|stopPropagation={() => dispatch('delete', poi)}
        class="text-red-600 hover:text-red-700"
      >
        <Trash2 class="w-4 h-4" />
      </Button>
    </div>
  </CardContent>
</Card>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>