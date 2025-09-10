<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { mcpApi, type MCPJob, type MCPJobResult, type MCPRealtimeEvent } from '$lib/api/mcp-client.js';

  // Real-time stores
  const analysisResults = writable<Array<{ job: MCPJob; result: MCPJobResult }>>([]);
  const activeJobs = writable<MCPJob[]>([]);
  const serverMetrics = writable({ workers: 0, cpu: 0, memory: 0, throughput: 0 });
  const alerts = writable<string[]>([]);

  // Component state
  let selectedFile: File | null = null;
  let isProcessing = false;
  let processingMode = 'gpu-accelerated';
  let analysisType = 'comprehensive';
  let currentJobId: string | null = null;
  let dragOver = false;

  // Sample legal documents for demo
  const sampleDocuments = [
    {
      name: 'Employment_Agreement_2024.pdf',
      type: 'Employment Contract',
      size: '245 KB',
      description: 'Standard employment agreement with non-compete clause'
    },
    {
      name: 'Real_Estate_Purchase.docx',
      type: 'Real Estate Contract',
      size: '189 KB',
      description: 'Commercial property acquisition agreement'
    },
    {
      name: 'NDA_Template.pdf',
      type: 'Non-Disclosure Agreement',
      size: '87 KB',
      description: 'Mutual NDA for technology partnership'
    },
    {
      name: 'Corporate_Merger_LOI.pdf',
      type: 'Letter of Intent',
      size: '312 KB',
      description: 'Merger and acquisition preliminary agreement'
    }
  ];

  // Demo mode - simulate file processing
  async function processSampleDocument(doc: any) {
    selectedFile = new File(['sample content'], doc.name, { type: 'application/pdf' });
    await processDocument();
  }

  // Real document processing
  async function processDocument() {
    if (!selectedFile) return;

    isProcessing = true;
    alerts.update(arr => [...arr, `🚀 Starting analysis of ${selectedFile!.name}`]);

    try {
      // Submit document for processing
      const submission = await mcpApi.processDocuments([selectedFile], {
        mode: processingMode as 'parallel' | 'sequential',
        analysisType: analysisType as any,
        gpu: processingMode === 'gpu-accelerated'
      });

      currentJobId = submission.jobId;
      alerts.update(arr => [...arr, `📝 Job ${submission.jobId} queued (position: ${submission.queuePosition})`]);

      // Poll for job completion
      pollJobStatus(submission.jobId);

    } catch (error) {
      console.error('Processing failed:', error);
      alerts.update(arr => [...arr, `❌ Processing failed: ${error}`]);
      isProcessing = false;
    }
  }

  // Poll job status until completion
  async function pollJobStatus(jobId: string) {
    const pollInterval = setInterval(async () => {
      try {
        const job = await mcpApi.getJobStatus(jobId);

        // Update active jobs
        activeJobs.update(jobs => {
          const filtered = jobs.filter(j => j.id !== jobId);
          return [...filtered, job];
        });

        if (job.status === 'completed') {
          clearInterval(pollInterval);
          await getJobResults(jobId);
          alerts.update(arr => [...arr, `✅ Analysis completed for ${job.filename}`]);
          isProcessing = false;
        } else if (job.status === 'error') {
          clearInterval(pollInterval);
          alerts.update(arr => [...arr, `❌ Analysis failed: ${job.error}`]);
          isProcessing = false;
        }
      } catch (error) {
        console.error('Job polling error:', error);
        clearInterval(pollInterval);
        isProcessing = false;
      }
    }, 2000);
  }

  // Get detailed job results
  async function getJobResults(jobId: string) {
    try {
      const job = await mcpApi.getJobStatus(jobId);
      const result = await mcpApi.getJobResults(jobId);

      analysisResults.update(results => [...results, { job, result }]);

      // Remove from active jobs
      activeJobs.update(jobs => jobs.filter(j => j.id !== jobId));
    } catch (error) {
      console.error('Failed to get results:', error);
    }
  }

  // Generate demo results for showcase
  function generateDemoResults(filename: string): MCPJobResult {
    const riskScore = Math.floor(Math.random() * 40) + 10; // 10-50 for demo

    return {
      jobId: `demo_${Date.now()}`,
      filename,
      results: {
        summary: getDemoSummary(filename),
        entities: getDemoEntities(),
        riskAssessment: {
          overall: riskScore,
          categories: {
            financial: Math.floor(Math.random() * 30) + 20,
            legal: Math.floor(Math.random() * 40) + 15,
            operational: Math.floor(Math.random() * 35) + 10,
            regulatory: Math.floor(Math.random() * 25) + 15
          },
          factors: getDemoRiskFactors()
        },
        compliance: getDemoCompliance(),
        precedents: getDemoPrecedents(),
        recommendations: getDemoRecommendations(),
        confidence: Math.floor(Math.random() * 20) + 80
      },
      metadata: {
        processingTime: Math.floor(Math.random() * 3000) + 1000,
        workerId: Math.floor(Math.random() * 4),
        modelVersion: 'Gemma-3-Legal-v2.1',
        documentType: getDocumentType(filename)
      }
    };
  }

  function getDemoSummary(filename: string): string {
    const summaries = {
      employment: 'Standard employment agreement with competitive salary, standard benefits, and 12-month non-compete clause. Contract includes intellectual property assignment and confidentiality provisions.',
      realestate: 'Commercial real estate purchase agreement for $2.3M property. Includes standard contingencies, financing terms, and environmental inspection clauses.',
      nda: 'Mutual non-disclosure agreement with 5-year term. Covers proprietary information exchange for technology partnership discussions.',
      merger: 'Letter of intent for corporate acquisition valued at $50M. Outlines due diligence timeline, key terms, and exclusivity period.'
    };

    if (filename.includes('Employment')) return summaries.employment;
    if (filename.includes('Real_Estate')) return summaries.realestate;
    if (filename.includes('NDA')) return summaries.nda;
    if (filename.includes('Merger')) return summaries.merger;
    return 'Comprehensive legal document analysis completed with entity extraction and risk assessment.';
  }

  function getDemoEntities() {
    return [
      { name: 'TechCorp Inc.', type: 'organization', confidence: 0.95, context: 'Primary contracting party' },
      { name: 'John Smith', type: 'person', confidence: 0.92, context: 'Signatory and legal representative' },
      { name: '$250,000', type: 'amount', confidence: 0.88, context: 'Annual compensation amount' },
      { name: 'December 31, 2024', type: 'date', confidence: 0.90, context: 'Contract termination date' }
    ];
  }

  function getDemoRiskFactors() {
    return [
      'Non-compete clause may be overly restrictive',
      'Termination conditions require legal review',
      'Intellectual property assignment is comprehensive',
      'Confidentiality terms extend beyond employment'
    ];
  }

  function getDemoCompliance() {
    return [
      { regulation: 'Employment Standards Act', status: 'compliant', confidence: 0.85, notes: 'Meets provincial employment requirements' },
      { regulation: 'Personal Information Protection Act', status: 'compliant', confidence: 0.92, notes: 'Privacy clauses are adequate' },
      { regulation: 'Competition Act', status: 'unclear', confidence: 0.65, notes: 'Non-compete scope needs review' }
    ];
  }

  function getDemoPrecedents() {
    return [
      { case: 'Lyons v. Multari (2000)', relevance: 0.87, summary: 'Non-compete enforceability standards', citation: '2000 CanLII 8415 (ON CA)' },
      { case: 'Elsley v. J.G. Collins Insurance (1978)', relevance: 0.73, summary: 'Restraint of trade doctrine', citation: '[1978] 2 S.C.R. 916' }
    ];
  }

  function getDemoRecommendations() {
    return [
      'Consider narrowing non-compete geographical scope',
      'Add severability clause to protect remaining terms',
      'Review termination notice periods for compliance',
      'Include dispute resolution mechanism',
      'Consider adding garden leave provisions'
    ];
  }

  function getDocumentType(filename: string): string {
    if (filename.includes('Employment')) return 'Employment Agreement';
    if (filename.includes('Real_Estate')) return 'Real Estate Contract';
    if (filename.includes('NDA')) return 'Non-Disclosure Agreement';
    if (filename.includes('Merger')) return 'Merger Agreement';
    return 'Legal Document';
  }

  // File drag and drop
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      selectedFile = files[0];
    }
  }

  // Clear results
  function clearResults() {
    analysisResults.set([]);
    activeJobs.set([]);
    alerts.set([]);
    selectedFile = null;
    currentJobId = null;
  }

  // Initialize real-time updates
  onMount(async () => {
    // Get initial metrics
    const metrics = await mcpApi.getMetrics();
    serverMetrics.set(metrics);

    // Set up WebSocket for real-time updates
    mcpApi.connectWebSocket((event: MCPRealtimeEvent) => {
      switch (event.type) {
        case 'metrics':
          serverMetrics.set(event.data);
          break;
        case 'job_update':
          // Handle job updates
          break;
        case 'alert':
          alerts.update(arr => [...arr, event.data.message]);
          break;
      }
    });

    // Add welcome message
    alerts.update(arr => [...arr, '🎯 MCP Legal Processor ready - GPU acceleration enabled']);
  });

  onDestroy(() => {
    mcpApi.disconnectWebSocket();
  });
