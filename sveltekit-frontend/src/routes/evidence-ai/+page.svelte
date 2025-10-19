<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Button } from 'bits-ui';

  // ======================
  // SVELTE 5 RUNES STATE
  // ======================

  // WebSocket connection state
  let ws = $state<WebSocket | null>(null);
  let wsConnected = $state(false);
  let wsReconnecting = $state(false);

  // File upload state
  let selectedFile = $state<File | null>(null);
  let isDragging = $state(false);
  let uploadProgress = $state(0);
  let currentFileId = $state<string | null>(null);

  // Workflow state
  interface WorkflowStatus {
    stage: string;
    progress: number;
    status: 'pending' | 'processing' | 'complete' | 'error';
    message?: string;
  }
  let workflowStatus = $state<WorkflowStatus>({
    stage: 'idle',
    progress: 0,
    status: 'pending'
  });

  // Backend health state
  let backendStatus = $state<{
    typescript: boolean;
    pythonAI: boolean;
    capabilities: string[];
  }>({
    typescript: true,
    pythonAI: false,
    capabilities: []
  });

  // AI streaming state
  let streamingTokens = $state<string>('');
  let isStreaming = $state(false);
  let aiSource = $state<'ollama' | 'tensorrt' | 'typescript-fallback' | null>(null);

  // Auto-tags state
  let extractedTags = $state<string[]>([]);

  // Search state
  let searchQuery = $state('');
  let searchResults = $state<any[]>([]);
  let aiSuggestions = $state<any[]>([]);
  let isSearching = $state(false);

  // File metadata
  let fileMetadata = $state<{
    filename: string;
    size: number;
    uploadTime: string;
    analysis?: string;
  } | null>(null);

  // ======================
  // WEBSOCKET CONNECTION
  // ======================

  // Compute WebSocket URL using public env or infer from location, fallback to Docker Desktop python-ai (localhost:8000)
  function computeWsUrl(): string {
    // Prefer explicit public env var (set in Docker / Caddy)
    const envUrl = (import.meta as any).env?.PUBLIC_WS_URL || (import.meta as any).env?.VITE_WS_URL;
    if (envUrl) return envUrl;

    if (browser) {
      // If page served over TLS use wss, else ws
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      // Try same host first, common in proxied deployments
      return `${proto}://${location.host}/ws`;
    }

    // Fallback to Docker Desktop python AI service host
    const fallbackProtocol = 'ws';
    const fallbackHost = (import.meta as any).env?.PUBLIC_WS_HOST || 'localhost:8000';
    return `${fallbackProtocol}://${fallbackHost}/ws`;
  }

  // Reconnect backoff state
  let reconnectAttempts = 0;
  function resetBackoff() { reconnectAttempts = 0; }

  function connectWebSocket() {
    if (!browser) return;
    const url = computeWsUrl();
    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('✅ WebSocket connected to Python AI Server ->', url);
        wsConnected = true;
        wsReconnecting = false;
        resetBackoff();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.warn('Malformed WS message', e);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        wsConnected = false;
        ws = null;

        // Exponential backoff reconnect
        wsReconnecting = true;
        reconnectAttempts++;
        const backoff = Math.min(30000, 1000 * 2 ** Math.min(reconnectAttempts, 6));
        setTimeout(() => {
          console.log(`🔄 Reconnect attempt #${reconnectAttempts} (backoff ${backoff}ms)`);
          connectWebSocket();
        }, backoff);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      wsConnected = false;
    }
  }

  function handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'TOKEN':
        // Real-time token streaming
        streamingTokens += data.token;
        isStreaming = true;
        aiSource = data.source;

        // Extract tags on-the-fly (look for #hashtags)
        const tagMatch = data.token.match(/#(\w+)/);
        if (tagMatch && !extractedTags.includes(tagMatch[1])) {
          extractedTags = [...extractedTags, tagMatch[1]];
        }
        break;

      case 'COMPLETE':
        // Streaming complete
        isStreaming = false;
        console.log('✅ AI streaming complete');

        // Cache the final analysis
        if (fileMetadata && streamingTokens) {
          fileMetadata.analysis = streamingTokens;
        }
        break;

      case 'WORKFLOW_UPDATE':
        // Workflow progress update
        workflowStatus = {
          stage: data.stage,
          progress: data.progress,
          status: data.status,
          message: data.message
        };
        break;

      case 'ERROR':
        console.error('AI Error:', data.message);
        workflowStatus = {
          ...workflowStatus,
          status: 'error',
          message: data.message
        };
        break;

      case 'PONG':
        // Heartbeat response
        console.log('💓 Pong received');
        break;
    }
  }

  function sendQuery(query: string, fileId?: string) {
    if (!ws || !wsConnected || !ws?.readyState || ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not open; falling back to REST query where available');
      // Optionally call REST endpoint for analysis if WS not available (server must support)
      const apiBase = (import.meta as any).env?.PUBLIC_API_BASE || '/api/v2/evidence';
      fetch(`${apiBase}?action=analyze`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: JSON.stringify({ query, file_id: fileId || currentFileId })
      }).catch(err => console.warn('REST analysis fallback failed', err));
      streamingTokens = '';
      isStreaming = true;
      return;
    }

    ws.send(JSON.stringify({
      type: 'QUERY',
      query,
      file_id: fileId || currentFileId
    }));

    // Reset streaming state
    streamingTokens = '';
    isStreaming = true;
  }

  function subscribeToWorkflow(fileId: string) {
    if (!ws || ws?.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'SUBSCRIBE_WORKFLOW', file_id: fileId }));
  }

  // ======================
  // FILE UPLOAD
  // ======================

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      selectedFile = files[0];
    }
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      selectedFile = input.files[0];
    }
  }

  async function uploadFile() {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    // Get authenticated user from XState auth machine
    import xstateIntegration from '$lib/services/xstate-integration';
    const authState = xstateIntegration.getGlobalState('auth');
    const userId = authState?.context?.user?.id || 'anonymous';
    formData.append('user_id', userId);
    formData.append('caseId', 'case_001');

    try {
      uploadProgress = 0;
      workflowStatus = {
        stage: 'uploading',
        progress: 0,
        status: 'processing'
      };

      // Use unified API v2 endpoint (env-aware)
      const apiBase = (import.meta as any).env?.PUBLIC_API_BASE || '/api/v2/evidence';
      const response = await fetch(apiBase, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        currentFileId = result.aiProcessing?.file_id || result.evidence?.id;

        // Set file metadata
        fileMetadata = {
          filename: selectedFile.name,
          size: selectedFile.size,
        switch (result.source) {
          case 'python-ai':
            aiSource = 'ollama';
            break;
          case 'tensorrt':
            aiSource = 'tensorrt';
            break;
          default:
            aiSource = 'typescript-fallback';
        }
        };

        // Update backend status based on response
        aiSource = result.source === 'python-ai' ? 'ollama' : 'typescript-fallback';

        // Subscribe to workflow updates if supported (WS or REST fallback)
        if (result.aiProcessing) {
          if (ws && wsConnected) {
            subscribeToWorkflow(result.aiProcessing.file_id);
            sendQuery(`Analyze this legal evidence document: ${selectedFile.name}`, result.aiProcessing.file_id);
          } else {
            // REST analysis trigger if WS not present
            fetch(`${apiBase}?action=analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_id: result.aiProcessing.file_id, prompt: `Analyze this legal evidence document: ${selectedFile.name}` })
            }).catch(err => console.warn('REST analysis trigger failed', err));
          }
        }

        console.log(`✅ File uploaded (${result.source}):`, currentFileId);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      workflowStatus = {
        stage: 'error',
        progress: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // ======================
  // SEARCH FUNCTIONALITY
  // ======================

  // Use a platform-independent timeout type (works with DOM and Node types)
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;

  async function performSearch() {
    if (!searchQuery.trim()) {
      searchResults = [];
      aiSuggestions = [];
      return;
    }

    isSearching = true;

    try {
      // Use unified API v2 endpoint with vector search (env-aware)
      const apiBase = (import.meta as any).env?.PUBLIC_API_BASE || '/api/v2/evidence';
      const response = await fetch(
        `${apiBase}?action=search&q=${encodeURIComponent(searchQuery)}&vector=true&limit=10`
      );

      const data = await response.json();

      if (data.success) {
        searchResults = data.data || [];
        aiSuggestions = data.suggestions || [];

        // Update backend status indicator
        aiSource = data.source === 'python-ai' ? 'ollama' : 'typescript-fallback';

        if (data.source === 'typescript-fallback') {
          console.warn('Using basic search. Python AI backend unavailable.');
        }
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      isSearching = false;
    }
  }

  // Debounced search
  $effect(() => {
    if (searchQuery) {
      if (searchTimeout) clearTimeout(searchTimeout);
  onMount(() => {
    let mounted = true;

    (async () => {
      // Check backend health first
      try {
        // env-aware health endpoint
        const apiBase = (import.meta as any).env?.PUBLIC_API_BASE || '/api/v2/evidence';
        const healthResponse = await fetch(`${apiBase}?action=health`);
        const health = await healthResponse.json();
        if (!mounted) return;

        backendStatus = {
          typescript: health.backends?.typescript?.status === 'healthy',
          pythonAI: health.backends?.pythonAI?.status === 'healthy',
          capabilities: health.backends?.pythonAI?.capabilities || []
        };

        console.log('🏥 Backend Health:', backendStatus);
      } catch (error) {
        if (!mounted) return;
        console.error('Health check failed:', error);
        backendStatus.pythonAI = false;
      }

      // Connect WebSocket if Python AI is available
      if (backendStatus.pythonAI) {
        connectWebSocket();
      } else {
        console.warn('⚠️ Python AI backend unavailable. Some features will be limited.');
      }
    })();

    // Heartbeat ping every 30s
    const heartbeat = setInterval(() => {
      if (ws && wsConnected && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(heartbeat);
      if (ws) {
        ws.close();
      }
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  });

    return () => {
      mounted = false;
      clearInterval(heartbeat);
      if (ws) {
        ws.close();
      }
    };
  });

  // ======================
  // HELPER FUNCTIONS
  // ======================

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getStageIcon(stage: string): string {
    const icons: Record<string, string> = {
      idle: '⏸️',
      uploading: '📤',
      upload: '📤',
      ocr: '📝',
      embedding: '🧬',
      analysis: '🤖',
      storage: '💾',
      complete: '✅',
      error: '❌'
    };
  function getProgressColor(progress: number): string {
    // Use UnoCSS theme tokens for colors
    if (progress < 30) return 'bg-primary-error';
    if (progress < 70) return 'bg-primary-warning';
    return 'bg-primary-success';
  }
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  }
</script>

<!-- ============================================ -->
<!-- MAIN TEMPLATE -->
<!-- ============================================ -->

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
  <div class="max-w-7xl mx-auto">

    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        🧠 Evidence AI Assistant
      </h1>
      <p class="text-slate-400">
        Upload documents, get AI-powered analysis with real-time streaming
      </p>

      <!-- Connection Status -->
      <div class="mt-4 flex items-center gap-2 flex-wrap">
        <!-- WebSocket Status -->
        <div class="flex items-center gap-2 px-3 py-1 rounded-full {wsConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
          <div class="w-2 h-2 rounded-full {wsConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse"></div>
          <span class="text-sm font-medium">
            {wsConnected ? 'WebSocket Connected' : wsReconnecting ? 'Reconnecting...' : 'WebSocket Offline'}
          </span>
        </div>

        <!-- Backend Status -->
        {#if backendStatus.pythonAI}
          <div class="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
            🐍 Python AI: Online
          </div>
        {:else}
          <div class="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">
            📘 TypeScript Mode
          </div>
        {/if}

        <!-- AI Source Indicator -->
        {#if aiSource}
          <div class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
            {#if aiSource === 'ollama'}
              🚀 Ollama (Vector Search)
            {:else if aiSource === 'tensorrt'}
              ⚡ TensorRT (GPU Accelerated)
            {:else}
              📊 Basic Search (Fallback)
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Left Column: Upload & Controls -->
      <div class="lg:col-span-1 space-y-6">

        <!-- File Upload Card -->
        <div class="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
          <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
            📁 Upload Evidence
          </h2>

          <!-- Drag & Drop Zone -->
          <div
            role="region"
            aria-label="File upload drop zone"
            class="border-2 border-dashed rounded-lg p-8 text-center transition-all {isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-slate-600 hover:border-slate-500'}"
            on:dragover={handleDragOver}
            on:dragleave={handleDragLeave}
            on:drop={handleDrop}
          >
            {#if selectedFile}
              <div class="space-y-2">
                <div class="text-4xl">📄</div>
                <p class="font-medium text-slate-200">{selectedFile.name}</p>
                <p class="text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
                <button
                  class="text-xs text-red-400 hover:text-red-300 mt-2"
                  on:click={() => selectedFile = null}
                >
                  Remove
                </button>
              </div>
            {:else}
              <div class="space-y-2">
                <div class="text-4xl">📎</div>
                <p class="text-slate-300">Drag & drop file here</p>
                <p class="text-sm text-slate-500">or click to browse</p>
              </div>
            {/if}

            <input
              type="file"
              class="hidden"
              id="fileInput"
              on:change={handleFileSelect}
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            />
            <label
              for="fileInput"
              class="mt-4 inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer transition-colors"
            >
              Choose File
            </label>
          </div>

          <!-- Upload Button -->
          <button
            class="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={uploadFile}
            disabled={!selectedFile || !wsConnected || isStreaming}
          >
            {isStreaming ? '🔄 Processing...' : '🚀 Upload & Analyze'}
          </button>
        </div>

        <!-- File Metadata Card -->
        {#if fileMetadata}
          <div class="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <h3 class="text-lg font-semibold mb-3">📋 File Info</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-400">Filename:</span>
                <span class="text-slate-200 font-medium">{fileMetadata.filename}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Size:</span>
                <span class="text-slate-200">{formatFileSize(fileMetadata.size)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Uploaded:</span>
                <span class="text-slate-200">{new Date(fileMetadata.uploadTime).toLocaleTimeString()}</span>
              </div>
              {#if currentFileId}
                <div class="flex justify-between">
                  <span class="text-slate-400">ID:</span>
                  <span class="text-slate-200 font-mono text-xs">{currentFileId.slice(0, 12)}...</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Workflow Progress Card -->
        {#if workflowStatus.stage !== 'idle'}
          <div class="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
              {getStageIcon(workflowStatus.stage)} Workflow Progress
            </h3>

            <!-- Progress Bar -->
            <div class="mb-3">
              <div class="flex justify-between text-sm mb-1">
                <span class="text-slate-400 capitalize">{workflowStatus.stage}</span>
                <span class="text-slate-200 font-medium">{workflowStatus.progress}%</span>
              </div>
              <div class="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  class="h-full {getProgressColor(workflowStatus.progress)} transition-all duration-500"
                  style="width: {workflowStatus.progress}%"
                ></div>
              </div>
            </div>

            {#if workflowStatus.message}
              <p class="text-sm text-slate-400 mt-2">{workflowStatus.message}</p>
            {/if}

            <!-- Status Badge -->
            <div class="mt-3">
              {#if workflowStatus.status === 'complete'}
                <span class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                  ✅ Complete
                </span>
              {:else if workflowStatus.status === 'error'}
                <span class="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                  ❌ Error
                </span>
              {:else if workflowStatus.status === 'processing'}
                <span class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium animate-pulse">
                  🔄 Processing
                </span>
              {/if}
            </div>
          </div>
        {/if}

      </div>

      <!-- Right Column: AI Output & Search -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Search Bar -->
        <div class="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
          <div class="flex gap-3">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="🔍 Search evidence with AI assistance..."
              class="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              class="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium transition-colors disabled:opacity-50"
              on:click={performSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? '🔄' : '🔍'}
            </button>
          </div>

          <!-- AI Suggestions -->
          {#if aiSuggestions.length > 0}
            <div class="mt-4 space-y-2">
              <p class="text-sm text-slate-400">💡 AI Suggestions:</p>
              <div class="flex flex-wrap gap-2">
                {#each aiSuggestions as suggestion}
                  <button
                    class="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-full text-sm transition-colors"
                    on:click={() => searchQuery = suggestion.insight}
                  >
                    {suggestion.insight}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- AI Streaming Terminal -->
        <div class="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
          <div class="bg-slate-900/50 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
            <span class="text-sm font-medium text-slate-300">🤖 AI Analysis Stream</span>
            {#if isStreaming}
              <span class="text-xs text-green-400 flex items-center gap-1">
                <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Streaming...
              </span>
            {/if}
          </div>

          <div class="p-6 max-h-96 overflow-y-auto">
            {#if streamingTokens}
              <pre class="font-mono text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{streamingTokens}</pre>
            {:else}
              <p class="text-slate-500 text-center py-12">
                ⏸️ Upload a file to see AI analysis streaming here...
              </p>
            {/if}
          </div>
        </div>

        <!-- Auto-Tags Display -->
        {#if extractedTags.length > 0}
          <div class="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
              🏷️ Auto-Extracted Tags
            </h3>
            <div class="flex flex-wrap gap-2">
              {#each extractedTags as tag}
                <span class="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-300 rounded-full text-sm font-medium">
                  #{tag}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Search Results -->
        {#if searchResults.length > 0}
          <div class="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
            <h3 class="text-lg font-semibold mb-4">📊 Search Results ({searchResults.length})</h3>
            <div class="space-y-3">
              {#each searchResults as result}
                <div class="bg-slate-900/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                  <div class="flex items-start justify-between mb-2">
                    <h4 class="font-medium text-slate-200">{result.filename || result.file_id}</h4>
                    {#if result.vector_score}
                      <span class="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                        {(result.vector_score * 100).toFixed(1)}% match
                      </span>
                    {/if}
                  </div>
                  {#if result.snippet}
                    <p class="text-sm text-slate-400 mb-2">{result.snippet}</p>
                  {/if}
                  {#if result.tags}
                    <div class="flex flex-wrap gap-1">
                      {#each result.tags as tag}
                        <span class="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                          #{tag}
                        </span>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

      </div>
    </div>

  </div>
</div>

<style>
  /* Custom scrollbar for terminal */
  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.3);
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: rgba(100, 116, 139, 0.5);
    border-radius: 4px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.7);
  }

  /* Smooth animations */
  @keyframes pulse {
    0%, 100% {
      opacity: 1,
    }
    50% {
      opacity: 0.5,
    }
  }
</style>
