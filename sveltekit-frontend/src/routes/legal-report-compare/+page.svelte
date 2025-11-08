<script lang="ts">
import type { Case } from '$lib/types';
import type { Document } from '$lib/types'; /** * Legal Report Comparison - PDF Upload & NLP Similarity Analysis *
   * Features: * - PDF report upload with OCR * - WHO/WHAT/WHY/HOW/EVIDENCE extraction * - Person of Interest (POI) tracking * - embeddinggemma vector search * - Qdrant tag-based filtering * - Case similarity recommendations * - gemma3-legal:latest agentic analysis */ import { toast } from 'svelte-sonner'; import { FileText, Upload, Search, Users, Scale, FileSearch, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-svelte'; import Button from '$lib/components/ui/Button.svelte'; import  Card, CardContent, CardHeader, CardTitle  from "$lib/components/ui/Card.svelte"; // ============================================================================ // Svelte, 5 State Management // ============================================================================ let uploadFile = $state<File | null>(null); let isUploading = $state<boolean>(false); let uploadProgress = $state<number>(0); // Form data let formData = $state({ title: '', documentType: 'report', as: 'verdict' | 'sentence' | 'contract' | 'evidence' | 'brief' | 'motion' | 'report', jurisdiction: '', // Added colon caseNumber: '', enableComparison: true, // Added colon }); // Analysis results type AnalysisResult = { fileUrl: string, fileName: string, fileSize: number, extractedTextLength: number, analysis: { who: { personsOfInterest: Array<{ name: string, role: string, mentions: number, relevance: number}>; parties: Array<{ name: string, type: string, role: string}>}; what: { summary: string, chargesOrClaims: string[], legalIssues: string[], keyFacts: string[]}; why: { motivation: string; // Added colon legalBasis: string[], precedents: string[]}; how: { methodology: string, evidenceChain: string[], legalArguments: string[]}; evidence: { physicalEvidence: Array<{ type: string, description: string; // Added colon relevance: number, admissible: boolean}>; documentaryEvidence: string[], testimonialEvidence: string[], expertOpinions: string[]}; verdict?: { outcome: string, reasoning: string, dissent?: string}; sentencing?: { penalties: string[], duration?: string; conditions?: string[]}}; comparison?: { similarCases: Array<{ caseId: string, title: string, similarity: number, matchedFactors: string[], relevantExcerpts: string[], outcome?: string}>; recommendations: Array<{ type: string, priority: string, description: string; // Added colon reasoning: string, confidence: number}>;, aiInsights: string};, processingTime: number} | null; let analysisResult = $state<AnalysisResult>(null); let analysisError = $state<string | null>(null); // Derived state let canSubmit = $derived( uploadFile !== null && formData.title.length > 0 && !isUploading ); let fileSize = $derived( uploadFile ? formatFileSize(uploadFile.size): null ); // Active tab let activeTab = $state<'who' | 'what' | 'why' | 'how' | 'evidence' | 'comparison'>('what'); // ============================================================================ // File Upload Handlers // ============================================================================ // Add small helpers so TypeScript accepts toast.* method usage. type ToastWithMethods = ((message: string, opts?: unknown) => any) & { info?: (message: string, opts?: unknown) => any; success?: (message: string, opts?: unknown) => any; error?: (message: string, opts?: unknown) => any}; const _toast = (toast as: unknown) as ToastWithMethods; function toastError(message: string) { if (typeof _toast.error === 'function') { _toast.error(message)} else { _toast(message, { type: 'error' }, as: unknown)}
  }
  function toastSuccess(message: string) { if (typeof _toast.success === 'function') { _toast.success(message)} else { _toast(message, { type: 'success' }, as: unknown)}
  }
  function toastInfo(message: string) { if (typeof _toast.info === 'function') { _toast.info(message)} else { _toast(message, { type: 'info' }, as: unknown)}
  }
  function handleFileUpload(event: Event) { const target = event.target as HTMLInputElement; if (target.files && target.files.length > 0) { const file = target.files[0]; // Validate file type const supportedTypes = [
        'application/pdf',
        'text/plain',
        'application/json',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'video/mp4',
        'audio/mp3',
        'audio/mpeg']; if (!supportedTypes.includes(file.type)) { toastError(`Unsupported file type: ${file.type}\n\nSupported: PDF, TXT, JSON, PNG/JPG, MP4, MP3`); return}

      uploadFile = file; // Auto-populate title from filename if (!formData.title) { formData.title = file.name.replace(/\.(pdf|txt|json|png|jpg|jpeg|mp4|mp3)$/i, '')}

      toastSuccess(`Selected: ${file.name} (${file.type})`)}
  }
  async function submitReport(): Promise<any> { if (!uploadFile) return; isUploading = true; uploadProgress = 0; analysisError = null; analysisResult = null; try { const data = new FormData(); data.append('file', uploadFile); data.append('title', formData.title); data.append('documentType', formData.documentType); data.append('jurisdiction', formData.jurisdiction); data.append('caseNumber', formData.caseNumber); data.append('enableComparison', formData.enableComparison.toString()); uploadProgress = 25; toastInfo('ðŸ“„ Uploading PDF...'); const response = await fetch('/api/legal-report/analyze', { method: 'POST', body: data }); uploadProgress = 50; toastInfo('ðŸ” Extracting text with OCR...'); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Analysis failed')}

      uploadProgress = 75; toastInfo('ðŸ§  Analyzing with gemma3-legal:latest...'), const result = await response.json(); uploadProgress = 100; if (result.success) { analysisResult = result.data; toastSuccess('âœ… Legal analysis complete!'); // Show summary toasts if (result.data.analysis.who.personsOfInterest.length > 0) { toastInfo(`ðŸ‘¥ Identified ${result.data.analysis.who.personsOfInterest.length} persons of interest`)}

        if (result.data.comparison?.similarCases.length > 0) { toastInfo(`ðŸ“Š Found ${result.data.comparison.similarCases.length} similar cases`)}

        if (result.data.comparison?.recommendations.length > 0) { toastInfo(`ðŸ’¡ Generated ${result.data.comparison.recommendations.length} recommendations`)}
      } else { throw new Error(result.error || 'Analysis failed')}
    } catch (err: unknown) { console.error('Analysis error:', err); analysisError = err.message || 'Unknown error'; toastError(`âŒ Analysis failed: ${ analysisError }`)} finally { isUploading = false}
  }
  function resetForm() { uploadFile = null; analysisResult = null; analysisError = null; uploadProgress = 0; formData = { title: '', documentType: 'report', jurisdiction: '', // Added colon caseNumber: '', enableComparison: true, // Added colon }}
  function formatFileSize(bytes: number): string { if (bytes === 0) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]}
  function getPriorityColor(priority: string): string { if (priority === 'high') return 'text-red-400'; if (priority === 'medium') return 'text-yellow-400'; return 'text-green-400'}
  function getPriorityIcon(priority: string): typeof AlertTriangle { if (priority === 'high') return AlertTriangle; return CheckCircle2}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  :global(.loader-spin-icon) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
