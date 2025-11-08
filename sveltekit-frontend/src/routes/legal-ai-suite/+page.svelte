<script lang="ts">
import type { Case } from '$lib/types';
import type { Document } from '$lib/types'; // Svelte, 5 runes are auto-imported import { onMount, onDestroy } from 'svelte'; import  Card, CardHeader, CardTitle, CardContent  from "$lib/components/ui/enhanced-bits.svelte"; import Progress from '$lib/components/ui/progress/Progress.svelte'; import Badge from '$lib/components/ui/badge/Badge.svelte'; // Added Badge import import { AlertCircle, UploadCloud, Search, Brain, CheckCircle, AlertTriangle } from 'lucide-svelte'; import GPUAcceleratedLegalSearch from '$lib/components/gpu/GPUAcceleratedLegalSearch.svelte'; // Helper to get Ollama endpoint, respecting Docker service names const getOllamaEndpoint = () => import.meta.env.VITE_OLLAMA_URL || 'http://ollama:11434'; // Svelte, 5 runes for state management let selectedFiles = $state<File[]>([]); let isProcessing = $state<boolean>(false); let processedDocuments = $state<any[]>([]); let ragQuery = $state<string>(''); let ragResults = $state<any[]>([]); let systemMetrics = $state({ gpuAcceleration: false, // Fixed syntax ollamaStatus: 'unknown', processingSpeed: 0, caseAIScore: 0 });
  let selectedJurisdiction = $state<string>('federal'); let processingSummary = $state<any>(null); let realTimeLogs = $state<string[]>([]); // Computed properties using Svelte, 5 $derived runes let hasFiles = $derived(selectedFiles.length > 0); let canProcess = $derived(hasFiles && !isProcessing); let totalEntities = $derived(processedDocuments.reduce((sum, doc) => sum + (doc?.entityCount || 0), 0)); let averageProsecutionScore = $derived( processedDocuments.length > 0 ? processedDocuments.reduce((sum, doc) => sum + (doc?.prosecutionScore || 0), 0) / processedDocuments.length: 0 ); let canQuery = $derived(ragQuery.trim().length > 0); // Fixed syntax $effect(() => { (async () => { await, checkSystemStatus(); // Start real-time logging startRealTimeLogging()})()}); function handleFileSelect(event: Event) { // Removed _event, used event directly const input = event.target as HTMLInputElement; const files = input?.files ? Array.from(input.files): []; selectedFiles = files.filter( file => file && (file.type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'))) // Fixed syntax ); addLog(`ðŸ“„ Selected ${selectedFiles.length} PDF files for processing`)}
  async function processLegalDocuments(): Promise<any> { if (!canProcess) return; isProcessing = true; processingSummary = null; addLog(`ðŸš€ Starting legal document processing...`); try { const formData = new FormData(); // Add files to form data selectedFiles.forEach(file => { formData.append('pdfFiles', file)}); // Add processing parameters formData.append('jurisdiction', selectedJurisdiction); formData.append('enhanceRAG', 'true'); formData.append('caseId', `case-${Date.now()}`); addLog(`âš–ï¸ Processing ${selectedFiles.length} documents under ${ selectedJurisdiction } jurisdiction`); const response = await fetch('/api/legal/ingest', { method: 'POST', body: formData }); if (!response.ok) { // Simplified type casting throw new Error( `HTTP ${response.status}: ${response.statusText}` )}
      const result = await response.json(); // Simplified type casting if (result.success) { // Simplified type casting processedDocuments = result.documents || []; processingSummary = result.summary; systemMetrics.caseAIScore = result.caseAISummaryScore; // Fixed typo addLog( `âœ… Processing complete: ${result.documentsProcessed} documents` ); addLog( `ðŸ“Š Total entities extracted: ${result.summary?.totalEntities || 0}` ); addLog(`ðŸŽ¯ Average prosecution score: ${(averageProsecutionScore * 100).toFixed(1)}%`); addLog( `ðŸ“ˆ Case AI summary score: ${result.caseAISummaryScore}/100` )} else { throw new Error( result.error || 'Processing failed'
        )}
    } catch (err) { const error = err as Error; console.error('Document processing failed:', error); addLog(`âŒ Processing failed: ${error.message}`)} finally { isProcessing = false}
  }
  async function executeRAGQuery(): Promise<any> { if (!ragQuery.trim()) return; addLog(`ðŸ” Executing enhanced RAG query: "${ ragQuery }"`); try { const response = await fetch('/api/enhanced-rag/query', { method: 'POST', headers: {
          'Content-Type': 'application/json'
        }, body: JSON.stringify({ query: ragQuery, jurisdiction: selectedJurisdiction, // Fixed syntax maxResults: 5, includeContext7: true, prioritizeFactChecked: true, minProsecutionScore: 0.5 }) }); if (!response.ok) { // Simplified type casting throw new Error( `HTTP ${response.status}: ${response.statusText}` )}
      const result = await response.json(); // Simplified type casting if (result.success) { // Simplified type casting ragResults = result.results || []; addLog( `âœ… RAG query complete: ${ragResults.length} results, score: ${(result.ragScore * 100).toFixed(1)}%` ); if (result.aggregatedAnalysis?.recommendedNextQuery) { // Simplified type casting addLog( `ðŸ’¡ Recommended follow-up: "${result.aggregatedAnalysis.recommendedNextQuery}"` )}
      } else { throw new Error( result.error || 'RAG query failed'
        )}
    } catch (err) { const error = err as Error; console.error('RAG query failed:', error); addLog(`âŒ RAG query failed: ${error.message}`)}
  }
  async function checkSystemStatus(): Promise<any> { try { // Check Ollama status using the helper const ollamaEndpoint = getOllamaEndpoint(); const ollamaResponse = await fetch(`${ ollamaEndpoint }/api/tags`); systemMetrics.ollamaStatus = ollamaResponse.ok ? 'healthy': 'offline'; // Check actual GPU service status try { const gpuResponse = await fetch('/api/v1/gpu'); if (gpuResponse.ok) { const gpuStatus = await gpuResponse.json(); systemMetrics.gpuAcceleration = gpuStatus.gpu_status?.gpu_available || false; if (systemMetrics.gpuAcceleration) { addLog(`ðŸ”¥ GPU acceleration available: ${gpuStatus.integration?.gpu_model || 'RTX, 3060 Ti'}`); addLog(`âš¡ Expected performance: ${gpuStatus.performance?.speedup_vs_cpu || '8.3x faster'}`)} else { addLog('âš ï¸ GPU acceleration not available - using CPU fallback')}
        } else { systemMetrics.gpuAcceleration = false}
      } catch (gpuError) { systemMetrics.gpuAcceleration = false; addLog('âš ï¸ GPU service not responding - using CPU processing')}
      addLog( `ðŸ–¥ï¸ System status: Ollama ${systemMetrics.ollamaStatus}, GPU: ${systemMetrics.gpuAcceleration ? 'enabled': 'disabled'}` )} catch (err) { const error = err as Error; systemMetrics.ollamaStatus = 'error'; addLog(`âš ï¸ System check failed: ${error.message}`)}
  }
  function addLog(message: string) { const timestamp = new Date().toLocaleTimeString(); realTimeLogs = [...realTimeLogs, `[${ timestamp }] ${ message }`]; // Keep only the last, 20 log entries if (realTimeLogs.length > 20) { realTimeLogs = realTimeLogs.slice(-20)}
  } let loggingInterval = $state<number | null>(null); function startRealTimeLogging() { // Prevent multiple intervals if (loggingInterval) return; // Simulate periodic system metrics updates loggingInterval = window.setInterval(() => { if (isProcessing) { systemMetrics.processingSpeed = Math.random() * 100 + 50; // 50-150 docs/min }
    }, 1000)}
  onDestroy(() => { if (loggingInterval !== null) { clearInterval(loggingInterval); loggingInterval = null}
  }); function clearLogs() { realTimeLogs = []; addLog('ðŸ“‹ Logs cleared')}
  function getFactCheckBadgeVariant(status: string) { switch (status) { case, 'FACT': return 'default'; case, 'FICTION': case, 'DISPUTED': return 'destructive'; case, 'UNVERIFIED': return 'secondary'; default: return 'outline'}
  }
  function getProsecutionScoreColor(score: number) { if (score >= 0.8) return 'text-green-600'; if (score >= 0.6) return 'text-yellow-600'; return 'text-red-600'}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  /* Custom scrollbar for logs */
  .yorha-panel-content::-webkit-scrollbar {
    width: 6px;
  }
  .yorha-panel-content::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  .yorha-panel-content::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  .yorha-panel-content::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>
