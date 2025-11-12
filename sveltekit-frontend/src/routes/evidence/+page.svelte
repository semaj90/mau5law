<script lang="ts">
  import EvidenceCanvas from '$lib/ui/EvidenceCanvas.svelte'; // Corrected import path
  import { TriangleAlert as AlertTriangle, Check, FileText, Loader, Sparkles, Upload, Zap } from 'lucide-svelte';
  import { onMount } from 'svelte';

  // Page data from server
  let { data }: { data: any } = $props();
  let evidence = $derived(data?.evidence || []);
  let caseId = $derived(data?.caseId || null);

  // State management with Svelte 5 runes
  let uploadFile = $state<File | null>(null);
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let uploadResult = $state<any | null>(null);
  let uploadError = $state<string | null>(null);
  let selectedEvidenceId = $state<string | null>(evidence && evidence.length > 0 ? evidence[0].id : null);
  let recommendationsLoading = $state(false);
  let recommendationsError = $state<string | null>(null);
  let recommendations = $state<any[]>([]);
  let aiTaggingActive = $state(false);
  let taggedEvidenceIds = $state<string[]>([]);

  // Form data
  let formData = $state({
    title: '',
    description: '',
    evidenceType: 'document',
    tags: '',
    isAdmissible: true
  });

  // Derived state
  let canSubmit = $derived(uploadFile !== null && formData.title.length > 0 && !isUploading);
  let fileSize = $derived(uploadFile ? formatFileSize(uploadFile.size) : null);

  // Load evidence on mount
  onMount(async () => {
    if (evidence.length === 0) {
      await loadEvidence();
    }
  });

  async function loadEvidence() {
    try {
      const res = await fetch('/api/v1/evidence');
      const result = await res.json();
      if (result.success) {
        evidence = result.data || [];
        // If evidence is loaded and selectedEvidenceId is null, set the first one
        if (evidence.length > 0 && selectedEvidenceId === null) {
          selectedEvidenceId = evidence[0].id;
        }
      }
    } catch (err) {
      console.error('Failed to load evidence:', err);
    }
  }

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      uploadFile = target.files[0];
      // Auto-populate title if empty
      if (!formData.title) {
        formData.title = target.files[0].name.replace(/\.[^/.]+$/, '');
      }
      // Auto-detect type
      const mime = target.files[0].type;
      if (mime.startsWith('image/')) formData.evidenceType = 'image';
      else if (mime.startsWith('video/')) formData.evidenceType = 'video';
      else if (mime.startsWith('audio/')) formData.evidenceType = 'audio';
      else if (mime === 'application/pdf') formData.evidenceType = 'document';

      console.log(`🕵️ Selected: ${target.files[0].name}`);
    }
  }

  async function submitEvidence() {
    if (!uploadFile) return;

    isUploading = true;
    uploadProgress = 0;
    uploadError = null;
    uploadResult = null;

    try {
      const data = new FormData();
      data.append('file', uploadFile);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('caseId', caseId || '');
      data.append('evidenceType', formData.evidenceType);
      data.append('tags', formData.tags);
      data.append('isAdmissible', formData.isAdmissible.toString());

      uploadProgress = 25;
      console.log('🚀 Uploading to MinIO...');

      const response = await fetch('/api/evidence/upload', {
        method: 'POST',
        body: data
      });

      uploadProgress = 75;
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      uploadProgress = 100;

      if (result.success) {
        uploadResult = result.data;
        console.log('✅ Evidence uploaded and indexed!');
        if (result.data.aiSummary) console.log('🧠 AI Summary generated');
        if (result.data.hasEmbedding) console.log('🎯 Vector embedding created');

        // Refresh the page data
        await loadEvidence();
        resetForm();
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      uploadError = err.message || 'Unknown error';
      console.error(`❌ Upload failed: ${uploadError}`);
    } finally {
      isUploading = false;
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function resetForm() {
    uploadFile = null;
    uploadResult = null;
    uploadError = null;
    uploadProgress = 0;
    formData = {
      title: '',
      description: '',
      evidenceType: 'document',
      tags: '',
      isAdmissible: true
    };
  }

  // Handle AI tagging when evidence is dropped on canvas
  async function handleTagging(e: CustomEvent<string[]>) { // Explicitly type 'e'
    const evidenceIds = e.detail;
    if (evidenceIds.length === 0) return;

    aiTaggingActive = true;
    taggedEvidenceIds = evidenceIds;

    try {
      console.log('🎮 Starting AI detective mode for evidence:', evidenceIds);

      const res = await fetch('/api/v1/evidence/detective', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId: caseId || 'general',
          query: 'auto-tag evidence for legal analysis',
          evidenceIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('🧠 AI Detective Results:', data.analysis);

        // Show success feedback
        setTimeout(() => {
          aiTaggingActive = false;
          taggedEvidenceIds = [];
        }, 2000);

        // Refresh evidence to show new tags
        await loadEvidence();
      } else {
        throw new Error('AI tagging failed');
      }
    } catch (err: any) {
      console.error('AI tagging error:', err);
      aiTaggingActive = false;
      taggedEvidenceIds = [];
    }
  }

  // Generate AI recommendations for selected evidence
  async function generateRecommendations(evidenceId: string) {
    if (!evidenceId) return;

    recommendationsLoading = true;
    recommendationsError = null;

    try {
      const response = await fetch(`/api/evidence/${evidenceId}/recommendations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to generate recommendations: ${response.statusText}`);
      }

      const data = await response.json();
      recommendations = data.recommendations || [];
    } catch (error) {
      console.error('Error generating recommendations:', error);
      recommendationsError = error instanceof Error ? error.message : 'Failed to generate recommendations';
      recommendations = [];
    } finally {
      recommendationsLoading = false;
    }
  }
</script>

<main class="nes-container is-dark with-title evidence-page">
  <h1 class="title nes-text is-primary">🕵️ Evidence Detective Board</h1>

  <div class="nes-container is-rounded evidence-grid">
    <!-- Upload Section -->
    <div class="nes-container is-dark upload-section">
      <h3 class="nes-text is-warning">📤 Upload Evidence</h3>

      <form onsubmit={(e) => { e.preventDefault(); submitEvidence(); }}>
        <div class="file-upload">
          <label for="evidence-file" class="nes-btn is-primary file-label">
            <Upload size={16} />
            Choose Evidence File
          </label>
          <input
            id="evidence-file"
            type="file"
            class="file-input"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            onchange={handleFileUpload}
            required
          />
        </div>

        {#if uploadFile}
          <div class="file-preview nes-container is-rounded">
            <span class="file-preview-icon-wrapper"> <!-- Wrapper for icon styling -->
              <FileText />
            </span>
            <div class="file-info">
              <p class="file-name nes-text">{uploadFile.name}</p>
              <p class="file-size nes-text is-disabled">{fileSize}</p>
            </div>
          </div>
        {/if}

        <div class="form-fields">
          <div class="nes-field">
            <label for="title" class="nes-text">Evidence Title</label>
            <input
              id="title"
              type="text"
              class="nes-input"
              bind:value={formData.title}
              placeholder="Enter evidence title"
              required
            />
          </div>

          <div class="nes-field">
            <label for="description" class="nes-text">Description</label>
            <textarea
              id="description"
              class="nes-textarea"
              bind:value={formData.description}
              placeholder="Describe the evidence"
              rows="3"
            ></textarea>
          </div>

          <div class="nes-field">
            <label for="evidenceType" class="nes-text">Type</label>
            <div class="nes-select">
              <select id="evidenceType" bind:value={formData.evidenceType}>
                <option value="document">📄 Document</option>
                <option value="image">🖼️ Image</option>
                <option value="video">🎥 Video</option>
                <option value="audio">🎵 Audio</option>
              </select>
            </div>
          </div>

          <div class="nes-field">
            <label for="tags" class="nes-text">Tags</label>
            <input
              id="tags"
              type="text"
              class="nes-input"
              bind:value={formData.tags}
              placeholder="Comma-separated tags"
            />
          </div>

          <label class="nes-checkbox">
            <input type="checkbox" bind:checked={formData.isAdmissible} />
            <span class="nes-text">Mark as admissible</span>
          </label>
        </div>

        {#if isUploading}
          <div class="upload-progress">
            <div class="progress-info nes-text is-primary">
              <span class="loader-spin-icon-wrapper"> <!-- Wrapper for icon styling -->
                <Loader />
              </span>
              Uploading... {uploadProgress}%
            </div>
            <progress class="nes-progress is-primary" value={uploadProgress} max="100"></progress>
          </div>
        {/if}

        <div class="button-group">
          <button type="submit" class="nes-btn is-primary" disabled={!canSubmit || isUploading}>
            {#if isUploading}
              <span class="loader-spin-icon-wrapper"> <!-- Wrapper for icon styling -->
                <Loader />
              </span>
              Uploading...
            {:else}
              <Upload size={16} />
              Upload Evidence
            {/if}
          </button>
          <button type="button" class="nes-btn" onclick={resetForm}>
            Reset
          </button>
        </div>
      </form>
    </div>

    <!-- Canvas Section -->
    <div class="nes-container is-dark canvas-section">
      <div class="canvas-header">
        <h3 class="nes-text is-success">🎨 Evidence Canvas</h3>
        {#if aiTaggingActive}
          <div class="ai-status nes-text is-warning">
            <Zap size={16} />
            AI Detective Mode Active
          </div>
        {/if}
      </div>

      <div class="canvas-instructions nes-text is-disabled">
        🖱️ Drag evidence cards onto the canvas to trigger AI auto-tagging
      </div>

      <EvidenceCanvas
        {evidence}
        {taggedEvidenceIds}
        on:tagged={(e) => handleTagging(e)}
        on:select={(e) => {
          selectedEvidenceId = e.detail;
          generateRecommendations(e.detail);
        }} <!-- Add on:select handler -->
      />
    </div>

    <!-- Results Section -->
    <div class="nes-container is-dark results-section">
      <h3 class="nes-text is-error">📊 Results</h3>

      {#if uploadResult}
        <div class="result-success nes-container is-rounded">
          <div class="result-header">
            <span class="result-success-icon-wrapper"> <!-- Wrapper for icon styling -->
              <Check />
            </span>
            <div>
              <h4 class="nes-text is-success">Evidence Uploaded!</h4>
              <p class="result-id nes-text is-disabled">ID: {uploadResult.id}</p>
            </div>
          </div>

          <div class="processing-steps">
            <div class="step">
              {#if uploadResult.hasEmbedding}
                <span class="processing-step-icon-wrapper"> <!-- Wrapper for icon styling -->
                  <Check />
                </span>
              {:else}
                <span class="processing-step-skip-icon-wrapper"> <!-- Wrapper for icon styling -->
                  <AlertTriangle />
                </span>
              {/if}
              <span class="nes-text">Vector Embedding</span>
            </div>
            <div class="step">
              {#if uploadResult.aiSummary}
                <span class="processing-step-icon-wrapper"> <!-- Wrapper for icon styling -->
                  <Check />
                </span>
              {:else}
                <span class="processing-step-skip-icon-wrapper"> <!-- Wrapper for icon styling -->
                  <AlertTriangle />
                </span>
              {/if}
              <span class="nes-text">AI Summary</span>
            </div>
          </div>

          {#if uploadResult.aiSummary}
            <div class="ai-summary nes-container is-rounded">
              <div class="summary-header nes-text is-primary">
                <Sparkles size={14} />
                AI Summary
              </div>
              <p class="nes-text">{uploadResult.aiSummary}</p>
            </div>
          {/if}
        </div>
      {:else if uploadError}
        <div class="result-error nes-container is-rounded">
          <span class="result-error-icon-wrapper"> <!-- Wrapper for icon styling -->
            <AlertTriangle />
          </span>
          <h4 class="nes-text is-error">Upload Failed</h4>
          <p class="nes-text">{uploadError}</p>
        </div>
      {:else}
        <div class="result-empty nes-text is-disabled">
          <FileText size={32} />
          <p>No evidence uploaded yet</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="quick-actions">
    <a href="/cases" class="nes-btn">📋 Cases</a>
    <a href="/ai/vector-search" class="nes-btn is-primary">🔍 Vector Search</a>
    <a href="/ai/chat" class="nes-btn is-success">💬 AI Assistant</a>
    <a href="/dashboard" class="nes-btn is-warning">📊 Dashboard</a>
  </div>
</main>

<style>
  .evidence-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
    background: #101010;
    color: white;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    gap: 1.5rem;
    margin: 2rem 0;
  }

  @media (max-width: 1024px) {
    .evidence-grid {
      grid-template-columns: 1fr;
    }
  }

  .upload-section,
  .canvas-section,
  .results-section {
    background: #1a1a1a;
    border: 4px solid #333;
  }

  .file-upload {
    margin-bottom: 1rem;
  }

  .file-label {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .file-input {
    display: none;
  }

  .file-preview {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    margin: 1rem 0;
    background: #2a2a2a;
    border: 2px solid #444;
  }

  .file-preview-icon-wrapper svg { /* Target SVG inside wrapper */
    width: 32px;
    height: 32px;
    color: #92cc41;
  }

  .file-info {
    flex: 1;
  }

  .file-name {
    margin: 0;
    font-size: 0.9rem;
  }

  .file-size {
    margin: 0.25rem 0 0 0;
    font-size: 0.75rem;
  }

  .form-fields {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 1rem 0;
  }

  .upload-progress {
    margin: 1rem 0;
  }

  .progress-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .loader-spin-icon-wrapper svg { /* Target SVG inside wrapper */
    animation: spin 1s linear infinite;
    width: 16px;
    height: 16px;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .canvas-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .ai-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: pulse 1s infinite;
  }

  .canvas-instructions {
    margin-bottom: 1rem;
    font-size: 0.8rem;
  }

  .result-success,
  .result-error,
  .result-empty {
    padding: 1rem;
  }

  .result-success {
    background: #1a1a1a;
    border: 2px solid #2a2d30;
  }

  .result-header {
    display: flex;
    align-items: start;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .result-id {
    font-size: 0.7rem;
    margin: 0.25rem 0 0 0;
    font-family: monospace;
  }

  .result-success-icon-wrapper svg { /* Target SVG inside wrapper */
    width: 24px;
    height: 24px;
    color: #92cc41;
    flex-shrink: 0;
  }

  .processing-steps {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .processing-step-icon-wrapper svg { /* Target SVG inside wrapper */
    width: 16px;
    height: 16px;
    color: #92cc41;
  }

  .processing-step-skip-icon-wrapper svg { /* Target SVG inside wrapper */
    width: 16px;
    height: 16px;
    color: #666;
  }

  .ai-summary {
    background: #2a2a2a;
    padding: 0.75rem;
    margin: 1rem 0;
  }

  .summary-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .result-error {
    background: #2a1a1a;
    border: 2px solid #5a2a2a;
    text-align: center;
  }

  .result-error-icon-wrapper svg { /* Target SVG inside wrapper */
    width: 32px;
    height: 32px;
    color: #ef4444;
    margin: 0 auto 0.5rem;
  }

  .result-empty {
    text-align: center;
    padding: 2rem 1rem;
  }

  .quick-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 2rem;
  }

  .quick-actions .nes-btn {
    text-decoration: none;
  }
</style>