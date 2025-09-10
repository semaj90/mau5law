<!--
  EvidenceManager.svelte
  
  Complete evidence management component with:
  - File upload with drag & drop
  - Evidence listing with embedding status
  - Semantic search functionality 
  - Integration with backfill worker
  - Real-time embedding progress
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/button/Button.svelte';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;

  interface EvidenceFile {
    id: number;
    title: string;
    description?: string;
    evidence_type: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
    case_id?: string;
    hasEmbedding?: boolean;
  }

  interface EmbeddingStats {
    total: number;
    withEmbeddings: number;
    withoutEmbeddings: number;
    percentage: number;
  }

  interface SearchResult extends EvidenceFile {
    similarity: number;
    similarityDistance: number;
  }

  // Props
  interface Props {
    caseId?: string;
    showUpload?: boolean;
    showSearch?: boolean;
  }

  let {
    caseId = '',
    showUpload = true,
    showSearch = true
  } = $props();

  // State
  let evidenceFiles = $state<EvidenceFile[]>([]);
  let searchResults = $state<SearchResult[]>([]);
  let embeddingStats = $state<EmbeddingStats>({
    total: 0,
    withEmbeddings: 0,
    withoutEmbeddings: 0,
    percentage: 0
  });
  
  let loading = $state({
    files: false,
    upload: false,
    backfill: false,
    search: false,
    stats: false
  });

  let searchQuery = $state('');
  let showSearchResults = $state(false);
  let uploadProgress = $state<string>('');
  let error = $state<string>('');

  // File upload
  let fileInput: HTMLInputElement;
  let dragActive = $state(false);

  onMount(() => {
    loadEvidenceFiles();
    loadEmbeddingStats();
  });

  async function loadEvidenceFiles() {
    loading.files = true;
    try {
      const response = await fetch('/api/evidence-files?limit=50');
      const result = await response.json();
      
      if (result.success) {
        evidenceFiles = result.items.map((item: any) => ({
          ...item,
          hasEmbedding: true // We'll check this when we get embedding status
        }));
      }
    } catch (err) {
      error = 'Failed to load evidence files';
      console.error(err);
    } finally {
      loading.files = false;
    }
  }

  async function loadEmbeddingStats() {
    loading.stats = true;
    try {
      const response = await fetch('/api/evidence-embeddings');
      const result = await response.json();
      
      if (result.success) {
        embeddingStats = result.stats;
      }
    } catch (err) {
      console.error('Failed to load embedding stats:', err);
    } finally {
      loading.stats = false;
    }
  }

  async function handleFileUpload(files: FileList) {
    if (!files.length) return;
    
    loading.upload = true;
    uploadProgress = '';
    error = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadProgress = `Uploading ${file.name} (${i + 1}/${files.length})...`;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        if (caseId) formData.append('case_id', caseId);
        formData.append('evidence_type', getEvidenceType(file.type));

        const response = await fetch('/api/evidence-files', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        if (result.duplicate) {
          uploadProgress = `${file.name} already exists (duplicate detected)`;
        } else {
          uploadProgress = `${file.name} uploaded successfully`;
        }
        
      } catch (err) {
        error = `Failed to upload ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(err);
      }
    }

    loading.upload = false;
    uploadProgress = 'Upload complete!';
    
    // Reload files and stats
    await Promise.all([loadEvidenceFiles(), loadEmbeddingStats()]);
    
    // Clear progress after delay
    setTimeout(() => { uploadProgress = ''; }, 3000);
  }

  async function triggerEmbeddingBackfill() {
    loading.backfill = true;
    error = '';

    try {
      const response = await fetch('/api/evidence-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backfill' })
      });

      const result = await response.json();
      
      if (result.success) {
        uploadProgress = `Backfill complete! Processed: ${result.result.processed}, Success: ${result.result.success}, Failed: ${result.result.failed}`;
        await loadEmbeddingStats();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      error = `Embedding backfill failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(err);
    } finally {
      loading.backfill = false;
    }
  }

  async function performSemanticSearch() {
    if (!searchQuery.trim()) return;
    
    loading.search = true;
    error = '';

    try {
      const params = new URLSearchParams({
        search: searchQuery,
        limit: '10'
      });
      
      if (caseId) params.set('case_id', caseId);

      const response = await fetch(`/api/evidence-embeddings?${params}`);
      const result = await response.json();
      
      if (result.success) {
        searchResults = result.results;
        showSearchResults = true;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      error = `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(err);
    } finally {
      loading.search = false;
    }
  }

  function getEvidenceType(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'DOCUMENT';
    if (mimeType.includes('image')) return 'PHOTO';
    if (mimeType.includes('video')) return 'VIDEO';
    if (mimeType.includes('audio')) return 'AUDIO';
    if (mimeType.includes('text')) return 'DOCUMENT';
    return 'UNKNOWN';
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Drag & drop handlers
  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    dragActive = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragActive = false;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragActive = false;
    
    if (e.dataTransfer?.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  }
</script>

<div class="evidence-manager">
  <!-- Embedding Stats Card -->
  <Card class="mb-6">
    <CardHeader>
      <CardTitle>📊 Embedding Status</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div class="stat-item">
          <div class="text-2xl font-bold text-blue-600">{embeddingStats.total}</div>
          <div class="text-sm text-gray-600">Total Files</div>
        </div>
        <div class="stat-item">
          <div class="text-2xl font-bold text-green-600">{embeddingStats.withEmbeddings}</div>
          <div class="text-sm text-gray-600">With Embeddings</div>
        </div>
        <div class="stat-item">
          <div class="text-2xl font-bold text-orange-600">{embeddingStats.withoutEmbeddings}</div>
          <div class="text-sm text-gray-600">Pending</div>
        </div>
        <div class="stat-item">
          <div class="text-2xl font-bold text-purple-600">{embeddingStats.percentage}%</div>
          <div class="text-sm text-gray-600">Complete</div>
        </div>
      </div>

      <div class="flex gap-2">
        <Button
          onclick={loadEmbeddingStats}
          disabled={loading.stats}
          variant="outline"
          class="text-sm bits-btn bits-btn"
        >
          {loading.stats ? 'Refreshing...' : '🔄 Refresh Stats'}
        </Button>
        
        <Button
          onclick={triggerEmbeddingBackfill}
          disabled={loading.backfill || embeddingStats.withoutEmbeddings === 0}
          variant="secondary"
          class="text-sm bits-btn bits-btn"
        >
          {loading.backfill ? 'Processing...' : `🚀 Generate Embeddings (${embeddingStats.withoutEmbeddings})`}
        </Button>
      </div>
    </CardContent>
  </Card>

  <!-- Upload Section -->
  {#if showUpload}
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>📁 Upload Evidence</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          class="upload-area {dragActive ? 'drag-active' : ''}"
          ondragenter={handleDragEnter}
          ondragleave={handleDragLeave}
          ondragover={handleDragOver}
          ondrop={handleDrop}
        >
          <input
            bind:this={fileInput}
            type="file"
            multiple
            class="hidden"
            onchange={(e) => e.target?.files && handleFileUpload(e.target.files)}
          />
          
          <div class="text-center p-8">
            <div class="text-4xl mb-4">📎</div>
            <p class="text-lg mb-2">Drop files here or click to browse</p>
            <p class="text-sm text-gray-600 mb-4">Supports PDFs, images, documents, and more</p>
            
            <Button class="bits-btn"
              onclick={() => fileInput?.click()}
              disabled={loading.upload}
            >
              {loading.upload ? 'Uploading...' : 'Select Files'}
            </Button>
          </div>
        </div>
        
        {#if uploadProgress}
          <div class="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p class="text-blue-700">{uploadProgress}</p>
          </div>
        {/if}
      </CardContent>
    </Card>
  {/if}

  <!-- Search Section -->
  {#if showSearch}
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>🔍 Semantic Search</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex gap-2 mb-4">
          <input
            bind:value={searchQuery}
            type="text"
            placeholder="Search for similar evidence..."
            class="flex-1 px-3 py-2 border rounded-lg"
            onkeydown={(e) => e.key === 'Enter' && performSemanticSearch()}
          />
          <Button class="bits-btn"
            onclick={performSemanticSearch}
            disabled={loading.search || !searchQuery.trim()}
          >
            {loading.search ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {#if showSearchResults}
          <div class="search-results">
            <div class="flex justify-between items-center mb-4">
              <h4 class="font-semibold">Search Results ({searchResults.length})</h4>
              <Button class="bits-btn"
                onclick={() => { showSearchResults = false; searchResults = []; }}
                variant="outline"
                class="text-sm"
              >
                Clear Results
              </Button>
            </div>

            {#if searchResults.length === 0}
              <p class="text-gray-600 italic">No similar evidence found.</p>
            {:else}
              <div class="space-y-3">
                {#each searchResults as result}
                  <div class="search-result-item p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div class="flex justify-between items-start">
                      <div class="flex-1">
                        <h5 class="font-medium text-gray-900">{result.title}</h5>
                        {#if result.description}
                          <p class="text-sm text-gray-600 mt-1">{result.description}</p>
                        {/if}
                        <div class="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>📁 {result.evidence_type}</span>
                          <span>📄 {result.mime_type}</span>
                          <span>📅 {formatDate(result.uploaded_at)}</span>
                          <span>💾 {formatFileSize(result.file_size)}</span>
                        </div>
                      </div>
                      <div class="text-right ml-4">
                        <div class="similarity-score text-lg font-bold text-green-600">
                          {Math.round(result.similarity * 100)}%
                        </div>
                        <div class="text-xs text-gray-500">similarity</div>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </CardContent>
    </Card>
  {/if}

  <!-- Evidence Files List -->
  <Card>
    <CardHeader>
      <div class="flex justify-between items-center">
        <CardTitle>📋 Evidence Files ({evidenceFiles.length})</CardTitle>
        <Button
          onclick={loadEvidenceFiles}
          disabled={loading.files}
          variant="outline"
          class="text-sm bits-btn bits-btn"
        >
          {loading.files ? 'Loading...' : '🔄 Refresh'}
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      {#if loading.files}
        <div class="text-center py-8">
          <div class="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-600">Loading evidence files...</p>
        </div>
      {:else if evidenceFiles.length === 0}
        <div class="text-center py-8">
          <div class="text-4xl mb-4">📂</div>
          <p class="text-gray-600">No evidence files uploaded yet.</p>
          {#if showUpload}
            <p class="text-sm text-gray-500 mt-2">Use the upload section above to add files.</p>
          {/if}
        </div>
      {:else}
        <div class="space-y-3">
          {#each evidenceFiles as file}
            <div class="evidence-file-item p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h5 class="font-medium text-gray-900">{file.title}</h5>
                  {#if file.description}
                    <p class="text-sm text-gray-600 mt-1">{file.description}</p>
                  {/if}
                  <div class="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>📁 {file.evidence_type}</span>
                    <span>📄 {file.mime_type}</span>
                    <span>📅 {formatDate(file.uploaded_at)}</span>
                    <span>💾 {formatFileSize(file.file_size)}</span>
                    {#if file.case_id}
                      <span>🗂️ Case: {file.case_id.substring(0, 8)}...</span>
                    {/if}
                  </div>
                </div>
                <div class="text-right ml-4">
                  <div class="embedding-status text-sm">
                    {#if file.hasEmbedding}
                      <span class="text-green-600 font-medium">✅ Embedded</span>
                    {:else}
                      <span class="text-orange-600 font-medium">⏳ Pending</span>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- Error Display -->
  {#if error}
    <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-start">
        <div class="text-red-600 mr-2">❌</div>
        <div class="flex-1">
          <h4 class="font-medium text-red-800">Error</h4>
          <p class="text-red-700 text-sm mt-1">{error}</p>
          <Button class="bits-btn"
            onclick={() => { error = ''; }}
            variant="outline"
            class="mt-2 text-sm"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .upload-area {
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .upload-area:hover,
  .upload-area.drag-active {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }

  .stat-item {
    text-align: center;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .similarity-score {
    font-family: 'Courier New', monospace;
  }

  .evidence-file-item,
  .search-result-item {
    transition: all 0.2s ease;
  }

  .evidence-file-item:hover,
  .search-result-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
</style>
