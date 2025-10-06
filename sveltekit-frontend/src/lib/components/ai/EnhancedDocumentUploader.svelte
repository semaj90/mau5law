<!-- Enhanced Document Uploader with Bits UI v2, AI Processing, and Real-time Status -->
<script lang="ts">
  import Button from '$lib/components/ui/bitsbutton.svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import {
    AlertTriangle,
    CheckCircle,
    File as FileIcon,
    FileImage,
    FileText,
    Loader2,
    Upload,
    X,
  } from 'lucide-svelte';
  import { onMount, createEventDispatcher } from 'svelte';
  import { derived, get, writable } from 'svelte/store';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';

  import Label from '$lib/components/ui/Label.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';

  // Public props
  export let acceptedTypes: string = '.pdf,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp';
  export let maxFileSize: number = 50 * 1024 * 1024; // 50MB
  export let maxFiles: number = 10;
  export let caseId: string = '';
  export let userId: string = '';
  export let autoProcess: boolean = true;
  export let showMetadataForm: boolean = true;
  export let className = '';

  const dispatch = createEventDispatcher<{
    'file-processed': { fileId: string; result: ProcessingResult };
    'files-updated': { files: ProcessedFile[] };
    'upload-error': { fileId: string; error: string };
    'file-progress': { fileId: string; progress: number };
  }>();

  // Types
  interface UploadFile {
    id: string;
    file: File;
    preview?: string;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
    progress: number;
    error?: string;
    metadata: {
      title?: string;
      description?: string;
      documentType?: string;
      jurisdiction?: string;
      tags?: string[];
      autoSummarize?: boolean;
      extractEntities?: boolean;
    };
  }

  interface ProcessedFile {
    id: string;
    documentId: string;
    filename: string;
    size: number;
    type: string;
    url?: string;
    thumbnail?: string;
  }

  interface ProcessingResult {
    summary?: string;
    entities?: any[];
    chunks?: number;
    embeddings?: number[];
  }

  // State
  const files = writable<UploadFile[]>([]);
  const isDragging = writable(false);
  const isProcessing = writable(false);
  const showMetadata = writable(false);
  const selectedFile = writable<UploadFile | null>(null);

  const totalProgress = derived(files, ($files) => {
    if ($files.length === 0) return 0;
    return $files.reduce((acc, file) => acc + file.progress, 0) / $files.length;
  });
  const completedFiles = derived(files, ($files) => $files.filter((f) => f.status === 'completed'));
  const hasErrors = derived(files, ($files) => $files.some((f) => f.status === 'error'));

  // DOM refs
  let fileInput: HTMLInputElement | null = null;
  let dropZone: HTMLDivElement | null = null;

  const documentTypes = [
    { value: 'contract', label: 'Contract' },
    { value: 'motion', label: 'Motion' },
    { value: 'brief', label: 'Brief' },
    { value: 'evidence', label: 'Evidence' },
    { value: 'correspondence', label: 'Correspondence' },
    { value: 'statute', label: 'Statute' },
    { value: 'regulation', label: 'Regulation' },
    { value: 'case_law', label: 'Case Law' },
    { value: 'other', label: 'Other' },
  ];

  const jurisdictions = [
    { value: 'federal', label: 'Federal' },
    { value: 'state', label: 'State' },
    { value: 'local', label: 'Local' },
    { value: 'international', label: 'International' },
  ];

  // Drag & drop handlers
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging.set(true);
  }

  function handleDragLeave(e: DragEvent) {
    if (!e.relatedTarget || !dropZone?.contains(e.relatedTarget as Node)) {
      isDragging.set(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging.set(false);
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    processSelectedFiles(droppedFiles as File[]);
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const selectedFiles = Array.from(target.files || []);
    processSelectedFiles(selectedFiles as File[]);
    target.value = '';
  }

  function processSelectedFiles(selectedFiles: File[]) {
    const validFiles = selectedFiles.filter((file) => {
      const ext = '.' + (file.name.split('.')?.pop() || '').toLowerCase();
      if (!acceptedTypes.includes(ext)) {
        console.warn(`File type ${ext} not accepted`);
        return false;
      }
      if (file.size > maxFileSize) {
        console.warn(`File ${file.name} exceeds maximum size`);
        return false;
      }
      return true;
    });

    files.update((currentFiles) => {
      if (currentFiles.length + validFiles.length > maxFiles) {
        console.warn(`Maximum ${maxFiles} files allowed`);
        return currentFiles;
      }
      const newFiles: UploadFile[] = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0,
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, ''),
          documentType: 'other',
          autoSummarize: true,
          extractEntities: true,
          tags: [],
        },
      }));

      // Generate previews for images
      newFiles.forEach((uploadFile) => {
        if (uploadFile.file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            uploadFile.preview = ev.target?.result as string;
            files.update((f) => [...f]);
          };
          reader.readAsDataURL(uploadFile.file);
        }
      });

      return [...currentFiles, ...newFiles];
    });

    if (autoProcess) {
      uploadFiles();
    }
  }

  // Upload & processing
  async function uploadFiles() {
    isProcessing.set(true);
    const currentFiles = get(files).filter((file) => file.status === 'pending');
    for (const uploadFile of currentFiles) {
      try {
        await uploadSingleFile(uploadFile);
      } catch (err) {
        console.error('Upload error:', err);
        updateFileStatus(uploadFile.id, 'error', 0, String(err));
      }
    }
    isProcessing.set(false);
  }

  async function uploadSingleFile(uploadFile: UploadFile) {
    updateFileStatus(uploadFile.id, 'uploading', 10);
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('caseId', caseId);
    formData.append('userId', userId);
    formData.append('metadata', JSON.stringify(uploadFile.metadata));

    try {
      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      const uploadResult = await uploadResponse.json();
      updateFileStatus(uploadFile.id, 'processing', 50);

      if (uploadFile.metadata.autoSummarize || uploadFile.metadata.extractEntities) {
        const processingResponse = await fetch('/api/ai/process-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: uploadResult.documentId,
            extractEntities: uploadFile.metadata.extractEntities,
            generateSummary: uploadFile.metadata.autoSummarize,
            riskAssessment: true,
          }),
        });
        if (!processingResponse.ok) throw new Error(`AI processing failed: ${processingResponse.statusText}`);
        const processingResult: ProcessingResult = await processingResponse.json();
        updateFileStatus(uploadFile.id, 'completed', 100);

        dispatch('file-processed', { fileId: uploadFile.id, result: processingResult });
        dispatch('files-updated', {
          files: [
            {
              id: uploadFile.id,
              documentId: uploadResult.documentId,
              filename: uploadFile.file.name,
              size: uploadFile.file.size,
              type: uploadFile.file.type,
              url: uploadResult.url,
              thumbnail: uploadFile.preview,
            } as ProcessedFile,
          ],
        });
      } else {
        updateFileStatus(uploadFile.id, 'completed', 100);
      }
    } catch (err) {
      updateFileStatus(uploadFile.id, 'error', 0, String(err));
      dispatch('upload-error', { fileId: uploadFile.id, error: String(err) });
    }
  }

  function updateFileStatus(fileId: string, status: UploadFile['status'], progress: number, error?: string) {
    files.update((currentFiles) =>
      currentFiles.map((file) => (file.id === fileId ? { ...file, status, progress, ...(error ? { error } : {}) } : file))
    );
    if (status === 'processing') dispatch('file-progress', { fileId, progress });
  }

  function removeFile(fileId: string) {
    files.update((currentFiles) => currentFiles.filter((f) => f.id !== fileId));
  }

  function openMetadataDialog(file: UploadFile) {
    selectedFile.set(file);
    showMetadata.set(true);
  }

  function updateFileMetadata(fileId: string, metadata: Partial<UploadFile['metadata']>) {
    files.update((currentFiles) => currentFiles.map((file) => (file.id === fileId ? { ...file, metadata: { ...file.metadata, ...metadata } } : file)));
  }

  function getFileIcon(file: File) {
    if (file.type.startsWith('image/')) return FileImage;
    if (file.type.includes('pdf')) return FileText;
    return FileIcon;
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getStatusColor(status: UploadFile['status']): string {
    switch (status) {
      case 'completed':
        return 'green';
      case 'error':
        return 'red';
      case 'processing':
        return 'blue';
      case 'uploading':
        return 'yellow';
      default:
        return 'gray';
    }
  }

  onMount(() => {
    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      document.addEventListener(eventName, preventDefaults, false);
    });
    return () => {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        document.removeEventListener(eventName, preventDefaults, false);
      });
    };
  });
