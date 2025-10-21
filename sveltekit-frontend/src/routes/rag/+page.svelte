<!--
  Production RAG System
  MinIO + Qdrant + PostgreSQL + embeddinggemma:latest + Fuse.js
-->
<script lang="ts">
  import { Search, Upload, Tag, FileText, Database } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/Button.svelte';
  import {
    storeDocumentLocal,
    searchDocumentsLocal,
    hybridSearchLocal,
    getStorageStats,
    type RAGDocument,
  } from '$lib/storage/rag-storage';

  // State using Svelte 5 runes
  let selectedFile = $state<File | null>(null);
  let tags = $state('');
  let uploading = $state(false);
  let uploadResult = $state<any>(null);
  let searchQuery = $state('');
  let searchTags = $state('');
  let searching = $state(false);
  let searchResults = $state<any[]>([]);
  let searchType = $state<'hybrid' | 'vector' | 'fuzzy'>('hybrid');
  let systemStatus = $state<any>(null);
  let useLocalStorage = $state(false); // Fallback mode

  // Check system status on mount
  async function checkStatus() {
    try {
      const res = await fetch('/api/rag/status');
      const data = await res.json();
      systemStatus = data;
    } catch (error) {
      console.error('Status check failed:', error);
      systemStatus = { healthy: false, error: 'Connection failed' };
    }
  }

  // Handle file selection
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      selectedFile = target.files[0];
    }
  }

  // Upload file to RAG system
  async function uploadFile() {
    if (!selectedFile) return;

    uploading = true;
    uploadResult = null;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (tags) {
        formData.append('tags', tags);
      }

      const res = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        uploadResult = { success: true, ...data };
        selectedFile = null;
        tags = '';

        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        uploadResult = { success: false, error: data.error || 'Upload failed' };
      }
    } catch (error) {
      uploadResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      uploading = false;
    }
  }

  // Search documents
  async function searchDocuments() {
    if (!searchQuery.trim()) return;

    searching = true;
    searchResults = [];

    try {
      const searchTagsArray = searchTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          searchType,
          tags: searchTagsArray.length > 0 ? searchTagsArray : undefined,
          limit: 10,
        }),
      });

      const data = await res.json();

      if (data.success) {
        searchResults = data.results || [];
      } else {
        searchResults = [];
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search error:', error);
      searchResults = [];
    } finally {
      searching = false;
    }
  }

  // Initialize
  $effect(() => {
    checkStatus();
  });
</script>

