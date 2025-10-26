<!--
  Evidence Upload Page - cleaned minimal version
  Purpose: restore a valid Svelte component for the upload page so the dev server can parse and render.
-->

<script lang="ts">
  import { get } from 'svelte/store';
  import { superForm } from 'sveltekit-superforms/client';
  import { zod } from 'sveltekit-superforms/adapters';
  import {
    evidenceUploadSchema,
    validateFileSize,
    validateFileType,
    generateMetadataFromFile,
    type EvidenceMetadata,
  } from '$lib/schemas/evidence-upload';
  import type { PageData } from './$types.js';

  import 'nes.css/css/nes.min.css';
  import 'uno.css';
  // bits-ui package sometimes misses the dist CSS file in some installs.
  // Use a local shim to avoid build-time specifier errors while preserving layout.
  import '$lib/styles/enhanced-bits-ui.css';

  import { onMount, onDestroy } from 'svelte';

  let { data }: { data: PageData } = $props();

  const { form, errors, enhance, submitting, message } = superForm(data.form, {
    validators: zod(evidenceUploadSchema),
    resetForm: false,
  });

  // Svelte 5 reactive state wrappers so updates correctly trigger reactivity
  let selectedFile = $state<File | null>(null);
  let filePreview = $state<string | null>(null);
  let dragOver = $state<boolean>(false);
  let metadata = $state<EvidenceMetadata | null>(null);

  function updateFileError(msg: string | null) {
    errors.update(errs => {
      if (msg) (errs as any).file = [msg];
      else delete (errs as any).file;
      return errs;
    });
  }

  async function handleFileSelect(file: File) {
    // revoke previous preview if present
    if (filePreview) {
      try {
        URL.revokeObjectURL(filePreview);
      } catch {
        /* ignore */
      }
    }
    selectedFile = file;
    if (!validateFileSize(file)) {
      updateFileError('File size exceeds allowed limit');
      selectedFile = null;
      return;
    }
    const currentEvidenceType = (get(form) as any)?.evidence_type ?? 'UNKNOWN';
    if (!validateFileType(file, currentEvidenceType)) {
      updateFileError(`File type ${file.type} not supported for ${currentEvidenceType}`);
      selectedFile = null;
      return;
    }
    filePreview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    try {
      metadata = await generateMetadataFromFile(file, currentEvidenceType);
    } catch {
      metadata = null;
    }
    updateFileError(null);
  }

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file) handleFileSelect(file);
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 B';
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  }

  // Additional helpers referenced in the cleaned template
  function onEvidenceTypeChange() {
    // reset selected file / metadata when type changes (auto-detect behavior)
    selectedFile = null;
    filePreview = null;
    metadata = null;
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }
  function onDragLeave() {
    dragOver = false;
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  }

  // Revoke preview when user removes file or component is destroyed
  onDestroy(() => {
    if (filePreview) {
      try {
        URL.revokeObjectURL(filePreview);
      } catch {}
      filePreview = null;
    }
  });

  function hasError(field: string) {
    const e = get(errors) as any;
    return !!(e && e[field] && e[field].length);
  }
  function getError(field: string) {
    const e = get(errors) as any;
    return e && e[field] && e[field][0];
  }
</script>

<svelte:head>
  <title>Upload Evidence - Legal AI Platform</title>
</svelte:head>

