<script lang="ts">
  import {
    Download,
    PenLine,
    Eye,
    FileText,
    Headphones,
    Image,
    Link,
    Tag,
    Trash2,
    Video,
    Search
  } from "lucide-svelte";
  import { quintOut } from "svelte/easing";
  import { scale } from "svelte/transition";
  import type { Evidence } from '$lib/types/evidence';
  import type { Snippet } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  // Props using Svelte 5 runes
  let {
    evidence, // Assuming evidence is always provided
    draggable = true,
    compact = false,
    expandOnHover = false,
    actions, // actions is now correctly destructured from the single $props() call
    showCompare = false,
    autoCompare = false
  } = $props<{
    evidence: Evidence;
    draggable?: boolean;
    compact?: boolean;
    expandOnHover?: boolean;
    actions?: Snippet<[Evidence]>; // Make actions optional
    showCompare?: boolean;
    autoCompare?: boolean;
  }>();
  const dispatch = createEventDispatcher<{ compare: Evidence; compared: { evidence: Evidence; result: any } }>();
  // Melt UI component creation removed - replace with bits-ui declarative components
  const getIcon = (type: Evidence["type"]) => { switch (type) {
      case "document":
        return FileText;
      case "image":
        return Image; // Fixed typo: Imag -> Image
      case "video":
        return Video;
      case "audio":
        return Headphones; // Fixed typo: Headphone -> Headphones
      case "link":
        return Link;
      default:
        return FileText;
     }
  }
  const formatFileSize = (bytes: number): string => { if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k)); // FIX: Added missing closing parenthesis
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
   }
  const fileSize = evidence.metadata?.size || evidence.fileSize || 0;
  let isHovered = $state(false);
  let comparing = $state(false);
  let compareError = $state<string | null>(null);
  let IconComponent = $derived(getIcon(
    ["document", "image", "video", "audio", "link"].includes(evidence.evidenceType || evidence.type)
      ? (evidence.evidenceType || evidence.type) as Evidence["type"]
      : "document"
  )); // FIX: Added missing closing parenthesis
  function handleMouseEnter() { if (expandOnHover) {
      isHovered = true;
     }
  }
  function handleMouseLeave() { if (expandOnHover) {
      isHovered = false;
     }
  }

  async function handleCompareClick() {
    try {
      compareError = null;
      comparing = true;
      dispatch('compare', evidence);
      if (!autoCompare) return; // Let parent handle
      const fd = new FormData();
      if ((evidence as any).url) fd.append('fileUrl', String((evidence as any).url));
      if (evidence.description) fd.append('text', evidence.description);
      if (Array.isArray(evidence.tags) && evidence.tags.length) fd.append('tags', evidence.tags.join(','));
      fd.append('topK', '8');
      const resp = await fetch('/api/v1/legal/compare-pdf', { method: 'POST', body: fd });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.error || 'Comparison failed');
      dispatch('compared', { evidence, result: data.data });
    } catch (e: any) {
      compareError = e?.message || String(e);
    } finally {
      comparing = false;
    }
  }
</script>

<div
  class="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-200 shadow hover:shadow-lg hover:border-blue-500
    relative
    {compact ? 'text-sm' : ''}
    {draggable ? 'cursor-grab active:cursor-grabbing' : ''}
    {isHovered ? 'scale-105 z-10 shadow-2xl' : ''}"
  transition:scale={{ duration: 200, easing: quintOut }}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  role="article"
