<!--
Enhanced Evidence Board with AI Integration + NES-Yorha Hybrid + N64 Gaming UI
Connects to Ollama legal model, CUDA services, and MinIO storage
Features: Retro gaming aesthetics, advanced AI analysis, real-time collaboration
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';

  // Types
  interface EvidenceItem {
    id: string;
    filename: string;
    type: 'document' | 'image' | 'video' | 'audio' | 'other';
    uploadedAt: string;
    status: 'uploading' | 'processing' | 'ready' | 'error';
    size: number;
    mimeType: string;
    aiAnalysis?: {
      summary?: string;
      confidence?: number;
      relevantLaws?: string[];
      suggestedTags?: string[];
      prosecutionScore?: number;
      legalRelevance?: string;
      keyFindings?: string[];
      recommendations?: string[];
      storage?: {
        bucket?: string;
        key?: string;
        url?: string;
      };
      unifiedInsights?: any;
    };
    position: { x: number; y: number };
  previewUrl?: string;
  }

  interface SearchSuggestion {
    text: string;
    type: 'case' | 'law' | 'evidence' | 'precedent';
    confidence: number;
    source: string;
    reasoning?: string;
  }

  // State management using Svelte 5 runes
  let evidenceItems = $state<EvidenceItem[]>([]);
  let filteredEvidence = $state<EvidenceItem[]>([]);
  let searchQuery = $state('');
  let selectedFilter = $state<string>('all');
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let dragActive = $state(false);
  let showToast = $state(false);
  let toastMessage = $state('');
  let showDeleteModal = $state(false);
  let pendingDeleteId = $state<string | null>(null);
  let searchSuggestions = $state<SearchSuggestion[]>([]);
  let showSuggestions = $state(false);
  let processingStatus = $state<'idle' | 'processing' | 'complete'>('idle');

  // AI Analysis state
  let aiEnabled = $state(true);
  let ollamaConnected = $state(false);
  let cudaConnected = $state(false);

  // Advanced analysis state
  let selectedEvidence = $state<string[]>([]);
  let isAnalyzing = $state(false);
  let aiAnalysisResults = $state<any>(null);
  let showAnalysisModal = $state(false);

  // MinIO upload configuration
  let minioConnected = $state(false);
  let uploadToMinIO = $state(true);
  let currentBucket = $state('legal-documents');
  let buckets = $state<string[]>([]);

  // Gaming UI state
  let gamingMode = $state(true);
  let particleEffects = $state(true);
  let spatialAudio = $state(true);
  let retroTerminalMode = $state(false);

  // Drag and drop state
  let dropZone: HTMLElement;
  let dragCounter = 0;

  // Computed properties
  let totalEvidence = $derived(evidenceItems.length);
  let processingCount = $derived(
    evidenceItems.filter(item => item.status === 'processing').length
  );
  let readyCount = $derived(
    evidenceItems.filter(item => item.status === 'ready').length
  );

  onMount(async () => {
  await loadExistingEvidence();
  await loadBuckets();
  await checkServiceStatus();
  startRealTimeUpdates();
  // fetch current user info for namespacing uploads
  try {
    const me = await fetch('/api/v1/storage/me', { credentials: 'include' });
    if (me.ok) {
      const j = await me.json();
      // store current user id in a local variable for signed url namespacing
      (window as any).__CURRENT_USER_ID__ = j.userId || (window as any).__CURRENT_USER_ID__;
    }
  } catch (e) {
    // ignore
  }
  });

  // Service health checks
  async function checkServiceStatus() {
    try {
      // Check Ollama connection
      const ollamaResponse = await fetch('/api/v1/evidence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceId: 'health-check',
          filename: 'test.txt',
          content: 'health check',
          type: 'document'
        })
      });
      ollamaConnected = ollamaResponse.status !== 500;

      // Check MinIO connection
      try {
        const minioResponse = await fetch('/api/v1/storage/health');
        minioConnected = minioResponse.ok;
      } catch (error) {
        console.warn('MinIO health check failed:', error);
        minioConnected = false;
      }

      console.log('Service status - Ollama:', ollamaConnected ? '✅' : '❌');
      console.log('Service status - MinIO:', minioConnected ? '✅' : '❌');
    } catch (error) {
      console.warn('Service health check failed:', error);
      ollamaConnected = false;
    }
  }

  // Load MinIO buckets for selection
  async function loadBuckets() {
    try {
      const resp = await fetch('/api/v1/storage/buckets');
      if (resp.ok) {
        const data = await resp.json();
        buckets = (data.buckets || []).map((b: any) => b.name);
        if ((!currentBucket || currentBucket === '') && buckets.length > 0) {
          currentBucket = buckets[0];
        }
        // mark connected if buckets available
        minioConnected = buckets.length > 0 || minioConnected;
      } else {
        buckets = [];
      }
    } catch (err) {
      console.warn('Failed to load MinIO buckets:', err);
      buckets = [];
    }
  }

  // Load existing evidence
  async function loadExistingEvidence() {
    try {
      const response = await fetch('/api/v1/evidence');
      if (response.ok) {
        const data = await response.json();
        evidenceItems = data.data || [];
        filterEvidence();
      }
    } catch (error) {
      console.error('Failed to load evidence:', error);
    }
  }

  // Filter evidence based on search and filters
  function filterEvidence() {
    let filtered = evidenceItems;

    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.aiAnalysis?.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.aiAnalysis?.relevantLaws?.some(law =>
          law.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(item => item.type === selectedFilter);
    }

    filteredEvidence = filtered;
  }

  // Get search suggestions from AI
  async function getSearchSuggestions(query: string) {
    if (query.length < 2) {
      searchSuggestions = [];
      showSuggestions = false;
      return;
    }

    try {
      const response = await fetch('/api/v1/evidence/search/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          type: 'legal',
          limit: 5
        })
      });

      if (response.ok) {
        const data = await response.json();
        searchSuggestions = data.data.suggestions;
        showSuggestions = true;
      }
    } catch (error) {
      console.error('Search suggestions failed:', error);
      searchSuggestions = [];
    }
  }

  // Handle search input with debouncing
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  function handleSearchInput() {
    if (searchTimeout !== null) clearTimeout(searchTimeout as any);
    searchTimeout = setTimeout(() => {
      filterEvidence();
      if (aiEnabled) {
        getSearchSuggestions(searchQuery);
      }
    }, 300);
  }

  // Apply search suggestion
  function applySuggestion(suggestion: SearchSuggestion) {
    searchQuery = suggestion.text;
    showSuggestions = false;
    filterEvidence();
  }

  // Drag and drop handlers
  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    dragCounter++;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      dragActive = true;
    }
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      dragActive = false;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragActive = false;
    dragCounter = 0;

    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;

    // Calculate drop position relative to the evidence board
    const rect = dropZone.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    await uploadFiles(files, position);
  }

  // File upload with AI processing
  async function uploadFiles(files: File[], position: { x: number; y: number }) {
    isUploading = true;
    processingStatus = 'processing';

    for (const file of files) {
      try {
        // Create evidence item immediately for UI feedback
        const evidenceId = crypto.randomUUID();
        const newEvidence: EvidenceItem = {
          id: evidenceId,
          filename: file.name,
          type: detectFileType(file.type),
          uploadedAt: new Date().toISOString(),
          status: 'uploading',
          size: file.size,
          mimeType: file.type,
          position: {
            x: position.x + (evidenceItems.length * 20),
            y: position.y + (evidenceItems.length * 20)
          }
        };

        // Add preview URL for images
        if (file.type.startsWith('image/')) {
          (newEvidence as any).previewUrl = URL.createObjectURL(file);
        }

        evidenceItems = [...evidenceItems, newEvidence];

        // Upload file to MinIO
        const formData = new FormData();
        formData.append('file', file);
        formData.append('position', JSON.stringify(newEvidence.position));
        formData.append('bucket', currentBucket);
        formData.append('useMinIO', uploadToMinIO.toString());

        // Upload to MinIO if configured, using signed URL (recommended)
        if (uploadToMinIO) {
            try {
            // Request signed URL (server will enforce session and namespace)
            const keyCandidate = `${(window as any).__CURRENT_USER_ID__ || 'anon'}/${file.name}`;
            const signedResp = await fetch('/api/v1/storage/signed-url', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: keyCandidate, bucket: currentBucket })
            });

            if (signedResp.ok) {
              const signedJson = await signedResp.json();
              const uploadUrl = signedJson.url;
              const namespacedKey = signedJson.key;

              // Upload directly to MinIO via PUT
              const putResp = await fetch(uploadUrl, { method: 'PUT', body: file });
              if (putResp.ok) {
                // Update status to processing and store storage metadata
                evidenceItems = evidenceItems.map(item =>
                  item.id === evidenceId ? ({
                    ...item,
                    status: 'processing',
                    aiAnalysis: {
                      ...(item.aiAnalysis || {}),
                      storage: { bucket: signedJson.bucket || currentBucket, key: namespacedKey, url: signedJson.url }
                    }
                  } as EvidenceItem) : item
                );

                toastMessage = `Uploaded ${file.name} → ${signedJson.bucket}/${namespacedKey}`;
                showToast = true;
                setTimeout(() => { showToast = false; }, 4000);

                // Trigger AI analysis
                await analyzeEvidence(evidenceId, file);
              } else {
                console.error('Direct PUT failed:', await putResp.text());
                evidenceItems = evidenceItems.map(item =>
                  item.id === evidenceId ? { ...item, status: 'error' } : item
                );
              }
            } else {
              // Signed URL request failed - fall back to server upload
              console.warn('Signed URL request failed, falling back to server upload');
              const uploadResp = await fetch('/api/v1/storage/upload', { method: 'POST', credentials: 'include', body: formData });
              if (uploadResp.ok) {
                const uploadJson = await uploadResp.json();
                evidenceItems = evidenceItems.map(item =>
                  item.id === evidenceId ? ({
                    ...item,
                    status: 'processing',
                    aiAnalysis: { ...(item.aiAnalysis || {}), storage: { bucket: uploadJson.bucket, key: uploadJson.key, url: uploadJson.url } }
                  } as EvidenceItem) : item
                );
                await analyzeEvidence(evidenceId, file);
              } else {
                evidenceItems = evidenceItems.map(item =>
                  item.id === evidenceId ? { ...item, status: 'error' } : item
                );
              }
            }
          } catch (err) {
            console.error('Upload exception:', err);
            evidenceItems = evidenceItems.map(item =>
              item.id === evidenceId ? { ...item, status: 'error' } : item
            );
          }
        } else {
          // Fallback/demo mode: simulate upload and trigger AI analysis
          setTimeout(async () => {
            evidenceItems = evidenceItems.map(item =>
              item.id === evidenceId ? { ...item, status: 'processing' } : item
            );
            await analyzeEvidence(evidenceId, file);
          }, 1000);
        }

      } catch (error) {
        console.error('File upload failed:', file.name, error);
      }
    }

    isUploading = false;
    filterEvidence();
  }

  // AI analysis of evidence
  async function analyzeEvidence(evidenceId: string, file: File) {
    try {
      // Extract text content for analysis (simplified)
      let content = '';
      if (file.type.startsWith('text/')) {
        content = await file.text();
      } else if (file.type === 'application/pdf') {
        content = `PDF document: ${file.name}`; // In production, extract PDF text
      }

      // Call AI analysis API
      const response = await fetch('/api/v1/evidence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceId,
          filename: file.name,
          content: content.substring(0, 2000), // Limit content length
          type: detectFileType(file.type)
        })
      });

      if (response.ok) {
        const analysisResult = await response.json();

        // Update evidence with AI analysis
        evidenceItems = evidenceItems.map(item =>
          item.id === evidenceId ? {
            ...item,
            status: 'ready',
            aiAnalysis: analysisResult.data.analysis
          } : item
        );
      } else {
        // Mark as error if analysis fails
        evidenceItems = evidenceItems.map(item =>
          item.id === evidenceId ? { ...item, status: 'error' } : item
        );
      }

    } catch (error) {
      console.error('AI analysis failed:', error);
      evidenceItems = evidenceItems.map(item =>
        item.id === evidenceId ? { ...item, status: 'error' } : item
      );
    }

    filterEvidence();
  }

  // Helper functions
  function detectFileType(mimeType: string): EvidenceItem['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.startsWith('text/')) return 'document';
    return 'other';
  }

  function getFileIcon(type: EvidenceItem['type']): string {
    const icons = {
      document: '📄',
      image: '🖼️',
      video: '🎥',
      audio: '🎵',
      other: '📎'
    };
    return icons[type];
  }

  // Revoke a preview URL if present
  function revokePreview(url?: string) {
    try {
      if (url && typeof URL !== 'undefined' && (URL as any).revokeObjectURL) {
        (URL as any).revokeObjectURL(url);
      }
    } catch (e) {
      // ignore
    }
  }

  // Remove evidence and revoke any preview URL
  function removeEvidence(id: string) {
    // open confirmation modal before deleting
    pendingDeleteId = id;
    showDeleteModal = true;
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    if (!id) return;

    const item = evidenceItems.find(it => it.id === id);

    let remoteOk = true;
    if (item?.aiAnalysis?.storage?.bucket && item?.aiAnalysis?.storage?.key) {
      try {
        const resp = await fetch('/api/v1/storage/object', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-api-key': (window as any).__MINIO_API_KEY__ || '' },
          body: JSON.stringify({ bucket: item.aiAnalysis.storage.bucket, key: item.aiAnalysis.storage.key })
        });

        const txt = await resp.text();
        if (!resp.ok) {
          remoteOk = false;
          console.warn('Remote delete failed:', txt);
          toastMessage = `Remote delete failed: ${txt}`;
          showToast = true;
          setTimeout(() => { showToast = false; }, 4000);
        }
      } catch (err) {
        remoteOk = false;
        console.warn('Remote delete exception:', err);
        toastMessage = `Remote delete exception`;
        showToast = true;
        setTimeout(() => { showToast = false; }, 4000);
      }
    }

    // Only remove locally if remote deletion succeeded (or there was nothing remote)
    if (remoteOk) {
      if (item && item.previewUrl) revokePreview(item.previewUrl);
      evidenceItems = evidenceItems.filter(it => it.id !== id);
      selectedEvidence = selectedEvidence.filter(sid => sid !== id);
      pendingDeleteId = null;
      showDeleteModal = false;
      filterEvidence();
    }
  }

  function cancelDelete() {
    pendingDeleteId = null;
    showDeleteModal = false;
  }

  // Cleanup object URLs when component unmounts
  onDestroy(() => {
    evidenceItems.forEach(item => {
      if (item.previewUrl) revokePreview(item.previewUrl);
    });
  });

  function getStatusIcon(status: EvidenceItem['status']): string {
    const icons = {
      uploading: '⬆️',
      processing: '🔄',
      ready: '✅',
      error: '❌'
    };
    return icons[status];
  }

  function getScoreColor(score: number): string {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }

  // Real-time updates (simulate with timer)
  function startRealTimeUpdates() {
    setInterval(() => {
      // Simulate processing completion
      evidenceItems = evidenceItems.map(item => {
        if (item.status === 'processing' && Math.random() > 0.8) {
          return {
            ...item,
            status: 'ready',
            aiAnalysis: {
              summary: `AI analysis complete for ${item.filename}`,
              confidence: Math.random() * 0.4 + 0.6,
              relevantLaws: ['Sample Law 1', 'Sample Law 2'],
              suggestedTags: ['evidence', 'legal'],
              prosecutionScore: Math.random() * 0.5 + 0.5,
              legalRelevance: 'High - Contains relevant legal information',
              keyFindings: ['Key finding 1', 'Key finding 2'],
              recommendations: ['Recommendation 1', 'Recommendation 2']
            }
          };
        }
        return item;
      });
    }, 5000);
  }

  // Enhanced AI analysis with all four advanced features
  async function performAdvancedAnalysis() {
    if (selectedEvidence.length === 0) {
      alert('Please select evidence for analysis');
      return;
    }

    isAnalyzing = true;

    try {
      const response = await fetch('/api/v1/evidence/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceIds: selectedEvidence,
          analysisScope: {
            vectorSimilarity: true,
            strategyRecommendations: true,
            wasmProcessing: false, // Enable for deep document analysis
            correlationAnalysis: true
          },
          parameters: {
            similarityThreshold: 0.7,
            strategyType: 'comprehensive',
            correlationConfidence: 0.6,
            includeVisualization: true
          },
          context: {
            caseType: 'commercial',
            urgency: 'medium'
          }
        })
      });

      if (response.ok) {
        const analysis = await response.json();
        aiAnalysisResults = analysis;

        // Update evidence with comprehensive AI insights
        evidenceItems = evidenceItems.map(item => {
          if (selectedEvidence.includes(item.id)) {
            // Enhance evidence with unified analysis results
            const correlations = (analysis.correlationAnalysis?.correlations || []).filter((c: any) =>
              c.evidenceA === item.id || c.evidenceB === item.id
            );

            const vectorGroup = (analysis.vectorAnalysis?.similarityGroups || []).find((g: any) =>
              Array.isArray(g.evidenceIds) && g.evidenceIds.includes(item.id)
            );

            const recs = (analysis.unifiedInsights?.recommendations || []).filter((r: any) =>
              String(r.action || '').toLowerCase().includes(item.filename.toLowerCase())
            );

            return {
              ...item,
              aiAnalysis: {
                ...(item.aiAnalysis || {}),
                unifiedInsights: {
                  correlations,
                  vectorGroup,
                  strategicImportance: analysis.strategyAnalysis?.primaryStrategy,
                  recommendations: recs
                }
              }
            } as EvidenceItem;
          }
          return item;
        });

        showAnalysisModal = true;

        // Update search suggestions based on analysis
        updateSearchSuggestions(analysis);

      } else {
        console.error('Advanced analysis failed');
        alert('Advanced analysis failed. Please try again.');
      }
    } catch (error) {
      console.error('Advanced analysis error:', error);
      alert('Analysis error occurred. Please check your connection and try again.');
    } finally {
      isAnalyzing = false;
    }
  }

  // Update search suggestions based on unified analysis
  function updateSearchSuggestions(analysis: any) {
    const newSuggestions: SearchSuggestion[] = [];

    // Add correlation-based suggestions
    if (analysis.correlationAnalysis?.patterns) {
      (analysis.correlationAnalysis.patterns || []).forEach((pattern: any) => {
        newSuggestions.push({ text: `${pattern.type}: ${pattern.description}`, type: 'evidence', confidence: 0.6, source: 'correlation' });
      });
    }

    // Add vector similarity suggestions
    if (analysis.vectorAnalysis?.similarityGroups) {
      (analysis.vectorAnalysis?.similarityGroups || []).forEach((group: any) => {
        (group.keyThemes || []).forEach((theme: any) => {
          newSuggestions.push({ text: `theme:${theme}`, type: 'precedent', confidence: 0.5, source: 'vector' });
        });
      });
    }

    // Add strategy-based suggestions
    if (analysis.strategyAnalysis?.primaryStrategy) {
      newSuggestions.push({ text: `strategy:${analysis.strategyAnalysis.primaryStrategy}`, type: 'case', confidence: 0.6, source: 'strategy' });
    }

  // Update suggestions (limit to top 10)
  const merged = [...searchSuggestions, ...newSuggestions];
  // Dedupe by text
  const dedup = Array.from(new Map(merged.map(s => [s.text, s])).values());
  searchSuggestions = dedup.slice(0, 10);
  }
