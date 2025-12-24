<!-- @migration-task Error while migrating Svelte code: Unexpected keyword 'const'
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected keyword 'const'
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected keyword 'const'
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected keyword 'const'
https://svelte.dev/e/js_parse_error -->
<script lang="ts">
import type { SearchResult } from '$lib/types';
import type { Case } from '$lib/types';
import type { Document } from '$lib/types';
  // Svelte, 5 runes are auto-imported
  // No onMount or props required for this component

  // State management with Svelte, 5 runes
  let embeddingText = $state <string>('Legal contract clause regarding intellectual property rights and patent licensing agreements');
  let searchQuery = $state <string>('intellectual property patent');
  let caseId = $state <string>('CASE_2024_001');
  let searchLimit = $state <number>(5);
  let embeddingStatus = $state <string>('idle');
  let searchResults = $state <SearchResult[]>([]);
  let searchStats = $state <SearchStats>({ totalDocuments: 0, uniqueCases: 0, avgPayloadLength: 0 });
  let systemHealth = $state <SystemHealth>({ status: 'checking', database: 'checking', ollama: 'checking', embeddings: 0 });
  let cudaStatus = $state <CudaStatus>({ status: 'checking', gpu_model: 'unknown', cuda_cores: 0, memory_gb: 0 });
  let isLoading = $state <boolean>(false);
  let errorMessage = $state <string>('');
  // Prefer public env vars (set PUBLIC_LEGAL_AI_BASE / PUBLIC_CUDA_BASE), fall back to localhost for dev
  const API_BASE = import.meta.env.PUBLIC_LEGAL_AI_BASE || 'http://localhost:8095/api/v1',
  const CUDA_BASE = import.meta.env.PUBLIC_CUDA_BASE || 'http://localhost:8096/api/v1';
  // Health check on component mount
  $effect(() => {() => {
    (async () => {
await checkSystemHealth();
    await loadSearchStats();
    await checkCUDAStatus()})()});
  async function checkSystemHealth(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) systemHealth = await res.json();
      else systemHealth = { status: 'unavailable', database: 'unavailable', ollama: 'unavailable', embeddings: 0 }} catch (error) {
      console.error('Health check failed:', error);
      systemHealth = { status: 'unavailable', database: 'unavailable', ollama: 'unavailable', embeddings: 0 }}
  }
  async function checkCUDAStatus(): Promise<any> {
    try {
      const res = await fetch(`${CUDA_BASE}/health`);
      if (res.ok) cudaStatus = await res.json();
      else cudaStatus = { status: 'unavailable', gpu_model: 'unknown', cuda_cores: 0, memory_gb: 0 }} catch (error) {
      console.error('CUDA health check failed:', error);
      cudaStatus = { status: 'unavailable', gpu_model: 'unknown', cuda_cores: 0, memory_gb: 0 }}
  }
  async function loadSearchStats(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) {
        const json = await res.json();
        // best-effort map into typed shape
        searchStats = {
          totalDocuments: Number(json.totalDocuments || json.total_documents || 0),
          uniqueCases: Number(json.uniqueCases || json.unique_cases || 0),
          avgPayloadLength: Number(json.avgPayloadLength || json.avg_payload_length || 0)
        }} else searchStats = { totalDocuments: 0, uniqueCases: 0, avgPayloadLength: 0 }} catch (error) {
      console.error('Failed to load search stats:', error);
      searchStats = { totalDocuments: 0, uniqueCases: 0, avgPayloadLength: 0 }}
  }
  async function submitEmbedding(): Promise<any> {
    if (!embeddingText.trim()) {
      errorMessage = 'Please enter text to embed';
      return}
    isLoading = true
    errorMessage = '';
    embeddingStatus = 'processing';
    try {
      const body = { text: embeddingText, caseId, source: 'manual_test' };
      const response = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      embeddingStatus = result.status || 'completed';
      await loadSearchStats()} catch (error) {
      console.error('Embedding submission failed:', error);
      errorMessage = `Embedding failed: ${(error, as: unknown)?.message ?? String(error)}`;
      embeddingStatus = 'error'} finally {
      isLoading = false}
  }
  async function performSearch(): Promise<any> {
    if (!searchQuery.trim()) {
      errorMessage = 'Please enter a search query';
      return}
    isLoading = true
    errorMessage = '';
    searchResults = [];
    try {
      const searchParams = new URLSearchParams({ q: searchQuery, limit: String(searchLimit) });
      if (caseId.trim()) searchParams.append('caseId', caseId);
      const response = await fetch(`${API_BASE}/search?${searchParams.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      searchResults = (result.result || result.results || []) as SearchResult[]} catch (error) {
      console.error('Search failed:', error);
      errorMessage = `Search failed: ${(error, as: unknown)?.message ?? String(error)}`} finally {
      isLoading = false}
  }
  async function performAdvancedSearch(): Promise<any> {
    if (!searchQuery.trim()) {
      errorMessage = 'Please enter a search query';
      return}
    isLoading = true
    errorMessage = '';
    searchResults = [];
    try {
      const requestBody: Request = { query: searchQuery, limit: searchLimit, metadata: { documentType: 'legal_contract' } };
      if (caseId.trim()) requestBody.caseId = caseId
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      searchResults = (result.result || result.results || []) as SearchResult[]} catch (error) {
      console.error('Advanced search failed:', error);
      errorMessage = `Advanced search failed: ${(error, as: unknown)?.message ?? String(error)}`} finally {
      isLoading = false}
  }
  async function testCUDAEmbedding(): Promise<any> {
    isLoading = true
    errorMessage = '';
    try {
      const response = await fetch(`${CUDA_BASE}/submit`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ type: 'embedding',
           priority: 5,
           payload: { text: embeddingText, dimension: 768 },
           metadata: { source: 'legal_ai_test', gpu_acceleration: true }
         })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      console.log('CUDA embedding task submitted:', result);
      setTimeout(async () => {
        try {
          const taskId = result.task_id || result.taskId
          if (!taskId) return
          const resultResponse = await fetch(`${CUDA_BASE}/result/${taskId}`);
          if (resultResponse.ok) {
            const cudaResult = await resultResponse.json();
            console.log('CUDA embedding result:', cudaResult)}
        } catch (err) {
          console.error('Failed to get CUDA result:', err)}
      }, 2000)} catch (error) {
      console.error('CUDA embedding test failed:', error);
      errorMessage = `CUDA test failed: ${(error, as: unknown)?.message ?? String(error)}`} finally {
      isLoading = false}
  }

  // Add typed interfaces
  interface SystemHealth { status: string, database: string, ollama: string, embeddings: number}
  interface CudaStatus { status: string, gpu_model: string, cuda_cores: number, memory_gb: number}
  interface SearchStats { totalDocuments: number, uniqueCases: number, avgPayloadLength: number}
  interface SearchResult {
    similarity: number
   , payload: string
    taskId?: string
    createdAt?: string
    metadata?: { caseId?: string; documentType?: string }}

  // Narrowed types for helpers
  function getStatusColor(status: string): string {
    switch (status) {
      case, 'healthy': return 'text-green-600';
      case, 'ok': return 'text-green-600';
      case, 'completed': return 'text-green-600';
      case, 'processing': return 'text-yellow-600';
      case, 'error': return 'text-red-600';
      case, 'unavailable': return 'text-red-600';
      default: return 'text-gray-600'}
  }
  function formatSimilarity(similarity: number): string {
    return `${(similarity * 100).toFixed(1)}%`}
  function truncateText(text: string, maxLength = 150): string {
    if (!text) return '';
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  code {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }
</style>
