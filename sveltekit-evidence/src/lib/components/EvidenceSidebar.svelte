<!--
EvidenceSidebar.svelte - Evidence upload and management sidebar
Handles file uploads, evidence display, and drag-to-board functionality
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { currentEvidence, caseActions } from '$lib/stores/caseStore';
  import { boardActions } from '$lib/stores/boardStore';
  import type { Evidence } from '$lib/types';

  // Props
  interface Props {
    caseId: string;
  }

  let { caseId }: Props = $props();

  // Component state
  let files = $state<FileList | null>(null);
  let fileInput = $state<HTMLInputElement>();
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let draggedEvidence = $state<Evidence | null>(null);

  // File upload handler
  async function uploadEvidence() {
    if (!files || files.length === 0) return;

    isUploading = true;
    uploadProgress = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await uploadSingleFile(file);
        uploadProgress = ((i + 1) / files.length) * 100;
      }

      // Clear file input
      if (fileInput) fileInput.value = '';
      files = null;

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error as Error).message);
    } finally {
      isUploading = false;
      uploadProgress = 0;
    }
  }

  async function uploadSingleFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);
    formData.append('uploadedBy', 'current_user'); // TODO: Get from auth store

    const response = await fetch('/api/evidence/ingest', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const evidence = await response.json();

    // Add to case store
    caseActions.addEvidence(evidence);
  }

  // Handle file input change
  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    files = target.files;
  }

  // Drag and drop handlers for evidence items
  function handleDragStart(event: DragEvent, evidence: Evidence) {
    draggedEvidence = evidence;
    event.dataTransfer?.setData('text/plain', evidence.id);
    event.dataTransfer!.effectAllowed = 'copy';
  }

  function handleDragEnd() {
    draggedEvidence = null;
  }

  // Add evidence to board
  function addEvidenceToBoard(evidence: Evidence) {
    const boardObjectId = boardActions.addEvidenceToBoard(
      evidence.id,
      evidence.minioUrl,
      evidence.type,
      { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 }
    );
    return boardObjectId;
  }

  // Get file icon based on type
  function getFileIcon(type: string): string {
    switch (type) {
      case 'image': return '🖼️';
      case 'document': return '📄';
      case 'audio': return '🎵';
      case 'video': return '🎬';
      case 'text': return '📝';
      default: return '📎';
    }
  }

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Format upload date
  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  }

  // Filter evidence by type
  let evidenceFilter = $state('all');
  let filteredEvidence = $derived($currentEvidence.filter(evidence => {
    if (evidenceFilter === 'all') return true;
    return evidence.type === evidenceFilter;
  }));

  // Search evidence
  let searchQuery = $state('');
  let searchedEvidence = $derived(filteredEvidence.filter(evidence =>
    evidence.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    evidence.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    evidence.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  ));
</script>

