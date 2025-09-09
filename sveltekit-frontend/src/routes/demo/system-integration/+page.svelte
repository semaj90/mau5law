<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  import {
    Input
  } from '$lib/components/ui/enhanced-bits';;
  import { Textarea } from '$lib/components/ui/textarea';
  import { Progress } from '$lib/components/ui/progress';
  import { Tabs } from '$lib/components/ui/tabs';
  import FabricCanvas from '$lib/components/canvas/FabricCanvas.svelte';
  import EvidenceProcessingWorkflow from '$lib/components/evidence/EvidenceProcessingWorkflow.svelte';

  // Import system services
  import { systemIntegration } from '$lib/services/system-integration.js';
  import { globalGPUCache } from '$lib/services/rag-minio-gpu-som-cache.js';

  // Demo state management
  let activeTab = 'overview';
  let isSystemReady = false;
  let systemStats = $state({
    minioHealth: false,
    postgresHealth: false,
    redisHealth: false,
    context7Health: false,
    totalDocuments: 0,
    cacheHitRate: 0,
    avgQueryTime: 0,
    integrationStatus: 'initializing' as 'healthy' | 'degraded' | 'critical' | 'initializing'
  });

  // Evidence processing demo
  let selectedFiles: FileList | null = null;
  let processingProgress = 0;
  let searchQuery = '';
  let searchResults = $state([]);
  let isSearching = false;

  // Canvas demo
  let canvasComponent: any;
  let evidenceItems = $state([
    {
      id: 'doc-1',
      type: 'document' as const,
      title: 'Contract Agreement',
      content: 'Legal contract between parties...',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 250 },
      metadata: { pages: 15, signed: true }
    },
    {
      id: 'img-1',
      type: 'image' as const,
      title: 'Evidence Photo',
      url: '/demo-evidence.jpg',
      thumbnail: '/demo-evidence-thumb.jpg',
      position: { x: 350, y: 150 },
      size: { width: 300, height: 200 },
      metadata: { timestamp: '2024-09-08T10:30:00Z' }
    },
    {
      id: 'note-1',
      type: 'note' as const,
      title: 'Investigation Notes',
      content: 'Key findings from witness interview...',
      position: { x: 200, y: 400 },
      size: { width: 200, height: 150 },
      metadata: { author: 'Det. Smith' }
    }
  ]);

  // GPU Cache visualization
  let somVisualization = $state([]);
  let cacheStats = $state({
    l1Size: 0,
    l2Size: 0,
    l3Size: 0,
    hitRate: 0,
    totalRequests: 0,
    avgResponseTime: 0
  });

  onMount(async () => {
    await initializeSystem();
    startMetricsUpdate();
  });

  /**
   * Initialize the evidence processing system
   */
  async function initializeSystem() {
    console.log('🚀 Initializing Evidence Processing System Demo...');

    try {
      // Initialize system integration
      const success = await systemIntegration.initialize();

      if (success) {
        isSystemReady = true;
        console.log('✅ System ready for demonstration');

        // Load initial demo data
        await loadDemoData();

        // Update system stats
        await updateSystemStats();
      } else {
        console.error('❌ System initialization failed');
      }
    } catch (error) {
      console.error('System initialization error:', error);
    }
  }

  /**
   * Load demo evidence data
   */
  async function loadDemoData() {
    try {
      // Simulate loading some demo evidence into the system
      const demoEvidence = [
        {
          id: 'demo-1',
          content: 'This is a sample legal document containing important evidence for the case. It includes witness statements, expert testimony, and physical evidence descriptions.',
          title: 'Legal Document 1',
          metadata: { type: 'witness-statement', importance: 'high' }
        },
        {
          id: 'demo-2',
          content: 'Contract agreement between ABC Corp and XYZ Ltd. Contains terms, conditions, and breach clauses relevant to the case.',
          title: 'Contract Agreement',
          metadata: { type: 'contract', parties: ['ABC Corp', 'XYZ Ltd'] }
        },
        {
          id: 'demo-3',
          content: 'Police report detailing the incident including timeline, witnesses, and initial findings from the investigation.',
          title: 'Police Report',
          metadata: { type: 'report', date: '2024-09-01', officer: 'Badge #1234' }
        }
      ];

      // Generate embeddings and store in GPU cache
      for (const doc of demoEvidence) {
        // Simulate embedding generation
        const embedding = new Float32Array(768);
        for (let i = 0; i < 768; i++) {
          embedding[i] = Math.random() * 0.1 - 0.05;
        }

        await globalGPUCache.store(doc.id, doc.content, embedding);
      }

      console.log('📄 Demo evidence data loaded');
    } catch (error) {
      console.error('Demo data loading failed:', error);
    }
  }

  /**
   * Update system statistics
   */
  async function updateSystemStats() {
    try {
      const stats = systemIntegration.getSystemStats();
      systemStats = stats;

      // Update GPU cache stats
      cacheStats = globalGPUCache.getStats();

      // Update SOM visualization
      somVisualization = globalGPUCache.getSOMVisualization();

    } catch (error) {
      console.error('Stats update failed:', error);
    }
  }

  /**
   * Start periodic metrics updates
   */
  function startMetricsUpdate() {
    setInterval(updateSystemStats, 2000); // Update every 2 seconds
  }

  /**
   * Handle evidence file upload
   */
  async function handleFileUpload() {
    if (!selectedFiles || selectedFiles.length === 0) return;

    processingProgress = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log(`📤 Processing file: ${file.name}`);

        // Store evidence through system integration
        const fileId = await systemIntegration.storeEvidence(
          'demo-case-123',
          file,
          { uploadedBy: 'demo-user', timestamp: new Date().toISOString() }
        );

        console.log(`✅ File stored with ID: ${fileId}`);

        // Update progress
        processingProgress = Math.round(((i + 1) / selectedFiles.length) * 100);
      }

      // Refresh stats after upload
      await updateSystemStats();

    } catch (error) {
      console.error('File upload failed:', error);
    }
  }

  /**
   * Perform semantic search
   */
  async function performSearch() {
    if (!searchQuery.trim()) return;

    isSearching = true;
    searchResults = [];

    try {
      console.log(`🔍 Searching for: "${searchQuery}"`);

      const results = await systemIntegration.semanticSearch(
        searchQuery,
        'demo-case-123',
        {
          limit: 10,
          threshold: 0.3,
          includeContext7: true,
          useGPUCache: true
        }
      );

      searchResults = results.documents;

      console.log(`📊 Found ${results.totalFound} results in ${results.queryTime.toFixed(2)}ms`);

    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      isSearching = false;
    }
  }

  /**
   * Add evidence to canvas
   */
  function addEvidenceToCanvas(evidence: any) {
    if (canvasComponent) {
      canvasComponent.addEvidence(evidence);
    }
  }

  /**
   * Get health status color
   */
  function getHealthColor(health: boolean): string {
    return health ? 'bg-green-500' : 'bg-red-500';
  }

  /**
   * Get status badge variant
   */
  function getStatusVariant(status: string): 'default' | 'destructive' | 'secondary' {
    switch (status) {
      case 'healthy': return 'default';
      case 'critical': return 'destructive';
      default: return 'secondary';
    }
  }
