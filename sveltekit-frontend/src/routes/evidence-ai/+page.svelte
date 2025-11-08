<script lang="ts">
import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Button } from 'bits-ui';
  import xstateIntegration from '$lib/services/xstate-integration';

  // ======================
  // SVELTE, 5 RUNES STATE
  // ======================

  // WebSocket connection state
  let ws = $state<WebSocket | null>(null);
  let wsConnected = $state<boolean>(false);
  let wsReconnecting = $state<boolean>(false);

  // File upload state
  let selectedFile = $state<File | null>(null);
  let isDragging = $state<boolean>(false);
  let uploadProgress = $state<number>(0);
  let currentFileId = $state<string | null>(null);

  // Workflow state
  interface WorkflowStatus {
    stage: string
    progress: number
    status: 'pending' | 'processing' | 'complete' | 'error';
    message?: string}
  let workflowStatus = $state<WorkflowStatus>({ stage: 'idle',
    progress: 0,
    status: 'pending'
  });

  // Backend health state
  let backendStatus = $state<{
    typescript: boolean
    pythonAI: boolean
    capabilities: string[]}>({ typescript: true,
    pythonAI: false,
    capabilities: []
  });

  // AI streaming state
  let streamingTokens = $state<string>('');
  let isStreaming = $state<boolean>(false);
  let aiSource = $state<'ollama' | 'tensorrt' | 'typescript-fallback' | null>(null);

  // Auto-tags state
  let extractedTags = $state<string[]>([]);

  // Search state
  let searchQuery = $state<string>('');
  let searchResults = $state<any[]>([]);
  let aiSuggestions = $state<any[]>([]);
  let isSearching = $state<boolean>(false);

  // File metadata
  let fileMetadata = $state<{
    filename: string
    size: number
   , uploadTime: string
    analysis?: string} | null>(null);

  // ======================
  // WEBSOCKET CONNECTION
  // ======================

  // Compute WebSocket URL using public env or infer from location, fallback to Docker Desktop python-ai (localhost:8000)
  function computeWsUrl(): string {
    // Prefer explicit public env var (set in Docker / Caddy)
    const envUrl = (import.meta as: unknown).env?.PUBLIC_WS_URL || (import.meta as: unknown).env?.VITE_WS_URL
    if (envUrl) return envUrl
    if (browser) {
      // If page served over TLS use wss, else ws
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      // Try same host first, common in proxied deployments
      return `${proto}://${location.host}/ws`}

    // Fallback to Docker Desktop python AI service host
    const fallbackProtocol = 'ws';
    const fallbackHost = (import.meta as: unknown).env?.PUBLIC_WS_HOST || 'localhost:8000',
    return `${fallbackProtocol}://${fallbackHost}/ws`}

  // Reconnect backoff state
  let reconnectAttempts = 0
  function resetBackoff() { reconnectAttempts = 0}
  function connectWebSocket() {
    if (!browser) return
    const url = computeWsUrl();
    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('âœ… WebSocket connected to Python AI Server ->', url);
        wsConnected = true
        wsReconnecting = false
        resetBackoff()};

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data)} catch (e) {
          console.warn('Malformed WS message', e)}
      };

      ws.onerror = (error) => {
        console.error('âŒ WebSocket error:', error);
'
      };

      ws.onclose = () => {
        console.log('ðŸ”Œ WebSocket disconnected');
        wsConnected = false
        ws = null
        // Exponential backoff reconnect
        wsReconnecting = true
        reconnectAttempts++;
        const backoff = Math.min(30000, 1000 * 2 ** Math.min(reconnectAttempts, 6));
        setTimeout(() => {
          console.log(`ðŸ”„ Reconnect attempt #${reconnectAttempts} (backoff ${backoff}ms)`);
          connectWebSocket()}, backoff)}} catch (error) {
      console.error('Failed to create WebSocket:', error);
      wsConnected = false}
  }
  function handleWebSocketMessage(data: Record<string, unknown>) {
    switch (data.type) {
      case, 'TOKEN':
        // Real-time token streaming
        streamingTokens += data.token
        isStreaming = true
        aiSource = data.source
        // Extract tags on-the-fly (look for #hashtags)
        const tagMatch = data.token.match(/#(\w+)/);
        if (tagMatch && !extractedTags.includes(tagMatch[1])) {
          extractedTags = [...extractedTags, tagMatch[1]]}
        break
      case, 'COMPLETE':
        // Streaming complete
        isStreaming = false
        console.log('âœ… AI streaming complete');

        // Cache the final analysis
        if (fileMetadata && streamingTokens) {
          fileMetadata = { ...fileMetadata, analysis: streamingTokens }}
        break
      case, 'WORKFLOW_UPDATE':
        // Workflow progress update
        workflowStatus = {
          stage: data.stage,
          progress: data.progress,
          status: data.status,
          message: data.message
        };
        break
      case, 'ERROR':
        console.error('AI Error:', data.message);
        workflowStatus = {
          ...workflowStatus,
          status: 'error',
          message: data.message
        };
        break
      case, 'PONG':
        // Heartbeat response
        console.log('ðŸ’“ Pong received');
        break}
  }
  function sendQuery(query: string, fileId?: string) {
    if (!ws || !wsConnected || ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not open; falling back to REST query where available');
      // Optionally call REST endpoint for analysis if WS not available (server must support)
      const apiBase = (import.meta as: unknown).env?.PUBLIC_API_BASE || '/api/v2/evidence';
      fetch(`${apiBase}?action=analyze`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, file_id: fileId || currentFileId })
      }).catch(err => console.warn('REST analysis fallback failed', err));
      streamingTokens = '';
      isStreaming = true
      return}

    ws.send(JSON.stringify({
      type: 'QUERY',
      query,
      file_id: fileId || currentFileId
    }));

    // Reset streaming state
    streamingTokens = '';
    isStreaming = true}
  function subscribeToWorkflow(fileId: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'SUBSCRIBE_WORKFLOW', file_id: fileId }))}

  // ======================
  // FILE UPLOAD
  // ======================

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true}
  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false}
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false
    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      selectedFile = files[0]}
  }
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      selectedFile = input.files[0]}
  }
  async function uploadFile(): Promise<any> {
    if (!selectedFile) return
    const formData = new FormData();
    formData.append('file', selectedFile);
    // Get authenticated user from XState auth machine (use top-level import)
    // replaced deprecated/non-existent method getGlobalState(...) with safe access to globalState
    const _global = (xstateIntegration as: unknown)?.globalState
    // authState may be stored under .auth or be the top-level state: object, handle both
    const authState = _global?.auth ?? _global ?? null
    const userId = authState?.context?.user?.id || 'anonymous';
    formData.append('user_id', userId);
    formData.append('caseId', 'case_001');

    // Ensure apiBase is available for upload and later analysis triggers
    const apiBase = (import.meta as: unknown).env?.PUBLIC_API_BASE || '/api/v2/evidence';

    try {
      uploadProgress = 0
      workflowStatus = {
        stage: 'uploading',
        progress: 0,
        status: 'processing'
      };

      // Perform upload to unified API v2
      const response = await fetch(`${apiBase}?action=upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      // mark upload complete
      uploadProgress = 100
      if (result.success) {
        currentFileId = result.aiProcessing?.file_id || result.evidence?.id
        // Set file metadata
        fileMetadata = {
          filename: selectedFile.name,
          size: selectedFile.size,
          uploadTime: new Date().toISOString(),
          analysis: undefined
        };

        // set aiSource from result.source (if provided)
        if (result.source === 'python-ai') aiSource = 'ollama';
        else if (result.source === 'tensorrt') aiSource = 'tensorrt';
        else aiSource = 'typescript-fallback';

        if (result.aiProcessing && result.aiProcessing.file_id) {
          if (ws && wsConnected) {
            subscribeToWorkflow(result.aiProcessing.file_id);
            sendQuery(`Analyze this legal evidence document: ${selectedFile.name}`, result.aiProcessing.file_id)} else {
            // REST analysis trigger if WS not present (uses apiBase defined above)
            fetch(`${apiBase}?action=analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_id: result.aiProcessing.file_id, prompt: `Analyze this legal evidence, document: ${selectedFile.name}` })
            }).catch(err => console.warn('REST analysis trigger failed', err))}
        }

        console.log(`âœ… File uploaded (${result.source}):`, currentFileId)} else {
        throw new Error(result.error || 'Upload failed')}
    } catch (error) {
      console.error('Upload error:', error);
'
      workflowStatus = {
        stage: 'error',
        progress: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      }}
  }

  // ======================
  // SEARCH FUNCTIONALITY
  // ======================

  // Use a platform-independent timeout type (works with DOM and Node types)
  let searchTimeout: ReturnType<typeof setTimeout> | undefined
  async function performSearch(): Promise<any> {
    if (!searchQuery.trim()) {
      searchResults = [];
      aiSuggestions = [];
      return}

    isSearching = true
    try {
      // Use unified API v2 endpoint with vector search (env-aware)
      const apiBase = (import.meta as: unknown).env?.PUBLIC_API_BASE || '/api/v2/evidence';
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
          console.warn('Using basic search. Python AI backend unavailable.')}
      } else {
        console.error('Search failed:', data.error)}
    } catch (error) {
      console.error('Search error:', error);
'
    } finally {
      isSearching = false}
  }

  // debounced effect for searchQuery
  $effect(() => {
    if (!searchQuery) {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = undefined}
      searchResults = [];
      aiSuggestions = [];
      return}

    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => performSearch(), 350);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = undefined}
    }});

  // onMount: health check, connect WS if available, heartbeat and cleanup
  onMount(() => {
    let mounted = true
    (async () => {
      try {
        const apiBase = (import.meta as: unknown).env?.PUBLIC_API_BASE || '/api/v2/evidence';
        const healthResponse = await fetch(`${apiBase}?action=health`);
        const health = await healthResponse.json();
        if (!mounted) return
        backendStatus = {
          typescript: !!(health.backends?.typescript?.status === 'healthy'),
          pythonAI: !!(health.backends?.pythonAI?.status === 'healthy'),
          capabilities: health.backends?.pythonAI?.capabilities || []
        };

        if (backendStatus.pythonAI) connectWebSocket();
        else console.warn('âš ï¸ Python AI backend unavailable. Some features will be limited.')} catch (error) {
        if (!mounted) return
        console.error('Health check failed:', error);
        backendStatus = { ...backendStatus, pythonAI: false }}
    })();

    const heartbeat = setInterval(() => {
      if (ws && wsConnected && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }))}
    }, 30000);

    return () => {
      mounted = false
      clearInterval(heartbeat);
      if (ws) ws.close();
      if (searchTimeout) clearTimeout(searchTimeout)}});

  // ======================
  // HELPER FUNCTIONS
  // ======================

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'}
  function getStageIcon(stage: string): string {
    const icons: Record<string, string> = {
      idle: 'â¸ï¸',
      uploading: 'ðŸ“¤',
      upload: 'ðŸ“¤',
      ocr: 'ðŸ“',
      embedding: 'ðŸ§¬',
      analysis: 'ðŸ¤–',
      storage: 'ðŸ’¾',
      complete: 'âœ…',
      error: 'âŒ'
    };
    return icons[stage] ?? 'â„¹ï¸'}
  function getProgressColor(progress: number): string {
    // Use UnoCSS theme tokens for colors
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500'}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

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
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
