<!-- Legal AI Embedding & Search Test Component -->
<script>
  import { onMount } from 'svelte';

  interface Props {
    // No props needed for this demo
  }

  let : Props = $props();

  // State management with Svelte 5 runes
  let embeddingText = $state('Legal contract clause regarding intellectual property rights and patent licensing agreements');
  let searchQuery = $state('intellectual property patent');
  let caseId = $state('CASE_2024_001');
  let searchLimit = $state(5);

  let embeddingStatus = $state('idle');
  let searchResults = $state([]);
  let searchStats = $state(null);
  let systemHealth = $state( );
  let cudaStatus = $state( );

  let isLoading = $state(false);
  let errorMessage = $state('');

  const API_BASE = 'http://localhost:8095/api/v1';
  const CUDA_BASE = 'http://localhost:8096/api/v1';

  // Health check on component mount
  onMount(async () => {
    await checkSystemHealth();
    await loadSearchStats();
    await checkCUDAStatus();
  });

  async function checkSystemHealth() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      systemHealth = await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  async function checkCUDAStatus() {
    try {
      const response = await fetch(`${CUDA_BASE}/health`);
      cudaStatus = await response.json();
    } catch (error) {
      console.error('CUDA health check failed:', error);
      cudaStatus = { status: 'unavailable' };
    }
  }

  async function loadSearchStats() {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      searchStats = await response.json();
    } catch (error) {
      console.error('Failed to load search stats:', error);
    }
  }

  async function submitEmbedding() {
    if (!embeddingText.trim()) {
      errorMessage = 'Please enter text to embed';
      return;
    }

    isLoading = true;
    errorMessage = '';
    embeddingStatus = 'processing';

    try {
      const response = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify.toISOString(),
            source: 'manual_test'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      embeddingStatus = result.status;

      // Refresh stats after successful embedding
      await loadSearchStats();

    } catch (error) {
      console.error('Embedding submission failed:', error);
      errorMessage = `Embedding failed: ${error.message}`;
      embeddingStatus = 'error';
    } finally {
      isLoading = false;
    }
  }

  async function performSearch() {
    if (!searchQuery.trim()) {
      errorMessage = 'Please enter a search query';
      return;
    }

    isLoading = true;
    errorMessage = '';
    searchResults = [];

    try {
      const searchParams = new URLSearchParams({
        q: searchQuery,
        limit: searchLimit.toString()
      });

      if (caseId.trim()) {
        searchParams.append('caseId', caseId);
      }

      const response = await fetch(`${API_BASE}/search?${searchParams}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      searchResults = result.results;

    } catch (error) {
      console.error('Search failed:', error);
      errorMessage = `Search failed: ${error.message}`;
    } finally {
      isLoading = false;
    }
  }

  async function performAdvancedSearch() {
    if (!searchQuery.trim()) {
      errorMessage = 'Please enter a search query';
      return;
    }

    isLoading = true;
    errorMessage = '';
    searchResults = [];

    try {
      const requestBody = {
        query: searchQuery,
        limit: searchLimit,
        metadata: {
          documentType: 'legal_contract'
        }
      };

      if (caseId.trim()) {
        requestBody.caseId = caseId;
      }

      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      searchResults = result.results;

    } catch (error) {
      console.error('Advanced search failed:', error);
      errorMessage = `Advanced search failed: ${error.message}`;
    } finally {
      isLoading = false;
    }
  }

  async function testCUDAEmbedding() {
    isLoading = true;
    errorMessage = '';

    try {
      const response = await fetch(`${API_BASE}/cuda/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'embedding',
          priority: 5,
          payload: {
            text: embeddingText,
            dimension: 768
          },
          metadata: {
            source: 'legal_ai_test',
            gpu_acceleration: 'true'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('CUDA embedding task submitted:', result);

      // Poll for result (simplified)
      setTimeout(async () => {
        try {
          const resultResponse = await fetch(`${API_BASE}/cuda/result/${result.task_id}`);
          if (resultResponse.ok) {
            const cudaResult = await resultResponse.json();
            console.log('CUDA embedding result:', cudaResult);
          }
        } catch (err) {
          console.error('Failed to get CUDA result:', err);
        }
      }, 2000);

    } catch (error) {
      console.error('CUDA embedding test failed:', error);
      errorMessage = `CUDA test failed: ${error.message}`;
    } finally {
      isLoading = false;
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'ok': return 'text-green-600';
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'unavailable': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  function formatSimilarity(similarity) {
    return `${(similarity * 100).toFixed(1)}%`;
  }

  function truncateText(text, maxLength = 150) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
</script>

<div class="legal-ai-test-container max-w-6xl mx-auto p-6 space-y-8">
  <!-- Header -->
  <div class="text-center">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Legal AI Embedding & Search Test</h1>
    <p class="text-gray-600">End-to-end testing of Ollama embeddings, PostgreSQL vector storage, and CUDA acceleration</p>
  </div>

  <!-- System Status Dashboard -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Main Service Health -->
    <div class="bg-white rounded-lg shadow p-4 border">
      <h3 class="font-semibold text-gray-800 mb-2">Legal AI Service</h3>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span>Status:</span>
          <span class="{getStatusColor(systemHealth.status)}">{systemHealth.status || 'checking...'}</span>
        </div>
        <div class="flex justify-between">
          <span>Database:</span>
          <span class="{getStatusColor(systemHealth.database)}">{systemHealth.database || 'checking...'}</span>
        </div>
        <div class="flex justify-between">
          <span>Ollama:</span>
          <span class="{getStatusColor(systemHealth.ollama)}">{systemHealth.ollama || 'checking...'}</span>
        </div>
        <div class="flex justify-between">
          <span>Embeddings:</span>
          <span class="text-blue-600">{systemHealth.embeddings || 0}</span>
        </div>
      </div>
    </div>

    <!-- CUDA Worker Status -->
    <div class="bg-white rounded-lg shadow p-4 border">
      <h3 class="font-semibold text-gray-800 mb-2">CUDA Worker (RTX 3060 Ti)</h3>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span>Status:</span>
          <span class="{getStatusColor(cudaStatus.status)}">{cudaStatus.status || 'checking...'}</span>
        </div>
        <div class="flex justify-between">
          <span>GPU Model:</span>
          <span class="text-blue-600">{cudaStatus.gpu_model || 'RTX 3060 Ti'}</span>
        </div>
        <div class="flex justify-between">
          <span>CUDA Cores:</span>
          <span class="text-blue-600">{cudaStatus.cuda_cores || 4864}</span>
        </div>
        <div class="flex justify-between">
          <span>Memory:</span>
          <span class="text-blue-600">{cudaStatus.memory_gb || 8}GB</span>
        </div>
      </div>
    </div>

    <!-- Search Statistics -->
    <div class="bg-white rounded-lg shadow p-4 border">
      <h3 class="font-semibold text-gray-800 mb-2">Search Statistics</h3>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span>Documents:</span>
          <span class="text-blue-600">{searchStats?.totalDocuments || 0}</span>
        </div>
        <div class="flex justify-between">
          <span>Cases:</span>
          <span class="text-blue-600">{searchStats?.uniqueCases || 0}</span>
        </div>
        <div class="flex justify-between">
          <span>Avg Length:</span>
          <span class="text-blue-600">{searchStats?.avgPayloadLength || 0} words</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Error Display -->
  {#if errorMessage}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
      {errorMessage}
    </div>
  {/if}

  <!-- Embedding Submission Section -->
  <div class="bg-white rounded-lg shadow p-6 border">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">1. Submit Legal Document for Embedding</h2>

    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Case ID</label>
          <input
            type="text"
            bind:value={caseId}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., CASE_2024_001"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status:
            <span class="{getStatusColor(embeddingStatus)}">{embeddingStatus}</span>
          </label>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Legal Document Text</label>
        <textarea
          bind:value={embeddingText}
          rows="4"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter legal document text here..."
        ></textarea>
      </div>

      <div class="flex space-x-4">
        <button
          onclick={submitEmbedding}
          disabled={isLoading}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Submit for Embedding (Ollama)'}
        </button>

        <button
          onclick={testCUDAEmbedding}
          disabled={isLoading || cudaStatus.status !== 'healthy'}
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Test CUDA Embedding'}
        </button>
      </div>
    </div>
  </div>

  <!-- Search Section -->
  <div class="bg-white rounded-lg shadow p-6 border">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">2. Vector Similarity Search</h2>

    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Search Query</label>
          <input
            type="text"
            bind:value={searchQuery}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., intellectual property patent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Limit</label>
          <input
            type="number"
            bind:value={searchLimit}
            min="1"
            max="20"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="flex space-x-4">
        <button
          onclick={performSearch}
          disabled={isLoading}
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching...' : 'Simple Search (GET)'}
        </button>

        <button
          onclick={performAdvancedSearch}
          disabled={isLoading}
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching...' : 'Advanced Search (POST)'}
        </button>
      </div>
    </div>
  </div>

  <!-- Search Results -->
  {#if searchResults.length > 0}
    <div class="bg-white rounded-lg shadow p-6 border">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Search Results ({searchResults.length})</h2>

      <div class="space-y-4">
        {#each searchResults as result, index}
          <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-medium text-gray-800">Result #{index + 1}</h3>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-600">Similarity:</span>
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                  {formatSimilarity(result.similarity)}
                </span>
              </div>
            </div>

            <p class="text-gray-700 mb-3">{truncateText(result.payload)}</p>

            <div class="flex flex-wrap gap-2 text-xs text-gray-500">
              <span>Task ID: {result.taskId}</span>
              <span>•</span>
              <span>Created: {new Date(result.createdAt).toLocaleString()}</span>
              {#if result.metadata?.caseId}
                <span>•</span>
                <span>Case: {result.metadata.caseId}</span>
              {/if}
              {#if result.metadata?.documentType}
                <span>•</span>
                <span>Type: {result.metadata.documentType}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else if searchResults.length === 0 && !isLoading}
    <div class="bg-gray-50 rounded-lg p-8 text-center">
      <p class="text-gray-600">No search results yet. Submit a search query to see vector similarity results.</p>
    </div>
  {/if}

  <!-- API Endpoints Reference -->
  <div class="bg-gray-50 rounded-lg p-6 border">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">API Endpoints Reference</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div>
        <h3 class="font-medium text-gray-700 mb-2">Legal AI Service (Port 8095)</h3>
        <ul class="space-y-1 text-gray-600">
          <li><code class="bg-gray-200 px-1 rounded">GET /api/v1/health</code> - Service health</li>
          <li><code class="bg-gray-200 px-1 rounded">POST /api/v1/submit</code> - Submit embedding</li>
          <li><code class="bg-gray-200 px-1 rounded">GET /api/v1/search?q=...</code> - Simple search</li>
          <li><code class="bg-gray-200 px-1 rounded">POST /api/v1/search</code> - Advanced search</li>
          <li><code class="bg-gray-200 px-1 rounded">GET /api/v1/stats</code> - Search statistics</li>
        </ul>
      </div>

      <div>
        <h3 class="font-medium text-gray-700 mb-2">CUDA Worker (Port 8096)</h3>
        <ul class="space-y-1 text-gray-600">
          <li><code class="bg-gray-200 px-1 rounded">GET /api/v1/health</code> - CUDA health</li>
          <li><code class="bg-gray-200 px-1 rounded">POST /api/v1/submit</code> - Submit CUDA task</li>
          <li><code class="bg-gray-200 px-1 rounded">GET /api/v1/workers</code> - Worker status</li>
          <li><code class="bg-gray-200 px-1 rounded">GET /api/v1/metrics</code> - Performance metrics</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
  code {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }
</style>