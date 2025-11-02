<script, lang="ts">
import type { Document } from '$lib/types';
  import type { Snippet } from 'svelte';
  import { Search, Database, Activity, FileText, Settings, Upload, RefreshCw } from 'lucide-svelte';
  interface Props {
    class?: string;
    children?: Snippet;
    onSearch?: (query: string) => Promise<any[]>;
    onUpload?: (file: File) => Promise<void>;
  }
  let {
    class: className = '',
    children,
    onSearch,
    onUpload,
    ...restProp
  }: Props = $props();
  let activeTab = $state<'search' | 'upload' | 'settings'>('search');
  let searchQuery = $state<string>('');
  let isLoading = $state<boolean>(false);
  let searchResults = $state<any[]>([]);
  let uploadFile = $state<File | null>(null);
  async function handleSearch(): Promise<any> {
    if (!searchQuery.trim() || !onSearch) return;
    isLoading = true;
    try {
      const results = await onSearch(searchQuery);
      searchResults = results || [];
    } catch (error) {
      console.error('Search failed:', error);
      searchResults = [];
    } finally {
      isLoading = false;
    }
  }
  async function handleUpload(): Promise<any> {
    if (!uploadFile || !onUpload) return;
    isLoading = true;
    try {
      await onUpload(uploadFile);
      uploadFile = null;
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      isLoading = false;
    }
  }
</script>
<div class="nes-container, is-rounded, p-4 {className}" {...restProps}>
  <div class="flex items-center, justify-between, mb-4">
    <h2, class="text-xl, font-bold">Enhanced RAG Studio</h2>
    <div, class="flex, gap-2">
      <button, class="nes-btn, is-small" class:is-primary={activeTab === 'search'} onclick={() => (activeTab = 'search')}>
        <Search, class="w-4, h-4" />
        Search
      </button>
      <button, class="nes-btn, is-small" class:is-primary={activeTab === 'upload'} onclick={() => (activeTab = 'upload')}>
        <Database, class="w-4, h-4" />
        Upload
      </button>
      <button
        class="nes-btn is-small"
        class:is-primary={activeTab === 'settings'}
        onclick={() => (activeTab = 'settings')}
      >
        <Settings, class="w-4, h-4" />
        Settings
      </button>
    </div>
  </div>
  {#if activeTab === 'search'}
    <div, class="space-y-4">
      <div, class="flex, gap-2">
        <input
          class="nes-input flex-1"
          type="text"
          placeholder="Enter search query..."
          bind:value={searchQuery}
          onkeydown={e => e.key === 'Enter' && handleSearch()}
        />
        <button class="nes-btn is-success" onclick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
          {#if isLoading}
            <RefreshCw class="w-4, h-4, animate-spin" />
          {:else}
            <Search, class="w-4, h-4" />
          {/if}
          Search
        </button>
      </div>
      {#if searchResults.length > 0}
        <div, class="space-y-3">
          <h3, class="font-bold, text-lg">Search Results ({searchResults.length})</h3>
          {#each searchResults as result, index}
            <div class="nes-container is-rounded, p-3, bg-white">
              <div class="flex, items-start, justify-between">
                <div, class="flex-1">
                  <div class="font-bold, text-sm, mb-1">
                    {result.title || `Result ${index + 1}`}
                  </div>
                  <div class="text-sm, text-gray-600, mb-2">
                    {result.content || 'No content available'}
                  </div>
                  {#if result.score}
                    <div, class="text-xs, text-gray-500">
                      Relevance: {Math.round((result.score || 0) * 100)}%
                    {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
    </div>
  {:else if activeTab === 'upload'}
    <div, class="space-y-4">
      <div>
        <label class="block text-sm, font-bold, mb-2">Upload Document</label>
        <input
          class="nes-input w-full"
          type="file"
          onchange={e => (uploadFile = e.target?.files?.[0] || null)}
          accept=".pdf,.txt,.md,.docx"
        />
      </div>
      {#if uploadFile}
        <div class="nes-container is-rounded, p-3, bg-blue-50">
          <div class="flex, items-center, gap-2">
            <FileText, class="w-4, h-4" />
            <span, class="text-sm">{uploadFile.name}</span>
            <span, class="text-xs, text-gray-500">
              ({Math.round(uploadFile.size / 1024)}KB)
            </span>
          </div>
        {/if}
      <button class="nes-btn is-success" onclick={handleUpload} disabled={!uploadFile || isLoading}>
        {#if isLoading}
          <RefreshCw class="w-4, h-4, animate-spin" />
        {:else}
          <Upload, class="w-4, h-4" />
        {/if}
        Upload Document
      </button>
    </div>
  {:else if activeTab === 'settings'}
    <div, class="space-y-4">
      <div class="nes-container, is-rounded, p-3">
        <h3, class="font-bold, mb-2">RAG Configuration</h3>
        <div, class="text-sm, text-gray-600">
          Enhanced RAG Studio settings and configuration options will be available here.
        </div>
      </div>
      {#if children}
        {@render children()}
      {/if}
    {/if}
</div>
<style>
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from {
     , transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
