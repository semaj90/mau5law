<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
</script>
  import { onMount } from 'svelte';
  
  // Reactive state
  let wasm: any = null;
  let status = $state('idle');
  let selectedFile: File | null = $state(null);
  let parsedDocuments: any[] = $state([]);
  let processingTime = $state(0);
  let jobId = $state('');
  let eventLog: string[] = $state([]);
  let eventSource: EventSource | null = null;
  
  // WASM Interface
  interface WasmInstance {
    parseDocuments(jsonPtr: number, jsonLength: number): boolean;
    getResultCount(): number;
    getProcessingTime(): number;
    getDocument(index: number, outputPtr: number, maxLength: number): number;
    allocateMemory(size: number): number;
    freeMemory(ptr: number): void;
    initializeParser(): boolean;
    cleanupParser(): void;
    memory: WebAssembly.Memory;
  }
  
  // Load WASM module
  async function loadWasm(): Promise<WasmInstance | null> {
    if (wasm) return wasm;
    
    status = 'loading-wasm';
    addLog('Loading WASM legal document parser...');
    
    try {
      const response = await fetch('/wasm/legal-parser.wasm');
      const bytes = await response.arrayBuffer();
      
      const { instance } = await WebAssembly.instantiate(bytes, {
        env: {
          abort() {
            throw new Error('WASM abort called');
          }
        }
      });
      
      wasm = instance.exports as WasmInstance;
      
      // Initialize parser
      if (wasm.initializeParser()) {
        status = 'wasm-loaded';
        addLog('✅ WASM parser loaded successfully');
        return wasm;
      } else {
        throw new Error('Failed to initialize WASM parser');
      }
    } catch (error) {
      status = 'wasm-error';
      addLog(`❌ WASM loading failed: ${error.message}`);
      return null;
    }
  }
  
  // Start SSE connection for real-time updates
  async function startSSE() {
    if (eventSource) return;
    
    try {
      eventSource = new EventSource('http://localhost:8080/api/events/subscribe');
      
      eventSource.addEventListener('connected', (e) => {
        addLog('🔗 Connected to processing pipeline');
      });
      
      eventSource.addEventListener('events:ingest', (e) => {
        try {
          const data = JSON.parse(e.data);
          addLog(`📥 Pipeline event: ${data.event || 'processing'}`);
          
          if (data.job_id === jobId) {
            if (data.event === 'job_created') {
              addLog(`✅ Job created: ${data.job_id}`);
            }
          }
        } catch (err) {
          console.warn('Failed to parse SSE event:', err);
        }
      });
      
      eventSource.addEventListener('events:processing', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.job_id === jobId) {
            addLog(`🔄 Processing: ${data.title || 'document'} (${data.progress || ''})`);
          }
        } catch (err) {
          console.warn('Failed to parse processing event:', err);
        }
      });
      
      eventSource.addEventListener('events:completed', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.job_id === jobId) {
            addLog(`✅ Processing completed: ${data.document_count} documents`);
            status = 'completed';
          }
        } catch (err) {
          console.warn('Failed to parse completion event:', err);
        }
      });
      
      eventSource.addEventListener('ping', (e) => {
        // Keepalive - no action needed
      });
      
      eventSource.onerror = (e) => {
        addLog('⚠️ SSE connection error, will retry...');
        eventSource?.close();
        eventSource = null;
        // Auto-reconnect after 5 seconds
        setTimeout(startSSE, 5000);
      };
      
    } catch (error) {
      addLog(`❌ SSE setup failed: ${error.message}`);
    }
  }
  
  // Parse and send document
  async function parseAndSend(file: File) {
    if (!file) return;
    
    status = 'reading';
    addLog(`📖 Reading file: ${file.name} (${file.size} bytes)`);
    
    try {
      // Load WASM if not already loaded
      const wasmInstance = await loadWasm();
      if (!wasmInstance) return;
      
      // Read file content
      const arrayBuffer = await file.arrayBuffer();
      const fileContent = new TextDecoder().decode(arrayBuffer);
      
      status = 'parsing';
      addLog('🧠 Parsing with WASM...');
      
      // Allocate memory for input JSON
      const inputLength = fileContent.length;
      const inputPtr = wasmInstance.allocateMemory(inputLength);
      
      // Copy JSON data to WASM memory
      const inputView = new Uint8Array(wasmInstance.memory.buffer, inputPtr, inputLength);
      const encoder = new TextEncoder();
      const encodedInput = encoder.encode(fileContent);
      inputView.set(encodedInput);
      
      // Parse with WASM
      const parseStart = performance.now();
      const success = wasmInstance.parseDocuments(inputPtr, inputLength);
      const wasmProcessingTime = performance.now() - parseStart;
      
      // Free input memory
      wasmInstance.freeMemory(inputPtr);
      
      if (!success) {
        throw new Error('WASM parsing failed');
      }
      
      // Get results
      const resultCount = wasmInstance.getResultCount();
      const wasmTime = wasmInstance.getProcessingTime();
      
      addLog(`✅ WASM parsed ${resultCount} documents in ${wasmTime.toFixed(2)}ms`);
      
      // Extract parsed documents
      const documents = [];
      const outputBuffer = wasmInstance.allocateMemory(8192); // 8KB buffer per document
      
      for (let i = 0; i < resultCount; i++) {
        const docLength = wasmInstance.getDocument(i, outputBuffer, 8192);
        if (docLength > 0) {
          const docView = new Uint8Array(wasmInstance.memory.buffer, outputBuffer, docLength);
          const docJson = new TextDecoder().decode(docView);
          try {
            const doc = JSON.parse(docJson);
            documents.push(doc);
          } catch (err) {
            addLog(`⚠️ Failed to parse document ${i}: ${err.message}`);
          }
        }
      }
      
      wasmInstance.freeMemory(outputBuffer);
      parsedDocuments = documents;
      processingTime = wasmProcessingTime;
      
      addLog(`📄 Extracted ${documents.length} processed documents`);
      
      // Send to Go API
      status = 'sending';
      addLog('🚀 Sending to processing pipeline...');
      
      const response = await fetch('http://localhost:8080/api/doc/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': `wasm-client-${Date.now()}`
        },
        body: JSON.stringify(documents)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      jobId = result.job_id;
      
      addLog(`✅ Job queued: ${jobId}`);
      addLog(`📊 Status: ${result.status}`);
      
      status = 'processing';
      
    } catch (error) {
      status = 'error';
      addLog(`❌ Error: ${error.message}`);
    }
  }
  
  // Handle file selection
  function onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      selectedFile = input.files[0];
      addLog(`📁 Selected: ${selectedFile.name}`);
    }
  }
  
  // Process selected file
  async function processFile() {
    if (selectedFile) {
      await parseAndSend(selectedFile);
    }
  }
  
  // Utility functions
  function addLog(message: string) {
    eventLog = [...eventLog, `${new Date().toLocaleTimeString()}: ${message}`];
    // Keep only last 50 log entries
    if (eventLog.length > 50) {
      eventLog = eventLog.slice(-50);
    }
  }
  
  function clearLog() {
    eventLog = [];
  }
  
  function getStatusColor(status: string): string {
    const colors = {
      'idle': 'text-gray-600',
      'loading-wasm': 'text-blue-600',
      'wasm-loaded': 'text-green-600', 
      'reading': 'text-blue-600',
      'parsing': 'text-purple-600',
      'sending': 'text-orange-600',
      'processing': 'text-yellow-600',
      'completed': 'text-green-600',
      'error': 'text-red-600',
      'wasm-error': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  }
  
  // Lifecycle
  onMount(async () => {
    addLog('🚀 WASM Legal Document Parser Demo initialized');
    await startSSE();
    await loadWasm(); // Preload WASM
  });
</script>

<div class="max-w-6xl mx-auto p-6 space-y-6">
  <div class="bg-white rounded-lg shadow-lg p-6">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">
      🧠 WASM Legal Document Parser
    </h1>
    <p class="text-gray-600 mb-6">
      Client-side AssemblyScript parser → Go pipeline → PostgreSQL pgvector
    </p>
    
    <!-- Status Display -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 rounded-full {getStatusColor(status)} bg-current"></div>
          <span class="font-medium {getStatusColor(status)}">
            {status.replace('-', ' ').toUpperCase()}
          </span>
        </div>
        
        {#if jobId}
          <div class="text-sm text-gray-600">
            Job ID: <code class="bg-gray-200 px-2 py-1 rounded">{jobId}</code>
          </div>
        {/if}
        
        {#if processingTime > 0}
          <div class="text-sm text-gray-600">
            WASM Processing: <span class="font-mono">{processingTime.toFixed(2)}ms</span>
          </div>
        {/if}
      </div>
    </div>
    
    <!-- File Upload -->
    <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <input 
        type="file" 
        accept=".json,.txt" 
        onchange={onFileSelect}
        class="hidden" 
        id="fileInput"
      />
      
      {#if selectedFile}
        <div class="space-y-4">
          <div class="text-lg font-medium text-gray-900">
            📁 {selectedFile.name}
          </div>
          <div class="text-sm text-gray-600">
            Size: {(selectedFile.size / 1024).toFixed(2)} KB
          </div>
          
          <div class="space-x-4">
            <button 
              onclick={processFile}
              disabled={status !== 'idle' && status !== 'wasm-loaded' && status !== 'completed' && status !== 'error'}
              class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              🚀 Parse & Process
            </button>
            
            <label 
              for="fileInput"
              class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 cursor-pointer inline-block"
            >
              📁 Select Different File
            </label>
          </div>
        </div>
      {:else}
        <label for="fileInput" class="cursor-pointer">
          <div class="space-y-4">
            <div class="text-4xl">📄</div>
            <div class="text-lg font-medium text-gray-900">
              Select Legal Document (JSON)
            </div>
            <div class="text-sm text-gray-600">
              Click to browse or drop a JSON file containing legal documents
            </div>
          </div>
        </label>
      {/if}
    </div>
  </div>
  
  <!-- Parsed Documents Display -->
  {#if parsedDocuments.length > 0}
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">
        📋 Parsed Documents ({parsedDocuments.length})
      </h2>
      
      <div class="space-y-4">
        {#each parsedDocuments as doc, index}
          <div class="border rounded-lg p-4 bg-gray-50">
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-lg font-semibold text-gray-900">
                {doc.title || `Document ${index + 1}`}
              </h3>
              <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {doc.documentType || 'document'}
              </span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div class="text-gray-600">Content Length:</div>
                <div class="font-mono">{doc.content?.length || 0} chars</div>
              </div>
              
              {#if doc.keywords && doc.keywords.length > 0}
                <div>
                  <div class="text-gray-600">Keywords:</div>
                  <div class="flex flex-wrap gap-1">
                    {#each doc.keywords.slice(0, 5) as keyword}
                      <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        {keyword}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
              
              {#if doc.entities && doc.entities.length > 0}
                <div>
                  <div class="text-gray-600">Entities:</div>
                  <div class="flex flex-wrap gap-1">
                    {#each doc.entities.slice(0, 3) as entity}
                      <span class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                        {entity}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
              
              {#if doc.citations && doc.citations.length > 0}
                <div>
                  <div class="text-gray-600">Citations:</div>
                  <div class="text-xs text-gray-700">{doc.citations.length} found</div>
                </div>
              {/if}
            </div>
            
            {#if doc.summary}
              <div class="mt-3 p-3 bg-white rounded border">
                <div class="text-gray-600 text-sm mb-1">Summary:</div>
                <div class="text-gray-800 text-sm">{doc.summary}</div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- Event Log -->
  <div class="bg-white rounded-lg shadow-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold text-gray-900">📊 Processing Log</h2>
      <button 
        onclick={clearLog}
        class="text-sm text-gray-600 hover:text-gray-900"
      >
        Clear Log
      </button>
    </div>
    
    <div class="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
      {#each eventLog as logEntry}
        <div class="mb-1">{logEntry}</div>
      {:else}
        <div class="text-gray-500">No events yet...</div>
      {/each}
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar for log */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #1f1f1f;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #4ade80;
    border-radius: 3px;
  }
</style>
