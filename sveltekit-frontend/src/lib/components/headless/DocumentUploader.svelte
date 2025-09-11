<!-- Headless Document Uploader Component
     Provides upload functionality without UI, perfect for integration with custom interfaces -->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { minioService, type MinIOFile, type UploadProgress } from '$lib/services/minio-service';
  
  interface Props {
    autoUpload?: boolean;
    maxFiles?: number;
    maxFileSize?: number;
    acceptedTypes?: string[];
    caseId?: string;
    priority?: number;
    processingOptions?: {
      extractText?: boolean;
      generateEmbeddings?: boolean;
      performAnalysis?: boolean;
      cacheResults?: boolean;
    };
  }
  
  let {
    autoUpload = true,
    maxFiles = 10,
    maxFileSize = 50 * 1024 * 1024, // 50MB
    acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'],
    caseId,
    priority = 128,
    processingOptions = {
      extractText: true,
      generateEmbeddings: true,
      performAnalysis: true,
      cacheResults: true
    }
  }: Props = $props();
  
  const dispatch = createEventDispatcher<{
    'files-selected': { files: FileList };
    'upload-start': { files: File[] };
    'upload-progress': { progress: UploadProgress };
    'upload-complete': { file: MinIOFile };
    'upload-error': { error: string; file?: File };
    'all-uploads-complete': { files: MinIOFile[] };
  }>();
  
  // State
  let isUploading = $state(false);
  let uploadQueue: File[] = $state([]);
  let completedUploads: MinIOFile[] = $state([]);
  let uploadProgress = $state(new Map<string, UploadProgress>());
  let currentUploads = $state(new Set<string>());
  
  // File input reference (headless)
  let fileInput: HTMLInputElement;
  
  /**
   * Programmatically trigger file selection
   */
  export function selectFiles(): void {
    fileInput?.click();
  }
  
  /**
   * Upload files programmatically
   */
  export async function uploadFiles(files: FileList | File[]): Promise<MinIOFile[]> {
    const fileArray = Array.from(files);
    return await processFileUploads(fileArray);
  }
  
  /**
   * Get current upload statistics
   */
  export function getUploadStats(): {
    isUploading: boolean;
    queueLength: number;
    completedCount: number;
    progressMap: Map<string, UploadProgress>;
  } {
    return {
      isUploading,
      queueLength: uploadQueue.length,
      completedCount: completedUploads.length,
      progressMap: uploadProgress
    };
  }
  
  /**
   * Clear completed uploads and reset state
   */
  export function clearUploads(): void {
    completedUploads = [];
    uploadProgress.clear();
    uploadQueue = [];
    currentUploads.clear();
    isUploading = false;
  }
  
  // Handle file selection
  async function handleFileSelection(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    
    if (!files || files.length === 0) return;
    
    // Validate files
    const validFiles = await validateFiles(files);
    
    if (validFiles.length === 0) {
      dispatch('upload-error', { error: 'No valid files selected' });
      return;
    }
    
    dispatch('files-selected', { files });
    
    if (autoUpload) {
      await processFileUploads(validFiles);
    } else {
      uploadQueue = [...uploadQueue, ...validFiles];
    }
  }
  
  // Validate selected files
  async function validateFiles(files: FileList): Promise<File[]> {
    const validFiles: File[] = [];
    
    for (const file of Array.from(files)) {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        dispatch('upload-error', { 
          error: `File type ${file.type} not accepted`, 
          file 
        });
        continue;
      }
      
      // Check file size
      if (file.size > maxFileSize) {
        dispatch('upload-error', { 
          error: `File size ${file.size} exceeds maximum ${maxFileSize}`, 
          file 
        });
        continue;
      }
      
      validFiles.push(file);
    }
    
    // Check max files limit
    if (validFiles.length > maxFiles) {
      dispatch('upload-error', { 
        error: `Too many files selected. Maximum is ${maxFiles}` 
      });
      return validFiles.slice(0, maxFiles);
    }
    
    return validFiles;
  }
  
  // Process file uploads
  async function processFileUploads(files: File[]): Promise<MinIOFile[]> {
    if (isUploading) {
      throw new Error('Upload already in progress');
    }
    
    isUploading = true;
    const results: MinIOFile[] = [];
    
    try {
      dispatch('upload-start', { files });
      
      // Process files sequentially to avoid overwhelming the server
      for (const file of files) {
        const uploadId = `${file.name}_${Date.now()}`;
        currentUploads.add(uploadId);
        
        try {
          // Subscribe to progress updates
          const unsubscribe = subscribeToProgress(uploadId);
          
          // Upload file
          const result = await minioService.uploadDocuments([file], {
            autoProcess: true,
            priority,
            caseId,
            documentType: detectDocumentType(file)
          });
          
          const uploadedFile = result[0];
          results.push(uploadedFile);
          completedUploads.push(uploadedFile);
          
          dispatch('upload-complete', { file: uploadedFile });
          
          unsubscribe();
          
        } catch (error) {
          dispatch('upload-error', { 
            error: error instanceof Error ? error.message : 'Upload failed', 
            file 
          });
        } finally {
          currentUploads.delete(uploadId);
        }
      }
      
      dispatch('all-uploads-complete', { files: results });
      return results;
      
    } finally {
      isUploading = false;
    }
  }
  
  // Subscribe to upload progress for a specific upload
  function subscribeToProgress(uploadId: string): () => void {
    const handleProgress = (progress: UploadProgress) => {
      uploadProgress.set(uploadId, progress);
      dispatch('upload-progress', { progress });
    };
    
    minioService.onUploadProgress(uploadId, handleProgress);
    
    return () => {
      minioService.offUploadProgress(uploadId);
      uploadProgress.delete(uploadId);
    };
  }
  
  // Detect document type from file
  function detectDocumentType(file: File): string {
    const name = file.name.toLowerCase();
    
    if (name.includes('contract') || name.includes('agreement')) return 'contract';
    if (name.includes('evidence') || name.includes('exhibit')) return 'evidence';
    if (name.includes('brief') || name.includes('motion')) return 'brief';
    if (name.includes('citation') || name.includes('cite')) return 'citation';
    if (name.includes('precedent') || name.includes('case')) return 'precedent';
    
    // Default based on file type
    if (file.type === 'application/pdf') return 'brief';
    if (file.type.startsWith('image/')) return 'evidence';
    
    return 'brief';
  }
</script>

<!-- Headless file input (hidden) -->
<input
  bind:this={fileInput}
  type="file"
  multiple={maxFiles > 1}
  accept={acceptedTypes.join(',')}
  style="display: none;"
  onchange={handleFileSelection}
/>

<!-- Slot for custom UI -->
<slot 
  {selectFiles}
  {uploadFiles}
  {getUploadStats}
  {clearUploads}
  {isUploading}
  {uploadQueue}
  {completedUploads}
  {uploadProgress}
/>