<div class="nes-container with-title is-centered" style="margin: 20px;">
  <p class="title">Legal AI Evidence Upload</p>

  {#if $message}
    <div class={`nes-container ${$message.type === 'success' ? 'is-success' : 'is-error'}`} style="margin: 10px 0;">
      <p>{$message.text}</p>
    </div>
  {/if}

  <form method="POST" action="?/upload" enctype="multipart/form-data" use:enhance>
    <div class="nes-field" style="margin: 15px 0;">
      <label for="case_id">⚖️ Select Case *</label>
      <div class="nes-select">
        <select id="case_id" name="case_id" required disabled={$submitting} bind:value={$form.case_id}>
          <option value="">Choose a case...</option>
          {#each data.cases as caseItem}
            <option value={caseItem.id}>
              {caseItem.case_number ? `${caseItem.case_number}: ` : ''}{caseItem.title}{caseItem.status !== 'active'
                ? ` (${caseItem.status})`
                : ''}
            </option>
          {/each}
        </select>
      </div>
      {#if hasError('case_id')}
        <p class="nes-text is-error">{getError('case_id')}</p>
      {/if}
    </div>

    <div class="nes-field" style="margin: 15px 0;">
      <label for="title">📝 Evidence Title *</label>
      <input id="title" name="title" type="text" required disabled={$submitting} bind:value={$form.title} />
      {#if hasError('title')}
        <p class="nes-text is-error">{getError('title')}</p>
      {/if}
    </div>

    <div class="nes-field" style="margin: 15px 0;">
      <label for="description">📄 Description</label>
      <textarea
        id="description"
        name="description"
        rows="3"
        class="nes-textarea"
        disabled={$submitting}
        bind:value={$form.description}
        placeholder="Brief description of the evidence..."
      ></textarea>
    </div>

    <div class="nes-field" style="margin: 15px 0;">
      <label for="evidence_type">🗂️ Evidence Type</label>
      <div class="nes-select">
        <select
          id="evidence_type"
          name="evidence_type"
          disabled={$submitting}
          bind:value={$form.evidence_type}
          onchange={onEvidenceTypeChange}
        >
          <option value="UNKNOWN">🔍 Auto-detect from file</option>
          <option value="PDF">📄 PDF Document</option>
          <option value="IMAGE">🖼️ Image/Photo</option>
          <option value="VIDEO">🎥 Video Recording</option>
          <option value="AUDIO">🎵 Audio Recording</option>
          <option value="TEXT">📝 Text Document</option>
          <option value="LINK">🔗 Web Link/URL</option>
        </select>
      </div>
      {#if hasError('evidence_type')}
        <p class="nes-text is-error">{getError('evidence_type')}</p>
      {/if}
    </div>

    {#if $form.evidence_type !== 'LINK'}
      <div class="nes-field" style="margin: 15px 0;">
        <label for="file">📎 File Upload <span aria-hidden="true" style="color: #dc3545;">*</span></label>

        <div
          class={`nes-container ${dragOver ? 'is-success' : ''} ${hasError('file') ? 'is-error' : ''}`}
          style="padding: 30px; text-align: center; cursor: pointer;"
          ondragover={onDragOver}
          ondragleave={onDragLeave}
          ondrop={onDrop}
          role="region"
          aria-label="Drop zone"
          title="Drop a file here or click to browse"
        >
          {#if selectedFile}
            <div class="space-y-4">
              {#if filePreview}
                <img src={filePreview} alt="Preview" style="max-width: 240px; border-radius: 6px;" />
              {:else}
                <div
                  style="width:64px;height:64px;margin:0 auto;background:#f3f3f3;border-radius:8px;display:flex;align-items:center;justify-content:center;"
                >
                  <svg
                    style="width:28px;height:28px;color:#9ca3af"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M9 12h6M9 16h6M7 21h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-5l-4-4H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2z"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              {/if}
              <div>
                <p style="font-weight: 600;margin:0">{selectedFile.name}</p>
                <p style="color:#6b7280;margin:0;font-size:0.9rem;">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
              <button
                type="button"
                onclick={() => {
                  selectedFile = null;
                  filePreview = null;
                  metadata = null;
                }}
                class="nes-btn is-error"
                title="Remove uploaded file">Remove file</button
              >
            </div>
          {:else}
            <div class="space-y-4">
              <svg class="mx-auto" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor">
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <p class="text-gray-600">
                Drag and drop your file here, or <label for="file" style="color:#00a0ff;cursor:pointer"
                  >click to browse<input
                    id="file"
                    name="file"
                    type="file"
                    class="sr-only"
                    onchange={onFileChange}
                    disabled={$submitting}
                  /></label
                >
              </p>
              <p style="font-size:0.85rem;color:#6b7280;margin:0;">Maximum file size: 100MB</p>
            </div>
          {/if}
        </div>

        {#if hasError('file')}
          <p class="mt-1 text-sm" style="color:#dc3545;">{getError('file')}</p>
        {/if}
      </div>
    {:else}
      <div class="nes-field" style="margin: 15px 0;">
        <label for="link_url">URL *</label>
        <input
          id="link_url"
          name="link_url"
          type="url"
          required
          disabled={$submitting}
          bind:value={$form.link_url}
          placeholder="https://example.com/document"
        />
        {#if hasError('link_url')}
          <p class="mt-1" style="color:#dc3545;">{getError('link_url')}</p>
        {/if}
      </div>
    {/if}

    <!-- Minimal enhanced fields -->
    <div style="margin: 15px 0;">
      <label for="tags">Tags (comma-separated)</label>
      <input
        id="tags"
        name="tags"
        type="text"
        disabled={$submitting}
        bind:value={$form.tags}
        placeholder="e.g., contract, confidential"
      />
    </div>

    {#if metadata}
      <div style="background:#f9fafb;border-radius:8px;padding:12px;margin:12px 0;">
        <h4 style="margin:0 0 8px 0;">Detected Metadata</h4>
        <pre style="white-space:pre-wrap;margin:0;font-size:0.85rem">{JSON.stringify(metadata, null, 2)}</pre>
      </div>
    {/if}

    <div style="text-align: center; margin: 20px 0;">
      <button type="button" onclick={() => history.back()} disabled={$submitting} class="nes-btn">← Cancel</button>
      <button
        type="submit"
        disabled={$submitting || ($form.evidence_type !== 'LINK' && !selectedFile) || !$form.case_id || !$form.title}
        class="nes-btn is-success"
        style="margin-left: 10px;"
      >
        {#if $submitting}Uploading...{:else}Upload{/if}
      </button>
    </div>
  </form>
</div>