</script>

<svelte:head>
  <title>Legal Document Analysis - MCP Demo</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">
        ⚖️ AI-Powered Legal Document Analysis
      </h1>
      <p class="text-gray-600">
        Real-time document processing with MCP Multi-Core Server & GPU acceleration
      </p>
    </div>

    <!-- Server Status Bar -->
    <div class="bg-white rounded-lg shadow-md p-4 mb-6 border-l-4 border-green-500">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-6">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span class="font-medium">MCP Server Online</span>
          </div>
          <div class="text-sm text-gray-600">
            Workers: {$serverMetrics.workers}/4 | CPU: {Math.round($serverMetrics.cpu)}% | Memory: {Math.round($serverMetrics.memory)}%
          </div>
        </div>
        <div class="text-sm font-medium text-green-600">
          🚀 GPU Accelerated
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

      <!-- Document Upload & Processing -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Upload Area -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">📄 Document Upload</h2>

          <div
            class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors {dragOver ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}"
            on:dragover={handleDragOver}
            on:dragleave={handleDragLeave}
            on:drop={handleDrop}
          >
            {#if selectedFile}
              <div class="flex items-center justify-center space-x-3 mb-4">
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  📄
                </div>
                <div>
                  <p class="font-medium text-gray-900">{selectedFile.name}</p>
                  <p class="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            {:else}
              <div class="mb-4">
                <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  📁
                </div>
                <p class="text-gray-600">Drag and drop a legal document here</p>
                <p class="text-sm text-gray-500 mt-1">PDF, DOC, DOCX supported</p>
              </div>
            {/if}

            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              bind:files={selectedFile ? null : undefined}
              on:change={(e) => selectedFile = e.target.files?.[0] || null}
              class="hidden"
              id="file-upload"
              disabled={isProcessing}
            />
            <label
              for="file-upload"
              class="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer {isProcessing ? 'opacity-50 cursor-not-allowed' : ''}"
            >
              Choose File
            </label>
          </div>

          <!-- Processing Options -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Processing Mode</label>
              <select bind:value={processingMode} class="w-full p-2 border border-gray-300 rounded-md" disabled={isProcessing}>
                <option value="gpu-accelerated">🚀 GPU Accelerated (Recommended)</option>
                <option value="parallel">⚡ Multi-Core Parallel</option>
                <option value="sequential">⏳ Sequential Processing</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
              <select bind:value={analysisType} class="w-full p-2 border border-gray-300 rounded-md" disabled={isProcessing}>
                <option value="comprehensive">🎯 Comprehensive Analysis</option>
                <option value="risk-assessment">⚠️ Risk Assessment Only</option>
                <option value="entity-extraction">🏢 Entity Extraction</option>
                <option value="compliance-check">✅ Compliance Check</option>
              </select>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex space-x-4 mt-6">
            <button
              on:click={processDocument}
              disabled={!selectedFile || isProcessing}
              class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {#if isProcessing}
                <div class="flex items-center justify-center space-x-2">
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              {:else}
                ⚡ Start Analysis
              {/if}
            </button>

            <button
              on:click={clearResults}
              class="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        <!-- Sample Documents -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-bold text-gray-900 mb-4">📚 Try Sample Documents</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each sampleDocuments as doc}
              <button
                on:click={() => processSampleDocument(doc)}
                disabled={isProcessing}
                class="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors disabled:opacity-50"
              >
                <div class="flex items-start justify-between mb-2">
                  <h4 class="font-medium text-gray-900">{doc.name}</h4>
                  <span class="text-xs text-gray-500">{doc.size}</span>
                </div>
                <p class="text-sm text-blue-600 mb-1">{doc.type}</p>
                <p class="text-xs text-gray-600">{doc.description}</p>
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Sidebar: Active Jobs & Alerts -->
      <div class="space-y-6">

        <!-- Active Jobs -->
        {#if $activeJobs.length > 0}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-4">🔄 Active Jobs</h3>
            <div class="space-y-3">
              {#each $activeJobs as job}
                <div class="p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-medium text-sm">{job.filename}</span>
                    <div class="w-2 h-2 rounded-full {
                      job.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                      job.status === 'queued' ? 'bg-yellow-500' : 'bg-gray-500'
                    }"></div>
                  </div>

                  {#if job.workerId !== undefined}
                    <p class="text-xs text-gray-600">Worker {job.workerId}</p>
                  {/if}

                  <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style="width: {job.progress}%"
                    ></div>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">{job.progress}% complete</p>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Real-time Alerts -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-bold text-gray-900 mb-4">🔔 Activity Feed</h3>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            {#each $alerts.slice(-10).reverse() as alert}
              <div class="p-2 bg-gray-50 rounded text-sm">
                <span class="text-gray-600">{new Date().toLocaleTimeString()}</span>
                <p class="text-gray-800">{alert}</p>
              </div>
            {/each}
            {#if $alerts.length === 0}
              <p class="text-gray-500 text-sm">No recent activity</p>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Results Section -->
    {#if $analysisResults.length > 0}
      <div class="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">📊 Analysis Results</h2>

        <div class="space-y-8">
          {#each $analysisResults as { job, result }}
            <div class="border border-gray-200 rounded-lg p-6">
              <!-- Result Header -->
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h3 class="text-xl font-semibold text-gray-900">{result.filename}</h3>
                  <div class="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>📄 {result.metadata.documentType}</span>
                    <span>⚡ {result.metadata.processingTime}ms</span>
                    <span>🤖 Worker {result.metadata.workerId}</span>
                    <span>🎯 {result.results.confidence}% confidence</span>
                  </div>
                </div>

                <div class="text-right">
                  <div class="text-2xl font-bold {
                    result.results.riskAssessment.overall < 30 ? 'text-green-600' :
                    result.results.riskAssessment.overall < 60 ? 'text-yellow-600' : 'text-red-600'
                  }">
                    {result.results.riskAssessment.overall}/100
                  </div>
                  <div class="text-sm text-gray-600">Risk Score</div>
                </div>
              </div>

              <!-- Summary -->
              <div class="mb-6">
                <h4 class="font-semibold text-gray-900 mb-2">📝 Executive Summary</h4>
                <p class="text-gray-700 bg-gray-50 p-4 rounded-lg">{result.results.summary}</p>
              </div>

              <!-- Key Metrics Grid -->
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="text-center p-4 bg-red-50 rounded-lg">
                  <div class="text-2xl font-bold text-red-600">{result.results.riskAssessment.categories.financial}</div>
                  <div class="text-sm text-red-700">Financial Risk</div>
                </div>
                <div class="text-center p-4 bg-yellow-50 rounded-lg">
                  <div class="text-2xl font-bold text-yellow-600">{result.results.riskAssessment.categories.legal}</div>
                  <div class="text-sm text-yellow-700">Legal Risk</div>
                </div>
                <div class="text-center p-4 bg-blue-50 rounded-lg">
                  <div class="text-2xl font-bold text-blue-600">{result.results.riskAssessment.categories.operational}</div>
                  <div class="text-sm text-blue-700">Operational Risk</div>
                </div>
                <div class="text-center p-4 bg-purple-50 rounded-lg">
                  <div class="text-2xl font-bold text-purple-600">{result.results.riskAssessment.categories.regulatory}</div>
                  <div class="text-sm text-purple-700">Regulatory Risk</div>
                </div>
              </div>

              <!-- Detailed Analysis Grid -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <!-- Entities -->
                <div>
                  <h4 class="font-semibold text-gray-900 mb-3">🏢 Key Entities</h4>
                  <div class="space-y-2">
                    {#each result.results.entities as entity}
                      <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <span class="font-medium">{entity.name}</span>
                          <span class="text-sm text-gray-600 ml-2">({entity.type})</span>
                        </div>
                        <span class="text-sm text-gray-500">{Math.round(entity.confidence * 100)}%</span>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Compliance -->
                <div>
                  <h4 class="font-semibold text-gray-900 mb-3">✅ Compliance Status</h4>
                  <div class="space-y-2">
                    {#each result.results.compliance as comp}
                      <div class="p-3 bg-gray-50 rounded">
                        <div class="flex items-center justify-between mb-1">
                          <span class="font-medium">{comp.regulation}</span>
                          <span class="px-2 py-1 text-xs rounded {
                            comp.status === 'compliant' ? 'bg-green-100 text-green-800' :
                            comp.status === 'non-compliant' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }">
                            {comp.status}
                          </span>
                        </div>
                        <p class="text-sm text-gray-600">{comp.notes}</p>
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Risk Factors -->
                <div>
                  <h4 class="font-semibold text-gray-900 mb-3">⚠️ Risk Factors</h4>
                  <ul class="space-y-2">
                    {#each result.results.riskAssessment.factors as factor}
                      <li class="flex items-start space-x-2">
                        <div class="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span class="text-sm text-gray-700">{factor}</span>
                      </li>
                    {/each}
                  </ul>
                </div>

                <!-- Recommendations -->
                <div>
                  <h4 class="font-semibold text-gray-900 mb-3">💡 Recommendations</h4>
                  <ul class="space-y-2">
                    {#each result.results.recommendations as rec}
                      <li class="flex items-start space-x-2">
                        <div class="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span class="text-sm text-gray-700">{rec}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              </div>

              <!-- Legal Precedents -->
              {#if result.results.precedents.length > 0}
                <div class="mt-6">
                  <h4 class="font-semibold text-gray-900 mb-3">⚖️ Relevant Precedents</h4>
                  <div class="space-y-3">
                    {#each result.results.precedents as precedent}
                      <div class="p-4 bg-gray-50 rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                          <h5 class="font-medium">{precedent.case}</h5>
                          <span class="text-sm text-gray-500">{Math.round(precedent.relevance * 100)}% relevant</span>
                        </div>
                        <p class="text-sm text-gray-700 mb-1">{precedent.summary}</p>
                        <p class="text-xs text-gray-500">{precedent.citation}</p>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Custom scrollbar */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
</style>