</script>
<!-- Main Upload Interface -->
<div class="enhanced-document-uploader {className}">
  <!-- Drop Zone -->
  <div
    bind:this={dropZone}
    class="drop-zone"
    class:dragging={$isDragging}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    role="button"
    aria-label="Drop zone"
    tabindex="0"
    onclick={() => fileInput?.click()}
    onkeydown={(e) => e.key === "Enter" && fileInput?.click()}
  >
    <div class="drop-zone-content">
      <Upload class="drop-zone-icon" size={48} />
      <h3 class="drop-zone-title">
        {$isDragging ? "Drop files here" : "Upload Legal Documents"}
      </h3>
      <p class="drop-zone-description">
        Drag and drop files here, or click to select
      </p>
      <p class="drop-zone-specs">
        Supports: PDF, DOCX, TXT, Images • Max {formatFileSize(maxFileSize)} • Up
        to {maxFiles} files
      </p>
      <Button variant="ghost" class="mt-4 bits-btn bits-btn" disabled={$isProcessing}>
<Upload class="mr-2" size={16} />
        Choose Files
</Button>
    </div>
  </div>
  <!-- Hidden File Input -->
  <input
    bind:this={fileInput}
    type="file"
    multiple
    accept={acceptedTypes} onchange={handleFileSelect}
    class="sr-only"
  />
  <!-- Progress Overview -->
  {#if $files.length > 0}
    <div class="mt-6 nes-container">
      <div class="yorha-panel-header">
        <h3 class="nes-text is-primary flex items-center justify-between">
          <span>Upload Progress</span>
          <Badge variant={$hasErrors ? "destructive" : "default"}>
            {$completedFiles.length} / {$files.length} completed
          </Badge>
        </h3>
      </div>
      <div class="yorha-panel-content">
        <div class="space-y-2">
          <Progress value={$totalProgress} class="w-full" />
          <p class="text-sm nes-text is-disabled">
            Overall Progress: {Math.round($totalProgress)}%
          </p>
        </div>
      </div>
    </div>
  {/if}
  <!-- File List -->
  {#if $files.length > 0}
    <div class="file-list mt-6">
      {#each $files as file (file.id)}
        <div class="file-item nes-container">
          <div class="yorha-panel-content p-4">
            <div class="file-info">
              <!-- File Icon/Preview -->
              <div class="file-preview">
                {#if file.preview}
                  <img src={file.preview} alt="Preview" class="preview-image" />
                {:else}
                  {@const SvelteComponent = getFileIcon(file.file)}
                  <SvelteComponent size={24} />
                {/if}
              </div>
              <!-- File Details -->
              <div class="file-details">
                <h4 class="file-name">
                  {file.metadata.title || file.file.name}
                </h4>
                <p class="file-meta">
                  {formatFileSize(file.file.size)} • {file.file.type}
                  {#if file.metadata.documentType !== "other"}
                    • {documentTypes.find(
                      (t) => t.value === file.metadata.documentType
                    )?.label}
                  {/if}
                </p>
                <!-- Progress Bar -->
                {#if file.status !== "pending" && file.status !== "completed"}
                  <Progress value={file.progress} class="file-progress" />
                {/if}
                <!-- Error Message -->
                {#if file.error}
                  <p class="error-message">
                    <AlertTriangle size={16} />
                    {file.error}
                  </p>
                {/if}
              </div>
              <!-- Status & Actions -->
              <div class="file-actions">
                <Badge variant={getStatusColor(file.status) as any}>
                  {#if file.status === "processing"}
                    <Loader2 class="mr-1 animate-spin" size={12} />
                  {:else if file.status === "completed"}
                    <CheckCircle class="mr-1" size={12} />
                  {:else if file.status === "error"}
                    <AlertTriangle class="mr-1" size={12} />
                  {/if}
                  {file.status}
                </Badge>
                <div class="action-buttons">
                  {#if showMetadataForm && file.status === "pending"}
                    <Button className="bits-btn"
                      variant="ghost"
                      size="sm"
                      onclick={() =>
openMetadataDialog(file)}
                    >
                      Edit
</Button>
                  {/if}
                  <Button className="bits-btn"
                    variant="ghost"
                    size="sm"
                    onclick={() =>
removeFile(file.id)}
                    disabled={file.status === "uploading" ||
                      file.status === "processing"}
                  >
                    <X size={16} />
</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
    <!-- Upload Actions -->
    <div class="upload-actions mt-6">
      <Button
        className="bits-btn mr-4"
        onclick={uploadFiles}
        disabled={$isProcessing || $files.every((f) =>
f.status !== "pending")}
      >
        {#if $isProcessing}
          <Loader2 class="mr-2 animate-spin" size={16} />
          Processing...
        {:else}
          <Upload class="mr-2" size={16} />
          Upload & Process ({$files.filter((f) => f.status === "pending")
            .length} files)
        {/if}
</Button>
      <Button className="bits-btn"
        variant="ghost"
        onclick={() =>
files.set([])}
        disabled={$isProcessing}
      >
        Clear All
</Button>
    </div>
  <!-- Metadata Dialog -->
  <Dialog.Root bind:open={showMetadata}>
    <Dialog.Content class="max-w-md">
      <Dialog.Header>
        <Dialog.Title>Document Metadata</Dialog.Title>
      </Dialog.Header>
      {#if $selectedFile}
        <div class="metadata-form space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              bind:value={$selectedFile.metadata.title}
              placeholder="Document title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              bind:value={$selectedFile.metadata.description}
              placeholder="Brief description"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="document-type">Document Type</Label>
            <Select.Root bind:value={$selectedFile.metadata.documentType}>
              <Select.Trigger>
                <Select.Value placeholder="Select type" />
              </Select.Trigger>
              <Select.Content>
                {#each documentTypes as type}
                  <Select.Item value={type.value}>{type.label}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
          <div>
            <Label htmlFor="jurisdiction">Jurisdiction</Label>
            <Select.Root bind:value={$selectedFile.metadata.jurisdiction}>
              <Select.Trigger>
                <Select.Value placeholder="Select jurisdiction" />
              </Select.Trigger>
              <Select.Content>
                {#each jurisdictions as jurisdiction}
                  <Select.Item value={jurisdiction.value}
                    >{jurisdiction.label}</Select.Item
                  >
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
          <div class="ai-options">
            <Label>AI Processing Options</Label>
            <div class="checkbox-group">
              <Checkbox bind:checked={$selectedFile.metadata.autoSummarize}>
                Auto-generate summary
              </Checkbox>
              <Checkbox bind:checked={$selectedFile.metadata.extractEntities}>
                Extract entities (names, dates, amounts)
              </Checkbox>
            </div>
          </div>
          <div class="dialog-actions">
            <Button class="bits-btn" variant="ghost" onclick={() =>
showMetadata.set(false)}>
              Cancel
</Button>
            <Button class="bits-btn"
              onclick={() =>
{
                if ($selectedFile) {
                  updateFileMetadata($selectedFile.id, $selectedFile.metadata);
                }
                showMetadata.set(false);
              }}
            >
              Save
</Button>
          </div>
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Root>
</div>
<style>
  .enhanced-document-uploader {
    width: 100%;
  }
  .drop-zone {
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    background: #f9fafb;
  }
  .drop-zone.dragging {
    border-color: #2563eb;
    background: rgba(37, 99, 235, 0.05);
  }
  .drop-zone-content {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .drop-zone-icon {
    display: block;
    margin-left: auto;
    margin-right: auto;
    color: #6b7280;
  }
  .drop-zone-title {
    font-size: 1.125rem;
    font-weight: 600;
  }
  .drop-zone-description {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .drop-zone-specs {
    font-size: 0.75rem;
    color: #6b7280;
  }
  .file-list {
    margin-top: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .file-item {
    transition: box-shadow 0.2s;
  }
  .file-item:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .file-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .file-preview {
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    border-radius: 0.5rem;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .file-details {
    flex: 1 1 0%;
    min-width: 0;
  }
  .file-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .file-meta {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .file-progress {
    margin-top: 0.5rem;
  }
  .error-message {
    font-size: 0.875rem;
    color: #dc2626;
    display: flex;
    align-items: center;
    margin-top: 0.5rem;
  }
  .file-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }
  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }
  .upload-actions {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .metadata-form {
    padding: 0.25rem;
  }
  .checkbox-group {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }
</style>