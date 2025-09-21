<script lang="ts">
  // Svelte 5 runes are auto-imported

  import 'nes.css/css/nes.min.css';
  import { onMount } from "svelte";
  import { apiFetch } from "$lib/api/clients/api-client";
  import { concurrencyOrchestrator } from '$lib/services/concurrency-orchestrator';
  import { FileText, Upload, Save, Loader, CheckCircle, AlertCircle } from 'lucide-svelte';

  // Props
  interface Props {
    caseId?: string;
  }

  let { caseId = 'demo-case-001' }: Props = $props();

  // Canvas and Fabric.js
  let canvasEl: HTMLCanvasElement = $state();
  let fabricCanvas: any;
  let fileInput: HTMLInputElement = $state();

  // Analysis state
  let analysisStatus: 'idle' | 'pending' | 'analyzing' | 'complete' | 'error' = $state('idle');
  let analysisProgress = $state(0);
  let error: string | null = $state(null);

  // Enhanced result structure matching our API
  let analysisResult: {
    summary?: string;
    riskLevel?: string;
    keyFindings?: string[];
    recommendations?: string[];
    similarCases?: Array<{ id: string; title: string; similarity: number }>;
    complianceStatus?: string;
    timeline?: Array<{ event: string; date: string; importance: string }>;
    processingTime?: number;
  } | null = $state(null);

  // Evidence upload state
  let evidenceList: Array<{
    id: string;
    name: string;
    type: string;
    uploadedAt: string;
    status: 'uploading' | 'uploaded' | 'failed';
  }> = $state([]);

  // Canvas options
  let options = $state({
    analyze_layout: true,
    extract_entities: true,
    generate_summary: true,
    confidence_level: 0.8,
    context_window: 4096,
  });

  $effect(async () => {
    const { fabric } = await import("fabric");
    fabricCanvas = new fabric.Canvas(canvasEl, {
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    // Register canvas with concurrency orchestrator
    const canvasId = `evidence-canvas-${Date.now()}`;
    concurrencyOrchestrator.createCanvas(canvasId, canvasEl);

    // Load existing evidence for this case
    await loadCaseEvidence();

    // Add some default evidence items if none exist
    if (evidenceList.length === 0) {
      addDefaultEvidenceItems();
    }
  });

  async function loadCaseEvidence() {
    try {
      const response = await fetch(`/api/cases/${caseId}/evidence`);
      if ((response as { ok?: any; json?: any; statusText?: any }).ok) {
        const data = await (response as { ok?: any; json?: any; statusText?: any }).json();
        evidenceList = ((data as { evidence?: any }).evidence || []).map((item: any) => ({
          id: (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).id || crypto.randomUUID(),
          name: (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).title || (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).name || 'Evidence Item',
          type: (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).type || (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).evidenceType || 'document',
          uploadedAt: (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).createdAt || new Date().toISOString(),
          status: 'uploaded' as const
        }));

        // Add visual representations to canvas
        evidenceList.forEach((item, index) => {
          addEvidenceToCanvas(item, index);
        });
      }
    } catch (error) {
      console.warn('Could not load case evidence:', error);
    }
  }

  function addDefaultEvidenceItems() {
    const defaultItems = [
      { name: 'Contract Document', type: 'document', color: '#3b82f6' },
      { name: 'Email Evidence', type: 'communication', color: '#10b981' },
      { name: 'Financial Records', type: 'financial', color: '#f59e0b' },
      { name: 'Witness Statement', type: 'testimony', color: '#8b5cf6' }
    ];

    defaultItems.forEach((item, index) => {
      const evidenceItem = {
        id: crypto.randomUUID(),
        name: (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).name,
        type: (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).type,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded' as const
      };
      evidenceList.push(evidenceItem);
      addEvidenceToCanvas(evidenceItem, index, (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).color);
    });
  }

  function addEvidenceToCanvas(evidence: any, index: number, color?: string) {
    const x = 100 + (index % 3) * 250;
    const y = 100 + Math.floor(index / 3) * 150;

    // Add evidence box
    const rect = new (fabricCanvas.constructor as any).Rect({
      left: x,
      top: y,
      fill: color || getEvidenceColor(evidence.type),
      width: 200,
      height: 120,
      stroke: '#333',
      strokeWidth: 2,
      rx: 10,
      ry: 10,
      selectable: true,
      evidenceId: evidence.id
    });

    // Add evidence label
    const text = new (fabricCanvas.constructor as any).Text(evidence.name, {
      left: x + 10,
      top: y + 10,
      fontFamily: 'Arial',
      fontSize: 14,
      fill: '#ffffff',
      fontWeight: 'bold',
      selectable: false,
      evented: false
    });

    // Add type label
    const typeText = new (fabricCanvas.constructor as any).Text(`Type: ${evidence.type}`, {
      left: x + 10,
      top: y + 35,
      fontFamily: 'Arial',
      fontSize: 12,
      fill: '#ffffff',
      selectable: false,
      evented: false
    });

    // Add status indicator
    const statusText = new (fabricCanvas.constructor as any).Text(`Status: ${evidence.status}`, {
      left: x + 10,
      top: y + 55,
      fontFamily: 'Arial',
      fontSize: 10,
      fill: '#ffffff',
      selectable: false,
      evented: false
    });

    fabricCanvas.add(rect);
    fabricCanvas.add(text);
    fabricCanvas.add(typeText);
    fabricCanvas.add(statusText);
  }

  function getEvidenceColor(type: string): string {
    const colors: Record<string, string> = {
      document: '#3b82f6',
      communication: '#10b981',
      financial: '#f59e0b',
      testimony: '#8b5cf6',
      physical: '#ef4444',
      digital: '#06b6d4',
      default: '#6b7280'
    };
    return colors[type] || colors.default;
  }

  function collectObjects() {
    const objs = (fabricCanvas?.getObjects?.() ?? []).map((o: any) => {
      const type = o.type || "object";
      const left = typeof o.left === "number" ? o.left: 0;
      const top = typeof o.top === "number" ? o.top: 0;
      const text = typeof o.text === "string" ? o.text: undefined;
      const evidenceId = o.evidenceId;
      return {
        type,
        position: { x: left, y: top },
        ...(text ? { text } : ),
        ...(evidenceId ? { evidenceId } : )
      };
    });
    return objs;
  }

  // Enhanced analysis function using our real API endpoint
  async function handleAnalysis() {
    if (!caseId) return;

    analysisStatus = 'pending';
    analysisProgress = 0;
    error = null;
    analysisResult = null;

    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        analysisProgress = Math.min(analysisProgress + 8, 85);
      }, 300);

      analysisStatus = 'analyzing';

      // Call our real analysis endpoint
      const response = await fetch(`/api/cases/${caseId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_data: {
            objects: collectObjects(),
            evidence_items: evidenceList,
            canvas_size: { width: canvasEl.width, height: canvasEl.height }
          },
          options
        })
      });

      clearInterval(progressInterval);

      if (!(response as { ok?: any; json?: any; statusText?: any }).ok) {
        throw new Error(`Analysis failed: ${(response as { ok?: any; json?: any; statusText?: any }).statusText}`);
      }

      const result = await (response as { ok?: any; json?: any; statusText?: any }).json();

      if ((result as { success?: any; analysis?: any; metadata?: any; error?: any }).success && (result as { success?: any; analysis?: any; metadata?: any; error?: any }).analysis) {
        analysisResult = {
          summary: (result as { success?: any; analysis?: any; metadata?: any; error?: any }).analysis.summary,
          riskLevel: (result as { success?: any; analysis?: any; metadata?: any; error?: any }).analysis.riskLevel,
          keyFindings: (result as { success?: any; analysis?: any; metadata?: any; error?: any }).analysis.keyFindings,
          recommendations: (result as { success?: any; analysis?: any; metadata?: any; error?: any }).analysis.recommendations,
          similarCases: (result as { success?: any; analysis?: any; metadata?: any; error?: any }).analysis.similarCases,
          complianceStatus: (result as { success?: any; analysis?: any; metadata?: any; error?: any }).analysis.complianceStatus,
          timeline: (result as { success?: any; analysis?: any; metadata?: any; error?: any }).analysis.timeline,
          processingTime: (result as { success?: any; analysis?: any; metadata?: any; error?: any }).metadata?.processingTimeMs
        };

        analysisProgress = 100;
        analysisStatus = 'complete';

        // Auto-close after showing success
        setTimeout(() => {
          analysisStatus = 'idle';
          analysisProgress = 0;
        }, 5000);
      } else {
        throw new Error((result as { success?: any; analysis?: any; metadata?: any; error?: any }).error || 'Analysis failed');
      }

    } catch (e: any) {
      error = e instanceof Error ? e.message: String(e);
      analysisStatus = 'error';
      console.error('Analysis failed:', e);
    }
  }

  // File upload function
  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const evidenceItem = {
        id: crypto.randomUUID(),
        name: file.name,
        type: getFileType(file.type),
        uploadedAt: new Date().toISOString(),
        status: 'uploading' as const
      };

      evidenceList.push(evidenceItem);

      try {
        // Upload to MinIO or fallback endpoint
        const formData = new FormData();
        formData.append('file', file);
        formData.append('caseId', caseId);
        formData.append('evidenceType', evidenceItem.type);

        const response = await fetch('/api/v1/minio/upload', {
          method: 'POST',
          body: formData
        });

        if ((response as { ok?: any; json?: any; statusText?: any }).ok) {
          evidenceItem.status = 'uploaded';
          addEvidenceToCanvas(evidenceItem, evidenceList.length - 1);
        } else {
          evidenceItem.status = 'failed';
        }
      } catch (error) {
        console.error('Upload failed:', error);
        evidenceItem.status = 'failed';
      }
    }

    // Clear the input
    target.value = '';
  }

  function getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'digital';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('text')) return 'document';
    if (mimeType.includes('video')) return 'digital';
    if (mimeType.includes('audio')) return 'digital';
    return 'document';
  }

  function saveCanvas() {
    const canvasData = {
      version: fabricCanvas.version,
      objects: fabricCanvas.toJSON(),
      evidence: evidenceList,
      timestamp: new Date().toISOString(),
      caseId
    };

    // Save to localStorage as backup
    localStorage.setItem(`evidence-canvas-${caseId}`, JSON.stringify(canvasData));

    // TODO: Save to backend
    console.log('Canvas saved:', canvasData);
  }
</script>

<!-- NES-styled toolbar with controls and status -->
<div class="nes-container with-title is-centered evidence-toolbar">
  <p class="title">Evidence Analysis Toolkit</p>

  <!-- File Upload Section -->
  <div class="upload-section">
    <label class="nes-btn">
      <Upload size={16} />
      Upload Evidence
      <input
        type="file"
        bind:this={fileInput}
        onchange={handleFileUpload}
        multiple
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
        style="display: none;"
      />
    </label>

    <button
      class="nes-btn {analysisStatus === 'idle' ? 'is-primary' : analysisStatus === 'complete' ? 'is-success' : 'is-warning'}"
      onclick={handleAnalysis}
      disabled={analysisStatus === 'analyzing' || analysisStatus === 'pending'}
    >
      {#if analysisStatus === 'analyzing'}
        <Loader size={16} />
        Analyzing Evidence...
      {:else if analysisStatus === 'complete'}
        <CheckCircle size={16} />
        Analysis Complete
      {:else if analysisStatus === 'error'}
        <AlertCircle size={16} />
        Retry Analysis
      {:else}
        <FileText size={16} />
        Analyze Evidence
      {/if}
    </button>

    <button class="nes-btn" onclick={saveCanvas}>
      <Save size={16} />
      Save Canvas
    </button>
  </div>

  <!-- Progress Bar -->
  {#if analysisStatus === 'pending' || analysisStatus === 'analyzing'}
    <div class="progress-section">
      <label class="nes-text">Analysis Progress:</label>
      <progress
        class="nes-progress {analysisStatus === 'analyzing' ? 'is-primary' : 'is-warning'}"
        value={analysisProgress}
        max="100"
      ></progress>
      <span class="progress-text">{Math.round(analysisProgress)}%</span>
    </div>
  {/if}

  <!-- Analysis Options -->
  <div class="options-grid">
    <label class="nes-text">
      <input type="checkbox" class="nes-checkbox" bind:checked={options.analyze_layout} />
      <span>Layout Analysis</span>
    </label>

    <label class="nes-text">
      <input type="checkbox" class="nes-checkbox" bind:checked={options.extract_entities} />
      <span>Entity Extraction</span>
    </label>

    <label class="nes-text">
      <input type="checkbox" class="nes-checkbox" bind:checked={options.generate_summary} />
      <span>AI Summary</span>
    </label>
  </div>

  <!-- Advanced Settings -->
  <details class="advanced-settings">
    <summary class="nes-text">Advanced Settings</summary>
    <div class="settings-row">
      <label class="nes-text">
        Context Window:
        <input
          type="number"
          class="nes-input"
          bind:value={options.context_window}
          min={512}
          max={16384}
          step={256}
          style="width: 8rem; margin-left: 0.5rem;"
        />
      </label>

      <label class="nes-text">
        Confidence:
        <input
          type="number"
          class="nes-input"
          bind:value={options.confidence_level}
          min={0}
          max={1}
          step={0.05}
          style="width: 6rem; margin-left: 0.5rem;"
        />
      </label>
    </div>
  </details>

  <!-- Status Messages -->
  {#if error}
    <div class="nes-container is-rounded is-error">
      <p><AlertCircle size={16} /> {error}</p>
    </div>
  {/if}
</div>

<div class="evidence-canvas-wrapper">
  <canvas bind:this={canvasEl} width="800" height="600"></canvas>
</div>

<!-- Evidence List Display -->
{#if evidenceList.length > 0}
  <div class="nes-container with-title evidence-list">
    <p class="title">Evidence Items ({evidenceList.length})</p>
    <div class="evidence-grid">
      {#each evidenceList as item}
        <div class="nes-container is-rounded evidence-item {(item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).status}">
          <div class="evidence-header">
            <span class="evidence-name">{(item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).name}</span>
            <span class="evidence-status nes-badge">
              {#if (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).status === 'uploaded'}
                <CheckCircle size={14} />
              {:else if (item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).status === 'uploading'}
                <Loader size={14} />
              {:else}
                <AlertCircle size={14} />
              {/if}
              {(item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).status}
            </span>
          </div>
          <div class="evidence-details">
            <small>Type: {(item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).type}</small>
            <small>Added: {new Date((item as { id?: any; title?: any; name?: any; type?: any; evidenceType?: any; createdAt?: any; color?: any; status?: any; uploadedAt?: any; uploading?: any; uploaded?: any; failed?: any; high?: any; medium?: any; low?: any }).uploadedAt).toLocaleDateString()}</small>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<!-- Comprehensive Analysis Results Panel -->
{#if analysisResult}
  <div class="nes-container with-title is-centered analysis-results">
    <p class="title">Legal Analysis Results</p>

    <!-- Executive Summary Card -->
    <div class="nes-container is-rounded summary-card">
      <h4 class="nes-text">Executive Summary</h4>
      <p class="analysis-text">{analysisResult.summary}</p>

      {#if analysisResult.riskLevel}
        <div class="risk-indicator">
          <span class="nes-badge {analysisResult.riskLevel === 'high' || analysisResult.riskLevel === 'critical' ? 'is-error' : analysisResult.riskLevel === 'medium' ? 'is-warning' : 'is-success'}">
            Risk Level: {analysisResult.riskLevel.toUpperCase()}
          </span>
        </div>
      {/if}
    </div>

    <!-- Key Findings -->
    {#if analysisResult.keyFindings && analysisResult.keyFindings.length > 0}
      <div class="nes-container is-rounded findings-card">
        <h4 class="nes-text">Key Findings</h4>
        <div class="findings-list">
          {#each analysisResult.keyFindings as finding}
            <div class="nes-container is-rounded finding-item">
              <p>• {finding}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Recommendations -->
    {#if analysisResult.recommendations && analysisResult.recommendations.length > 0}
      <div class="nes-container is-rounded recommendations-card">
        <h4 class="nes-text">AI Recommendations</h4>
        <div class="recommendations-list">
          {#each analysisResult.recommendations as recommendation}
            <div class="nes-container is-rounded recommendation-item">
              <p>→ {recommendation}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Similar Cases -->
    {#if analysisResult.similarCases && analysisResult.similarCases.length > 0}
      <div class="nes-container is-rounded similar-cases-card">
        <h4 class="nes-text">Similar Cases Found</h4>
        <div class="similar-cases-list">
          {#each analysisResult.similarCases as similarCase}
            <div class="nes-container is-rounded case-item">
              <div class="case-header">
                <span class="case-title">{similarCase.title}</span>
                <span class="nes-badge is-primary">{Math.round(similarCase.similarity * 100)}% match</span>
              </div>
              <small class="case-id">Case ID: {similarCase.id}</small>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Timeline -->
    {#if analysisResult.timeline && analysisResult.timeline.length > 0}
      <div class="nes-container is-rounded timeline-card">
        <h4 class="nes-text">Case Timeline</h4>
        <div class="timeline-list">
          {#each analysisResult.timeline as event}
            <div class="nes-container is-rounded timeline-item {event.importance}">
              <div class="timeline-header">
                <span class="timeline-date">{new Date(event.date).toLocaleDateString()}</span>
                <span class="nes-badge {event.importance === 'high' ? 'is-error' : event.importance === 'medium' ? 'is-warning' : 'is-success'}">
                  {event.importance}
                </span>
              </div>
              <p class="timeline-event">{event.event}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Compliance Status -->
    {#if analysisResult.complianceStatus}
      <div class="nes-container is-rounded compliance-card">
        <h4 class="nes-text">Compliance Status</h4>
        <div class="compliance-status">
          <span class="nes-badge {analysisResult.complianceStatus.toLowerCase.includes('compliant') ? 'is-success' : analysisResult.complianceStatus.toLowerCase.includes('violation') ? 'is-error' : 'is-warning'}">
            {analysisResult.complianceStatus}
          </span>
        </div>
      </div>
    {/if}

    <!-- Processing Metadata -->
    <div class="nes-container is-rounded metadata-card">
      <h4 class="nes-text">Analysis Metadata</h4>
      <div class="metadata-grid">
        {#if analysisResult.processingTime}
          <div class="metadata-item">
            <span class="metadata-label">Processing Time:</span>
            <span class="metadata-value">{analysisResult.processingTime}ms</span>
          </div>
        {/if}
        <div class="metadata-item">
          <span class="metadata-label">Evidence Items:</span>
          <span class="metadata-value">{evidenceList.length}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Analysis Date:</span>
          <span class="metadata-value">{new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Main toolbar styling */
  .evidence-toolbar {
    margin-bottom: 2rem;
    max-width: 1000px;
    margin-left: auto;
    margin-right: auto;
  }

  .upload-section {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .upload-section .nes-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Progress section */
  .progress-section {
    margin: 1rem 0;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .progress-text {
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
  }

  /* Analysis options grid */
  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .options-grid label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Advanced settings */
  .advanced-settings {
    margin-top: 1rem;
  }

  .advanced-settings summary {
    cursor: pointer;
    font-family: 'Press Start 2P', monospace;
    margin-bottom: 0.5rem;
  }

  .settings-row {
    display: flex;
    gap: 2rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  /* Canvas wrapper */
  .evidence-canvas-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 2rem auto;
    border: 4px solid #212529;
    max-width: 820px;
    height: 620px;
    background: #f8f8f8;
    position: relative;
  }

  canvas {
    background: #fff;
    border: 2px solid #000;
  }

  /* Evidence list styling */
  .evidence-list {
    margin: 2rem auto;
    max-width: 1000px;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .evidence-item {
    padding: 1rem;
  }

  .evidence-.uploading {
    border-color: #ffc107;
    background-color: #fff8e1;
  }

  .evidence-.uploaded {
    border-color: #28a745;
    background-color: #f1f8e9;
  }

  .evidence-.failed {
    border-color: #dc3545;
    background-color: #ffebee;
  }

  .evidence-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .evidence-name {
    font-weight: bold;
    font-size: 14px;
    flex: 1;
  }

  .evidence-status {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 10px;
  }

  .evidence-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    opacity: 0.8;
    font-size: 11px;
  }

  /* Analysis results styling */
  .analysis-results {
    margin: 2rem auto;
    max-width: 1000px;
    padding: 2rem;
  }

  .analysis-results h4 {
    margin-bottom: 1rem;
    font-size: 14px;
  }

  /* Executive summary */
  .summary-card {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }

  .analysis-text {
    line-height: 1.6;
    margin-bottom: 1rem;
    font-size: 14px;
  }

  .risk-indicator {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }

  /* Findings */
  .findings-card, .recommendations-card, .similar-cases-card,
  .timeline-card, .compliance-card, .metadata-card {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }

  .findings-list, .recommendations-list, .similar-cases-list,
  .timeline-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .finding-item, .recommendation-item, .case-item, .timeline-item {
    padding: 0.75rem;
    font-size: 13px;
    line-height: 1.4;
  }

  /* Similar cases */
  .case-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .case-title {
    font-weight: bold;
    font-size: 13px;
  }

  .case-id {
    opacity: 0.7;
    font-size: 11px;
  }

  /* Timeline */
  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .timeline-date {
    font-weight: bold;
    font-size: 12px;
  }

  .timeline-event {
    font-size: 13px;
    line-height: 1.4;
  }

  .timeline-.high {
    border-color: #dc3545;
  }

  .timeline-.medium {
    border-color: #ffc107;
  }

  .timeline-.low {
    border-color: #28a745;
  }

  /* Compliance status */
  .compliance-status {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }

  /* Metadata */
  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .metadata-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    font-size: 12px;
  }

  .metadata-label {
    font-weight: bold;
  }

  .metadata-value {
    font-family: monospace;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .upload-section {
      flex-direction: column;
      align-items: stretch;
    }

    .settings-row {
      flex-direction: column;
      gap: 1rem;
    }

    .evidence-grid {
      grid-template-columns: 1fr;
    }

    .case-header, .timeline-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .metadata-grid {
      grid-template-columns: 1fr;
    }
  }
</style>



