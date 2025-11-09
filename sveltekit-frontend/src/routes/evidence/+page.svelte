<script lang="ts">
	import SmartEvidenceRecommendations from '$lib/components/SmartEvidenceRecommendations.svelte';
	import { Check, TriangleAlert as AlertTriangle, Loader, FileText, Sparkles, Upload } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	// Assume these types are defined elsewhere or add them
	interface Recommendation { // Changed from type to interface to fix parsing error
		id: string;
		text: string;
		// Add other properties as needed based on actual recommendation structure
	}
	type UploadResult = {
		id: string;
		hasEmbedding: boolean;
		aiSummary: string;
		evidenceType: string;
		fileSize: number;
		createdAt: string;
		tags: string[];
	};
	type PageData = {
		user: any | null; // Updated to use 'any' directly (removed 'User' type alias)
		evidence: any[];
		caseId: string | null;
	};

	// Page data from server
	let { data }: { data: PageData } = $props();
	let evidence = $derived(data?.evidence || []);
	let caseId = $derived(data?.caseId || null);

	// State management
	let uploadFile = $state<File | null>(null);
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let uploadResult = $state<UploadResult | null>(null);
	let uploadError = $state<string | null>(null); // Changed type to string | null
  let selectedEvidenceId = $state<string | null>(evidence && evidence.length > 0 ? evidence[0].id : null); // Changed type to string | null
	let recommendationsLoading = $state(false);
	let recommendationsError = $state<string | null>(null); // Changed type to string | null
	let recommendations = $state<Recommendation[]>([]);

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

			console.log(`Selected: ${target.files[0].name}`);
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
			console.log('Uploading to MinIO...');

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
				console.log('Evidence uploaded and indexed!');
				if (result.data.aiSummary) console.log('AI Summary generated');
				if (result.data.hasEmbedding) console.log('Vector embedding created');

				// Refresh the page data
				window.location.reload();
			} else {
				throw new Error(result.error || 'Upload failed');
			}
		} catch (err: unknown) {
			console.error('Upload error:', err);
			uploadError = (err as Error).message || 'Unknown error';
			console.error(`Upload failed: ${uploadError}`);
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

	async function generateRecommendations(evidenceId: string) {
		recommendationsLoading = true;
		recommendationsError = null;
		selectedEvidenceId = evidenceId;

		try {
			const response = await fetch('/api/ai/evidence-recommendations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					evidenceId,
					caseId
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const result = await response.json();
			if (result.success) {
				recommendations = result.data.recommendations;
				console.log('AI recommendations generated!');
			} else {
				throw new Error(result.error || 'Failed to generate recommendations');
			}
		} catch (err: unknown) {
			console.error('Recommendations error:', err);
			recommendationsError = (err as Error).message || 'Failed to generate recommendations';
			console.error(`${recommendationsError}`);
		} finally {
			recommendationsLoading = false;
		}
	}

	function handleRecommendationEvent(event: any) {
		const { type, detail } = event;
		if (type === 'generate') {
			generateRecommendations(detail.evidenceId);
		}
	}
</script>

<main class="home-page">
  <div class="hero-section">
    <h1>🕵️ Evidence Management</h1>
    <p class="subtitle">AI-Powered Legal Evidence Analysis & Recommendations</p>
    <p class="status">Case: {caseId || 'No case selected'}</p>
  </div>

  <div class="action-grid">
    <!-- Upload Card -->
    <div class="action-card upload-card">
      <h3>📤 Upload Evidence</h3>
      <form onsubmit={(e) => { e.preventDefault(); submitEvidence(); }}>
        <input
          type="file"
          class="file-input"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          onchange={handleFileUpload}
          required
        />

        {#if uploadFile}
          <div class="file-preview">
            <FileText class="file-preview-file-icon" />
            <div class="file-info">
              <p class="file-name">{uploadFile.name}</p>
              <p class="file-size">{fileSize}</p>
            </div>
          </div>
        {/if}

        <div class="form-fields">
          <input
            type="text"
            class="form-input"
            placeholder="Evidence Title"
            bind:value={formData.title}
            required
          />

          <textarea
            class="form-textarea"
            placeholder="Description (optional)"
            bind:value={formData.description}
            rows="3"
          ></textarea>

          <select class="form-select" bind:value={formData.evidenceType}>
            <option value="document">Document</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>

          <input
            type="text"
            class="form-input"
            placeholder="Tags (comma-separated)"
            bind:value={formData.tags}
          />

          <label class="form-input">
            <input type="checkbox" bind:checked={formData.isAdmissible} />
            Mark as admissible
          </label>
        </div>

        {#if isUploading}
          <div class="upload-progress">
            <div class="progress-info">
              <Loader class="loader-spin-icon" />
              Uploading... {uploadProgress}%
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: {uploadProgress}%"></div>
            </div>
          </div>
        {/if}

        <div class="button-group">
          <button type="submit" class="upload-btn" disabled={!canSubmit || isUploading}>
            {#if isUploading}
              <Loader class="loader-spin-icon" />
              Uploading...
            {:else}
              <Upload class="icon" />
              Upload Evidence
            {/if}
          </button>
          <button type="button" class="reset-btn" onclick={resetForm}>
            Reset
          </button>
        </div>
      </form>
    </div>

    <!-- Results Card -->
    <div class="action-card results-card">
      <h3>📊 Upload Results</h3>
      {#if uploadResult}
        <div class="result-success">
          <div class="result-header">
            <Check class="result-success-icon" />
            <div>
              <h4>Evidence Uploaded Successfully</h4>
              <p class="result-id">ID: {uploadResult.id}</p>
            </div>
          </div>

          <div class="processing-steps">
            <div class="step">
              {#if uploadResult.hasEmbedding}
                <Check class="processing-step-icon" />
              {:else}
                <AlertTriangle class="processing-step-skip-icon" />
              {/if}
              Vector Embedding
            </div>
            <div class="step">
              {#if uploadResult.aiSummary}
                <Check class="processing-step-icon" />
              {:else}
                <AlertTriangle class="processing-step-skip-icon" />
              {/if}
              AI Summary
            </div>
          </div>

          {#if uploadResult.aiSummary}
            <div class="ai-summary">
              <div class="summary-header">
                <Sparkles class="ai-summary-sparkle-icon" />
                AI Summary
              </div>
              <p>{uploadResult.aiSummary}</p>
            </div>
          {/if}

          <div class="metadata">
            <div class="meta-row">
              <span>Type:</span>
              <span>{uploadResult.evidenceType}</span>
            </div>
            <div class="meta-row">
              <span>Size:</span>
              <span>{formatFileSize(uploadResult.fileSize)}</span>
            </div>
            <div class="meta-row">
              <span>Uploaded:</span>
              <span>{new Date(uploadResult.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {#if uploadResult.tags && uploadResult.tags.length > 0}
            <div class="tags">
              {#each uploadResult.tags as tag (tag)}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          {/if}
        </div>
      {:else if uploadError}
        <div class="result-error">
          <AlertTriangle class="result-error-icon" />
          <h4>Upload Failed</h4>
          <p>{uploadError}</p>
        </div>
      {:else}
        <div class="result-empty">
          <FileText class="result-empty-icon" />
          <p>No evidence uploaded yet. Use the form to upload your first piece of evidence.</p>
        </div>
      {/if}
    </div>

    <!-- Info Card -->
    <div class="action-card info-card">
      <h3>🧠 AI Tech Stack</h3>
      <div class="tech-stack">
        <div class="tech-item">
          <strong>Model:</strong> gemma3-legal:latest (6.8GB GGUF)
        </div>
        <div class="tech-item">
          <strong>Vector DB:</strong> pgvector with cosine similarity
        </div>
        <div class="tech-item">
          <strong>Storage:</strong> MinIO S3-compatible
        </div>
        <div class="tech-item">
          <strong>Processing:</strong> CUDA acceleration + embeddings
        </div>
        <div class="tech-item">
          <strong>Analysis:</strong> Pattern recognition & recommendations
        </div>
      </div>
    </div>
  </div>

  <!-- Smart Evidence Recommendations -->
  {#if evidence && evidence.length > 0}
    <SmartEvidenceRecommendations
      evidenceId={selectedEvidenceId ?? evidence[0].id}
      <!-- Changed to pass undefined if caseId is null -->
      caseId={caseId ?? undefined}
      {recommendations}
      {recommendationsLoading}
      {recommendationsError}
      on:generate={handleRecommendationEvent}
    />
  {/if}

  <!-- Quick Actions -->
  <div class="quick-actions">
    <button class="action-link" onclick={() => goto('/cases')}>📋 View Cases</button>
    <button class="action-link" onclick={() => goto('/ai/vector-search')}>🔍 Vector Search</button>
    <button class="action-link" onclick={() => goto('/ai/chat')}>💬 AI Assistant</button>
    <button class="action-link" onclick={() => goto('/dashboard')}>📊 Dashboard</button>
  </div>
</main>

<style>
  .home-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
    background: #0a0a0a;
  }

  .hero-section {
    text-align: center;
    margin-bottom: 3rem;
  }

  .hero-section h1 {
    font-size: 2.5rem;
    color: #ffd700;
    margin-bottom: 0.5rem;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
  }

  .subtitle {
    font-size: 0.9rem;
    color: #92cc41;
    margin-bottom: 0.5rem;
    font-family: 'JetBrains Mono', monospace;
  }

  .status {
    font-size: 0.9rem;
    color: #888;
  }

  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  @media (max-width: 1024px) {
    .action-grid {
      grid-template-columns: 1fr;
    }
  }
  .action-card {
    background: linear-gradient(135deg, #1a1d20 0%, #0f1215 100%);
    border: 2px solid #2a2d30;
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .action-card:hover {
    border-color: #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.15);
    transform: translateY(-2px);
  }

  .action-card h3 {
    margin: 0 0 1rem 0; /* Corrected margin syntax */
    color: #ffd700;
    font-size: 1.1rem;
  }

  .upload-card {
    grid-column: 1;
  }

  .results-card {
    grid-column: 2;
  }

  .info-card {
    grid-column: 3;
    grid-row: 1;
  }

  .file-input {
    width: 100%;
    padding: 0.75rem;
    margin: 0.5rem 0;
    background: #0a0d10;
    border: 2px dashed #444;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .file-input:hover {
    border-color: #ffd700;
  }

  .file-preview {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #0f1215;
    border: 1px solid #2a2d30;
    border-radius: 6px;
    margin: 1rem 0;
  }
  :global(.file-preview-file-icon) {
    width: 32px;
    height: 32px;
    color: #92cc41;
  }

  .file-info {
    flex: 1;
  }

  .file-name {
    font-size: 0.9rem;
    color: #e8e8e8;
    margin: 0;
  }

  .file-size {
    font-size: 0.75rem;
    color: #888;
    margin: 0.25rem 0 0 0; /* Corrected margin syntax */
  }

  .form-fields {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .form-input,
  .form-textarea,
  .form-select {
    width: 100%;
    padding: 0.5rem;
    background: #0a0d10;
    border: 1px solid #2a2d30;
    border-radius: 6px;
    color: white;
    font-size: 0.85rem;
  }

  .form-input:focus,
  .form-textarea:focus,
  .form-select:focus {
    outline: none;
    border-color: #ffd700;
  }

  .upload-progress {
    margin: 1rem 0;
  }

  .progress-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    color: #92cc41;
  }
  :global(.loader-spin-icon) {
    animation: spin 1s linear infinite;
    width: 16px;
    height: 16px;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #0a0d10;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #92cc41, #ffd700);
    transition: width 0.3s ease;
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .upload-btn,
  .reset-btn {
    flex: 1;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
  }

  .upload-btn {
    background: #ffd700;
    color: #0a0a0a;
  }

  .upload-btn:hover {
    background: #ffed4a;
    transform: translateY(-1px);
  }

  .upload-btn:disabled {  /* Updated selector to ':disabled' to match the 'disabled' attribute usage */
    opacity: 0.5;
    cursor: not-allowed;
  }

  .reset-btn {
    background: #f7d51d;
    color: #0a0a0a;
  }

  .result-success,
  .result-error,
  .result-empty {
    padding: 1rem;
    border-radius: 8px;
  }

  .result-success {
    background: #0f1215;
    border: 1px solid #2a2d30;
  }

  .result-header {
    display: flex;
    align-items: start;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .result-header h4 {
    margin: 0;
    color: #e8e8e8;
    font-size: 1rem;
  }

  .result-id {
    font-size: 0.7rem;
    color: #666;
    margin: 0.25rem 0 0 0; /* Corrected margin syntax */
    font-family: monospace;
  }
  :global(.result-success-icon) {
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
    color: #b0b0b0;
  }
  :global(.processing-step-icon) {
    width: 16px;
    height: 16px;
    color: #92cc41;
  }
  :global(.processing-step-skip-icon) {
    width: 16px;
    height: 16px;
    color: #666;
  }

  .ai-summary {
    background: #0a0d10;
    padding: 0.75rem;
    border-radius: 6px;
    margin: 1rem 0;
  }

  .summary-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    color: #a78bfa;
    font-weight: 600;
  }
  :global(.ai-summary-sparkle-icon) {
    width: 14px;
    height: 14px;
  }

  .ai-summary p {
    font-size: 0.8rem;
    color: #e8e8e8;
    line-height: 1.5;
    margin: 0;
  }

  .metadata {
    margin-top: 1rem;
    font-size: 0.8rem;
  }

  .meta-row {
    display: flex;
    justify-content: space-between; /* Corrected typo from space-betweennn */
    padding: 0.5rem 0;
    border-bottom: 1px solid #1a1d20;
    color: #b0b0b0;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .tag {
    background: #2a2d30;
    color: #ffd700;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
  }

  .result-error {
    background: #2a1a1a;
    border: 1px solid #5a2a2a;
    text-align: center;
  }
  :global(.result-error-icon) {
    width: 32px;
    height: 32px;
    color: #ef4444;
    margin: 0 auto 0.5rem;
  }

  .result-error h4 {
    color: #ef4444;
    margin: 0.5rem 0;
  }

  .result-error p {
    color: #b0b0b0;
    font-size: 0.85rem;
    margin: 0;
  }

  .result-empty {
    text-align: center;
    padding: 2rem 1rem;
  }
  :global(.result-empty-icon) {
    width: 48px;
    height: 48px;
    color: #333;
    margin: 0 auto 1rem;
    opacity: 0.3;
  }

  .result-empty p {
    color: #666;
    font-size: 0.85rem;
    margin: 0;
  }

  .tech-stack {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .tech-item {
    font-size: 0.75rem;
    color: #b0b0b0;
    line-height: 1.6;
  }

  .tech-item strong {
    color: #ffd700;
  }

  .quick-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 2rem;
  }

  .action-link {
    color: #ffd700;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border: 1px solid #ffd700;
    border-radius: 6px;
    transition: all 0.3s ease;
    font-size: 0.85rem;
  }

  .action-link:hover {
    background: #ffd700;
    color: #0a0a0a;
    transform: translateY(-1px);
  }
  :global(.icon) {
    width: 16px;
    height: 16px;
  }
</style>