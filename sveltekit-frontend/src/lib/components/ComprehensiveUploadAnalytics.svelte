<script lang="ts">
  /**
   * Comprehensive Upload Analytics Interface
   * Svelte 5 component that integrates with the upload analytics XState machine
   * Features contextual AI prompting, user analytics, and performance monitoring
   */

  import { onMount } from 'svelte';
  import { createActor } from 'xstate';
  import {
    comprehensiveUploadAnalyticsMachine,
    createUploadAnalyticsActor,
    getContextualPromptsByTiming,
    calculateUserEngagementScore,
    generateUserInsights,
    type UploadContext,
    type UserAnalytics
  } from '$lib/machines/comprehensive-upload-analytics-machine-fixed';

  // Props
  interface Props {
    caseId?: string;
    userId?: string;
    maxFiles?: number;
    allowedTypes?: string[];
    enableAnalytics?: boolean;
    enableAIPrompts?: boolean;
    expertiseLevel?: 'paralegal' | 'associate' | 'senior' | 'partner';
  }

  let {
    caseId = '',
    userId = '',
    maxFiles = 10,
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'],
    enableAnalytics = true,
    enableAIPrompts = true,
    expertiseLevel = 'associate'
  }: Props = $props();

  // State
  let uploadActor = $state<ReturnType<typeof createUploadAnalyticsActor> | null>(null);
  let machineState = $state<any>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let dragOver = $state(false);
  let selectedFiles = $state<File[]>([]);

  // Reactive derived state
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
  let isUploading = $derived(
    machineState?.matches('uploadPipeline') || false
  );
  let isComplete = $derived(machineState?.matches('completed') || false);
  let hasErrors = $derived(
    machineState?.context?.errors?.length > 0 || false
  );

  let uploadResults = $derived(machineState?.context?.uploadResults || []);
  let pipelineStatus = $derived(machineState?.context?.pipeline || {});

  // Initialize analytics
  onMount(() => {
    initializeUploadAnalytics();

    // Setup user interaction tracking
    if (enableAnalytics) {
      setupUserTracking();
    }

    return () => {
      uploadActor?.stop();
    };
  });

  function initializeUploadAnalytics() {
    const userAnalytics: UserAnalytics = {
      userId: userId || 'anonymous',
      sessionId: `session-${Date.now()}`,
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

    uploadActor = createUploadAnalyticsActor({
      userAnalytics
    });

    // Subscribe to state changes
    uploadActor.subscribe((state) => {
      machineState = state;
    });

    uploadActor.start();
  }

  function setupUserTracking() {
    // Track typing patterns
    let typingStartTime = 0;
    let keyStrokes = 0;

    document.addEventListener('keydown', (e) => {
      if (typingStartTime === 0) {
        typingStartTime = Date.now();
      }
      keyStrokes++;

      // Calculate WPM every 10 keystrokes
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

    // Track click patterns
    document.addEventListener('click', (e) => {
      uploadActor?.send({
        type: 'USER_CLICK',
        x: e.clientX,
        y: e.clientY,
        element: (e.target as HTMLElement)?.tagName || 'unknown'
      });
    });

    // Track scroll behavior
    let lastScrollTime = 0;
    document.addEventListener('scroll', () => {
      const currentTime = Date.now();
      const scrollDepth = window.scrollY / (document.body.scrollHeight - window.innerHeight);

      if (lastScrollTime > 0) {
        const scrollSpeed = Math.abs(window.scrollY) / (currentTime - lastScrollTime);

        uploadActor?.send({
          type: 'USER_SCROLL',
          depth: scrollDepth,
          speed: scrollSpeed
        });
      }
      lastScrollTime = currentTime;
    });
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      const files = Array.from(target.files);
      selectFiles(files);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;

    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files);
      selectFiles(files);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function selectFiles(files: File[]) {
    // Filter by allowed types
    const validFiles = files.filter(file =>
      allowedTypes.includes(file.type)
    );

    // Limit number of files
    const limitedFiles = validFiles.slice(0, maxFiles);

    selectedFiles = limitedFiles;

    if (uploadActor) {
      uploadActor.send({
        type: 'SELECT_FILES',
        files: limitedFiles,
        caseId
      });

      // Track file selection
      uploadActor.send({
        type: 'TRACK_USER_ACTION',
        action: 'file_selection',
        data: {
          fileCount: limitedFiles.length,
          totalSize: limitedFiles.reduce((sum, file) => sum + file.size, 0),
          fileTypes: [...new Set(limitedFiles.map(f => f.type))]
        }
      });
    }
  }

  function startUpload() {
    if (uploadActor && selectedFiles.length > 0) {
      uploadActor.send({ type: 'START_UPLOAD' });
    }
  }

  function cancelUpload() {
    if (uploadActor) {
      uploadActor.send({ type: 'CANCEL_UPLOAD' });
    }
    selectedFiles = [];
  }

  function retryUpload() {
    if (uploadActor) {
      uploadActor.send({ type: 'RETRY_UPLOAD' });
    }
  }

  function resetUpload() {
    if (uploadActor) {
      uploadActor.send({ type: 'RESET' });
    }
    selectedFiles = [];
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

  function requestAISuggestions() {
    if (uploadActor) {
      uploadActor.send({
        type: 'REQUEST_AI_SUGGESTIONS',
        context: 'user_requested'
      });
    }
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
</script>

<div class="comprehensive-upload-analytics">
  <!-- Header -->
  <div class="upload-header">
    <h2>Legal Document Upload & Analysis</h2>
    {#if enableAnalytics && currentUserInsights}
      <div class="user-insights-badge">
        <span class="expertise-level">{currentUserInsights.behaviorPattern}</span>
        <span class="engagement-score">Engagement: {Math.round(engagementScore * 100)}%</span>
      </div>
    {/if}
  </div>

  <!-- Contextual AI Prompts - Before Upload -->
  {#if enableAIPrompts && beforeUploadPrompts.length > 0}
    <div class="ai-prompts before-upload">
      <h3>💡 AI Suggestions</h3>
      {#each beforeUploadPrompts as prompt}
        <div class="ai-prompt" class:high-confidence={prompt.confidence > 0.8}>
          <p class="prompt-content">{prompt.content}</p>
          <div class="prompt-actions">
            <button
              class="btn-accept"
              onclick={() => handlePromptReaction(prompt.id, 'accepted')}
            >
              ✓ Accept
            </button>
            <button
              class="btn-dismiss"
              onclick={() => handlePromptReaction(prompt.id, 'dismissed')}
            >
              ✕ Dismiss
            </button>
          </div>
          <div class="prompt-confidence">
            Confidence: {Math.round(prompt.confidence * 100)}%
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- File Selection Area -->
  <div
    class="file-drop-zone"
    class:drag-over={dragOver}
    class:has-files={selectedFiles.length > 0}
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
  >
    {#if selectedFiles.length === 0}
      <div class="drop-zone-content">
        <div class="upload-icon">📁</div>
        <p>Drag & drop files here or click to select</p>
        <p class="file-constraints">
          Max {maxFiles} files • {allowedTypes.map(type => type.split('/')[1]).join(', ')}
        </p>
        <input
          bind:this={fileInput}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onchange={handleFileSelect}
          style="display: none;"
        />
        <button
          class="btn-select-files"
          onclick={() => fileInput?.click()}
        >
          Select Files
        </button>
      </div>
    {:else}
      <div class="selected-files">
        <h3>Selected Files ({selectedFiles.length})</h3>
        {#each selectedFiles as file, index}
          <div class="file-item">
            <div class="file-info">
              <span class="file-name">{file.name}</span>
              <span class="file-size">{formatFileSize(file.size)}</span>
              <span class="file-type">{file.type}</span>
            </div>
            {#if uploadResults[index]}
              <div class="file-status">
                {#if uploadResults[index].success}
                  <span class="status-success">✓ Complete</span>
                {:else}
                  <span class="status-error">✗ Failed</span>
                {/if}
              </div>
            {/if}
          </div>
        {/each}

        {#if !isUploading && !isComplete}
          <div class="file-actions">
            <button class="btn-primary" onclick={startUpload}>
              Start Upload & Analysis
            </button>
            <button class="btn-secondary" onclick={() => { selectedFiles = []; }}>
              Clear Files
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Contextual AI Prompts - During Upload -->
  {#if enableAIPrompts && duringUploadPrompts.length > 0 && isUploading}
    <div class="ai-prompts during-upload">
      <h3>🤖 Processing Insights</h3>
      {#each duringUploadPrompts as prompt}
        <div class="ai-prompt processing">
          <p class="prompt-content">{prompt.content}</p>
          <div class="prompt-confidence">
            Confidence: {Math.round(prompt.confidence * 100)}%
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Upload Progress -->
  {#if isUploading}
    <div class="upload-progress">
      <div class="progress-header">
        <h3>Processing Files</h3>
        <span class="progress-percentage">{uploadProgress}%</span>
      </div>

      <div class="progress-bar">
        <div
          class="progress-fill"
          style="width: {uploadProgress}%"
        ></div>
      </div>

      <!-- Pipeline Status -->
      <div class="pipeline-status">
        {#each Object.entries(pipelineStatus) as [stage, status]}
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
          </div>
        {/each}
      </div>

      <div class="upload-actions">
        <button class="btn-cancel" onclick={cancelUpload}>
          Cancel Upload
        </button>
      </div>
    </div>
  {/if}

  <!-- Upload Results -->
  {#if isComplete && uploadResults.length > 0}
    <div class="upload-results">
      <h3>Upload Complete</h3>

      <div class="results-summary">
        <div class="summary-stat">
          <span class="stat-value">{uploadResults.filter(r => r.success).length}</span>
          <span class="stat-label">Successful</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value">{uploadResults.filter(r => !r.success).length}</span>
          <span class="stat-label">Failed</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value">{formatDuration(Math.max(...uploadResults.map(r => r.processingTime)))}</span>
          <span class="stat-label">Processing Time</span>
        </div>
      </div>

      <div class="results-list">
        {#each uploadResults as result}
          <div class="result-item" class:success={result.success} class:error={!result.success}>
            <div class="result-info">
              <span class="result-filename">{result.fileName}</span>
              {#if result.success}
                <span class="result-document-id">ID: {result.documentId}</span>
              {/if}
            </div>

            {#if result.success && result.aiInsights}
              <div class="ai-insights">
                <h4>AI Analysis Results</h4>
                <p class="insights-summary">{result.aiInsights.aiInsights?.summary}</p>

                {#if result.aiInsights.keyEntities}
                  <div class="entities">
                    <strong>Key Entities:</strong>
                    {#each result.aiInsights.keyEntities as entity}
                      <span class="entity-tag">{entity.value} ({entity.type})</span>
                    {/each}
                  </div>
                {/if}

                {#if result.aiInsights.suggestedTags}
                  <div class="suggested-tags">
                    <strong>Suggested Tags:</strong>
                    {#each result.aiInsights.suggestedTags as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            {#if !result.success && result.errorMessage}
              <div class="error-message">
                <strong>Error:</strong> {result.errorMessage}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Contextual AI Prompts - After Upload -->
  {#if enableAIPrompts && afterUploadPrompts.length > 0 && isComplete}
    <div class="ai-prompts after-upload">
      <h3>🎯 Next Steps</h3>
      {#each afterUploadPrompts as prompt}
        <div class="ai-prompt next-step">
          <p class="prompt-content">{prompt.content}</p>
          <div class="prompt-actions">
            <button
              class="btn-primary"
              onclick={() => handlePromptReaction(prompt.id, 'accepted')}
            >
              Let's Do It
            </button>
            <button
              class="btn-secondary"
              onclick={() => handlePromptReaction(prompt.id, 'dismissed')}
            >
              Maybe Later
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Error Handling -->
  {#if hasErrors}
    <div class="error-section">
      <h3>⚠️ Issues Detected</h3>
      {#each machineState.context.errors as error}
        <div class="error-item">
          <p>{error}</p>
        </div>
      {/each}

      <div class="error-actions">
        <button class="btn-retry" onclick={retryUpload}>
          Retry Upload
        </button>
        <button class="btn-reset" onclick={resetUpload}>
          Start Over
        </button>
      </div>
    </div>
  {/if}

  <!-- Analytics Dashboard (Optional) -->
  {#if enableAnalytics && currentUserInsights}
    <details class="analytics-dashboard">
      <summary>📊 Analytics Dashboard</summary>

      <div class="analytics-content">
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
          <h4>Recommendations</h4>
          <ul class="recommendations-list">
            {#each currentUserInsights.recommendations as recommendation}
              <li>{recommendation}</li>
            {/each}
          </ul>
        </div>
      </div>
    </details>
  {/if}

  <!-- Action Buttons -->
  {#if isComplete}
    <div class="final-actions">
      <button class="btn-primary" onclick={resetUpload}>
        Upload More Files
      </button>

      {#if enableAIPrompts}
        <button class="btn-secondary" onclick={requestAISuggestions}>
          Get AI Suggestions
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .comprehensive-upload-analytics {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .upload-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .upload-header h2 {
    margin: 0;
    color: #2563eb;
  }

  .user-insights-badge {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
  }

  .expertise-level {
    background: #dbeafe;
    color: #2563eb;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    text-transform: capitalize;
  }

  .engagement-score {
    background: #dcfce7;
    color: #16a34a;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
  }

  .ai-prompts {
    margin-bottom: 2rem;
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 2px solid #e5e7eb;
  }

  .ai-prompts.before-upload {
    background: #fef3c7;
    border-color: #f59e0b;
  }

  .ai-prompts.during-upload {
    background: #dbeafe;
    border-color: #3b82f6;
  }

  .ai-prompts.after-upload {
    background: #dcfce7;
    border-color: #10b981;
  }

  .ai-prompts h3 {
    margin: 0 0 1rem 0;
    color: #374151;
  }

  .ai-prompt {
    background: white;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .ai-prompt.high-confidence {
    border-left: 4px solid #10b981;
  }

  .prompt-content {
    margin: 0 0 1rem 0;
    line-height: 1.5;
  }

  .prompt-actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .prompt-confidence {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .file-drop-zone {
    border: 2px dashed #d1d5db;
    border-radius: 0.75rem;
    padding: 2rem;
    text-align: center;
    transition: all 0.2s;
    margin-bottom: 2rem;
  }

  .file-drop-zone.drag-over {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .file-drop-zone.has-files {
    border-color: #10b981;
    background: #f0fdf4;
  }

  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .upload-icon {
    font-size: 3rem;
  }

  .file-constraints {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .selected-files h3 {
    margin: 0 0 1rem 0;
    color: #374151;
  }

  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .file-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .file-name {
    font-weight: 500;
  }

  .file-size, .file-type {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .file-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    justify-content: center;
  }

  .upload-progress {
    background: #f9fafb;
    padding: 1.5rem;
    border-radius: 0.75rem;
    margin-bottom: 2rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .progress-bar {
    height: 0.5rem;
    background: #e5e7eb;
    border-radius: 0.25rem;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #10b981);
    transition: width 0.3s ease;
  }

  .pipeline-status {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .pipeline-stage {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .pipeline-stage.active {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .pipeline-stage.completed {
    border-color: #10b981;
    background: #f0fdf4;
  }

  .stage-name {
    text-transform: capitalize;
    font-size: 0.875rem;
  }

  .upload-results {
    background: #f0fdf4;
    padding: 1.5rem;
    border-radius: 0.75rem;
    margin-bottom: 2rem;
  }

  .results-summary {
    display: flex;
    gap: 2rem;
    margin-bottom: 1.5rem;
    justify-content: center;
  }

  .summary-stat {
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 2rem;
    font-weight: bold;
    color: #10b981;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .result-item {
    background: white;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    border-left: 4px solid #e5e7eb;
  }

  .result-item.success {
    border-left-color: #10b981;
  }

  .result-item.error {
    border-left-color: #ef4444;
  }

  .ai-insights {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .ai-insights h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
  }

  .insights-summary {
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .entity-tag, .tag {
    display: inline-block;
    background: #e5e7eb;
    color: #374151;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    margin-right: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .analytics-dashboard {
    margin-top: 2rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }

  .analytics-dashboard summary {
    padding: 1rem;
    cursor: pointer;
    font-weight: 500;
  }

  .analytics-content {
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .insight-card {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .insight-card h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
  }

  .behavior-pattern {
    text-transform: capitalize;
    font-weight: 500;
    color: #3b82f6;
  }

  .recommendations-list {
    margin: 0;
    padding-left: 1rem;
  }

  /* Button Styles */
  .btn-primary {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-secondary:hover {
    background: #4b5563;
  }

  .btn-accept {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-dismiss {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-cancel {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .btn-retry {
    background: #f59e0b;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-reset {
    background: #6b7280;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-select-files {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    font-size: 1rem;
  }

  .final-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
  }

  .error-section {
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 1.5rem;
    border-radius: 0.75rem;
    margin-bottom: 2rem;
  }

  .error-section h3 {
    margin: 0 0 1rem 0;
    color: #dc2626;
  }

  .error-item {
    background: white;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    border-left: 4px solid #ef4444;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  @media (max-width: 640px) {
    .comprehensive-upload-analytics {
      padding: 1rem;
    }

    .upload-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .results-summary {
      flex-direction: column;
      gap: 1rem;
    }

    .file-actions, .final-actions, .error-actions {
      flex-direction: column;
    }

    .analytics-content {
      grid-template-columns: 1fr;
    }
  }
</style>
