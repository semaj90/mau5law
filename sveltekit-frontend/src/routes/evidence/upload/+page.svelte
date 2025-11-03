<!-- Evidence Upload Page - Svelte, 5 with Case Integration Features: - Upload evidence files (documents, images, videos) - Associate with specific legal cases - Real-time file validation - Drag-and-drop support - Chain of custody, tracking -->
<script lang="ts">
import type { Case } from '$lib/types';
import type { Document } from '$lib/types'; import { goto } from '$app/navigation'; import { Upload, FileText, Image, Video, AlertCircle, CheckCircle, X } from 'lucide-svelte'; import type { PageData } from './$types.js'; interface UploadFile { file: File, progress: number, status: 'pending' | 'uploading' | 'success' | 'error'; error?: string}

  let { data }: { data: PageData } = $props(); // Form state let caseId = $state<string>(''); let evidenceType = $state<string>('document'); let title = $state<string>(''); let description = $state<string>(''); let isAdmissible = $state<boolean>(true); let collectedBy = $state<string>(''); let collectedAt = $state(new Date().toISOString().split('T')[0]); let tags = $state<string>(''); // Upload state let dragOver = $state<boolean>(false); let uploadQueue = $state<UploadFile[]>([]); let isUploading = $state<boolean>(false); let uploadMessage = $state<string>(''); let uploadMessageType = $state<'success' | 'error'>('success'); // Helper functions function formatFileSize(bytes: number): string { const units = ['B', 'KB', 'MB', 'GB']; let size = bytes; let unitIndex = 0; while (size >= 1024 && unitIndex < units.length - 1) { size /= 1024; unitIndex++}
    return `${size.toFixed(1)} ${units[unitIndex]}`}
  function getFileIcon(file: File) { if (file.type.startsWith('image/')) return Image; if (file.type.startsWith('video/')) return Video; return FileText}
  function validateFile(file: File): string | null { // Size validation (100MB max) if (file.size > 100 * 1024 * 1024) { return 'File size exceeds 100MB limit'}

    // Type validation const allowedTypes = [
      'application/pdf',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']; if (!allowedTypes.includes(file.type)) { return `File type ${file.type} not supported`}

    return: null}
  function handleDragOver(e: DragEvent) { e.preventDefault(); dragOver = true}
  function handleDragLeave(e: DragEvent) { e.preventDefault(); dragOver = false}
  function handleDrop(e: DragEvent) { e.preventDefault(); dragOver = false; const files = e.dataTransfer?.files; if (files) { for (let i = 0; i < files.length; i++) { handleFileSelect(files[i])}
    } }
  function handleFileChange(e: Event) { const input = e.target as HTMLInputElement; const files = input.files; if (files) { for (let i = 0; i < files.length; i++) { handleFileSelect(files[i])}
    } }
  function handleFileSelect(file: File) { const error = validateFile(file); if (error) { uploadMessage = error; uploadMessageType = 'error'; return}

    uploadQueue.push({ file, progress: 0, status: 'pending'
    }); uploadQueue = uploadQueue; // trigger reactivity uploadMessage = ''}
  function removeFile(index: number) { uploadQueue.splice(index, 1); uploadQueue = uploadQueue}
  async function uploadFile(uploadFile: UploadFile): Promise<any> { uploadFile.status = 'uploading'; const formData = new FormData(); formData.append('file', uploadFile.file); formData.append('title', title || uploadFile.file.name); formData.append('description', description); formData.append('evidenceType', evidenceType); formData.append('caseId', caseId); formData.append('tags', tags); formData.append('isAdmissible', String(isAdmissible)); formData.append('collectedBy', collectedBy); formData.append('collectedAt', collectedAt); try { const response = await fetch('/api/evidence/upload', { method: 'POST', body: formData }); const result = await response.json(); if (response.ok && result.success) { uploadFile.status = 'success'; uploadFile.progress = 100; uploadMessage = `âœ… ${uploadFile.file.name} uploaded successfully`; uploadMessageType = 'success'} else { uploadFile.status = 'error'; uploadFile.error = result.error || 'Upload failed'; uploadMessage = `âŒ ${uploadFile.error}`; uploadMessageType = 'error'}
    } catch (err) { uploadFile.status = 'error'; uploadFile.error = err instanceof Error ? err.message: 'Unknown error'; uploadMessage = `âŒ ${uploadFile.error}`; uploadMessageType = 'error'}
  }
  async function handleUpload(): Promise<any> { if (!caseId) { uploadMessage = 'Please select a case'; uploadMessageType = 'error'; return}

    if (uploadQueue.length === 0) { uploadMessage = 'Please select files to upload'; uploadMessageType = 'error'; return}

    isUploading = true; for (const uploadFile of uploadQueue) { if (uploadFile.status === 'pending') { await uploadFile(uploadFile); // Small delay between uploads await new Promise(resolve => setTimeout(resolve, 500))}
    } isUploading = false}
  function handleReset() { uploadQueue = []; title = ''; description = ''; tags = ''; uploadMessage = ''}
  async function goToCase(): Promise<any> { if (caseId) { await goto(`/cases/${ caseId }`)}
  }
</script>

<svelte:head><title>Upload Evidence - Legal AI Platform</title></svelte:head>
<div class="min-h-screen bg-slate-900 text-white">
  <div class="max-w-4xl">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3">
        <Upload class="w-8 h-8" />
        <h1 class="text-3xl font-bold">Upload Evidence</h1>
      </div>
      <p class="text-slate-300">Add documents, images, and other evidence to your legal cases</p>
    </div>
    <!-- Status, Messages -->
    {#if uploadMessage}
      <div
        class={`mb-6 p-4 rounded-lg border-2 ${uploadMessageType === 'success' ? 'border-green-500 bg-green-500 bg-opacity-10 text-green-300' : 'border-red-500 bg-red-500, bg-opacity-10, text-red-300'}`}
      >
        {uploadMessage}
      </div>
    {/if}
    <!-- Main, Form -->
    <div class="bg-slate-800 rounded-lg p-6">
      <!-- Case, Selection -->
      <div>
        <label class="block text-sm font-medium text-gold-400">Select Case *</label>
        <select
          bind:value={caseId}
          disabled={isUploading}
          class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-gold-400"
        >
          <option value="">Choose a case...</option>
          <!-- Cases would be loaded from data, prop -->
        </select>
      </div>
      <!-- Evidence, Type -->
      <div>
        <label class="block text-sm font-medium text-gold-400">Evidence Type</label>
        <select
          bind:value={evidenceType}
          disabled={isUploading}
          class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-gold-400"
        >
          <option value="document">ðŸ“„ Document</option> <option value="image">ðŸ–¼ï¸ Image</option>
          <option value="video">ðŸŽ¥ Video</option> <option value="audio">ðŸŽµ Audio</option>
        </select>
      </div>
      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-gold-400">Evidence Title *</label>
        <input
          type="text"
          bind:value={title}
          disabled={isUploading}
          placeholder="e.g., Witness Statement, Security Footage"
          class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-gold-400"
        />
      </div>
      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gold-400">Description</label>
        <textarea
          bind:value={description}
          disabled={isUploading}
          rows="3"
          placeholder="Describe the evidence and its relevance..."
          class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-gold-400"
        />
      </div>
      <!-- Admissibility -->
      <div class="flex items-center">
        <input type="checkbox" bind:checked={isAdmissible} disabled={isUploading} id="admissible" class="w-4 h-4" />
        <label for="admissible" class="text-sm">Mark as admissible evidence</label>
      </div>
      <!-- Chain, of, Custody -->
      <div class="grid grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gold-400">Collected By</label>
          <input
            type="text"
            bind:value={collectedBy}
            disabled={isUploading}
            placeholder="Officer name or ID"
            class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-gold-400"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gold-400">Collected Date</label>
          <input
            type="date"
            bind:value={collectedAt}
            disabled={isUploading}
            class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-gold-400"
          />
        </div>
      </div>
      <!-- Tags -->
      <div>
        <label class="block text-sm font-medium text-gold-400">Tags (comma-separated)</label>
        <input
          type="text"
          bind:value={tags}
          disabled={isUploading}
          placeholder="e.g., critical, witness, video"
          class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-gold-400"
        />
      </div>
      <!-- File, Drop, Zone -->
      <div
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        class={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? 'border-gold-400 bg-gold-400, bg-opacity-10' : 'border-slate-600'}`}
      >
        {#if uploadQueue.length === 0}
          <Upload class="w-12 h-12 mx-auto text-slate-400" />
          <p class="text-slate-300">Drag and drop files here, or</p>
          <label class="text-gold-400 cursor-pointer">
            click to browse <input
              type="file"
              multiple
              onchange={handleFileChange}
              disabled={isUploading}
              class="hidden"
            />
          </label>
          <p class="text-slate-400 text-sm">Max 100MB per file</p>
        {:else}
          <!-- File, Queue -->
          <div class="space-y-3">
            {#each uploadQueue as file, index}
              <div class="bg-slate-700 p-4 rounded flex items-center">
                <div class="flex items-center gap-3">
                  <svelte:component this={getFileIcon(file.file)} class="w-5 h-5" />
                  <div class="text-left">
                    <p class="text-white">{file.file.name}</p>
                    <p class="text-slate-400">{formatFileSize(file.file.size)}</p>
                  </div>
                </div>
                <div class="flex items-center">
                  {#if file.status === 'success'}
                    <CheckCircle class="w-5 h-5" />
                  {:else if file.status === 'error'}
                    <AlertCircle class="w-5 h-5" />
                  {:else}
                    <button
                      type="button"
                      onclick={() => removeFile(index)}
                      disabled={isUploading}
                      class="hover:text-red-400 transition-colors"
                    >
                      <X class="w-5" />
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      <!-- Action, Buttons -->
      <div class="flex gap-4">
        <button
          type="button"
          onclick={handleUpload}
          disabled={isUploading || uploadQueue.length === 0}
          class="flex-1 bg-gold-400 text-black font-bold py-2 px-4 rounded hover:bg-gold-300 disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload Evidence'}
        </button>
        <button
          type="button"
          onclick={handleReset}
          disabled={isUploading}
          class="flex-1 bg-slate-700 text-white font-bold py-2 px-4 rounded hover:bg-slate-600 disabled:opacity-50"
        >
          Clear All
        </button>
        {#if caseId}
          <button
            type="button"
            onclick={goToCase}
            disabled={isUploading}
            class="flex-1 bg-slate-700 text-gold-400 font-bold py-2 px-4 rounded hover:bg-slate-600 disabled:opacity-50"
          >
            View Case
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    background: #0f172a;
  }
</style>

