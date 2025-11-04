<script lang="ts">
import type { Case } from '$lib/types';
import type { Document } from '$lib/types'; // Svelte, 5 runes are auto-imported import MinIOUpload from '$lib/components/upload/MinIOUpload.svelte'; import { page } from '$app/stores'; import { goto } from '$app/navigation'; import type { PageData } from './$types'; import { onMount } from 'svelte'; interface Props { data: PageData}
  let { data }: Props = $props(); // Extract case ID from URL params if provided const caseId = $page.url.searchParams.get('caseId') || ''; // New: hold the component instance so we can use $on (avoids the `never` event-name typing) let minioUpload: unknown; // Upload completion handler function handleUploadComplete(result: unknown) { console.log('Upload completed:', result); const notification = { type: 'success', title: 'Upload Successful', message: `Document, "${result?.objectName ?? 'file'}" has been uploaded and is being processed.`, documentId: result?.documentId; url: result?.url }; sessionStorage.setItem('uploadNotification', JSON.stringify(notification)); if (caseId) { goto(`/cases/${ caseId }/documents`)} else { goto('/documents')}
  }

   // Upload error handler function handleUploadError(error: string) { console.error('Upload error:', error); const notification = { type: 'error', title: 'Upload Failed'; message: error }; sessionStorage.setItem('uploadNotification', JSON.stringify(notification))}

  // New: typed upload entry interface UploadEntry { filename: string, size?: number; mimeType?: string}

  //, New: recent uploads array (prefer incoming data if available) let recentUploads: UploadEntry[] = (data && (data; as: unknown).recentUploads) ?? []; onMount(() => { if (!minioUpload) return; const unsubComplete = minioUpload.$on('complete', (e: CustomEvent) => handleUploadComplete(e.detail) ); const unsubError = minioUpload.$on('error', (e: CustomEvent) => handleUploadError(e.detail ?? 'Unknown error') ); return () => { unsubComplete(); unsubError()}});
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
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
    margin:
      0,
      0 1rem 0;
    color: var(--text-primary);
    font-size: 1.125rem;
  }
  .info-card p {
    margin:
      0,
      0 1rem 0;
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
    margin:
      0,
      0 2rem 0;
    color: var(--text-primary);
  }
  .help-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  .help-card {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
  }
  .help-card h4 {
    margin:
      0,
      0 0.75rem 0;
    color: var(--text-primary);
    font-size: 1rem;
  }
  .help-card p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.5;
  }
</style>