>
  <!-- Header -->
  <div class="flex items-center justify-between px-3 py-3 bg-gray-50 border-b border-gray-200">
    <div
      class="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border capitalize"
      class:bg-blue-50={evidence.evidenceType === 'document' || evidence.type === 'document'}
      class:text-blue-700={evidence.evidenceType === 'document' || evidence.type === 'document'}
      class:border-blue-200={evidence.evidenceType === 'document' || evidence.type === 'document'}
      class:bg-green-50={evidence.evidenceType === 'image' || evidence.type === 'image'}
      class:text-green-700={evidence.evidenceType === 'image' || evidence.type === 'image'}
      class:border-green-200={evidence.evidenceType === 'image' || evidence.type === 'image'}
      class:bg-purple-50={evidence.evidenceType === 'video' || evidence.type === 'video'}
      class:text-purple-700={evidence.evidenceType === 'video' || evidence.type === 'video'}
      class:border-purple-200={evidence.evidenceType === 'video' || evidence.type === 'video'}
      class:bg-orange-50={evidence.evidenceType === 'audio' || evidence.type === 'audio'}
      class:text-orange-700={evidence.evidenceType === 'audio' || evidence.type === 'audio'}
      class:border-orange-200={evidence.evidenceType === 'audio' || evidence.type === 'audio'}
      class:bg-indigo-50={evidence.evidenceType === 'link' || evidence.type === 'link'}
      class:text-indigo-700={evidence.evidenceType === 'link' || evidence.type === 'link'}
      class:border-indigo-200={evidence.evidenceType === 'link' || evidence.type === 'link'}
      data-type={evidence.evidenceType || evidence.type}
    >
      <IconComponent size={16} />
      <span>{evidence.evidenceType || evidence.type}</span>
    </div>
    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {#if actions}
        {@render actions(evidence)}
      {:else if showCompare}
        <button
          class="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-blue-600"
          on:click={handleCompareClick}
          title={comparing ? 'Analyzing…' : 'Analyze & compare'}
          aria-busy={comparing}
          disabled={comparing}
        >
          <Search size={14} />
        </button>
      {/if}
    </div>
  </div>
  <!-- Content -->
  <div class="px-3 py-3">
    <!-- Preview (for images/videos) -->
    {#if (evidence.evidenceType || evidence.type) === 'image' && evidence.url}
      <div class="relative w-full mb-3 rounded-lg overflow-hidden bg-gray-50">
        <img
          src={evidence.url}
          alt={evidence.title}
          loading="lazy"
          class="w-full h-auto max-h-48 object-cover"
          onerror={e => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    {:else if (evidence.evidenceType || evidence.type) === 'video' && evidence.url}
      <div class="relative w-full mb-3 rounded-lg overflow-hidden bg-gray-50">
        <video src={evidence.url} preload="metadata" controls={false} muted class="w-full h-auto max-h-48 object-cover">
          <track kind="captions" />
        </video>
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 rounded-full p-3 text-white"
        >
          <Video size={24} />
        </div>
      </div>
    {/if}
    <!-- Title and Description -->
    <div class="flex flex-col gap-2">
      <h3 class="font-semibold text-base text-gray-900 leading-tight line-clamp-2">
        {evidence.title}
      </h3>
      {#if evidence.description && !compact}
        <p class="text-sm text-gray-500 leading-snug line-clamp-3">
          {evidence.description}
        </p>
      {/if}
      <!-- Metadata -->
      <div class="flex flex-wrap gap-2 my-2">
        {#if evidence.metadata?.createdAt || evidence.createdAt}
          <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            {new Date(evidence.metadata?.createdAt || evidence.createdAt || '').toLocaleDateString()}
          </span>
        {/if}
        {#if fileSize > 0}
          <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            {formatFileSize(fileSize)}
          </span>
        {/if}
        {#if evidence.metadata?.format}
          <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            {evidence.metadata.format.toUpperCase()}
          </span>
        {/if}
      </div>
      <!-- Tags -->
      {#if evidence.tags && evidence.tags.length > 0}
        <div class="flex flex-wrap gap-1 mt-2">
          {#each evidence.tags.slice(0, 3) as tag}
            <span
              class="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200"
            >
              <Tag size={10} />
              {tag}
            </span>
          {/each}
          {#if evidence.tags.length > 3}
            <span class="text-xs text-gray-500 font-medium">+{evidence.tags.length - 3}</span>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  <!-- Footer (if has URL) -->
  {#if evidence.url && (evidence.evidenceType || evidence.type) === 'link'}
    <div class="px-3 py-3 border-t border-gray-200 bg-gray-50">
      <a
        href={evidence.url}
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
      >
        <Link size={14} />
        Open Link
      </a>
    </div>
  {/if}
</div>
<!-- Tooltip section removed - replaced with native title attributes -->
<!-- Tooltip section removed - replaced with native title attributes -->
      >