</script>

<svelte:head>
  <title>Evidence Processing System Demo</title>
  <meta name="description" content="Comprehensive evidence processing with GPU acceleration, self-organizing maps, and canvas integration">
</svelte:head>

<div class="demo-container">
  <!-- Header -->
  <div class="demo-header">
    <h1>🔍 Evidence Processing System</h1>
    <p>GPU-Accelerated RAG with MinIO, PostgreSQL, Redis & Context7 Integration</p>

    <div class="system-status">
      <Badge variant={getStatusVariant(systemStats.integrationStatus)} class="status-badge">
        {systemStats.integrationStatus.toUpperCase()}
      </Badge>

      <div class="health-indicators">
        <div class="health-item">
          <div class="health-dot {getHealthColor(systemStats.minioHealth)}"></div>
          <span>MinIO (4002/4003)</span>
        </div>
        <div class="health-item">
          <div class="health-dot {getHealthColor(systemStats.postgresHealth)}"></div>
          <span>PostgreSQL (5432)</span>
        </div>
        <div class="health-item">
          <div class="health-dot {getHealthColor(systemStats.redisHealth)}"></div>
          <span>Redis (4005)</span>
        </div>
        <div class="health-item">
          <div class="health-dot {getHealthColor(systemStats.context7Health)}"></div>
          <span>Context7 MCP</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <Tabs bind:value={activeTab} class="demo-tabs">
    <!-- Tab Navigation -->
    <div class="tab-nav">
      <button
        class="tab-button {activeTab === 'overview' ? 'active' : ''}"
        onclick={() => activeTab = 'overview'}
      >
        📊 System Overview
      </button>
      <button
        class="tab-button {activeTab === 'upload' ? 'active' : ''}"
        onclick={() => activeTab = 'upload'}
      >
        📤 Evidence Upload
      </button>
      <button
        class="tab-button {activeTab === 'search' ? 'active' : ''}"
        onclick={() => activeTab = 'search'}
      >
        🔍 Semantic Search
      </button>
      <button
        class="tab-button {activeTab === 'canvas' ? 'active' : ''}"
        onclick={() => activeTab = 'canvas'}
      >
        🖼️ Evidence Canvas
      </button>
      <button
        class="tab-button {activeTab === 'cache' ? 'active' : ''}"
        onclick={() => activeTab = 'cache'}
      >
        ⚡ GPU Cache
      </button>
      <button
        class="tab-button {activeTab === 'workflow' ? 'active' : ''}"
        onclick={() => activeTab = 'workflow'}
      >
        🔄 Workflow
      </button>
    </div>

    <!-- System Overview Tab -->
    {#if activeTab === 'overview'}
      <div class="tab-content">
        <div class="overview-grid">
          <!-- Architecture Diagram -->
          <Card class="architecture-card">
            <h3>🏗️ System Architecture</h3>
            <div class="architecture-diagram">
              <div class="arch-layer frontend">
                <div class="arch-component">Svelte Frontend</div>
                <div class="arch-component">Fabric.js Canvas</div>
              </div>

              <div class="arch-layer services">
                <div class="arch-component">GPU Cache (SOM)</div>
                <div class="arch-component">System Integration</div>
              </div>

              <div class="arch-layer storage">
                <div class="arch-component">MinIO<br><small>4002/4003</small></div>
                <div class="arch-component">PostgreSQL+pgVector<br><small>5432</small></div>
                <div class="arch-component">Redis<br><small>4005</small></div>
                <div class="arch-component">Context7 MCP<br><small>Semantic</small></div>
              </div>
            </div>
          </Card>

          <!-- System Metrics -->
          <Card class="metrics-card">
            <h3>📈 Performance Metrics</h3>
            <div class="metrics-grid">
              <div class="metric">
                <div class="metric-value">{systemStats.totalDocuments}</div>
                <div class="metric-label">Total Documents</div>
              </div>
              <div class="metric">
                <div class="metric-value">{Math.round(systemStats.cacheHitRate * 100)}%</div>
                <div class="metric-label">Cache Hit Rate</div>
              </div>
              <div class="metric">
                <div class="metric-value">{systemStats.avgQueryTime.toFixed(1)}ms</div>
                <div class="metric-label">Avg Query Time</div>
              </div>
              <div class="metric">
                <div class="metric-value">{cacheStats.totalRequests}</div>
                <div class="metric-label">Total Requests</div>
              </div>
            </div>
          </Card>

          <!-- Cache Distribution -->
          <Card class="cache-card">
            <h3>💾 3-Tier Cache Status</h3>
            <div class="cache-tiers">
              <div class="cache-tier l1">
                <div class="tier-label">L1 (GPU Memory)</div>
                <div class="tier-bar">
                  <Progress value={(cacheStats.l1Size / 1000) * 100} class="tier-progress" />
                </div>
                <div class="tier-info">{cacheStats.l1Size}/1000 items</div>
              </div>

              <div class="cache-tier l2">
                <div class="tier-label">L2 (System RAM)</div>
                <div class="tier-bar">
                  <Progress value={(cacheStats.l2Size / 10000) * 100} class="tier-progress" />
                </div>
                <div class="tier-info">{cacheStats.l2Size}/10k items</div>
              </div>

              <div class="cache-tier l3">
                <div class="tier-label">L3 (MinIO)</div>
                <div class="tier-bar">
                  <Progress value={(cacheStats.l3Size / 100000) * 100} class="tier-progress" />
                </div>
                <div class="tier-info">{cacheStats.l3Size}/100k items</div>
              </div>
            </div>
          </Card>

          <!-- Feature Highlights -->
          <Card class="features-card">
            <h3>✨ Key Features</h3>
            <div class="feature-list">
              <div class="feature-item">
                <div class="feature-icon">🚀</div>
                <div class="feature-text">
                  <strong>GPU Acceleration</strong><br>
                  CUDA-like operations for vector similarity
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🧠</div>
                <div class="feature-text">
                  <strong>Self-Organizing Maps</strong><br>
                  Intelligent document clustering
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🎯</div>
                <div class="feature-text">
                  <strong>3-Tier Caching</strong><br>
                  Optimal performance hierarchy
                </div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🔍</div>
                <div class="feature-text">
                  <strong>Semantic Search</strong><br>
                  Context7 MCP integration
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    {/if}

    <!-- Evidence Upload Tab -->
    {#if activeTab === 'upload'}
      <div class="tab-content">
        <Card class="upload-card">
          <h3>📤 Evidence File Upload</h3>
          <p>Upload evidence files for processing and storage in the integrated system</p>

          <div class="upload-section">
            <div class="file-input-wrapper">
              <input
                type="file"
                multiple
                bind:files={selectedFiles}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp4,.mp3"
                id="evidence-files"
                class="file-input"
              />
              <label for="evidence-files" class="file-input-label">
                📁 Choose Evidence Files
              </label>
            </div>

            {#if selectedFiles && selectedFiles.length > 0}
              <div class="selected-files">
                <h4>Selected Files:</h4>
                {#each Array.from(selectedFiles) as file}
                  <div class="file-item">
                    <span class="file-icon">
                      {#if file.type.startsWith('image/')}🖼️
                      {:else if file.type.startsWith('video/')}🎥
                      {:else if file.type.startsWith('audio/')}🎵
                      {:else}📄{/if}
                    </span>
                    <span class="file-name">{file.name}</span>
                    <span class="file-size">({Math.round(file.size / 1024)}KB)</span>
                  </div>
                {/each}
              </div>

              <Button
                onclick={handleFileUpload}
                disabled={!isSystemReady}
                class="upload-button bits-btn bits-btn"
              >
                🚀 Process Evidence Files
              </Button>

              {#if processingProgress > 0}
                <div class="progress-section">
                  <div class="progress-label">Processing: {processingProgress}%</div>
                  <Progress value={processingProgress} class="upload-progress" />
                </div>
              {/if}
            {/if}
          </div>

          <div class="upload-info">
            <h4>📋 Processing Pipeline:</h4>
            <ol class="pipeline-steps">
              <li>🔄 File validation and metadata extraction</li>
              <li>📊 Text content extraction (OCR if needed)</li>
              <li>🧠 Vector embedding generation</li>
              <li>💾 Storage across MinIO + PostgreSQL + Redis</li>
              <li>⚡ GPU cache optimization with SOM clustering</li>
              <li>🔍 Semantic indexing for search</li>
            </ol>
          </div>
        </Card>
      </div>
    {/if}

    <!-- Semantic Search Tab -->
    {#if activeTab === 'search'}
      <div class="tab-content">
        <Card class="search-card">
          <h3>🔍 Advanced Semantic Search</h3>
          <p>Search across all evidence using GPU-accelerated semantic similarity</p>

          <div class="search-section">
            <div class="search-input-wrapper">
              <Input
                bind:value={searchQuery}
                placeholder="Enter your search query (e.g., 'contract terms', 'witness testimony', 'evidence timeline')"
                class="search-input"
                onkeydown={(e) => e.key === 'Enter' && performSearch()}
              />
              <Button
                onclick={performSearch}
                disabled={!isSystemReady || isSearching}
                class="search-button bits-btn bits-btn"
              >
                {#if isSearching}🔄 Searching...{:else}🔍 Search{/if}
              </Button>
            </div>

            <div class="search-options">
              <div class="search-option">
                <input type="checkbox" id="use-gpu-cache" checked />
                <label for="use-gpu-cache">⚡ Use GPU Cache</label>
              </div>
              <div class="search-option">
                <input type="checkbox" id="include-context7" checked />
                <label for="include-context7">🌐 Include Context7</label>
              </div>
            </div>
          </div>

          {#if searchResults.length > 0}
            <div class="search-results">
              <h4>📊 Search Results</h4>
              {#each searchResults as result}
                <Card class="result-card">
                  <div class="result-header">
                    <h5>{result.title}</h5>
                    <div class="result-meta">
                      <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{result.source}</span>
                      <span class="similarity">
                        {Math.round(result.similarity * 100)}% match
                      </span>
                    </div>
                  </div>
                  <p class="result-content">{result.content}</p>
                  {#if result.url}
                    <Button size="sm" variant="outline" class="view-button bits-btn bits-btn">
                      👁️ View Evidence
                    </Button>
                  {/if}
                </Card>
              {/each}
            </div>
          {/if}

          {#if searchQuery && searchResults.length === 0 && !isSearching}
            <div class="no-results">
              <p>No results found for "{searchQuery}"</p>
              <p>Try adjusting your search terms or check system status.</p>
            </div>
          {/if}
        </Card>
      </div>
    {/if}

    <!-- Evidence Canvas Tab -->
    {#if activeTab === 'canvas'}
      <div class="tab-content">
        <Card class="canvas-card">
          <h3>🖼️ Interactive Evidence Canvas</h3>
          <p>Drag & drop evidence items, create connections, and visualize case relationships</p>

          <div class="canvas-container">
            <FabricCanvas
              bind:this={canvasComponent}
              caseId="demo-case-123"
              width={1000}
              height={600}
              gridEnabled={true}
              snapToGrid={false}
              on:canvasReady={() => console.log('Canvas ready')}
              on:evidenceAdded={(e) => console.log('Evidence added:', e.detail)}
              on:connectionCreated={(e) => console.log('Connection created:', e.detail)}
              on:canvasSaved={() => console.log('Canvas saved')}
            />
          </div>

          <div class="canvas-controls">
            <h4>📋 Sample Evidence Items</h4>
            <div class="evidence-samples">
              {#each evidenceItems as evidence}
                <Card class="evidence-sample"
                      onclick={() => addEvidenceToCanvas(evidence)}
                      role="button"
                      tabindex="0">
                  <div class="sample-icon">
                    {#if evidence.type === 'document'}📄
                    {:else if evidence.type === 'image'}🖼️
                    {:else if evidence.type === 'note'}📝
                    {:else}📁{/if}
                  </div>
                  <div class="sample-info">
                    <div class="sample-title">{evidence.title}</div>
                    <div class="sample-type">{evidence.type}</div>
                  </div>
                </Card>
              {/each}
            </div>

            <div class="canvas-help">
              <h5>💡 Canvas Tips:</h5>
              <ul>
                <li>Click evidence items above to add them to the canvas</li>
                <li>Use connection tool to link related evidence</li>
                <li>Zoom with mouse wheel, pan by dragging</li>
                <li>Select multiple items with Ctrl+click</li>
                <li>Save your canvas layout with Ctrl+S</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    {/if}

    <!-- GPU Cache Visualization Tab -->
    {#if activeTab === 'cache'}
      <div class="tab-content">
        <Card class="cache-card">
          <h3>⚡ GPU Cache & Self-Organizing Map</h3>
          <p>Real-time visualization of the 3-tier cache system and SOM clustering</p>

          <div class="cache-visualization">
            <!-- SOM Grid Visualization -->
            <div class="som-grid-container">
              <h4>🧠 Self-Organizing Map (16x16 Grid)</h4>
              <div class="som-grid">
                {#each somVisualization as node}
                  <div
                    class="som-node"
                    style="background-color: hsl({Math.min(node.docCount * 30, 240)}, 70%, {70 + node.docCount * 5}%)"
                    title="Cluster {node.clusterId}: {node.docCount} documents"
                  >
                    {node.docCount}
                  </div>
                {/each}
              </div>
              <div class="som-legend">
                <span>🔵 Darker = More Documents</span>
                <span>⚡ Real-time clustering</span>
              </div>
            </div>

            <!-- Cache Performance Metrics -->
            <div class="cache-metrics">
              <h4>📊 Cache Performance</h4>
              <div class="metrics-grid">
                <div class="metric-box">
                  <div class="metric-value">{Math.round(cacheStats.hitRate * 100)}%</div>
                  <div class="metric-label">Hit Rate</div>
                </div>
                <div class="metric-box">
                  <div class="metric-value">{cacheStats.avgResponseTime.toFixed(1)}ms</div>
                  <div class="metric-label">Avg Response</div>
                </div>
                <div class="metric-box">
                  <div class="metric-value">{cacheStats.l1Size + cacheStats.l2Size + cacheStats.l3Size}</div>
                  <div class="metric-label">Total Cached</div>
                </div>
              </div>
            </div>

            <!-- Cache Tier Breakdown -->
            <div class="cache-tiers-detail">
              <h4>💾 Cache Tier Analysis</h4>
              <div class="tier-analysis">
                <div class="tier-detail l1-detail">
                  <div class="tier-header">
                    <span class="tier-icon">⚡</span>
                    <span class="tier-name">L1 Cache (GPU Memory)</span>
                  </div>
                  <div class="tier-stats">
                    <div>Items: {cacheStats.l1Size}/1000</div>
                    <div>Speed: ~0.1ms access</div>
                    <div>Usage: Hot documents</div>
                  </div>
                </div>

                <div class="tier-detail l2-detail">
                  <div class="tier-header">
                    <span class="tier-icon">💾</span>
                    <span class="tier-name">L2 Cache (System RAM)</span>
                  </div>
                  <div class="tier-stats">
                    <div>Items: {cacheStats.l2Size}/10k</div>
                    <div>Speed: ~1ms access</div>
                    <div>Usage: Warm documents</div>
                  </div>
                </div>

                <div class="tier-detail l3-detail">
                  <div class="tier-header">
                    <span class="tier-icon">🗄️</span>
                    <span class="tier-name">L3 Cache (MinIO)</span>
                  </div>
                  <div class="tier-stats">
                    <div>Items: {cacheStats.l3Size}/100k</div>
                    <div>Speed: ~10ms access</div>
                    <div>Usage: Cold storage</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    {/if}

    <!-- Workflow Tab -->
    {#if activeTab === 'workflow'}
      <div class="tab-content">
        <Card class="workflow-card">
          <h3>🔄 Evidence Processing Workflow</h3>
          <p>Real-time evidence processing with streaming updates</p>

          <div class="workflow-container">
            <EvidenceProcessingWorkflow
              caseId="demo-case-123"
              autoStart={false}
              on:workflowStarted={() => console.log('Workflow started')}
              on:progressUpdate={(e) => console.log('Progress:', e.detail)}
              on:workflowComplete={() => console.log('Workflow completed')}
              on:error={(e) => console.error('Workflow error:', e.detail)}
            />
          </div>

          <div class="workflow-info">
            <h4>📋 Workflow Steps:</h4>
            <div class="workflow-steps">
              <div class="step">
                <div class="step-icon">1️⃣</div>
                <div class="step-content">
                  <strong>Evidence Intake</strong>
                  <p>File validation and metadata extraction</p>
                </div>
              </div>

              <div class="step">
                <div class="step-icon">2️⃣</div>
                <div class="step-content">
                  <strong>Content Processing</strong>
                  <p>OCR, text extraction, and content analysis</p>
                </div>
              </div>

              <div class="step">
                <div class="step-icon">3️⃣</div>
                <div class="step-content">
                  <strong>Vector Generation</strong>
                  <p>GPU-accelerated embedding creation</p>
                </div>
              </div>

              <div class="step">
                <div class="step-icon">4️⃣</div>
                <div class="step-content">
                  <strong>Storage & Indexing</strong>
                  <p>Multi-tier storage with semantic indexing</p>
                </div>
              </div>

              <div class="step">
                <div class="step-icon">5️⃣</div>
                <div class="step-content">
                  <strong>Cache Optimization</strong>
                  <p>SOM clustering and intelligent placement</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    {/if}
  </Tabs>
</div>

<style>
  .demo-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .demo-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: #1f2937;
  }

  .demo-header p {
    font-size: 1.125rem;
    color: #6b7280;
    margin-bottom: 1.5rem;
  }

  .system-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
  }

  .status-badge {
    font-weight: 600;
    px: 1rem;
    py: 0.5rem;
  }

  .health-indicators {
    display: flex;
    gap: 1rem;
  }

  .health-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .health-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
  }

  .tab-nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .tab-button {
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
    color: #6b7280;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-button:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .tab-button.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .tab-content {
    min-height: 600px;
  }

  /* Overview Tab Styles */
  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .architecture-card,
  .metrics-card,
  .cache-card,
  .features-card {
    padding: 1.5rem;
  }

  .architecture-diagram {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }

  .arch-layer {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .arch-component {
    flex: 1;
    min-width: 120px;
    padding: 0.75rem;
    border-radius: 0.5rem;
    text-align: center;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .frontend .arch-component {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .services .arch-component {
    background: #fef3c7;
    color: #d97706;
  }

  .storage .arch-component {
    background: #d1fae5;
    color: #059669;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-top: 1rem;
  }

  .metric {
    text-align: center;
    padding: 1rem;
    border-radius: 0.5rem;
    background: #f8fafc;
  }

  .metric-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .metric-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .cache-tiers {
    margin-top: 1rem;
  }

  .cache-tier {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background: #f8fafc;
  }

  .tier-label {
    font-size: 0.875rem;
    font-weight: 500;
    min-width: 120px;
  }

  .tier-bar {
    flex: 1;
  }

  .tier-info {
    font-size: 0.75rem;
    color: #6b7280;
    min-width: 80px;
    text-align: right;
  }

  .feature-list {
    margin-top: 1rem;
  }

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background: #f8fafc;
  }

  .feature-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .feature-text {
    font-size: 0.875rem;
    line-height: 1.5;
  }

  /* Upload Tab Styles */
  .upload-card {
    padding: 2rem;
  }

  .upload-section {
    margin: 2rem 0;
  }

  .file-input-wrapper {
    margin-bottom: 1.5rem;
  }

  .file-input {
    display: none;
  }

  .file-input-label {
    display: inline-block;
    padding: 1rem 2rem;
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    background: #f9fafb;
    color: #6b7280;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .file-input-label:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: #eff6ff;
  }

  .selected-files {
    margin: 1rem 0;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    margin-bottom: 0.25rem;
    border-radius: 0.25rem;
    background: #f3f4f6;
  }

  .file-icon {
    font-size: 1.25rem;
  }

  .file-name {
    flex: 1;
    font-weight: 500;
  }

  .file-size {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .upload-button {
    margin: 1rem 0;
  }

  .progress-section {
    margin-top: 1rem;
  }

  .progress-label {
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .upload-info {
    margin-top: 2rem;
    padding: 1.5rem;
    border-radius: 0.5rem;
    background: #f0f9ff;
  }

  .pipeline-steps {
    margin-top: 1rem;
    padding-left: 1rem;
  }

  .pipeline-steps li {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  /* Search Tab Styles */
  .search-card {
    padding: 2rem;
  }

  .search-section {
    margin: 2rem 0;
  }

  .search-input-wrapper {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .search-input {
    flex: 1;
  }

  .search-options {
    display: flex;
    gap: 1rem;
  }

  .search-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .search-results {
    margin-top: 2rem;
  }

  .result-card {
    margin-bottom: 1rem;
    padding: 1.5rem;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .result-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .similarity {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .result-content {
    color: #4b5563;
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  .no-results {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  /* Canvas Tab Styles */
  .canvas-card {
    padding: 1.5rem;
  }

  .canvas-container {
    margin: 1.5rem 0;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .canvas-controls {
    margin-top: 2rem;
  }

  .evidence-samples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .evidence-sample {
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
  }

  .evidence-sample:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
  }

  .sample-icon {
    font-size: 2rem;
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .sample-title {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .sample-type {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
  }

  .canvas-help {
    margin-top: 2rem;
    padding: 1.5rem;
    background: #f0f9ff;
    border-radius: 0.5rem;
  }

  .canvas-help ul {
    margin-top: 0.5rem;
    padding-left: 1rem;
  }

  .canvas-help li {
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
  }

  /* Cache Tab Styles */
  .cache-visualization {
    margin-top: 2rem;
  }

  .som-grid-container {
    margin-bottom: 2rem;
  }

  .som-grid {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 1px;
    max-width: 400px;
    margin: 1rem auto;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .som-node {
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 500;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .som-legend {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-top: 1rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .cache-metrics {
    margin-bottom: 2rem;
  }

  .metric-box {
    text-align: center;
    padding: 1.5rem;
    border-radius: 0.5rem;
    background: #f8fafc;
  }

  .cache-tiers-detail {
    margin-top: 2rem;
  }

  .tier-analysis {
    margin-top: 1rem;
  }

  .tier-detail {
    padding: 1.5rem;
    margin-bottom: 1rem;
    border-radius: 0.5rem;
    border-left: 4px solid;
  }

  .l1-detail {
    background: #fef3c7;
    border-left-color: #f59e0b;
  }

  .l2-detail {
    background: #dbeafe;
    border-left-color: #3b82f6;
  }

  .l3-detail {
    background: #d1fae5;
    border-left-color: #059669;
  }

  .tier-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .tier-icon {
    font-size: 1.25rem;
  }

  .tier-stats {
    font-size: 0.875rem;
    color: #4b5563;
  }

  .tier-stats div {
    margin-bottom: 0.25rem;
  }

  /* Workflow Tab Styles */
  .workflow-card {
    padding: 2rem;
  }

  .workflow-container {
    margin: 2rem 0;
  }

  .workflow-info {
    margin-top: 2rem;
  }

  .workflow-steps {
    margin-top: 1rem;
  }

  .step {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    border-radius: 0.5rem;
    background: #f8fafc;
  }

  .step-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;
  }

  .step-content strong {
    display: block;
    margin-bottom: 0.25rem;
    color: #1f2937;
  }

  .step-content p {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .demo-container {
      padding: 1rem;
    }

    .demo-header h1 {
      font-size: 2rem;
    }

    .system-status {
      flex-direction: column;
      gap: 1rem;
    }

    .health-indicators {
      flex-wrap: wrap;
      justify-content: center;
    }

    .tab-nav {
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .tab-nav::-webkit-scrollbar {
      display: none;
    }

    .overview-grid {
      grid-template-columns: 1fr;
    }

    .search-input-wrapper {
      flex-direction: column;
    }

    .evidence-samples {
      grid-template-columns: 1fr;
    }

    .som-grid {
      max-width: 280px;
    }
  }
</style>