<div class="nes-container is-dark" style="min-height: 100vh; background: #212529; padding: 2rem;">
  <!-- Header -->
  <div style="border-bottom: 4px solid #d4af37; padding-bottom: 1.5rem; margin-bottom: 2rem;">
    <h1 class="nes-text is-primary" style="font-size: 2rem; margin-bottom: 0.5rem;">🤖 RAG KNOWLEDGE BASE</h1>
    <p style="color: #d4af37; font-size: 0.875rem;">embeddinggemma:latest + MinIO + Qdrant + PostgreSQL + Fuse.js</p>

    <!-- System Status -->
    {#if systemStatus}
      <div style="margin-top: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
        <div class="nes-badge">
          <span class="is-{systemStatus.healthy ? 'success' : 'error'}">
            {systemStatus.healthy ? '✓' : '✗'} System
          </span>
        </div>
        {#if systemStatus.documentsCount !== undefined}
          <div class="nes-badge">
            <span class="is-primary">{systemStatus.documentsCount} Docs</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
    <!-- Upload Section -->
    <div class="nes-container is-dark" style="background: #1a1d20;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem;">
        <Upload size={20} style="color: #d4af37;" />
        <h2 class="nes-text is-primary" style="font-size: 1.25rem; margin: 0;">UPLOAD DOCUMENT</h2>
      </div>

      <!-- File Input -->
      <div class="nes-field" style="margin-bottom: 1rem;">
        <label for="file-input" style="color: #d4af37; margin-bottom: 0.5rem; display: block;">
          <FileText size={16} style="display: inline; vertical-align: middle;" />
          Select File (.txt, .md, .json, .csv)
        </label>
        <input
          id="file-input"
          type="file"
          accept=".txt,.md,.json,.csv,text/*"
          onchange={handleFileSelect}
          style="padding: 0.5rem; width: 100%; background: #212529; border: 2px solid #d4af37; color: #d4af37;"
        />
      </div>

      {#if selectedFile}
        <div style="margin-bottom: 1rem; padding: 0.75rem; background: #0f1214; border: 2px solid #4a5568;">
          <p style="color: #d4af37; font-size: 0.875rem; margin: 0;">
            📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </p>
        </div>
      {/if}

      <!-- Tags Input -->
      <div class="nes-field" style="margin-bottom: 1.5rem;">
        <label for="tags-input" style="color: #d4af37; margin-bottom: 0.5rem; display: block;">
          <Tag size={16} style="display: inline; vertical-align: middle;" />
          Tags (comma-separated)
        </label>
        <input
          id="tags-input"
          type="text"
          class="nes-input is-dark"
          placeholder="contract, legal, evidence"
          bind:value={tags}
          style="width: 100%;"
        />
      </div>

      <!-- Upload Button -->
      <Button
        onclick={uploadFile}
        disabled={!selectedFile || uploading}
        class="nes-btn is-success"
        style="width: 100%;"
      >
        {uploading ? '⏳ UPLOADING...' : '📤 UPLOAD TO RAG SYSTEM'}
      </Button>

      <!-- Upload Result -->
      {#if uploadResult}
        <div
          class="nes-container"
          style="margin-top: 1rem; background: {uploadResult.success ? '#1a3a1a' : '#3a1a1a'};"
        >
          {#if uploadResult.success}
            <p style="color: #4ade80; margin: 0;">✓ Upload Successful!</p>
            <ul style="margin: 0.5rem 0 0 1.5rem; color: #d4af37; font-size: 0.875rem;">
              <li>Document ID: {uploadResult.documentId}</li>
              <li>Chunks: {uploadResult.chunks}</li>
              <li>Embeddings: {uploadResult.embeddings}</li>
              <li>Tags: {uploadResult.tags?.join(', ') || 'None'}</li>
              <li>MinIO: {uploadResult.minioStored ? '✓' : '✗'}</li>
              <li>Qdrant: {uploadResult.qdrantStored ? '✓' : '✗'}</li>
            </ul>
          {:else}
            <p style="color: #ef4444; margin: 0;">✗ Upload Failed</p>
            <p style="color: #d4af37; font-size: 0.875rem; margin: 0.5rem 0 0 0;">
              {uploadResult.error}
            </p>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Search Section -->
    <div class="nes-container is-dark" style="background: #1a1d20;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem;">
        <Search size={20} style="color: #d4af37;" />
        <h2 class="nes-text is-primary" style="font-size: 1.25rem; margin: 0;">SEARCH KNOWLEDGE BASE</h2>
      </div>

      <!-- Search Query -->
      <div class="nes-field" style="margin-bottom: 1rem;">
        <label for="search-input" style="color: #d4af37; margin-bottom: 0.5rem; display: block;"> Search Query </label>
        <input
          id="search-input"
          type="text"
          class="nes-input is-dark"
          placeholder="What are you looking for?"
          bind:value={searchQuery}
          onkeydown={e => e.key === 'Enter' && searchDocuments()}
          style="width: 100%;"
        />
      </div>

      <!-- Search Tags Filter -->
      <div class="nes-field" style="margin-bottom: 1rem;">
        <label for="search-tags-input" style="color: #d4af37; margin-bottom: 0.5rem; display: block;">
          <Tag size={16} style="display: inline; vertical-align: middle;" />
          Filter by Tags
        </label>
        <input
          id="search-tags-input"
          type="text"
          class="nes-input is-dark"
          placeholder="contract, evidence"
          bind:value={searchTags}
          style="width: 100%;"
        />
      </div>

      <!-- Search Type -->
      <div style="margin-bottom: 1.5rem;">
        <label style="color: #d4af37; margin-bottom: 0.5rem; display: block;">
          <Database size={16} style="display: inline; vertical-align: middle;" />
          Search Type
        </label>
        <div style="display: flex; gap: 0.5rem;">
          <label class="nes-radio" style="color: #d4af37;">
            <input type="radio" name="search-type" bind:group={searchType} value="hybrid" />
            <span>Hybrid</span>
          </label>
          <label class="nes-radio" style="color: #d4af37;">
            <input type="radio" name="search-type" bind:group={searchType} value="vector" />
            <span>Vector</span>
          </label>
          <label class="nes-radio" style="color: #d4af37;">
            <input type="radio" name="search-type" bind:group={searchType} value="fuzzy" />
            <span>Fuzzy</span>
          </label>
        </div>
      </div>

      <!-- Search Button -->
      <Button
        onclick={searchDocuments}
        disabled={!searchQuery.trim() || searching}
        class="nes-btn is-primary"
        style="width: 100%;"
      >
        {searching ? '🔍 SEARCHING...' : '🔎 SEARCH'}
      </Button>
    </div>
  </div>

  <!-- Search Results -->
  {#if searchResults.length > 0}
    <div class="nes-container is-dark" style="margin-top: 2rem; background: #1a1d20;">
      <h3 class="nes-text is-primary" style="font-size: 1.25rem; margin-bottom: 1rem;">
        📊 SEARCH RESULTS ({searchResults.length})
      </h3>

      <div style="display: flex; flex-direction column; gap: 1rem;">
        {#each searchResults as result, index}
          <div class="nes-container" style="background: #0f1214; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
              <div>
                <h4 style="color: #d4af37; margin: 0 0 0.25rem 0;">
                  {index + 1}. {result.filename}
                </h4>
                {#if result.tags && result.tags.length > 0}
                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                    {#each result.tags as tag}
                      <span class="nes-badge">
                        <span class="is-warning">{tag}</span>
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>
              <div style="text-align: right;">
                <div class="nes-badge">
                  <span class="is-success">{Math.round((result.score || result.matchScore || 0) * 100)}%</span>
                </div>
                {#if result.searchType}
                  <p style="color: #9ca3af; font-size: 0.75rem; margin: 0.25rem 0 0 0;">
                    {result.searchType}
                  </p>
                {/if}
              </div>
            </div>

            {#if result.content}
              <p style="color: #d4af37; font-size: 0.875rem; margin: 0.5rem 0 0 0; line-height: 1.5;">
                {result.content.slice(0, 200)}...
              </p>
            {/if}

            {#if result.createdAt}
              <p style="color: #6b7280; font-size: 0.75rem; margin: 0.5rem 0 0 0;">
                📅 {new Date(result.createdAt).toLocaleDateString()}
              </p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else if searching}
    <div class="nes-container is-dark" style="margin-top: 2rem; text-align: center; background: #1a1d20;">
      <p class="nes-text is-primary">🔍 Searching...</p>
    </div>
  {:else if searchQuery}
    <div class="nes-container is-dark" style="margin-top: 2rem; text-align: center; background: #1a1d20;">
      <p class="nes-text is-disabled">No results found</p>
    </div>
  {/if}
</div>

<style>
  @import 'nes.css/css/nes.min.css';

  :global(body) {
    background: #212529;
    color: #d4af37;
    font-family: 'Press Start 2P', 'Courier New', monospace;
  }
</style>
