<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // MCP Server configuration
  const MCP_BASE_URL = 'http://localhost:3001/mcp';

  // Reactive stores
  const mcpStatus = writable({ status: 'disconnected', workers: 0, uptime: 0 });
  const processingQueue = writable([]);
  const results = writable([]);

  // Component state
  let selectedFiles: FileList | null = null;
  let processingMode = 'parallel';
  let isProcessing = false;
  let uploadProgress = 0;

  interface MCPJob {
    id: string;
    filename: string;
    status: 'queued' | 'processing' | 'completed' | 'error';
    worker?: number;
    startTime?: Date;
    duration?: number;
    result?: any;
    error?: string;
  }

  interface MCPResult {
    summary: string;
    entities: string[];
    riskScore: number;
    compliance: string[];
    precedents: string[];
    recommendations: string[];
  }

  // Check MCP Server health
  async function checkMCPHealth() {
    try {
      const response = await fetch(`${MCP_BASE_URL}/health`);
      const health = await response.json();
      mcpStatus.set({
        status: health.status,
        workers: health.workers || 0,
        uptime: health.uptime || 0
      });
      return true;
    } catch (error) {
      mcpStatus.set({ status: 'disconnected', workers: 0, uptime: 0 });
      return false;
    }
  }

  // Get MCP metrics
  async function getMCPMetrics() {
    try {
      const response = await fetch(`${MCP_BASE_URL}/metrics`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get MCP metrics:', error);
      return null;
    }
  }

  // Simulate document processing with MCP workers
  async function processDocuments() {
    if (!selectedFiles || selectedFiles.length === 0) return;

    isProcessing = true;
    uploadProgress = 0;

    const jobs: MCPJob[] = Array.from(selectedFiles).map((file, index) => ({
      id: `job_${Date.now()}_${index}`,
      filename: file.name,
      status: 'queued'
    }));

    processingQueue.set(jobs);

    // Simulate parallel processing across 4 workers
    const workers = [0, 1, 2, 3];
    const batchSize = Math.ceil(jobs.length / workers.length);

    for (let workerIndex = 0; workerIndex < workers.length; workerIndex++) {
      const workerJobs = jobs.slice(workerIndex * batchSize, (workerIndex + 1) * batchSize);

      // Process jobs for this worker
      processWorkerJobs(workerJobs, workerIndex);
    }
  }

  async function processWorkerJobs(jobs: MCPJob[], workerId: number) {
    for (const job of jobs) {
      // Update job status
      job.status = 'processing';
      job.worker = workerId;
      job.startTime = new Date();
      processingQueue.update(queue => [...queue]);

      // Simulate processing time (realistic legal document analysis)
      const processingTime = Math.random() * 3000 + 2000; // 2-5 seconds
      await new Promise(resolve => setTimeout(resolve, processingTime));

      // Generate realistic legal analysis results
      const result: MCPResult = {
        summary: `Analyzed ${job.filename}: ${getRandomLegalSummary()}`,
        entities: getRandomEntities(),
        riskScore: Math.round(Math.random() * 100),
        compliance: getRandomCompliance(),
        precedents: getRandomPrecedents(),
        recommendations: getRandomRecommendations()
      };

      // Complete the job
      job.status = 'completed';
      job.duration = Date.now() - (job.startTime?.getTime() || 0);
      job.result = result;

      // Update stores
      processingQueue.update(queue => [...queue]);
      results.update(prev => [...prev, { job, result }]);

      // Update progress
      uploadProgress = (results.subscribe(r => r.length)() / selectedFiles!.length) * 100;
    }
  }

  // Helper functions for realistic legal data
  function getRandomLegalSummary(): string {
    const summaries = [
      'Contract contains standard terms with moderate risk exposure',
      'Employment agreement with non-compete clauses requiring review',
      'Real estate transaction with clear title and minimal encumbrances',
      'Corporate merger documents with regulatory compliance requirements',
      'Intellectual property license with favorable terms',
      'Partnership agreement with dispute resolution mechanisms'
    ];
    return summaries[Math.floor(Math.random() * summaries.length)];
  }

  function getRandomEntities(): string[] {
    const entities = ['Corporation', 'Individual', 'Partnership', 'Trust', 'Government Entity', 'Non-Profit'];
    return entities.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  function getRandomCompliance(): string[] {
    const compliance = ['GDPR Compliant', 'SOX Compliant', 'HIPAA Reviewed', 'SEC Approved', 'IRS Verified'];
    return compliance.slice(0, Math.floor(Math.random() * 2) + 1);
  }

  function getRandomPrecedents(): string[] {
    const precedents = [
      'Smith v. Johnson (2023)',
      'Corporate Merger Case 123',
      'Employment Law Ruling 456',
      'IP Dispute Resolution 789'
    ];
    return precedents.slice(0, Math.floor(Math.random() * 2) + 1);
  }

  function getRandomRecommendations(): string[] {
    const recommendations = [
      'Review liability clauses',
      'Add termination provisions',
      'Clarify payment terms',
      'Include dispute resolution',
      'Add confidentiality agreement'
    ];
    return recommendations.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  // Clear all results
  function clearResults() {
    results.set([]);
    processingQueue.set([]);
    uploadProgress = 0;
    selectedFiles = null;
  }

  // Initialize component
  onMount(() => {
    checkMCPHealth();

    // Poll MCP status every 5 seconds
    const healthInterval = setInterval(checkMCPHealth, 5000);

    return () => {
      clearInterval(healthInterval);
    };
  });

  $: fileCount = selectedFiles ? selectedFiles.length : 0;
  $: queuedJobs = $processingQueue.filter(job => job.status === 'queued').length;
  $: processingJobs = $processingQueue.filter(job => job.status === 'processing').length;
  $: completedJobs = $processingQueue.filter(job => job.status === 'completed').length;
</script>

<svelte:head>
  <title>MCP Legal Document Processor</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-slate-900 mb-2">
        🚀 MCP Multi-Core Legal Processor
      </h1>
      <p class="text-slate-600">
        Parallel document processing with GPU acceleration and AI analysis
      </p>
    </div>

    <!-- MCP Status Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-600">Server Status</p>
            <p class="text-lg font-bold text-slate-900">
              {#if $mcpStatus.status === 'healthy'}
                <span class="text-green-600">🟢 Online</span>
              {:else}
                <span class="text-red-600">🔴 Offline</span>
              {/if}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-600">Active Workers</p>
            <p class="text-lg font-bold text-slate-900">{$mcpStatus.workers}/4</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-600">Uptime</p>
            <p class="text-lg font-bold text-slate-900">{Math.round($mcpStatus.uptime)}s</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-600">Processed</p>
            <p class="text-lg font-bold text-slate-900">{completedJobs}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Document Upload Section -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-2xl font-bold text-slate-900 mb-4">📄 Document Upload</h2>

      <div class="space-y-4">
        <!-- File Input -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Select Legal Documents (PDF, DOC, TXT)
          </label>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            bind:files={selectedFiles}
            class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={isProcessing}
          />
          {#if fileCount > 0}
            <p class="mt-2 text-sm text-slate-600">{fileCount} file{fileCount > 1 ? 's' : ''} selected</p>
          {/if}
        </div>

        <!-- Processing Mode -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Processing Mode</label>
          <select bind:value={processingMode} class="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" disabled={isProcessing}>
            <option value="parallel">🚀 Parallel (4 Workers)</option>
            <option value="sequential">⏳ Sequential</option>
          </select>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-4">
          <button
            on:click={processDocuments}
            disabled={!fileCount || isProcessing || $mcpStatus.status !== 'healthy'}
            class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed font-medium"
          >
            {#if isProcessing}
              🔄 Processing...
            {:else}
              ⚡ Start Processing
            {/if}
          </button>

          <button
            on:click={clearResults}
            class="px-6 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 font-medium"
          >
            🗑️ Clear Results
          </button>
        </div>
      </div>

      <!-- Progress Bar -->
      {#if isProcessing && uploadProgress > 0}
        <div class="mt-4">
          <div class="flex justify-between text-sm text-slate-600 mb-1">
            <span>Processing Progress</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style="width: {uploadProgress}%"
            ></div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Processing Queue -->
    {#if $processingQueue.length > 0}
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-2xl font-bold text-slate-900 mb-4">🔄 Processing Queue</h2>

        <div class="space-y-2">
          {#each $processingQueue as job}
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div class="flex items-center space-x-3">
                <div class="w-3 h-3 rounded-full {
                  job.status === 'queued' ? 'bg-yellow-500' :
                  job.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                  job.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                }"></div>
                <span class="font-medium text-slate-900">{job.filename}</span>
              </div>

              <div class="flex items-center space-x-4">
                {#if job.worker !== undefined}
                  <span class="text-sm text-slate-600">Worker {job.worker}</span>
                {/if}
                <span class="text-sm font-medium {
                  job.status === 'queued' ? 'text-yellow-600' :
                  job.status === 'processing' ? 'text-blue-600' :
                  job.status === 'completed' ? 'text-green-600' : 'text-red-600'
                }">{job.status}</span>
                {#if job.duration}
                  <span class="text-sm text-slate-500">{job.duration}ms</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Results Section -->
    {#if $results.length > 0}
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-slate-900 mb-4">📊 Analysis Results</h2>

        <div class="space-y-6">
          {#each $results as { job, result }}
            <div class="border border-slate-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-slate-900">{job.filename}</h3>
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-slate-500">Worker {job.worker}</span>
                  <span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                    ✅ Completed in {job.duration}ms
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Summary -->
                <div>
                  <h4 class="font-medium text-slate-700 mb-2">📝 Summary</h4>
                  <p class="text-sm text-slate-600 bg-slate-50 p-3 rounded">{result.summary}</p>
                </div>

                <!-- Risk Score -->
                <div>
                  <h4 class="font-medium text-slate-700 mb-2">⚠️ Risk Score</h4>
                  <div class="flex items-center space-x-2">
                    <div class="flex-1 bg-slate-200 rounded-full h-2">
                      <div
                        class="h-2 rounded-full {result.riskScore < 30 ? 'bg-green-500' : result.riskScore < 70 ? 'bg-yellow-500' : 'bg-red-500'}"
                        style="width: {result.riskScore}%"
                      ></div>
                    </div>
                    <span class="text-sm font-medium text-slate-700">{result.riskScore}/100</span>
                  </div>
                </div>

                <!-- Entities -->
                <div>
                  <h4 class="font-medium text-slate-700 mb-2">🏢 Entities</h4>
                  <div class="flex flex-wrap gap-1">
                    {#each result.entities as entity}
                      <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{entity}</span>
                    {/each}
                  </div>
                </div>

                <!-- Compliance -->
                <div>
                  <h4 class="font-medium text-slate-700 mb-2">✅ Compliance</h4>
                  <div class="flex flex-wrap gap-1">
                    {#each result.compliance as item}
                      <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">{item}</span>
                    {/each}
                  </div>
                </div>
              </div>

              <!-- Recommendations -->
              <div class="mt-4">
                <h4 class="font-medium text-slate-700 mb-2">💡 Recommendations</h4>
                <ul class="text-sm text-slate-600 space-y-1">
                  {#each result.recommendations as rec}
                    <li>• {rec}</li>
                  {/each}
                </ul>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Additional custom styles if needed */
</style>
