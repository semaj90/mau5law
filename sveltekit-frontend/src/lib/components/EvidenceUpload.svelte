<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  const { caseId: string, onUploadComplete: ((artifactUrl: string) = > void) | undefined = undefined, onError: ((error: string) = > void) | undefined = undefined, allowedTypes: string[] = ['image/png', 'image/jpeg', 'application/pdf'], maxFileSize: number = 50 * 1024 * 1024 } = $props();

  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import {
    evidenceService,
    currentState,
    isProcessing,
    processingProgress,
    processEvidence,
    retryProcessing,
    resetProcessor,
    type EvidenceUploadProps
  } from '$lib/stores/evidence-workflow';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import { Progress } from '$lib/components/ui/progress';
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { Badge } from '$lib/components/ui/badge';
  import { Upload, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-svelte';

  // Props
  
  
  
  
   // 50MB

  // Component state
  let fileInput: HTMLInputElement;
  let dragover = false;
  let selectedFile: File | null = null;
  let evidenceId = '';
  let processingStartTime: Date;

  // Reactive state from xState machine
  // TODO: Convert to $derived: state = $currentState
  // TODO: Convert to $derived: processing = $isProcessing
  // TODO: Convert to $derived: progress = $processingProgress
  // TODO: Convert to $derived: error = state.context.error
  // TODO: Convert to $derived: processingSteps = state.context.processingSteps
  // TODO: Convert to $derived: completed = state.matches('completed')
  // TODO: Convert to $derived: artifactUrl = state.context.artifactUrl

  // Watch for state changes
  // TODO: Convert to $derived: if (completed && artifactUrl && onUploadComplete) {
    onUploadComplete(artifactUrl)
  }

  // TODO: Convert to $derived: if (error && onError) {
    onError(error)
  }

  // File handling
  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragover = false;

    const file = event.dataTransfer?.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Type validation
    if (!allowedTypes.includes(file.type)) {
      const error = `File type not allowed. Supported: ${allowedTypes.join(', ')}`;
      if (onError) onError(error);
      return;
    }

    // Size validation
    if (file.size > maxFileSize) {
      const error = `File too large. Maximum size: ${formatFileSize(maxFileSize)}`;
      if (onError) onError(error);
      return;
    }

    selectedFile = file;
    evidenceId = `${caseId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const startProcessing = () => {
    if (selectedFile && evidenceId && caseId) {
      processingStartTime = new Date();
      processEvidence(selectedFile, evidenceId, caseId);
    }
  };

  const handleRetry = () => {
    retryProcessing();
  };

  const handleReset = () => {
    resetProcessor();
    selectedFile = null;
    evidenceId = '';
    if (fileInput) fileInput.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'validating': return AlertCircle;
      case 'analyzing': return FileText;
      case 'embedding': return Upload;
      case 'uploading': return Upload;
      case 'completed': return CheckCircle;
      case 'error': return XCircle;
      default: return Upload;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'validating':
      case 'analyzing':
      case 'embedding':
      case 'uploading': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  onMount(() => {
    // Cleanup on component destroy
    return () => {
      if (evidenceService) {
        evidenceService.stop();
      }
    };
  });
</script>

<div class="evidence-upload-container p-6 border rounded-lg bg-white shadow-sm">
  <h2 class="text-2xl font-semibold mb-6 text-gray-900">Evidence Upload & Processing</h2>

  <!-- File Drop Zone -->
  {#if !selectedFile && !processing}
    <div
      class="drop-zone border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200"
      class:border-blue-500={dragover}
      class:bg-blue-50={dragover}
      class:border-gray-300={!dragover}
      on:dragover|preventDefault={() => dragover = true}
      on:dragleave={() => dragover = false}
      on:drop={handleDrop}
      role="button"
      tabindex="0"
    >
      <Upload class="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p class="text-lg mb-2 text-gray-600">Drop evidence file here or click to browse</p>
      <p class="text-sm text-gray-500 mb-4">
        Supported formats: {allowedTypes.join(', ')} (max {formatFileSize(maxFileSize)})
      </p>

      <input
        bind:this={fileInput}
        type="file"
        accept={allowedTypes.join(',')}
        onchange={handleFileSelect}
        class="hidden"
      />

      <Button 
        class="bits-btn mt-2"
        variant="outline"
        onclick={() => fileInput?.click()}
      >
        Select File
      </Button>
    </div>
  {/if}

  <!-- Selected File Info -->
  {#if selectedFile && !processing && !completed}
    <div class="file-info bg-gray-50 p-4 rounded-lg mb-6" transition:fade>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-gray-900">{selectedFile.name}</p>
          <p class="text-sm text-gray-600">
            {formatFileSize(selectedFile.size)} • {selectedFile.type}
          </p>
          <p class="text-sm text-blue-600 mt-1">Evidence ID: {evidenceId}</p>
        </div>
        <div class="flex gap-2">
          <Button class="bits-btn" variant="outline" size="sm" onclick={handleReset}>
            Change File
          </Button>
          <Button onclick={startProcessing} class="bg-blue-600 hover:bg-blue-700 bits-btn">
            Process Evidence
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Processing Status -->
  {#if processing}
    <div class="processing-status" transition:fly={{ y: 20 }}>
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-medium text-gray-900">Processing Evidence</h3>
          <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{#if state.value === 'validating'}
              Validating
            {:else if state.value === 'analyzing'}
              AI Analysis
            {:else if state.value === 'embedding'}
              Embedding Metadata
            {:else if state.value === 'uploading'}
              Uploading & Indexing
            {/if}</span>
        </div>
        <Progress value={progress} class="w-full" />
        <p class="text-sm text-gray-600 mt-1">{progress}% complete</p>
      </div>

      <!-- Processing Steps -->
      <div class="steps-list space-y-2">
        {#each processingSteps as step, index}
          <div
            class="flex items-center gap-2 text-sm text-green-600"
            transition:fly={{ x: -20, delay: index * 100 }}
          >
            <CheckCircle class="w-4 h-4" />
            {step}
          </div>
        {/each}
      </div>

      {#if processingStartTime}
        <p class="text-xs text-gray-500 mt-4">
          Processing time: {((Date.now() - processingStartTime.getTime()) / 1000).toFixed(1)}s
        </p>
      {/if}
    </div>
  {/if}

  <!-- Completion Status -->
  {#if completed}
    <div class="completion-status bg-green-50 p-4 rounded-lg" transition:fade>
      <div class="flex items-center gap-3 mb-3">
        <CheckCircle class="w-6 h-6 text-green-600" />
        <div>
          <h3 class="font-medium text-green-900">Evidence Processing Complete</h3>
          <p class="text-sm text-green-700">
            Legal AI metadata embedded and artifact indexed successfully
          </p>
        </div>
      </div>

      {#if artifactUrl}
        <div class="flex gap-2 mt-4">
          <Button class="bits-btn"
            variant="outline"
            size="sm"
            onclick={() => window.open(artifactUrl, '_blank')}
          >
            Download Artifact
          </Button>
          <Button class="bits-btn" variant="outline" size="sm" onclick={handleReset}>
            Process Another
          </Button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Error Status -->
  {#if error}
    <Alert variant="destructive" class="mt-4">
      <XCircle class="w-4 h-4" />
      <AlertDescription>
        <div class="mb-2">{error}</div>
        <div class="flex gap-2">
          <Button class="bits-btn" variant="outline" size="sm" onclick={handleRetry}>
            Retry
          </Button>
          <Button class="bits-btn" variant="outline" size="sm" onclick={handleReset}>
            Reset
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  {/if}
</div>

<style>
  .drop-zone {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .drop-zone:hover {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }

  .processing-status {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    background-color: #f9fafb;
  }

  .completion-status {
    animation: slideInUp 0.3s ease-out;
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

