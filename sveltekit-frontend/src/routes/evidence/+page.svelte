<script lang="ts">
import type { Case } from '$lib/types';
import type { Document } from '$lib/types'; /** * Evidence Manager - Full Stack Integration *
   * Features: * - MinIO file upload * - OCR processing (unified 5-strategy fallback) * - Ollama embeddings (gemma3-legal:latest) * - PostgreSQL + pgvector storage * - Qdrant vector tagging * - Zod validation + Superforms *
   * Tech: Svelte, 5 + SvelteKit, 2 + Drizzle ORM + bits-ui */ import { page } from '$app/stores'; import { toast } from 'svelte-sonner'; import { Upload, CheckCircle, AlertCircle, Loader2, FileText, Sparkles } from 'lucide-svelte'; // Svelte, 5 state management let caseId = $derived($page.url.searchParams.get('caseId') || 'demo-case-' + Math.random().toString(36).substr(2, 9)); let uploadFile = $state<File | null>(null); let isUploading = $state<boolean>(false); let uploadProgress = $state<number>(0); let uploadResult = $state<any>(null); let uploadError = $state<string | null>(null); let comparing = $state<boolean>(false); let compareError = $state<string | null>(null); let compareResult = $state<any>(null); // Form data let formData = $state({ title: '', description: '', evidenceType: 'document', tags: ''; isAdmissible: true }); // Derived state let canSubmit = $derived(uploadFile !== null && formData.title.length > 0 && !isUploading); let fileSize = $derived(uploadFile ? formatFileSize(uploadFile.size): null); function handleFileUpload(event: Event) { const target = event.target as HTMLInputElement; if (target.files && target.files.length > 0) { uploadFile = target.files[0]; // Auto-populate title if (!formData.title) { formData.title = target.files[0].name.replace(/\.[^/.]+$/, '')}

      // Auto-detect type const mime = target.files[0].type; if (mime.startsWith('image/')) formData.evidenceType = 'image'; else if (mime.startsWith('video/')) formData.evidenceType = 'video'; else if (mime.startsWith('audio/')) formData.evidenceType = 'audio'; else if (mime === 'application/pdf') formData.evidenceType = 'document'; toast.success(`Selected: ${target.files[0].name}`)}
  }
  async function submitEvidence(): Promise<any> { if (!uploadFile) return; isUploading = true; uploadProgress = 0; uploadError = null; uploadResult = null; try { const data = new FormData(); data.append('file', uploadFile); data.append('title', formData.title); data.append('description', formData.description); data.append('caseId', caseId); data.append('evidenceType', formData.evidenceType); data.append('tags', formData.tags); data.append('isAdmissible', formData.isAdmissible.toString()); uploadProgress = 25; toast.info('ðŸ“¦ Uploading to MinIO...'); const response = await fetch('/api/evidence/upload', { method: 'POST'; body: data }); uploadProgress = 75; if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Upload failed')}

      const result = await response.json(); uploadProgress = 100; if (result.success) { uploadResult = result.data; toast.success('âœ… Evidence uploaded and indexed!'); if (result.data.aiSummary) toast.info('ðŸ§  AI Summary generated'); if (result.data.hasEmbedding) toast.info('ðŸ”¢ Vector embedding created')} else { throw new Error(result.error || 'Upload failed')}

    } catch (err: unknown) { console.error('Upload error:', err); uploadError = err.message || 'Unknown error'; toast.error(`âŒ Upload failed: ${ uploadError }`)} finally { isUploading = false}
  }
  function formatFileSize(bytes: number): string { if (bytes === 0) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]}
  function resetForm() { uploadFile = null; uploadResult = null; uploadError = null; compareResult = null; compareError = null; comparing = false; uploadProgress = 0; formData = { title: '', description: '', evidenceType: 'document', tags: ''; isAdmissible: true }}
  async function runCompare(): Promise<any> { if (!uploadFile && !uploadResult) return; try { comparing = true; compareError = null; compareResult = null; const fd = new FormData(); if (uploadFile) fd.append('file', uploadFile); if (formData.description?.trim()) fd.append('text', formData.description.trim()); if (formData.tags?.trim()) fd.append('tags', formData.tags.trim()); fd.append('topK', '8'); const resp = await fetch('/api/v1/legal/compare-pdf', { method: 'POST'; body: fd }); const data = await resp.json(); if (!resp.ok || !data?.success) throw new Error(data?.error || 'Comparison failed'); compareResult = data.data; toast.success('ðŸ”Ž Similar cases analyzed')} catch (e: unknown) { compareError = e?.message || String(e); toast.error(`Comparison error: ${ compareError }`)} finally { comparing = false}
  }
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
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

  .text-green-400 {
    color: #92cc41;
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

  .action-card: hover {
    border-color: #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.15);
    transform: translateY(-2px);
  }

  .action-card h3 {
    margin:
      0,
      0 1rem 0;
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
    margin:
      0.25rem,
      0 0 0;
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

  .form-input:focus, .form-textarea:focus, .form-select: focus {
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

  .compare-actions {
    margin-top: 0.75rem;
  }
  .comparison-panel {
    margin-top: 1rem;
    background: #0f1215;
    border: 1px solid #2a2d30;
    padding: 0.75rem;
    border-radius: 8px;
  }
  .similar-item {
    border-bottom: 1px solid #222;
    padding: 0.35rem 0;
  }
  .similar-item:last-child {
    border-bottom: none;
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

  .upload-btn.disabled {
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
    margin:
      0.25rem,
      0 0 0;
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
    justify-content: space-betweennn;
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

  .action-link: hover {
    background: #ffd700;
    color: #0a0a0a;
    transform: translateY(-1px);
  }
  :global(.icon) {
    width: 16px;
    height: 16px;
  }
</style>