<div class="evidence-sidebar">
  <!-- Upload Section -->
  <div class="upload-section nes-container is-dark with-title">
    <p class="title">📤 Upload Evidence</p>

    <div class="file-input-wrapper">
      <input
        type="file"
        bind:this={fileInput}
        on:change={handleFileChange}
        multiple
        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
        class="nes-input"
        disabled={isUploading}
      />
    </div>

    {#if files && files.length > 0}
      <div class="selected-files">
        <p class="nes-text">Selected files: {files.length}</p>
        {#each Array.from(files) as file}
          <div class="file-preview">
            <span class="nes-text is-disabled">{file.name}</span>
            <span class="nes-text is-disabled">({formatFileSize(file.size)})</span>
          </div>
        {/each}
      </div>
    {/if}

    <button
      class="nes-btn is-primary upload-btn"
      on:click={uploadEvidence}
      disabled={!files || files.length === 0 || isUploading}
    >
      {isUploading ? 'Uploading...' : 'Upload Evidence'}
    </button>

    {#if isUploading}
      <div class="upload-progress">
        <progress class="nes-progress is-primary" value={uploadProgress} max="100"></progress>
        <span class="nes-text is-disabled">{Math.round(uploadProgress)}%</span>
      </div>
    {/if}
  </div>

  <!-- Evidence Management -->
  <div class="evidence-section nes-container is-dark with-title">
    <p class="title">🔍 Evidence ({$currentEvidence.length})</p>

    <!-- Search and Filter -->
    <div class="controls">
      <input
        type="text"
        placeholder="Search evidence..."
        bind:value={searchQuery}
        class="nes-input search-input"
      />

      <select bind:value={evidenceFilter} class="nes-select filter-select">
        <option value="all">All Types</option>
        <option value="image">Images</option>
        <option value="document">Documents</option>
        <option value="audio">Audio</option>
        <option value="video">Video</option>
        <option value="text">Text</option>
      </select>
    </div>

    <!-- Evidence List -->
    <div class="evidence-list">
      {#each searchedEvidence as evidence (evidence.id)}
        <div
          class="evidence-item nes-container"
          draggable="true"
          on:dragstart={(e) => handleDragStart(e, evidence)}
          on:dragend={handleDragEnd}
          role="button"
          tabindex="0"
          on:click={() => addEvidenceToBoard(evidence)}
          on:keydown={(e) => e.key === 'Enter' && addEvidenceToBoard(evidence)}
        >
          <div class="evidence-header">
            <span class="file-icon">{getFileIcon(evidence.type)}</span>
            <span class="filename" title={evidence.filename}>
              {evidence.filename}
            </span>
          </div>

          <div class="evidence-meta">
            <span class="nes-text is-disabled">
              {formatFileSize(evidence.metadata.size)}
            </span>
            <span class="nes-text is-disabled">
              {formatDate(evidence.uploadedAt)}
            </span>
          </div>

          {#if evidence.tags.length > 0}
            <div class="evidence-tags">
              {#each evidence.tags as tag}
                <span class="nes-badge">{tag}</span>
              {/each}
            </div>
          {/if}

          {#if evidence.notes}
            <div class="evidence-notes">
              <p class="nes-text is-disabled">{evidence.notes}</p>
            </div>
          {/if}

          <!-- Quick Actions -->
          <div class="evidence-actions">
            <button
              class="nes-btn is-small is-success"
              on:click|stopPropagation={() => addEvidenceToBoard(evidence)}
              title="Add to board"
            >
              📌
            </button>

            <a
              href={evidence.minioUrl}
              target="_blank"
              class="nes-btn is-small"
              title="Open file"
              on:click|stopPropagation
            >
              👁️
            </a>
          </div>
        </div>
      {/each}

      {#if searchedEvidence.length === 0}
        <div class="no-evidence nes-container is-centered">
          {#if $currentEvidence.length === 0}
            <p class="nes-text">No evidence uploaded yet</p>
            <p class="nes-text is-disabled">Upload files to get started</p>
          {:else}
            <p class="nes-text">No evidence matches your search</p>
            <p class="nes-text is-disabled">Try adjusting your filters</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Usage Instructions -->
  <div class="instructions nes-container is-dark">
    <h4 class="nes-text is-primary">💡 How to Use</h4>
    <ul class="instruction-list">
      <li class="nes-text is-disabled">🖱️ Click evidence to add to board</li>
      <li class="nes-text is-disabled">🫳 Drag evidence to board position</li>
      <li class="nes-text is-disabled">👁️ Click eye icon to preview</li>
      <li class="nes-text is-disabled">🔍 Use search to find evidence</li>
    </ul>
  </div>
</div>

<style>
  .evidence-sidebar {
    width: 350px;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: #1a1a1a;
    border-right: 2px solid #495057;
    overflow-y: auto;
  }

  .upload-section, .evidence-section, .instructions {
    flex-shrink: 0;
  }

  .evidence-section {
    flex: 1;
    min-height: 0;
  }

  .file-input-wrapper {
    margin-bottom: 1rem;
  }

  .selected-files {
    margin-bottom: 1rem;
  }

  .file-preview {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem;
    background: rgba(255, 255, 255, 0.1);
    margin-bottom: 0.25rem;
    border-radius: 4px;
  }

  .upload-btn {
    width: 100%;
    margin-bottom: 1rem;
  }

  .upload-progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .search-input, .filter-select {
    width: 100%;
  }

  .evidence-list {
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
  }

  .evidence-item {
    margin-bottom: 0.5rem;
    padding: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
  }

  .evidence-item:hover {
    border-color: #007bff;
    background: rgba(0, 123, 255, 0.1);
  }

  .evidence-item[draggable="true"]:hover {
    cursor: grab;
  }

  .evidence-item[draggable="true"]:active {
    cursor: grabbing;
  }

  .evidence-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .file-icon {
    font-size: 1.2em;
    flex-shrink: 0;
  }

  .filename {
    flex: 1;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .evidence-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.8em;
  }

  .evidence-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .evidence-notes {
    margin-bottom: 0.5rem;
  }

  .evidence-notes p {
    font-size: 0.8em;
    line-height: 1.3;
    margin: 0;
  }

  .evidence-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .no-evidence {
    text-align: center;
    padding: 2rem 1rem;
  }

  .instruction-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .instruction-list li {
    margin-bottom: 0.25rem;
    font-size: 0.9em;
  }

  /* Scrollbar styling */
  .evidence-list::-webkit-scrollbar {
    width: 6px;
  }

  .evidence-list::-webkit-scrollbar-track {
    background: #2a2a2a;
  }

  .evidence-list::-webkit-scrollbar-thumb {
    background: #495057;
    border-radius: 3px;
  }

  .evidence-list::-webkit-scrollbar-thumb:hover {
    background: #6c757d;
  }
</style>