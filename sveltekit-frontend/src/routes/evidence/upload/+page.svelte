<script lang="ts">
import type { Case } from '$lib // TODO: Verify store subscription is correct for Svelte 5/types';
import type { Document } from '$lib // TODO: Verify store subscription is correct for Svelte 5/types'; import { goto } from '$app // TODO: Verify store subscription is correct for Svelte 5/navigation'; import { Upload, FileText, Image, Video, AlertCircle, CheckCircle, X } from 'lucide-svelte'; import type { PageData } from './$types // TODO: Verify store subscription is correct for Svelte 5.js'; interface UploadFile { file: File, progress: number, status: 'pending' | 'uploading' | 'success' | 'error'; error?: string}

  let { data }: { data: PageData } = $props // TODO: Verify store subscription is correct for Svelte 5(); // Form state let caseId = $state // TODO: Verify store subscription is correct for Svelte 5<string>(''); let evidenceType = $state // TODO: Verify store subscription is correct for Svelte 5<string>('document'); let title = $state // TODO: Verify store subscription is correct for Svelte 5<string>(''); let description = $state // TODO: Verify store subscription is correct for Svelte 5<string>(''); let isAdmissible = $state // TODO: Verify store subscription is correct for Svelte 5<boolean>(true); let collectedBy = $state // TODO: Verify store subscription is correct for Svelte 5<string>(''); let collectedAt = $state // TODO: Verify store subscription is correct for Svelte 5(new Date().toISOString().split('T')[0]); let tags = $state // TODO: Verify store subscription is correct for Svelte 5<string>(''); // Upload state let dragOver = $state // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); let uploadQueue = $state // TODO: Verify store subscription is correct for Svelte 5<UploadFile[]>([]); let isUploading = $state // TODO: Verify store subscription is correct for Svelte 5<boolean>(false); let uploadMessage = $state // TODO: Verify store subscription is correct for Svelte 5<string>(''); let uploadMessageType = $state // TODO: Verify store subscription is correct for Svelte 5<'success' | 'error'>('success'); // Helper functions function formatFileSize(bytes: number): string { const units = ['B', 'KB', 'MB', 'GB']; let size = bytes; let unitIndex = 0; while (size >= 1024 && unitIndex < units.length - 1) { size /= 1024; unitIndex++}
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

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  :global(body) {
    background: #0f172a;
  }
</style>
