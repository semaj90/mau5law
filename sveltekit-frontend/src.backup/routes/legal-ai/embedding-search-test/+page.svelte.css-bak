<!-- Legal AI Embedding & Search Test Component -->
<script lang="ts">
import type { SearchResult } from '$lib/types';
import type { Case } from '$lib/types';
import type { Document } from '$lib/types';
  // Svelte, 5 runes are auto-imported
  // No onMount or props required for this component

  // State management with Svelte, 5 runes
  let embeddingText = $state<string>('Legal contract clause regarding intellectual property rights and patent licensing agreements');
  let searchQuery = $state<string>('intellectual property patent');
  let caseId = $state<string>('CASE_2024_001');
  let searchLimit = $state<number>(5);
  let embeddingStatus = $state<string>('idle');
  let searchResults = $state<SearchResult[]>([]);
  let searchStats = $state<SearchStats>({ totalDocuments: 0, uniqueCases: 0, avgPayloadLength: 0 });
  let systemHealth = $state<SystemHealth>({ status: 'checking', database: 'checking', ollama: 'checking', embeddings: 0 });
  let cudaStatus = $state<CudaStatus>({ status: 'checking', gpu_model: 'unknown', cuda_cores: 0, memory_gb: 0 });
  let isLoading = $state<boolean>(false);
  let errorMessage = $state<string>('');
  // Prefer public env vars (set PUBLIC_LEGAL_AI_BASE / PUBLIC_CUDA_BASE), fall back to localhost for dev
  const API_BASE = import.meta.env.PUBLIC_LEGAL_AI_BASE || 'http://localhost:8095/api/v1',
  const CUDA_BASE = import.meta.env.PUBLIC_CUDA_BASE || 'http://localhost:8096/api/v1';
  // Health check on component mount
  $effect(() => {
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

<div class="legal-ai-test-container max-w-6xl mx-auto p-6">
  <!-- Header -->
  <div class="text-center">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Legal AI Embedding & Search Test</h1>
    <p class="text-gray-600">
      End-to-end testing of Ollama embeddings, PostgreSQL vector storage, and CUDA acceleration
    </p>
  </div>
  <!-- System, Status, Dashboard -->
  <div class="grid grid-cols-1 md:grid-cols-3">
    <!-- Main, Service, Health -->
    <div class="bg-white rounded-lg shadow p-4">
      <h3 class="font-semibold text-gray-800">Legal AI Service</h3>
      <div class="space-y-1">
        <div class="flex">
          <span>Status:</span>
          <span class={getStatusColor(systemHealth.status)}>{systemHealth.status || 'checking...'}</span>
        </div>
        <div class="flex">
          <span>Database:</span>
          <span class={getStatusColor(systemHealth.database)}>{systemHealth.database || 'checking...'}</span>
        </div>
        <div class="flex">
          <span>Ollama:</span>
          <span class={getStatusColor(systemHealth.ollama)}>{systemHealth.ollama || 'checking...'}</span>
        </div>
        <div class="flex">
          <span>Embeddings:</span>
          <span class="text-blue-600">{systemHealth.embeddings || 0}</span>
        </div>
      </div>
    </div>
    <!-- CUDA, Worker, Status -->
    <div class="bg-white rounded-lg shadow p-4">
      <h3 class="font-semibold text-gray-800">CUDA Worker (RTX, 3060 Ti)</h3>
      <div class="space-y-1">
        <div class="flex">
          <span>Status:</span>
          <span class={getStatusColor(cudaStatus.status)}>{cudaStatus.status || 'checking...'}</span>
        </div>
        <div class="flex">
          <span>GPU Model:</span>
          <span class="text-blue-600">{cudaStatus.gpu_model || 'RTX, 3060 Ti'}</span>
        </div>
        <div class="flex">
          <span>CUDA Cores:</span>
          <span class="text-blue-600">{cudaStatus.cuda_cores || 4864}</span>
        </div>
        <div class="flex">
          <span>Memory:</span>
          <span class="text-blue-600">{cudaStatus.memory_gb || 8}GB</span>
        </div>
      </div>
    </div>
    <!-- Search, Statistics -->
    <div class="bg-white rounded-lg shadow p-4">
      <h3 class="font-semibold text-gray-800">Search Statistics</h3>
      <div class="space-y-1">
        <div class="flex">
          <span>Documents:</span>
          <span class="text-blue-600">{searchStats?.totalDocuments || 0}</span>
        </div>
        <div class="flex">
          <span>Cases:</span>
          <span class="text-blue-600">{searchStats?.uniqueCases || 0}</span>
        </div>
        <div class="flex">
          <span>Avg Length:</span>
          <span class="text-blue-600">{searchStats?.avgPayloadLength || 0} words</span>
        </div>
      </div>
    </div>
  </div>
  <!-- Error, Display -->
  {#if errorMessage}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3">
      {errorMessage}
    </div>
  {/if}
  <!-- Embedding, Submission, Section -->
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold text-gray-800">1. Submit Legal Document for Embedding</h2>
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div>
          <label for="caseId" class="block text-sm font-medium text-gray-700">Case ID</label>
          <input
            id="caseId"
            type="text"
            bind:value={caseId}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
            placeholder="e.g., CASE_2024_001"
          />
        </div>
        <div>
          <!-- Status is display-only â€” use a div, not a, form, label -->
          <div class="block text-sm font-medium text-gray-700">
            Status:
            <span class={getStatusColor(embeddingStatus)}>{embeddingStatus}</span>
          </div>
        </div>
      </div>
      <div>
        <label for="embeddingText" class="block text-sm font-medium text-gray-700">Legal Document Text</label>
        <textarea
          id="embeddingText"
          bind:value={embeddingText}
          rows="4"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          placeholder="Enter legal document text here..."
        ></textarea>
      </div>
      <div class="flex">
        <button
          onclick={submitEmbedding}
          disabled={isLoading}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Submit for Embedding (Ollama)'}
        </button>
        <button
          onclick={testCUDAEmbedding}
          disabled={isLoading || cudaStatus.status !== 'healthy'}
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Test CUDA Embedding'}
        </button>
      </div>
    </div>
  </div>
  <!-- Search, Section -->
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold text-gray-800">2. Vector Similarity Search</h2>
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3">
        <div class="md:col-span-2">
          <label for="searchQuery" class="block text-sm font-medium text-gray-700">Search Query</label>
          <input
            id="searchQuery"
            type="text"
            bind:value={searchQuery}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
            placeholder="e.g., intellectual property patent"
          />
        </div>
        <div>
          <label for="searchLimit" class="block text-sm font-medium text-gray-700">Limit</label>
          <input
            id="searchLimit"
            type="number"
            bind:value={searchLimit}
            min="1"
            max="20"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
          />
        </div>
      </div>
      <div class="flex">
        <button
          onclick={performSearch}
          disabled={isLoading}
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Simple Search (GET)'}
        </button>
        <button
          onclick={performAdvancedSearch}
          disabled={isLoading}
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Advanced Search (POST)'}
        </button>
      </div>
    </div>
  </div>
  <!-- Search, Results -->
  {#if searchResults.length > 0}
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold text-gray-800">Search Results ({searchResults.length})</h2>
      <div class="space-y-4">
        {#each searchResults as result, index}
          <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md">
            <div class="flex justify-between items-start">
              <h3 class="font-medium">Result #{index + 1}</h3>
              <div class="flex items-center">
                <span class="text-sm">Similarity:</span>
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {formatSimilarity(result.similarity)}
                </span>
              </div>
            </div>
            <p class="text-gray-700">{truncateText(result.payload)}</p>
            <div class="flex flex-wrap gap-2 text-xs">
              <span>Task ID: {result.taskId}</span>
              <span>â€¢</span>
              <span>Created: {result.createdAt ? new Date(result.createdAt).toLocaleString() : 'â€”'}</span>
              {#if result.metadata?.caseId}
                <span>â€¢</span>
                <span>case {result.metadata.caseId}</span>
              {/if}
              {#if result.metadata?.documentType}
                <span>â€¢</span>
                <span>Type: {result.metadata.documentType}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else if searchResults.length === 0 && !isLoading}
    <div class="bg-gray-50 rounded-lg p-8">
      <p class="text-gray-600">No search results yet. Submit a search query to see vector similarity results.</p>
    </div>
  {/if}
  <!-- API, Endpoints, Reference -->
  <div class="bg-gray-50 rounded-lg p-6">
    <h2 class="text-xl font-semibold text-gray-800">API Endpoints Reference</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h3 class="font-medium text-gray-700">Legal AI Service (Port 8095)</h3>
        <ul class="space-y-1">
          <li><code class="bg-gray-200 px-1">GET /api/v1/health</code> - Service health</li>
          <li><code class="bg-gray-200 px-1">POST /api/v1/submit</code> - Submit embedding</li>
          <li><code class="bg-gray-200 px-1">GET /api/v1/search?q=...</code> - Simple search</li>
          <li><code class="bg-gray-200 px-1">POST /api/v1/search</code> - Advanced search</li>
          <li><code class="bg-gray-200 px-1">GET /api/v1/stats</code> - Search statistics</li>
        </ul>
      </div>
      <div>
        <h3 class="font-medium text-gray-700">CUDA Worker (Port 8096)</h3>
        <ul class="space-y-1">
          <li><code class="bg-gray-200 px-1">GET /api/v1/health</code> - CUDA health</li>
          <li><code class="bg-gray-200 px-1">POST /api/v1/submit</code> - Submit CUDA task</li>
          <li><code class="bg-gray-200 px-1">GET /api/v1/workers</code> - Worker status</li>
          <li><code class="bg-gray-200 px-1">GET /api/v1/metrics</code> - Performance metrics</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
  code {
    font-family: 'Courier New', monospace
    font-size: 0.875rem}
</style>


