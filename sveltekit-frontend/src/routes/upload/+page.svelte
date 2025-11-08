<script lang="ts">
  import MinIOUpload from '$lib/components/upload/MinIOUpload.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  // Define types for better clarity
  interface UploadResult {
    objectName?: string;
    documentId?: string;
    url?: string;
  }

  interface UploadEntry {
    filename: string;
    size?: number;
    mimeType?: string;
  }

  let { data } = $props<{ data: PageData & { recentUploads?: UploadEntry[] } }>();

  const caseId = $page.url.searchParams.get('caseId') || '';

  // Use $state for reactive variables
  let recentUploads = $state<UploadEntry[]>(data.recentUploads ?? []);

  // Upload completion handler
  function handleUploadComplete(event: CustomEvent<UploadResult>) {
    const result = event.detail;
    console.log('Upload completed:', result);
    const notification = {
      type: 'success',
      title: 'Upload Successful',
      message: `Document, "${result?.objectName ?? 'file'}" has been uploaded and is being processed.`,
      documentId: result?.documentId,
      url: result?.url,
    };
    sessionStorage.setItem('uploadNotification', JSON.stringify(notification));
    if (caseId) {
      goto(`/cases/${caseId}/documents`);
    } else {
      goto('/documents');
    }
  }

  // Upload error handler
  function handleUploadError(event: CustomEvent<string>) {
    const error = event.detail;
    console.error('Upload error:', error);
    const notification = {
      type: 'error',
      title: 'Upload Failed',
      message: error,
    };
    sessionStorage.setItem('uploadNotification', JSON.stringify(notification));
  }
</script>

<main class="upload-page">
  <header class="page-header">
    <h1>Upload Documents</h1>
    <p class="page-description">
      Drag and drop files here or click to select files for analysis. Your documents are secure and
      processed confidentially.
    </p>
  </header>

  <div class="upload-container">
    <section class="upload-section">
      <MinIOUpload {caseId} oncomplete={handleUploadComplete} onerror={handleUploadError} />
    </section>

    <aside class="info-sidebar">
      <div class="info-card">
        <div class="card-header">
          <h3>Recent Uploads</h3>
          <button class="text-button" onclick={() => (recentUploads = [])}>Clear</button>
        </div>
        <div class="recent-uploads">
          {#if recentUploads.length > 0}
            {#each recentUploads as upload (upload.filename)}
              <div class="upload-item">
                <span class="upload-icon">📄</span>
                <div class="upload-details">
                  <div class="upload-name">{upload.filename}</div>
                  {#if upload.size}
                    <div class="upload-meta">
                      {(upload.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          {:else}
            <p class="no-uploads">No recent uploads.</p>
          {/if}
        </div>
      </div>

      <div class="info-card">
        <h3>Supported Formats</h3>
        <ul>
          <li>PDF, DOCX, TXT</li>
          <li>JPG, PNG (OCR will be applied)</li>
          <li>ZIP archives containing supported files</li>
        </ul>
      </div>
    </aside>
  </div>

  <section class="help-section">
    <h2>Need Help?</h2>
    <div class="help-grid">
      <div class="help-card">
        <h4>Secure Processing</h4>
        <p>All documents are encrypted in transit and at rest. We prioritize your data security.</p>
      </div>
      <div class="help-card">
        <h4>Batch Uploads</h4>
        <p>You can upload multiple files at once. They will be processed in parallel.</p>
      </div>
      <div class="help-card">
        <h4>Processing Time</h4>
        <p>
          Analysis time varies by document size and complexity. You'll be notified upon completion.
        </p>
      </div>
    </div>
  </section>
</main>

<style>
  .upload-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .page-description {
    font-size: 1.125rem;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
  }

  .upload-container {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 3rem;
    margin-bottom: 4rem;
  }

  @media (max-width: 1024px) {
    .upload-container {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }

  .upload-section {
    min-height: 600px;
  }

  .info-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .info-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .info-card h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1.125rem;
  }

  .info-card p {
    margin: 0 0 1rem 0;
    color: var(--text-secondary);
  }

  .info-card ul {
    margin: 0;
    padding-left: 1.25rem;
    color: var(--text-secondary);
  }

  .info-card li {
    margin-bottom: 0.5rem;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .text-button {
    background: none;
    border: none;
    color: var(--accent-primary);
    cursor: pointer;
    font-size: 0.875rem;
    text-decoration: underline;
  }

  .text-button:hover {
    color: var(--accent-primary-dark);
  }

  .recent-uploads {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .upload-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--bg-primary);
    border-radius: 6px;
    border: 1px solid var(--border-color);
  }

  .upload-icon {
    font-size: 1.25rem;
    opacity: 0.7;
  }

  .upload-details {
    flex: 1;
    min-width: 0;
  }

  .upload-name {
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .upload-meta {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }

  .upload-status {
    font-size: 1rem;
  }

  .no-uploads {
    color: var(--text-secondary);
    font-style: italic;
    text-align: center;
    margin: 1rem 0;
  }

  .help-section {
    background: var(--bg-secondary);
    border-radius: 16px;
    padding: 3rem;
    border: 1px solid var(--border-color);
  }

  .help-section h2 {
    text-align: center;
    margin: 0;
  }

  .help-section p {
    margin-bottom: 1em;
  }

  .help-section ul {
    list-style: disc;
    margin-left: 20px;
    margin-bottom: 1em;
  }

  .help-section li {
    margin-bottom: 0.5em;
  }

  .help-section code {
    background-color: #2d2d2d;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
  }

  .help-section a {
    color: #61dafb;
    text-decoration: underline;
  }
</style>