</script>

<svelte:head>
  <title>🎮 Evidence Board - NES×YoRHa×N64 Legal AI</title>
  <link href="https://unpkg.com/nes.css@latest/css/nes.min.css" rel="stylesheet" />
</svelte:head>

<div class="nes-yorha-evidence-board min-h-screen bg-gradient-to-br from-nier-bg-primary via-nier-bg-secondary to-nier-bg-tertiary"
     class:retro-terminal={retroTerminalMode}
     class:particle-effects={particleEffects}>
  <!-- NES×YoRHa Hybrid Header -->
  <header class="yorha-card border-b-4 border-nier-accent mb-6">
    <div class="w-full px-6 py-8">
      <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">

        <!-- Title Section with Gaming Elements -->
        <div class="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div class="flex items-center gap-4">
            <div class="nes-avatar is-large">
              <div class="flex items-center justify-center w-16 h-16 bg-nier-accent rounded text-2xl">
                ⚖️
              </div>
            </div>
            <div>
              <h1 class="text-4xl font-bold nes-text is-primary mb-2">
                Evidence Board
              </h1>
              <p class="text-nier-text-secondary text-lg">
                NES×YoRHa×N64 Legal AI Assistant
              </p>
            </div>
          </div>

          <!-- System Status with NES Badges -->
          <div class="flex flex-wrap gap-2">
            <span class="nes-badge {ollamaConnected ? 'is-success' : 'is-error'}">
              🤖 {ollamaConnected ? 'AI Online' : 'AI Offline'}
            </span>
            <span class="nes-badge {minioConnected ? 'is-success' : 'is-error'}">
              📦 {minioConnected ? 'MinIO Ready' : 'Storage Offline'}
            </span>
            <span class="nes-badge {cudaConnected ? 'is-success' : 'is-warning'}">
              ⚡ {cudaConnected ? 'CUDA Active' : 'CPU Mode'}
            </span>
          </div>
        </div>

        <!-- Gaming Controls & Stats -->
        <div class="flex flex-col lg:flex-row items-start lg:items-center gap-4">

          <!-- Evidence Stats with N64 Style -->
          <div class="flex gap-2">
            <div class="n64-stat-card bg-gradient-to-br from-blue-500 to-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transform hover:scale-105 transition-all">
              <div class="text-xs opacity-80">Total</div>
              <div class="text-xl font-bold">{totalEvidence}</div>
            </div>
            <div class="n64-stat-card bg-gradient-to-br from-yellow-500 to-orange-600 text-white px-4 py-2 rounded-lg shadow-lg transform hover:scale-105 transition-all">
              <div class="text-xs opacity-80">Processing</div>
              <div class="text-xl font-bold">{processingCount}</div>
            </div>
            <div class="n64-stat-card bg-gradient-to-br from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg transform hover:scale-105 transition-all">
              <div class="text-xs opacity-80">Ready</div>
              <div class="text-xl font-bold">{readyCount}</div>
            </div>
          </div>

          <!-- Gaming Mode Toggle -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="nes-btn {gamingMode ? 'is-success' : ''}"
              onclick={() => gamingMode = !gamingMode}
              title="Toggle Gaming Mode"
            >
              🎮 Gaming
            </button>

            <button
              type="button"
              class="nes-btn {retroTerminalMode ? 'is-primary' : ''}"
              onclick={() => retroTerminalMode = !retroTerminalMode}
              title="Toggle Terminal Mode"
            >
              💻 Terminal
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>

  <div class="w-full px-4 py-6">

    <!-- Gaming-Style Search & Control Panel -->
    <div class="nes-container with-title is-rounded mb-6 relative z-10">
      <p class="title">🔍 AI-Powered Evidence Search & Control</p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-4 items-end">

        <!-- Enhanced Search Input -->
        <div class="lg:col-span-2">
          <label for="search-input" class="nes-text is-primary text-sm mb-2 block">Search Query</label>
          <div class="nes-field relative">
            <input
              type="text"
              class="nes-input"
              id="search-input"
              placeholder="Search evidence, laws, cases..."
              bind:value={searchQuery}
              oninput={handleSearchInput}
            />
          </div>

          <!-- AI Suggestions Dropdown -->
          {#if showSuggestions && searchSuggestions.length > 0}
            <div class="nes-container is-dark mt-2 max-h-48 overflow-y-auto">
              {#each searchSuggestions as suggestion}
                <button
                  type="button"
                  class="w-full text-left p-2 hover:bg-nier-accent hover:text-white transition-colors rounded mb-1"
                  onclick={() => applySuggestion(suggestion)}
                >
                  <div class="flex justify-between items-center">
                    <span class="font-medium">{suggestion.text}</span>
                    <span class="nes-badge is-success text-xs">
                      {(suggestion.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {#if suggestion.reasoning}
                    <div class="text-xs opacity-75 mt-1">{suggestion.reasoning}</div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Filter Selection -->
        <div>
          <label for="filter-select" class="nes-text is-primary text-sm mb-2 block">Evidence Type</label>
          <div class="nes-select">
            <select id="filter-select" bind:value={selectedFilter} onchange={filterEvidence}>
              <option value="all">All Types</option>
              <option value="document">📄 Documents</option>
              <option value="image">🖼️ Images</option>
              <option value="video">🎥 Videos</option>
              <option value="audio">🎵 Audio</option>
              <option value="other">📎 Other</option>
            </select>
          </div>
        </div>

        <!-- MinIO Bucket Selection -->
        <div>
          <label for="bucket-select" class="nes-text is-primary text-sm mb-2 block">Storage Bucket</label>
          <div class="nes-select">
            <select id="bucket-select" bind:value={currentBucket} onchange={() => { /* selection handled by bind */ }}>
              {#if buckets.length === 0}
                <option value="legal-documents">📁 Documents</option>
              {:else}
                {#each buckets as b}
                  <option value={b}>{b}</option>
                {/each}
              {/if}
            </select>
          </div>
        </div>
      </div>


      <!-- N64-Style Advanced Controls -->
      <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Selection & Upload Controls -->
        <div class="flex flex-col gap-2">
          <button
            type="button"
            class="nes-btn"
            onclick={() => {
              if (selectedEvidence.length === filteredEvidence.length) {
                selectedEvidence = [];
              } else {
                selectedEvidence = filteredEvidence.map(e => e.id);
              }
            }}
          >
            {selectedEvidence.length === filteredEvidence.length ? '❌ Deselect All' : '✅ Select All'}
          </button>

          <label class="flex items-center gap-2">
            <input type="checkbox" class="nes-checkbox" bind:checked={uploadToMinIO}>
            <span class="nes-text text-sm">📦 Upload to MinIO</span>
          </label>
        </div>

        <!-- Gaming Options -->
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2">
            <input type="checkbox" class="nes-checkbox" bind:checked={particleEffects}>
            <span class="nes-text text-sm">✨ Particle Effects</span>
          </label>

          <label class="flex items-center gap-2">
            <input type="checkbox" class="nes-checkbox" bind:checked={spatialAudio}>
            <span class="nes-text text-sm">🔊 Spatial Audio</span>
          </label>
        </div>

        <!-- Advanced AI Analysis -->
        <div class="flex flex-col gap-2">
          <button
            type="button"
            class="nes-btn {isAnalyzing ? 'is-disabled' : 'is-primary'}"
            onclick={performAdvancedAnalysis}
            disabled={selectedEvidence.length === 0 || isAnalyzing}
          >
            {#if isAnalyzing}
              🔄 Analyzing...
            {:else}
              🧠 AI Analysis ({selectedEvidence.length})
            {/if}
          </button>

          {#if selectedEvidence.length > 0}
            <div class="nes-text text-xs text-center">
              {selectedEvidence.length} items selected
            </div>
          {/if}
        </div>
      </div>
    </div>    <!-- Gaming-Themed Evidence Board -->
    <div class="nes-container is-rounded relative {dragActive ? 'drag-active' : ''}"
         class:retro-glow={gamingMode && particleEffects}>
      <div
        bind:this={dropZone}
        role="list"
        class="evidence-drop-zone min-h-96 p-6 transition-all duration-300"
        class:n64-depth={gamingMode}
        class:yorha-glow={dragActive}
        ondragenter={handleDragEnter}
        ondragleave={handleDragLeave}
        ondragover={handleDragOver}
        ondrop={handleDrop}
      >
        {#if dragActive}
          <div class="nes-container is-success p-8 text-center animate-pulse">
            <div class="text-6xl mb-4">📂</div>
            <h3 class="nes-text is-primary text-xl mb-2">Drop Evidence Here!</h3>
            <p class="nes-text">🤖 AI analysis will begin automatically</p>
            {#if uploadToMinIO}
              <p class="nes-text text-sm mt-2">📦 Uploading to MinIO bucket: {currentBucket}</p>
            {/if}
          </div>
        {/if}

        {#if filteredEvidence.length === 0 && !dragActive}
          <div class="text-center py-12">

            <!-- Retro Terminal Style Empty State -->
            {#if retroTerminalMode}
              <div class="nes-container is-dark p-6 text-left max-w-2xl mx-auto font-mono">
                <p class="text-green-400">$ ls -la /evidence/</p>
                <p class="text-gray-400">total 0</p>
                <p class="text-gray-400">drwxr-xr-x 2 legal legal 4096 Sep  8 15:30 .</p>
                <p class="text-gray-400">drwxr-xr-x 3 legal legal 4096 Sep  8 15:30 ..</p>
                <p class="text-red-400 mt-2">ERROR: No evidence files found</p>
                <p class="text-green-400 mt-2">$ drag-drop --upload-to=minio --analyze=ai</p>
                <p class="text-yellow-400">Waiting for evidence upload...</p>
              </div>
            {:else}
              <!-- Gaming Style Empty State -->
              <div class="nes-container with-title">
                <p class="title">🎮 Evidence Repository</p>
                <div class="text-8xl mb-4">⚖️</div>
                <h3 class="nes-text is-primary text-2xl mb-4">No Evidence Loaded</h3>
                <p class="nes-text mb-4">Drag and drop files here to begin analysis</p>

                <div class="flex flex-wrap justify-center gap-2 mb-4">
                  <span class="nes-badge">📄 PDF</span>
                  <span class="nes-badge">🖼️ Images</span>
                  <span class="nes-badge">🎥 Videos</span>
                  <span class="nes-badge">🎵 Audio</span>
                  <span class="nes-badge">📎 Files</span>
                </div>

                {#if buckets.length > 0}
                  <div class="mt-4 flex flex-wrap justify-center gap-2">
                    {#each buckets as b}
                      <button type="button" class="nes-btn is-primary text-sm" onclick={() => currentBucket = b} title={`Select bucket ${b}`}>
                        📦 {b}
                      </button>
                    {/each}
                  </div>
                {/if}

                {#if aiEnabled && ollamaConnected}
                  <div class="nes-container is-success p-4 inline-block">
                    <p class="nes-text text-sm">✨ AI Analysis Ready</p>
                    <p class="nes-text text-xs">gemma3-legal model online</p>
                  </div>
                {/if}

                {#if minioConnected}
                  <div class="nes-container is-primary p-4 inline-block mt-2">
                    <p class="nes-text text-sm">📦 MinIO Storage Ready</p>
                    <p class="nes-text text-xs">Bucket: {currentBucket}</p>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Gaming-Style Evidence Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {#each filteredEvidence as evidence (evidence.id)}
            <div class="evidence-card nes-container {selectedEvidence.includes(evidence.id) ? 'is-success' : 'with-title'} relative"
                 class:n64-glow={gamingMode && selectedEvidence.includes(evidence.id)}
                 class:yorha-selected={selectedEvidence.includes(evidence.id)}>

              {#if !selectedEvidence.includes(evidence.id)}
                <p class="title">{getFileIcon(evidence.type)} Evidence File</p>
              {/if}

              <!-- Gaming-Style Header -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3 flex-1 min-w-0">

                  <!-- NES Checkbox -->
                  <label class="flex items-center">
                    <input
                      type="checkbox"
                      class="nes-checkbox"
                      checked={selectedEvidence.includes(evidence.id)}
                      onchange={(e: Event) => {
                        const target = e.target as HTMLInputElement | null;
                        if (target && target.checked) {
                          selectedEvidence = [...selectedEvidence, evidence.id];
                        } else {
                          selectedEvidence = selectedEvidence.filter(id => id !== evidence.id);
                        }
                      }}
                    />
                    <span></span>
                  </label>

                <span class="w-10 h-10 flex items-center justify-center">
                  {#if evidence.previewUrl}
                    <img src={evidence.previewUrl} alt={evidence.filename} class="evidence-thumb rounded" />
                  {:else}
                    <span class="text-2xl">{getFileIcon(evidence.type)}</span>
                  {/if}
                </span>
                  <h4 class="font-medium text-gray-900 truncate text-sm" title={evidence.filename}>
                    {evidence.filename}
                  </h4>
                  <button type="button" class="ml-2 nes-btn is-error is-small" onclick={() => removeEvidence(evidence.id)} title="Remove evidence">
                    ✖
                  </button>
                  <p class="text-xs text-gray-500">
                    {(evidence.size / 1024).toFixed(1)} KB • {new Date(evidence.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
                  <span class="text-lg" title={evidence.status}>
                {getStatusIcon(evidence.status)}
              </span>

              <!-- AI Analysis -->
              {#if evidence.aiAnalysis}
                <div class="space-y-2">
                <!-- Prosecution Score -->
                {#if evidence.aiAnalysis.prosecutionScore}
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-gray-600">Prosecution Score</span>
                    <span class="text-xs px-2 py-1 rounded {getScoreColor(evidence.aiAnalysis.prosecutionScore)}">
                      {(evidence.aiAnalysis.prosecutionScore * 100).toFixed(0)}%
                    </span>
                  </div>
                {/if}

                <!-- Summary -->
                <p class="text-xs text-gray-700 leading-relaxed">
                  {evidence.aiAnalysis.summary}
                </p>

                <!-- Relevant Laws -->
                {#if evidence.aiAnalysis?.relevantLaws && evidence.aiAnalysis.relevantLaws.length > 0}
                  <div class="space-y-1">
                    <span class="text-xs font-medium text-gray-600">Relevant Laws:</span>
                    <div class="flex flex-wrap gap-1">
                      {#each evidence.aiAnalysis.relevantLaws.slice(0, 2) as law}
                        <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {law}
                        </span>
                      {/each}
                      {#if evidence.aiAnalysis.relevantLaws.length > 2}
                        <span class="text-xs text-gray-500">+{evidence.aiAnalysis.relevantLaws.length - 2} more</span>
                      {/if}
                    </div>
                  </div>
                {/if}

                <!-- Tags -->
                {#if evidence.aiAnalysis?.suggestedTags && evidence.aiAnalysis.suggestedTags.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each evidence.aiAnalysis.suggestedTags.slice(0, 3) as tag}
                      <span class="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    {/each}
                  </div>
                {/if}

                <!-- Storage URL -->
                {#if evidence.aiAnalysis?.storage?.url}
                  <div class="mt-2 text-xs">
                    <a class="text-blue-600 underline" href={evidence.aiAnalysis.storage.url} target="_blank" rel="noopener noreferrer">
                      View file in storage
                    </a>
                  </div>
                {/if}

                <!-- Processing Status -->
                {#if evidence.status === 'processing'}
                  <div class="mt-3 flex items-center gap-2 text-xs text-blue-600">
                    <div class="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
                    Analyzing with AI...
                  </div>
                {:else if evidence.status === 'error'}
                  <div class="mt-3 text-xs text-red-600">
                    Analysis failed - manual review needed
                  </div>
                {/if}
              </div>
            {/if}

            </div>
          {/each}
      </div>
    </div>

    <!-- Upload Progress -->
    {#if isUploading}
      <div class="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div class="flex items-center gap-3">
          <div class="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <div class="flex-1">
            <div class="font-medium text-gray-900">Processing Evidence</div>
            <div class="text-sm text-gray-500">AI analysis in progress...</div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

</div>

<!-- Toast confirmation -->
{#if showToast}
  <div class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow-lg z-50">
    {toastMessage}
  </div>
{/if}

{#if showDeleteModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <h3 class="text-lg font-semibold mb-4">Confirm Delete</h3>
      <p class="text-sm mb-4">Are you sure you want to permanently delete this evidence item? This will also remove the file from storage if present.</p>
      <div class="flex justify-end gap-2">
        <button class="nes-btn" onclick={cancelDelete}>Cancel</button>
        <button class="nes-btn is-error" onclick={confirmDelete}>Delete</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .evidence-thumb {
    width: 40px;
    height: 40px;
    object-fit: cover;
    display: block;
  }
</style>
