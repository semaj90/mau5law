<script lang="ts">
  import type { superForm } from 'sveltekit-superforms/client';
  // evidenceUploadSchema only exports validateFileSize and getFileTypeFromMime
  import type { getFileTypeFromMime, validateFileSize } from '$lib/schemas/evidence-upload.js';

  import type { PageData } from './$types.js';
  const { data }: { data: PageData } = $props();

  // Initialize Superform with a safe fallback when the server didn't include a form
  const serverForm = (data as any)?.form ?? {};
  const { form, errors } = superForm(serverForm, {
    resetForm: false,
    invalidateAll: true,
    onError: ({ result }) => {
      const notice = document.createElement('div');
      notice.innerHTML = '⚠️ failure default to mock - Upload service temporarily unavailable';
      notice.style.cssText =
        'position: fixed; top: 20px; right: 20px; background: rgba(220, 53, 69, 0.9); color: white; padding: 0.5rem 1rem; border-radius: 4px; z-index: 10000; font-size: 0.9rem;';
      document.body.appendChild(notice);
      setTimeout(() => notice.remove(), 5000);
      console.log('Upload failed, using mock fallback:', result);
    },
  });

  // File upload state
  let selectedFile = $state <File | null>(null);
  let filePreview = $state <string | null>(null);
  let dragOver = $state <boolean>(false);
  let metadata = $state <any>(null);

  // Helper: validate file type (local shim using getFileTypeFromMime)
  function validateFileType(file: File, evidenceType: string | undefined): boolean {
    // If evidenceType is not provided, allow known mime types
    const detected = getFileTypeFromMime(file.type, evidenceType);
    // Basic rule: reject UNKNOWN
    return detected !== 'UNKNOWN';
  }

  // Helper: generate metadata from file (local stub with useful info)
  async function generateMetadataFromFile(file: File, evidenceType: string | undefined) {
    // Images: return dimensions + basic info
    if (file.type.startsWith('image/')) {
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            name: file.name,
            size: file.size,
            mimeType: file.type,
            width: img.width,
            height: img.height,
            detectedType: getFileTypeFromMime(file.type, evidenceType),
          });
        };
        img.onerror = () =>
          resolve({
            name: file.name,
            size: file.size,
            mimeType: file.type,
            detectedType: getFileTypeFromMime(file.type, evidenceType),
          });
        img.src = URL.createObjectURL(file);
      });
    }

    // Text-like files: provide a short preview
    if (file.type.startsWith('text/') || file.type === 'application/json') {
      const text = await file.text();
      return {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        preview: text.slice(0, 500),
        detectedType: getFileTypeFromMime(file.type, evidenceType),
      };
    }

    // Fallback metadata
    return {
      name: file.name,
      size: file.size,
      mimeType: file.type,
      detectedType: getFileTypeFromMime(file.type, evidenceType),
    };
  }

  // Handle file selection
  async function handleFileSelect(file: File): Promise<any> {
    selectedFile = file;
    // Validate file size (100MB limit)
    if (!validateFileSize(file, 100 * 1024 * 1024)) {
      $errors .file = ['File size exceeds 100MB limit'];
      selectedFile = null;
      return;
    }

    // Auto-detect evidence type from file
    const detectedType = getFileTypeFromMime(file.type, $form .evidence_type);
    if (detectedType !== 'UNKNOWN') {
      $form .evidence_type = detectedType as any;
    }

    // Validate file type against evidence type (uses local shim)
    if (!validateFileType(file, $form .evidence_type)) {
      $errors .file = [`File type ${file.type} not supported for ${$form .evidence_type} evidence`];
      selectedFile = null;
      return;
    }

    // Generate file preview for images
    if (file.type.startsWith('image/')) {
      filePreview = URL.createObjectURL(file);
    } else {
      filePreview = null;
    }

    // Generate metadata preview with fallback
    try {
      metadata = await generateMetadataFromFile(file, $form .evidence_type);
    } catch (error) {
      console.warn('Failed to generate metadata preview:', error);
      metadata = {
        mockData: true,
        error: 'failure default to mock',
        fallbackMetadata: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          detectedType: $form .evidence_type,
          estimatedProcessingTime: '2-5 minutes',
          suggestedTags: ['document', 'evidence'],
          confidenceLevel: 'medium',
        },
      };
    }

    // Clear unknown file errors
    if ($errors .file) {
      delete $errors .file;
      $errors = $errors ;
    }
  }

  // File input change handler
  function onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  // Drag and drop handlers
  function onDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }
  function onDragLeave(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
  }
  function onDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  // Evidence type change handler
  function onEvidenceTypeChange() {
    if (selectedFile) {
      if (!validateFileType(selectedFile, $form .evidence_type)) {
        $errors .file = [
          `File type ${selectedFile.type} not supported for ${$form .evidence_type} evidence`,
        ];
      } else if ($errors .file) {
        delete $errors .file;
        $errors = $errors ;
      }
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<main class="page-repair" ondragover={onDragOver} ondragleave={onDragLeave} ondrop={onDrop}>
  <h1>Upload evidence</h1>

  <!-- Minimal dropzone / input that wires the handlers and prevents "declared but never used" warnings -->
  <div
    class="dropzone border-2 border-dashed border-gray-300 p-4 rounded-lg mb-4"
  >
    <p class="mb-2">Drop a file here or choose a file</p>
    <label class="cursor-pointer text-accent">
      <input type="file" class="hidden" onchange={onFileChange} />
      Choose file…
    </label>
    <div class="mt-2">
      <label
        >Evidence type:
        <select bind:value={$form .evidence_type} onchange={onEvidenceTypeChange}>
          <option value="DOCUMENT">Document</option>
          <option value="IMAGE">Image</option>
          <option value="AUDIO">Audio</option>
          <option value="VIDEO">Video</option>
          <option value="OTHER">Other</option>
        </select>
      </label>
    </div>
  </div>

  {#if filePreview}
    <div class="mb-4">
      <img
        src={filePreview}
        alt="preview"
        class="max-w-full h-auto rounded"
      />
    </div>
  {/if}

  {#if selectedFile}
    <div class="mb-4">
      <strong>{selectedFile.name}</strong> — {formatFileSize(selectedFile.size)}
    </div>
  {/if}

  <div>
    <h3>Metadata preview</h3>
    <pre
      class="bg-gray-100 p-2 rounded max-h-60 overflow-auto">{JSON.stringify(
        metadata,
        null,
        2
      )}</pre>
  </div>
</main>

<style>
  .page-repair {
    padding: 2rem;
    font-family: sans-serif;
  }
</style>
