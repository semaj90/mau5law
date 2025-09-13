<!--
  Enhanced Legal Upload Analytics Component
  Integrated with enhanced-bits UI, Lucia auth, Drizzle ORM, and Ollama AI services
  Features NieR theming and legal-specific optimizations
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import {
    Button,
    Card,
    Dialog,
    Input,
    Select
  } from '$lib/components/ui/enhanced-bits';
  import {
    comprehensiveUploadAnalyticsMachine,
    createUploadAnalyticsActor,
    getContextualPromptsByTiming,
    calculateUserEngagementScore,
    generateUserInsights,
    type UploadContext,
    type UserAnalytics
  } from '$lib/machines/comprehensive-upload-analytics-machine-fixed';

  // Props with enhanced legal context
  interface Props {
    caseId?: string;
    userId?: string;
    maxFiles?: number;
    allowedTypes?: string[];
    enableAnalytics?: boolean;
    enableAIPrompts?: boolean;
    expertiseLevel?: 'paralegal' | 'associate' | 'senior' | 'partner';
    mode?: 'standard' | 'detective' | 'evidence-board';
    legalContext?: {
      practiceArea?: string;
      caseType?: string;
      urgency?: 'low' | 'medium' | 'high' | 'critical';
    };
  }

  let {
    caseId = '',
    userId = page.data.user?.id || '',
    maxFiles = 10,
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/msword'],
    enableAnalytics = true,
    enableAIPrompts = true,
    expertiseLevel = 'associate',
    mode = 'standard',
    legalContext = {}
  }: Props = $props();

  // Enhanced state management
  let uploadActor = $state<ReturnType<typeof createUploadAnalyticsActor> | null>(null);
  let machineState = $state<any>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let dragOver = $state(false);
  let selectedFiles = $state<File[]>([]);
  let aiAnalysisResults = $state<any[]>([]);
  let showAdvancedSettings = $state(false);
  let uploadStartTime = $state<number>(0);

  // Legal AI integration
  let ollamaConnected = $state(false);
  let currentModel = $state('gemma3:270m');
  let analysisDepth = $state<'quick' | 'standard' | 'comprehensive'>('standard');

  const analysisDepthOptions = [
    { value: 'quick', label: 'Quick Scan' },
    { value: 'standard', label: 'Standard Analysis' },
    { value: 'comprehensive', label: 'Comprehensive Review' }
  ];

  // Reactive derived state with legal enhancements
  let contextualPrompts = $derived(
    machineState?.context?.contextualPrompts || []
  );

  let beforeUploadPrompts = $derived(
    machineState ? getContextualPromptsByTiming(machineState.context, 'before-upload') : []
  );

  let duringUploadPrompts = $derived(
    machineState ? getContextualPromptsByTiming(machineState.context, 'during-upload') : []
  );

  let afterUploadPrompts = $derived(
    machineState ? getContextualPromptsByTiming(machineState.context, 'after-upload') : []
  );

  let currentUserInsights = $derived(
    machineState ? generateUserInsights(machineState.context) : null
  );

  let engagementScore = $derived(
    machineState ? calculateUserEngagementScore(machineState.context) : 0
  );

  let uploadProgress = $derived(machineState?.context?.uploadProgress || 0);
  let isUploading = $derived(machineState?.matches('uploadPipeline') || false);
  let isComplete = $derived(machineState?.matches('completed') || false);
  let hasErrors = $derived(machineState?.context?.errors?.length > 0 || false);

  let uploadResults = $derived(machineState?.context?.uploadResults || []);
  let pipelineStatus = $derived(machineState?.context?.pipeline || {});

  // Legal-specific derived state
  let legalInsights = $derived(() => {
    if (!aiAnalysisResults.length) return null;

    return {
      privilegedDocuments: aiAnalysisResults.filter(r => r.privileged).length,
      evidenceQuality: calculateEvidenceQuality(aiAnalysisResults),
      recommendedActions: generateLegalRecommendations(aiAnalysisResults, legalContext),
      riskAssessment: assessLegalRisks(aiAnalysisResults)
    };
  });

  // Initialize enhanced analytics with legal context
  onMount(() => {
    initializeEnhancedUploadAnalytics();
    checkOllamaConnection();

    if (enableAnalytics) {
      setupAdvancedUserTracking();
    }

    return () => {
      uploadActor?.stop();
    };
  });

  async function initializeEnhancedUploadAnalytics() {
    const userAnalytics: UserAnalytics = {
      userId: userId || 'anonymous',
      sessionId: `legal-session-${Date.now()}`,
      behaviorPattern: 'intermediate',
      uploadHistory: {
        totalUploads: 0,
        successRate: 0.0,
        averageFileSize: 0,
        preferredFormats: [],
        commonUploadTimes: []
      },
      interactionMetrics: {
        typingSpeed: 0,
        clickPatterns: [],
        scrollBehavior: { depth: 0, speed: 0 },
        focusTime: 0
      },
      contextualPreferences: {
        preferredAIPromptStyle: 'detailed',
        helpLevel: 'moderate',
        autoSuggestions: enableAIPrompts,
        proactiveInsights: enableAIPrompts
      },
      caseContext: {
        activeCases: caseId ? [caseId] : [],
        currentCaseId: caseId,
        workflowStage: 'discovery',
        expertise: expertiseLevel
      }
    };

    uploadActor = createUploadAnalyticsActor({ userAnalytics });

    uploadActor.subscribe((state) => {
      machineState = state;
    });

    uploadActor.start();
  }

  async function checkOllamaConnection() {
    try {
      const response = await fetch('/api/ai/ollama/health');
      ollamaConnected = response.ok;

      if (ollamaConnected) {
        const modelsResponse = await fetch('/api/ai/ollama/models');
        const models = await modelsResponse.json();
        if (models.models?.length > 0) {
          currentModel = models.models[0].name;
        }
      }
    } catch (error) {
      console.warn('Ollama connection check failed:', error);
      ollamaConnected = false;
    }
  }

  function setupAdvancedUserTracking() {
    let typingStartTime = 0;
    let keyStrokes = 0;

    // Enhanced typing pattern analysis for legal professionals
    document.addEventListener('keydown', (e) => {
      if (typingStartTime === 0) {
        typingStartTime = Date.now();
      }
      keyStrokes++;

      // Legal-specific shortcuts tracking
      if (e.ctrlKey && ['s', 'f', 'h'].includes(e.key.toLowerCase())) {
        uploadActor?.send({
          type: 'TRACK_USER_ACTION',
          action: 'legal_shortcut',
          data: { shortcut: `Ctrl+${e.key.toUpperCase()}`, timestamp: Date.now() }
        });
      }

      if (keyStrokes % 10 === 0) {
        const timeDiff = Date.now() - typingStartTime;
        const wpm = Math.round((keyStrokes / 5) / (timeDiff / 60000));

        uploadActor?.send({
          type: 'USER_TYPING',
          speed: wpm,
          content: e.key
        });
      }
    });

    // Enhanced click pattern analysis for legal workflow
    document.addEventListener('click', (e) => {
      const element = e.target as HTMLElement;
      const isLegalElement = element.closest('[data-legal-action]') !== null;

      uploadActor?.send({
        type: 'USER_CLICK',
        x: e.clientX,
        y: e.clientY,
        element: element.tagName.toLowerCase(),
        legalContext: isLegalElement ? element.getAttribute('data-legal-action') : null
      });
    });
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      const files = Array.from(target.files);
      await selectFiles(files);
    }
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;

    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files);
      await selectFiles(files);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  async function selectFiles(files: File[]) {
    // Enhanced file validation for legal documents
    const validFiles = files.filter(file => {
      const isValidType = allowedTypes.includes(file.type);
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });

    const limitedFiles = validFiles.slice(0, maxFiles);
    selectedFiles = limitedFiles;

    if (uploadActor) {
      uploadActor.send({
        type: 'SELECT_FILES',
        files: limitedFiles,
        caseId
      });

      // Enhanced tracking with legal context
      uploadActor.send({
        type: 'TRACK_USER_ACTION',
        action: 'file_selection_legal',
        data: {
          fileCount: limitedFiles.length,
          totalSize: limitedFiles.reduce((sum, file) => sum + file.size, 0),
          fileTypes: [...new Set(limitedFiles.map(f => f.type))],
          legalContext: {
            caseId,
            mode,
            practiceArea: legalContext.practiceArea,
            urgency: legalContext.urgency
          }
        }
      });
    }

    // Pre-analyze files if AI is enabled
    if (enableAIPrompts && ollamaConnected) {
      await performPreAnalysis(limitedFiles);
    }
  }

  async function performPreAnalysis(files: File[]) {
    try {
      const analysisPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('analysisType', 'legal_preview');
        formData.append('model', currentModel);

        const response = await fetch('/api/ai/analyze-document', {
          method: 'POST',
          body: formData
        });

        return response.ok ? await response.json() : null;
      });

      const results = await Promise.all(analysisPromises);
      aiAnalysisResults = results.filter(r => r !== null);

    } catch (error) {
      console.warn('Pre-analysis failed:', error);
    }
  }

  async function startEnhancedUpload() {
    if (uploadActor && selectedFiles.length > 0) {
      uploadStartTime = Date.now();
      uploadActor.send({ type: 'START_UPLOAD' });

      // Perform enhanced AI analysis during upload
      if (ollamaConnected) {
        await performEnhancedAnalysis();
      }
    }
  }

  async function performEnhancedAnalysis() {
    try {
      const analysisRequests = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('caseId', caseId);
        formData.append('analysisDepth', analysisDepth);
        formData.append('model', currentModel);
        formData.append('legalContext', JSON.stringify(legalContext));

        const response = await fetch('/api/ai/legal/analyze', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          return await response.json();
        }
        throw new Error(`Analysis failed for ${file.name}`);
      });

      const enhancedResults = await Promise.all(analysisRequests);
      aiAnalysisResults = enhancedResults;

    } catch (error) {
      console.error('Enhanced analysis failed:', error);
    }
  }

  function calculateEvidenceQuality(results: any[]): number {
    if (!results.length) return 0;

    const qualityFactors = results.map(r => {
      let score = 0.5; // Base score

      if (r.confidence > 0.8) score += 0.3;
      if (r.entities?.length > 0) score += 0.2;
      if (r.legalCitations?.length > 0) score += 0.2;
      if (r.privileged === false) score += 0.1; // Non-privileged is good for evidence

      return Math.min(score, 1.0);
    });

    return qualityFactors.reduce((sum, score) => sum + score, 0) / qualityFactors.length;
  }

  function generateLegalRecommendations(results: any[], context: any): string[] {
    const recommendations: string[] = [];

    const privilegedCount = results.filter(r => r.privileged).length;
    const qualityScore = calculateEvidenceQuality(results);

    if (privilegedCount > 0) {
      recommendations.push(`⚠️ ${privilegedCount} potentially privileged documents detected - review carefully`);
    }

    if (qualityScore > 0.8) {
      recommendations.push('✅ High-quality evidence detected - suitable for legal proceedings');
    } else if (qualityScore < 0.5) {
      recommendations.push('⚠️ Evidence quality concerns - consider additional documentation');
    }

    if (context.urgency === 'critical') {
      recommendations.push('🔥 Critical case - expedite document review and analysis');
    }

    return recommendations;
  }

  function assessLegalRisks(results: any[]): { level: string; factors: string[] } {
    const risks: string[] = [];
    let level = 'low';

    const privilegedCount = results.filter(r => r.privileged).length;
    const redactedCount = results.filter(r => r.needsRedaction).length;

    if (privilegedCount > 0) {
      risks.push('Privileged material detected');
      level = 'medium';
    }

    if (redactedCount > 0) {
      risks.push('Personal information requires redaction');
      if (level === 'low') level = 'medium';
    }

    if (privilegedCount > 2) {
      level = 'high';
    }

    return { level, factors: risks };
  }

  function handlePromptReaction(promptId: string, reaction: 'accepted' | 'dismissed' | 'ignored') {
    if (uploadActor) {
      uploadActor.send({
        type: 'USER_REACTED_TO_PROMPT',
        promptId,
        reaction
      });
    }
  }

  function resetUpload() {
    if (uploadActor) {
      uploadActor.send({ type: 'RESET' });
    }
    selectedFiles = [];
    aiAnalysisResults = [];
    uploadStartTime = 0;
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  function getPriorityColor(urgency?: string) {
    switch (urgency) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  }
</script>

<div class="legal-upload-analytics yorha-container">
  <!-- Enhanced Header with Legal Context -->
  <Card.Root class="mb-6 yorha-card">
    <Card.Header>
      <div class="flex justify-between items-start">
        <div>
          <Card.Title class="yorha-title">
            🏛️ Legal Document Upload & Analysis
            {#if mode === 'detective'}
              <span class="yorha-badge detective">Detective Mode</span>
            {/if}
          </Card.Title>
          <Card.Description>
            {#if caseId}
              Case: <span class="font-mono text-blue-400">{caseId}</span>
            {/if}
            {#if legalContext.practiceArea}
              • {legalContext.practiceArea}
            {/if}
            {#if legalContext.urgency}
              • <span class={getPriorityColor(legalContext.urgency)}>
                {legalContext.urgency.toUpperCase()} Priority
              </span>
            {/if}
          </Card.Description>
        </div>

        <div class="flex gap-2">
          <!-- AI Status Indicator -->
          <div class="yorha-status-indicator">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full {ollamaConnected ? 'bg-green-400' : 'bg-red-400'}"></div>
              <span class="text-sm">
                {ollamaConnected ? `AI Ready (${currentModel})` : 'AI Offline'}
              </span>
            </div>
          </div>

          <!-- User Insights Badge -->
          {#if enableAnalytics && currentUserInsights}
            <div class="yorha-insights-badge">
              <span class="expertise-level">{currentUserInsights.behaviorPattern}</span>
              <span class="engagement-score">Engagement: {Math.round(engagementScore * 100)}%</span>
            </div>
          {/if}
        </div>
      </div>
    </Card.Header>
  </Card.Root>

  <!-- Enhanced AI Prompts with Legal Context -->
  {#if enableAIPrompts && beforeUploadPrompts.length > 0}
    <Card.Root class="mb-6 yorha-card ai-prompts before-upload">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          🤖 AI Legal Insights
          <span class="yorha-badge confidence-high">High Confidence</span>
        </Card.Title>
      </Card.Header>
      <Card.Content>
        {#each beforeUploadPrompts as prompt}
          <div class="ai-prompt yorha-prompt {prompt.category}" data-legal-action="ai-prompt">
            <div class="prompt-header">
              <span class="prompt-category">{prompt.category.toUpperCase()}</span>
              <span class="prompt-confidence">
                {Math.round(prompt.confidence * 100)}% confidence
              </span>
            </div>
            <p class="prompt-content">{prompt.content}</p>
            <div class="prompt-actions">
              <Button
                variant="outline"
                size="sm"
                legal
                confidence="high"
                onclick={() => handlePromptReaction(prompt.id, 'accepted')}
              >
                ✓ Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onclick={() => handlePromptReaction(prompt.id, 'dismissed')}
              >
                ✕ Dismiss
              </Button>
            </div>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Enhanced File Upload Zone -->
  <Card.Root class="mb-6 yorha-card">
    <Card.Content class="p-0">
      <div
        class="file-drop-zone yorha-drop-zone"
        class:drag-over={dragOver}
        class:has-files={selectedFiles.length > 0}
        class:detective-mode={mode === 'detective'}
        role="button"
        tabindex="0"
        aria-label="File drop zone for legal document upload"
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        data-legal-action="file-upload"
      >
        {#if selectedFiles.length === 0}
          <div class="drop-zone-content">
            <div class="upload-icon">📁</div>
            <h3>Legal Document Upload</h3>
            <p>Drag & drop evidence files or click to select</p>
            <div class="file-constraints">
              <span>Max {maxFiles} files</span>
              <span>• {allowedTypes.map(type => type.split('/')[1]).join(', ')}</span>
              <span>• Up to 50MB each</span>
            </div>

            <input
              bind:this={fileInput}
              type="file"
              multiple
              accept={allowedTypes.join(',')}
              onchange={handleFileSelect}
              class="hidden"
            />

            <Button
              variant="yorha"
              size="lg"
              legal
              priority={legalContext.urgency}
              onclick={() => fileInput?.click()}
            >
              Select Legal Documents
            </Button>
          </div>
        {:else}
          <div class="selected-files">
            <div class="files-header">
              <h3>Selected Documents ({selectedFiles.length})</h3>
              {#if legalInsights}
                <div class="legal-insights-summary">
                  <span class="insight-item">
                    Quality: {Math.round(legalInsights.evidenceQuality * 100)}%
                  </span>
                  {#if legalInsights.privilegedDocuments > 0}
                    <span class="insight-item warning">
                      {legalInsights.privilegedDocuments} Privileged
                    </span>
                  {/if}
                </div>
              {/if}
            </div>

            {#each selectedFiles as file, index}
              <div class="file-item yorha-file-item">
                <div class="file-info">
                  <div class="file-name">{file.name}</div>
                  <div class="file-meta">
                    <span class="file-size">{formatFileSize(file.size)}</span>
                    <span class="file-type">{file.type.split('/')[1]}</span>
                    {#if aiAnalysisResults[index]}
                      <span class="ai-confidence">
                        AI: {Math.round(aiAnalysisResults[index].confidence * 100)}%
                      </span>
                    {/if}
                  </div>
                </div>

                {#if uploadResults[index]}
                  <div class="file-status">
                    {#if uploadResults[index].success}
                      <span class="status-success yorha-success">✓ Processed</span>
                    {:else}
                      <span class="status-error yorha-error">✗ Failed</span>
                    {/if}
                  </div>
                {/if}

                {#if aiAnalysisResults[index]}
                  <div class="ai-preview">
                    {#if aiAnalysisResults[index].privileged}
                      <span class="privilege-warning">⚠️ Privileged</span>
                    {/if}
                    {#if aiAnalysisResults[index].entities?.length > 0}
                      <span class="entity-count">
                        {aiAnalysisResults[index].entities.length} entities
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}

            {#if !isUploading && !isComplete}
              <div class="file-actions">
                <Button
                  variant="yorha"
                  size="lg"
                  legal
                  priority={legalContext.urgency}
                  loading={isUploading}
                  onclick={startEnhancedUpload}
                  data-legal-action="start-upload"
                >
                  {#if ollamaConnected}
                    🤖 Start AI Analysis & Upload
                  {:else}
                    📤 Start Upload
                  {/if}
                </Button>

                <Button
                  variant="outline"
                  onclick={() => { selectedFiles = []; aiAnalysisResults = []; }}
                >
                  Clear Files
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => showAdvancedSettings = !showAdvancedSettings}
                >
                  Advanced Settings
                </Button>
              </div>
            {/if}

            <!-- Advanced Settings Panel -->
            {#if showAdvancedSettings}
              <Card.Root class="mt-4 yorha-settings">
                <Card.Header>
                  <Card.Title>Advanced Settings</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div class="settings-grid">
                    <div class="setting-item">
                      <label for="analysis-depth-select">Analysis Depth</label>
                      <select id="analysis-depth-select" bind:value={analysisDepth} class="enhanced-select">
                        {#each analysisDepthOptions as opt}
                          <option value={opt.value}>{opt.label}</option>
                        {/each}
                      </select>
                    </div>

                    <div class="setting-item">
                      <label for="ai-model-input">AI Model</label>
                      <input
                        id="ai-model-input"
                        bind:value={currentModel}
                        placeholder="gemma3:270m"
                        disabled={!ollamaConnected}
                        class="enhanced-input"
                      />
                    </div>
                  </div>
                </Card.Content>
              </Card.Root>
            {/if}
          </div>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Enhanced Upload Progress with Legal Context -->
  {#if isUploading}
    <Card.Root class="mb-6 yorha-card upload-progress">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          ⚡ Processing Legal Documents
          <span class="progress-percentage">{uploadProgress}%</span>
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="progress-bar yorha-progress">
          <div
            class="progress-fill"
            style="width: {uploadProgress}%"
          ></div>
        </div>

        <!-- Enhanced Pipeline Status -->
        <div class="pipeline-status yorha-pipeline">
          {#each Object.entries(pipelineStatus) as [stage, statusObj]}
            {@const status = statusObj as { status: string; progress?: number }}
            <div class="pipeline-stage" class:active={status.status === 'processing'} class:completed={status.status === 'completed'}>
              <div class="stage-icon">
                {#if status.status === 'completed'}
                  ✓
                {:else if status.status === 'processing'}
                  ⏳
                {:else if status.status === 'failed'}
                  ✗
                {:else}
                  ○
                {/if}
              </div>
              <span class="stage-name">{stage.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
              {#if status.status === 'processing'}
                <span class="stage-progress">{status.progress || 0}%</span>
              {/if}
            </div>
          {/each}
        </div>

        <!-- AI Processing Insights -->
        {#if duringUploadPrompts.length > 0}
          <div class="processing-insights">
            {#each duringUploadPrompts as prompt}
              <div class="processing-insight yorha-insight">
                <span class="insight-icon">🔍</span>
                <span class="insight-text">{prompt.content}</span>
              </div>
            {/each}
          </div>
        {/if}

        <div class="upload-actions">
          <Button
            variant="destructive"
            onclick={() => uploadActor?.send({ type: 'CANCEL_UPLOAD' })}
          >
            Cancel Upload
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Enhanced Results with Legal Analysis -->
  {#if isComplete && uploadResults.length > 0}
    <Card.Root class="mb-6 yorha-card upload-results">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          ✅ Legal Analysis Complete
          {#if uploadStartTime > 0}
            <span class="processing-time">
              {formatDuration(Date.now() - uploadStartTime)}
            </span>
          {/if}
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <!-- Legal Insights Summary -->
        {#if legalInsights}
          <div class="legal-summary yorha-summary">
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-value">{uploadResults.filter((r: any) => r.success).length}</span>
                <span class="stat-label">Successfully Processed</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{Math.round(legalInsights.evidenceQuality * 100)}%</span>
                <span class="stat-label">Evidence Quality</span>
              </div>
              <div class="stat-item">
                <span class="stat-value {legalInsights.riskAssessment.level === 'high' ? 'text-red-500' : legalInsights.riskAssessment.level === 'medium' ? 'text-yellow-500' : 'text-green-500'}">
                  {legalInsights.riskAssessment.level.toUpperCase()}
                </span>
                <span class="stat-label">Risk Level</span>
              </div>
            </div>

            {#if legalInsights.recommendedActions.length > 0}
              <div class="recommendations">
                <h4>Legal Recommendations</h4>
                {#each legalInsights.recommendedActions as recommendation}
                  <div class="recommendation-item yorha-recommendation">
                    {recommendation}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Detailed Results -->
        <div class="results-list">
          {#each uploadResults as result, index}
            <Card.Root class={`result-item ${result.success ? 'success' : ''}`}>
              <Card.Content>
                <div class="result-header">
                  <div class="result-info">
                    <span class="result-filename">{result.fileName}</span>
                    {#if result.success && result.documentId}
                      <span class="result-document-id">ID: {result.documentId}</span>
                    {/if}
                  </div>
                  <div class="result-status">
                    {#if result.success}
                      <span class="status-success">✓ Success</span>
                    {:else}
                      <span class="status-error">✗ Failed</span>
                    {/if}
                  </div>
                </div>

                {#if result.success && result.aiInsights}
                  <div class="ai-insights yorha-insights">
                    <h4>🤖 AI Analysis Results</h4>
                    <p class="insights-summary">{result.aiInsights.summary}</p>

                    {#if result.aiInsights.keyEntities}
                      <div class="entities">
                        <strong>Key Entities:</strong>
                        <div class="entity-tags">
                          {#each result.aiInsights.keyEntities as entity}
                            <span class="entity-tag yorha-tag" class:person={entity.type === 'person'} class:organization={entity.type === 'organization'}>
                              {entity.value} ({entity.type})
                            </span>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    {#if result.aiInsights.suggestedTags}
                      <div class="suggested-tags">
                        <strong>Evidence Categories:</strong>
                        <div class="tag-list">
                          {#each result.aiInsights.suggestedTags as tag}
                            <span class="tag yorha-tag">{tag}</span>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    {#if result.aiInsights.confidenceScore}
                      <div class="confidence-indicator">
                        <span class="confidence-label">AI Confidence:</span>
                        <div class="confidence-bar">
                          <div
                            class="confidence-fill"
                            style="width: {result.aiInsights.confidenceScore * 100}%"
                          ></div>
                        </div>
                        <span class="confidence-value">
                          {Math.round(result.aiInsights.confidenceScore * 100)}%
                        </span>
                      </div>
                    {/if}
                  </div>
                {/if}

                {#if !result.success && result.errorMessage}
                  <div class="error-message yorha-error">
                    <strong>Error:</strong> {result.errorMessage}
                  </div>
                {/if}
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Post-Upload AI Recommendations -->
  {#if enableAIPrompts && afterUploadPrompts.length > 0 && isComplete}
    <Card.Root class="mb-6 yorha-card ai-prompts after-upload">
      <Card.Header>
        <Card.Title>🎯 Recommended Next Steps</Card.Title>
      </Card.Header>
      <Card.Content>
        {#each afterUploadPrompts as prompt}
          <div class="ai-prompt yorha-prompt next-step">
            <p class="prompt-content">{prompt.content}</p>
            <div class="prompt-actions">
              <Button
                variant="yorha"
                legal
                priority="high"
                onclick={() => handlePromptReaction(prompt.id, 'accepted')}
              >
                Let's Do It
              </Button>
              <Button
                variant="outline"
                onclick={() => handlePromptReaction(prompt.id, 'dismissed')}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Enhanced Analytics Dashboard -->
  {#if enableAnalytics && currentUserInsights}
    <Card.Root class="analytics-dashboard yorha-card">
      <Card.Header>
        <Card.Title>📊 Legal Workflow Analytics</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="analytics-grid">
          <div class="insight-card">
            <h4>User Behavior Pattern</h4>
            <p class="behavior-pattern">{currentUserInsights.behaviorPattern}</p>
            <p class="engagement-level">Engagement: {currentUserInsights.engagementLevel}</p>
          </div>

          <div class="insight-card">
            <h4>Upload Efficiency</h4>
            <p class="efficiency-score">
              {Math.round(currentUserInsights.uploadEfficiency * 100)}% Success Rate
            </p>
          </div>

          <div class="insight-card">
            <h4>Legal Workflow Recommendations</h4>
            <ul class="recommendations-list">
              {#each currentUserInsights.recommendations as recommendation}
                <li>{recommendation}</li>
              {/each}
            </ul>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Error Handling -->
  {#if hasErrors}
    <Card.Root class="error-section yorha-card error">
      <Card.Header>
        <Card.Title>⚠️ Issues Detected</Card.Title>
      </Card.Header>
      <Card.Content>
        {#each machineState.context.errors as error}
          <div class="error-item">
            <p>{error}</p>
          </div>
        {/each}

        <div class="error-actions">
          <Button
            variant="destructive"
            onclick={() => uploadActor?.send({ type: 'RETRY_UPLOAD' })}
          >
            Retry Upload
          </Button>
          <Button
            variant="outline"
            onclick={resetUpload}
          >
            Start Over
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Final Actions -->
  {#if isComplete}
    <div class="final-actions">
      <Button
        variant="yorha"
        size="lg"
        legal
        onclick={resetUpload}
      >
        Upload More Documents
      </Button>

      {#if enableAIPrompts}
        <Button
          variant="outline"
          onclick={() => uploadActor?.send({ type: 'REQUEST_AI_SUGGESTIONS', context: 'user_requested' })}
        >
          Get More AI Insights
        </Button>
      {/if}

      {#if caseId}
        <Button
          variant="ghost"
          onclick={() => goto(`/cases/${caseId}/evidence`)}
        >
          View in Evidence Board
        </Button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .legal-upload-analytics {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'JetBrains Mono', monospace;
  }

  .yorha-container {
    background: linear-gradient(135deg, #0f1419 0%, #1a1f29 100%);
    min-height: 100vh;
    color: #e8e8e8;
  }

  .yorha-card {
    background: rgba(24, 24, 24, 0.95);
    border: 1px solid #404040;
    border-radius: 0.5rem;
    backdrop-filter: blur(10px);
  }

  .yorha-title {
    color: #ffd700;
    font-weight: 600;
    font-size: 1.5rem;
  }

  .yorha-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .yorha-badge.detective {
    background: #ff6b6b;
    color: white;
  }

  .yorha-badge.confidence-high {
    background: #51cf66;
    color: white;
  }

  .yorha-status-indicator {
    padding: 0.5rem 1rem;
    background: rgba(64, 64, 64, 0.3);
    border-radius: 0.5rem;
    border: 1px solid #404040;
  }

  .yorha-insights-badge {
    display: flex;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .expertise-level {
    background: #339af0;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    text-transform: capitalize;
  }

  .engagement-score {
    background: #51cf66;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
  }

  .file-drop-zone {
    border: 2px dashed #404040;
    border-radius: 0.75rem;
    padding: 3rem;
    text-align: center;
    transition: all 0.3s ease;
    background: rgba(16, 16, 16, 0.5);
  }

  .file-drop-zone.drag-over {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
    transform: scale(1.02);
  }

  .file-drop-zone.has-files {
    border-color: #51cf66;
    background: rgba(81, 207, 102, 0.05);
  }

  .file-drop-zone.detective-mode {
    border-color: #ff6b6b;
    background: rgba(255, 107, 107, 0.05);
  }

  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .upload-icon {
    font-size: 4rem;
    opacity: 0.7;
  }

  .file-constraints {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: #999;
  }

  .files-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #404040;
  }

  .legal-insights-summary {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
  }

  .insight-item {
    padding: 0.25rem 0.75rem;
    background: rgba(64, 64, 64, 0.3);
    border-radius: 0.25rem;
  }

  .insight-item.warning {
    background: rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
  }

  .yorha-file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(24, 24, 24, 0.7);
    border: 1px solid #404040;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    transition: all 0.2s ease;
  }

  .yorha-file-item:hover {
    background: rgba(32, 32, 32, 0.8);
    border-color: #ffd700;
  }

  .file-info {
    flex: 1;
  }

  .file-name {
    font-weight: 500;
    color: #e8e8e8;
    margin-bottom: 0.25rem;
  }

  .file-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #999;
  }

  .ai-confidence {
    color: #51cf66;
    font-weight: 500;
  }

  .ai-preview {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .privilege-warning {
    color: #ff6b6b;
    font-weight: 500;
  }

  .entity-count {
    color: #339af0;
  }

  .file-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .yorha-settings {
    background: rgba(16, 16, 16, 0.8);
    border: 1px solid #404040;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .setting-item label {
    font-weight: 500;
    color: #e8e8e8;
    font-size: 0.875rem;
  }

  .yorha-progress {
    height: 0.75rem;
    background: rgba(64, 64, 64, 0.3);
    border-radius: 0.375rem;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ffd700, #51cf66);
    transition: width 0.3s ease;
    border-radius: 0.375rem;
  }

  .yorha-pipeline {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .pipeline-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(24, 24, 24, 0.7);
    border: 1px solid #404040;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }

  .pipeline-stage.active {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
  }

  .pipeline-stage.completed {
    border-color: #51cf66;
    background: rgba(81, 207, 102, 0.1);
  }

  .stage-icon {
    font-size: 1.5rem;
  }

  .stage-name {
    text-transform: capitalize;
    font-size: 0.875rem;
    text-align: center;
  }

  .stage-progress {
    font-size: 0.75rem;
    color: #ffd700;
    font-weight: 500;
  }

  .processing-insights {
    background: rgba(16, 16, 16, 0.8);
    border: 1px solid #404040;
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 1rem 0;
  }

  .processing-insight {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .insight-icon {
    color: #339af0;
  }

  .yorha-summary {
    background: rgba(16, 16, 16, 0.8);
    border: 1px solid #404040;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .stat-item {
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 2rem;
    font-weight: bold;
    color: #ffd700;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #999;
  }

  .recommendations h4 {
    color: #e8e8e8;
    margin-bottom: 1rem;
    font-size: 1.125rem;
  }

  .yorha-recommendation {
    padding: 0.75rem;
    background: rgba(24, 24, 24, 0.7);
    border: 1px solid #404040;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .result-item {
    margin-bottom: 1rem;
  }

  .result-item.success {
    border-left: 4px solid #51cf66;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .result-filename {
    font-weight: 500;
    color: #e8e8e8;
  }

  .result-document-id {
    font-size: 0.75rem;
    color: #999;
    font-family: monospace;
  }

  .status-success {
    color: #51cf66;
    font-weight: 500;
  }

  .status-error {
    color: #ff6b6b;
    font-weight: 500;
  }

  .yorha-insights {
    background: rgba(16, 16, 16, 0.8);
    border: 1px solid #404040;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-top: 1rem;
  }

  .yorha-insights h4 {
    color: #ffd700;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .insights-summary {
    margin-bottom: 1rem;
    line-height: 1.5;
    color: #e8e8e8;
  }

  .entities {
    margin-bottom: 1rem;
  }

  .entity-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .yorha-tag {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: rgba(64, 64, 64, 0.5);
    border: 1px solid #404040;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #e8e8e8;
  }

  .yorha-tag.person {
    background: rgba(51, 154, 240, 0.3);
    border-color: #339af0;
    color: #339af0;
  }

  .yorha-tag.organization {
    background: rgba(255, 107, 107, 0.3);
    border-color: #ff6b6b;
    color: #ff6b6b;
  }

  .suggested-tags {
    margin-bottom: 1rem;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .confidence-indicator {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .confidence-label {
    font-size: 0.875rem;
    color: #999;
  }

  .confidence-bar {
    flex: 1;
    height: 0.5rem;
    background: rgba(64, 64, 64, 0.3);
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .confidence-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff6b6b, #ffd700, #51cf66);
    transition: width 0.3s ease;
  }

  .confidence-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: #ffd700;
  }

  .yorha-error {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid #ff6b6b;
    color: #ff6b6b;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-top: 1rem;
  }

  .ai-prompt {
    background: rgba(24, 24, 24, 0.8);
    border: 1px solid #404040;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1rem;
  }

  .yorha-prompt {
    border-left: 4px solid #ffd700;
  }

  .yorha-prompt.next-step {
    border-left-color: #51cf66;
  }

  .prompt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .prompt-category {
    font-size: 0.75rem;
    font-weight: 500;
    color: #ffd700;
  }

  .prompt-confidence {
    font-size: 0.75rem;
    color: #999;
  }

  .prompt-content {
    margin-bottom: 1rem;
    line-height: 1.5;
    color: #e8e8e8;
  }

  .prompt-actions {
    display: flex;
    gap: 0.5rem;
  }

  .analytics-dashboard {
    margin-top: 2rem;
  }

  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .insight-card {
    background: rgba(16, 16, 16, 0.8);
    border: 1px solid #404040;
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  .insight-card h4 {
    color: #ffd700;
    margin-bottom: 1rem;
    font-size: 1.125rem;
  }

  .behavior-pattern {
    text-transform: capitalize;
    font-weight: 500;
    color: #339af0;
    font-size: 1.125rem;
  }

  .engagement-level {
    color: #51cf66;
    font-size: 0.875rem;
  }

  .efficiency-score {
    font-size: 1.5rem;
    font-weight: bold;
    color: #51cf66;
  }

  .recommendations-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .recommendations-list li {
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(64, 64, 64, 0.3);
    color: #e8e8e8;
    font-size: 0.875rem;
  }

  .recommendations-list li:last-child {
    border-bottom: none;
  }

  .error-section {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid #ff6b6b;
  }

  .error-item {
    background: rgba(255, 107, 107, 0.2);
    border: 1px solid #ff6b6b;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 0.5rem;
    color: #ff6b6b;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .final-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    .legal-upload-analytics {
      padding: 1rem;
    }

    .files-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .legal-insights-summary {
      flex-direction: column;
      gap: 0.5rem;
    }

    .file-actions,
    .final-actions,
    .error-actions {
      flex-direction: column;
    }

    .summary-stats {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .yorha-pipeline {
      grid-template-columns: 1fr;
    }

    .analytics-grid {
      grid-template-columns: 1fr;
    }

    .settings-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
