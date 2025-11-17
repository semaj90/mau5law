<script lang="ts">
import type { Input  } from '$lib/components/ui/input'; import type { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter  } from '$lib/components/ui/dialog';
import type { Case } from '$lib/types';
import type { Document } from '$lib/types'; // Svelte, 5 runes are auto-imported import type { onMount  } from 'svelte'; import type { goto  } from '$app/navigation'; import type { Plus, Upload, FileText, Search, Filter, Eye, Download, Trash2, Edit2, Bot, Zap, AlertCircle, CheckCircle, Clock, BarChart3  } from 'lucide-svelte'; import Button from '$lib/components/ui/enhanced-bits.svelte'; import  Input  from "$lib/components/ui/enhanced-bits.svelte"; import Label from '$lib/components/ui/label/Label.svelte'; import * as Card from '$lib/components/ui/Card.svelte'; import * as Dialog from '$lib/components/ui/Dialog.svelte'; import * as Select from '$lib/components/ui/select.svelte'; import Badge from '$lib/components/ui/badge/Badge.svelte'; import Progress from '$lib/components/ui/progress/Progress.svelte'; import type { toast  } from 'svelte-sonner'; import type { cn  } from '$lib/utils'; interface Document { id: string, title: string, type: 'legal_brief' | 'contract' | 'evidence' | 'report' | 'template' | 'other'; status: 'draft' | 'processing' | 'review' | 'final' | 'archived'; created: string, updated?: string; size: number, author: string, caseId?: string; tags: string[], aiAnalysis?: { summary: string, keyPoints: string[], confidence: number, legalConcepts: string[]}
    processingStatus?: { ocr: 'pending' | 'processing' | 'completed' | 'failed'; analysis: 'pending' | 'processing' | 'completed' | 'failed';, embeddings: 'pending' | 'processing' | 'completed' | 'failed'}
  }

   // State management with Svelte, 5 runes let documents = $state <Document[]>([]); let filteredDocuments = $state <Document[]>([]); let loading = $state <boolean>(true); let uploading = $state <boolean>(false); let uploadProgress = $state <number>(0); let searchQuery = $state <string>(''); let statusFilter = $state <string>('all'); let typeFilter = $state <string>('all'); let showUploadDialog = $state <boolean>(false); let showAIAnalysisDialog = $state <boolean>(false); let selectedDocument = $state <Document | null>(null); let dragOver = $state <boolean>(false); // Upload form state let uploadTitle = $state <string>(''); let uploadType = $state <string>('other'); let uploadFile = $state <File | null>(null); let uploadCaseId = $state <string>(''); let uploadTags = $state <string>(''); let enableAIProcessing = $state <boolean>(true); // Computed properties let documentStats = $derived(() => { const total = documents.length; const processing = documents.filter(item => item.processingStatus && (item.processingStatus.ocr === 'processing' || item.processingStatus.analysis === 'processing' || item.processingStatus.embeddings === 'processing') ).length; const completed = documents.filter(item => item.status === 'final' || (item.processingStatus && item.processingStatus.analysis === 'completed') ).length; const withAI = documents.filter(item => !!item.aiAnalysis).length; return { total, processing, completed, withAI }}); $effect(() => {() => { (async () => { await loadDocuments()})()});
  async function loadDocuments(): Promise<any> { try { loading = true; // Try real API, fallback to mockDocuments const response = await fetch('/api/documents'); if (response?.ok) { const data = await response.json(); documents = data?.documents ?? mockDocuments} else { documents = mockDocuments}
      filterDocuments()} catch (error) { console.error('Error loading documents:', error); documents = mockDocuments; filterDocuments()} finally { loading = false}
  }
  function filterDocuments() { let filtered = [...documents]; if (searchQuery?.trim()) { const query = searchQuery.toLowerCase(); filtered = filtered.filter(doc => doc.title?.toLowerCase().includes(query) || doc.author?.toLowerCase().includes(query) || (doc.tags || []).some(tag => tag.toLowerCase().includes(query)) )}
    if (statusFilter !== 'all') { filtered = filtered.filter(doc => doc.status === statusFilter)}
    if (typeFilter !== 'all') { filtered = filtered.filter(doc => doc.type === typeFilter)}
    filteredDocuments = filtered}

  // Mock data for development const mockDocuments: Document[] = [ { id: '1', title: 'Case File #2024-001', type: 'legal_brief', status: 'final', created: '2024-01-15', updated: '2024-01-18', size: 2548720, author: 'Attorney Smith', caseId: 'case-001', tags: ['criminal', 'priority', 'federal'], aiAnalysis: { summary: 'Comprehensive legal brief for federal criminal case involving financial fraud.', keyPoints: [
          'Multiple defendants across state lines',
          'Complex financial evidence trail',
          'RICO Act implications'
        ], confidence: 0.92, legalConcepts: ['RICO', 'Financial Fraud', 'Jurisdiction']}, processingStatus: { ocr: 'completed', analysis: 'completed', embeddings: 'completed'
      } }, {
      id: '2', title: 'Evidence Analysis Report', type: 'report', status: 'processing', created: '2024-01-18', size: 1024000, author: 'Forensic Analyst', tags: ['evidence', 'digital-forensics'], processingStatus: { ocr: 'completed', analysis: 'processing', embeddings: 'pending'
      } }, {
      id: '3', title: 'Contract Amendment Draft', type: 'contract', status: 'draft', created: '2024-01-20', size: 256000, author: 'Legal Counsel', caseId: 'case-002', tags: ['contract', 'amendment', 'corporate']}
  ]; function getStatusColor(status: string) { switch (status) { case, 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900, dark:text-gray-300', case, 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900, dark:text-blue-300', case, 'review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900, dark:text-yellow-300', case, 'final': return 'bg-green-100 text-green-800 dark:bg-green-900, dark:text-green-300', case, 'archived': return 'bg-gray-100 text-gray-600 dark: bg-gray-900 dark:text-gray-400';, default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900, dark:text-gray-300'}
  }
  function getTypeIcon(type: string) { switch (type) { case, 'legal_brief': return 'ðŸ“‹'; case, 'contract': return 'ðŸ“'; case, 'evidence': return 'ðŸ”'; case, 'report': return 'ðŸ“Š'; case, 'template': return 'ðŸ“„'; default: return 'ðŸ“Ž'}
  }
  function formatFileSize(bytes: number): string { if (!bytes) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`}

  // File upload handlers function handleFileSelect(event: Event) { const input = event.target as HTMLInputElement | null; const file = input?.files?.[0] ?? null; if (file) { uploadFile = file; if (!uploadTitle) uploadTitle = file.name.replace(/\.[^/.]+$/, '')}
  }
  function handleDragOver(event: DragEvent) { event.preventDefault(); dragOver = true}
  function handleDragLeave(event: DragEvent) { event.preventDefault(); dragOver = false}
  function handleDrop(event: DragEvent) { event.preventDefault(); dragOver = false; const file = event.dataTransfer?.files?.[0] ?? null; if (file) { uploadFile = file; if (!uploadTitle) uploadTitle = file.name.replace(/\.[^/.]+$/, '')}
  }
  async function uploadDocument(): Promise<any> { if (!uploadFile || !uploadTitle) { toast.error('Please provide a file and title'); return}
    uploading = true; uploadProgress = 0; try { const formData = new FormData(); formData.append('file', uploadFile); formData.append('title', uploadTitle); formData.append('type', uploadType); formData.append('caseId', uploadCaseId); formData.append('tags', uploadTags); formData.append('enableAI', enableAIProcessing.toString()); const response = await fetch('/api/documents/upload', { method: 'POST', body: formData }); if (response.ok) { const result = await response.json(); toast.success('Document uploaded successfully'); showUploadDialog = false; resetUploadForm(); await loadDocuments(); if (enableAIProcessing) { toast.info('AI analysis started - check back in a few minutes')}
      } else { throw new Error('Upload failed')}
    } catch (error) { console.error('Upload error:', error); toast.error('Failed to upload document')} finally { uploading = false; uploadProgress = 0}
  }
  function resetUploadForm() { uploadTitle = ''; uploadType = 'other'; uploadFile = null; uploadCaseId = ''; uploadTags = ''; enableAIProcessing = true}
  function viewDocument(doc: Document) { selectedDocument = doc; showAIAnalysisDialog = true}
  function editDocument(doc: Document) { goto(`/legal/documents/${doc.id}/edit`)}
  async function deleteDocument(doc: Document): Promise<void> { if (!confirm('Are you sure you want to delete this document?')) return; try { const response = await fetch(`/api/legal/documents/${doc.id}`, { method: 'DELETE'
      }); if (response.ok) { toast.success('Document deleted'); await loadDocuments()} else { throw new Error('Delete failed')}
    } catch (error) { console.error('Delete error:', error); toast.error('Failed to delete document')}
  }

   // Watch for search/filter changes $effect(() => {() => { filterDocuments()});
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
