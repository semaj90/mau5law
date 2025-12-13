<script lang="ts">
  // Types
  interface AnalysisStep {
    name: string;
    key: string;
    status: 'pending' | 'processing' | 'completed';
    description: string;
    icon: string;
    duration: string;
  }

  interface EvidenceType {
    value: string;
    label: string;
  }

  interface PriorityOption {
    value: string;
    label: string;
    color: string;
  }

  interface AnalysisResults {
    status: string;
    sessionId: string;
    analysisResults: Record<string, any>;
    metadata?: {
      source: string;
      processingTime: string;
      model: string;
    };
  }

  // Convert runes-state -> standard Svelte variables
  let analyzing: boolean = false;
  let results: AnalysisResults | null = null;
  let error: string = '';
  let progress: number = 0;
  let showResults: boolean = false;

  // Form data
  let caseId: string = '';
  let evidenceContent: string = '';
  let evidenceFile: File | null = null;
  let evidenceType: string = 'police_report';
  let priority: string = 'medium';
  let sessionId: string = '';

  // Analysis pipeline steps with enhanced metadata
  let steps: AnalysisStep[] = [
    {
      name: 'Evidence Analysis',
      key: 'evidence_analysis',
      status: 'pending',
      description: 'Structuring document and extracting key facts',
      icon: '📄',
      duration: '30-45s',
    },
    {
      name: 'Person Extraction',
      key: 'persons_extracted',
      status: 'pending',
      description: 'Identifying persons of interest and roles',
      icon: '👥',
      duration: '20-30s',
    },
    {
      name: 'Relationship Mapping',
      key: 'neo4j_updates',
      status: 'pending',
      description: 'Building knowledge graph connections',
      icon: '🔗',
      duration: '15-25s',
    },
    {
      name: 'Case Synthesis',
      key: 'case_synthesis',
      status: 'pending',
      description: 'Generating prosecutorial analysis',
      icon: '⚖️',
      duration: '25-35s',
    },
  ];

  // Evidence type options
  const evidenceTypes: EvidenceType[] = [
    { value: 'police_report', label: 'Police Report' },
    { value: 'witness_statement', label: 'Witness Statement' },
    { value: 'financial_records', label: 'Financial Records' },
    { value: 'digital_forensics', label: 'Digital Forensics' },
    { value: 'physical_evidence', label: 'Physical Evidence' },
    { value: 'expert_testimony', label: 'Expert Testimony' },
    { value: 'other', label: 'Other Document' },
  ];

  // Priority options
  const priorityOptions: PriorityOption[] = [
    { value: 'low', label: 'Low Priority', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium Priority', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High Priority', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
  ];

  // Current step tracking (derived from progress)
  let currentStep: number = 0;
  $: {
    const total = steps.length || 1;
    const perStep = 100 / total;
    currentStep = Math.max(0, Math.min(total - 1, Math.floor(progress / perStep)));
  }

  // File upload handler
  function handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input || !input.files || input.files.length === 0) return;
    evidenceFile = input.files[0];
    // Read file content (plain text fallback)
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>): void => {
      evidenceContent = String(e.target?.result ?? '');
    };
    reader.readAsText(evidenceFile);
  }

  // Start analysis
  async function startAnalysis(): Promise<void> {
    // Validation
    if (!caseId.trim()) {
      error = 'Case ID is required';
      return;
    }
    if (!evidenceContent.trim()) {
      error = 'Evidence content is required';
      return;
    }
    if (evidenceContent.length < 50) {
      error = 'Evidence content must be at least 50 characters';
      return;
    }
    if (evidenceContent.length > 100000) {
      error = 'Evidence content is too large (max 100,000 characters)';
      return;
    }

    analyzing = true;
    error = '';
    results = null;
    progress = 0;

    // Simulate progressive analysis steps
    const updateProgress = (stepIndex: number): void => {
      const total = steps.length || 1;
      const perStep = 100 / total;
      progress = Math.min(100, Math.round((stepIndex / total) * 100));

      // Create a new steps array to ensure reactivity
      steps = steps.map((s, i) => {
        const status: AnalysisStep['status'] =
          i < stepIndex ? 'completed' : i === stepIndex ? 'processing' : 'pending';
        return { ...s, status };
      });
    };

    try {
      updateProgress(0);
      const response = await fetch('/api/v1/evidence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceId: crypto.randomUUID(),
          filename: evidenceFile?.name || 'uploaded_evidence.txt',
          content: evidenceContent,
          type: evidenceType === 'police_report' ? 'document' : evidenceType,
        }),
      });
      updateProgress(2);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      updateProgress(3);
      // Handle real AI response directly (no polling needed)
      updateProgress(4);
      analyzing = false;
      showResults = true;

      // Transform API response to expected format
      results = {
        status: 'completed',
        sessionId: data.data?.evidenceId || 'ai-session-' + Date.now(),
        analysisResults: {
          summary: data.data?.analysis?.summary || 'Analysis completed',
          confidence: data.data?.analysis?.confidence || 0.5,
          keyFactsCount: data.data?.analysis?.keyFindings?.length || 0,
          relevantLaws: data.data?.analysis?.relevantLaws || [],
          suggestedTags: data.data?.analysis?.suggestedTags || [],
          prosecutionScore: data.data?.analysis?.prosecutionScore || 0,
          legalRelevance: data.data?.analysis?.legalRelevance || 'Unknown',
          keyFindings: data.data?.analysis?.keyFindings || [],
          recommendations: data.data?.analysis?.recommendations || [],
          model: data.data?.model || 'gemma3-legal',
          processedAt: data.data?.processedAt,
        },
      };
    } catch (err) {
      console.error('Evidence analysis error:', err);
      analyzing = false;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

      const notice = document.createElement('div');
      notice.innerHTML = `⚠️ API failed: ${errorMessage.substring(0, 100)}`;
      notice.style.cssText =
        'position: fixed; top: 20px; right: 20px; background: rgba(220, 53, 69, 0.9); color: white; padding: 0.75rem 1.25rem; border-radius: 6px; z-index: 10000; font-size: 0.9rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 400px;';
      document.body.appendChild(notice);
      setTimeout(() => {
        notice.style.transition = 'opacity 0.3s';
        notice.style.opacity = '0';
        setTimeout(() => notice.remove(), 300);
      }, 4000);

      // Generate mock analysis results for demo purposes
      progress = 100;
      showResults = true;
      results = {
        status: 'completed',
        sessionId: 'mock-session-' + Date.now(),
        analysisResults: {
          documentType: evidenceType,
          keyFactsCount: Math.floor(Math.random() * 10) + 5,
          personsOfInterest: [
            { name: 'John Doe', role: 'witness', confidence: 0.85 },
            { name: 'Jane Smith', role: 'defendant', confidence: 0.92 },
          ],
          timeline: [
            { event: 'Mock incident occurred', date: '2024-01-15', importance: 'high' },
            { event: 'Mock evidence collected', date: '2024-01-16', importance: 'medium' },
          ],
          legalImplications:
            'Mock, analysis: Strong evidence pattern suggesting liability. Recommend further investigation of contract terms.',
          confidenceScore: 0.78,
          nextSteps: [
            'Review additional witness statements',
            'Obtain security footage',
            'Examine financial records',
          ],
        },
        metadata: {
          source: 'mock-evidence-analyzer',
          processingTime: '45 seconds',
          model: 'Legal Evidence AI v2.0 (Simulated)',
        },
      };
      error = '';
    }
  }

  // Reset form
  function resetForm(): void {
    caseId = '';
    evidenceContent = '';
    evidenceFile = null;
    evidenceType = 'police_report';
    priority = 'medium';
    analyzing = false;
    results = null;
    error = '';
    progress = 0;
    showResults = false;
    sessionId = '';
    steps = steps.map((step) => ({ ...step, status: 'pending' }));
  }

  // View detailed results
  function viewDetailedResults(analysisData: unknown): void {
    console.log('Opening detailed results:', analysisData);
    // Could open a modal or navigate to detailed view
  }
</script>

<!-- Replace placeholder markup with a simple, accessible form + results display -->
<main class="page-analyze">
  <h1>Evidence Analysis</h1>

  <form
    onsubmit={async (e: Event) => {
      e.preventDefault();
      await startAnalysis();
    }}
    class="analyze-form"
    aria-label="Evidence analysis form"
  >
    <label>
      Case ID
      <input
        type="text"
        value={caseId}
        oninput={(e) => (caseId = (e.target as HTMLInputElement).value)}
        required
      />
    </label>

    <label>
      Evidence Type
      <select
        value={evidenceType}
        onchange={(e) => (evidenceType = (e.target as HTMLSelectElement).value)}
      >
        {#each evidenceTypes as t}
          <option value={t.value}>{t.label}</option>
        {/each}
      </select>
    </label>

    <label>
      Priority
      <select value={priority} onchange={(e) => (priority = (e.target as HTMLSelectElement).value)}>
        {#each priorityOptions as p}
          <option value={p.value}>{p.label}</option>
        {/each}
      </select>
    </label>

    <label>
      Evidence (text)
      <textarea
        id="evidence-content"
        rows="8"
        value={evidenceContent}
        oninput={(e) => (evidenceContent = (e.target as HTMLTextAreaElement).value)}
        placeholder="Paste or type evidence text here..."
        required
      ></textarea>
    </label>

    <label>
      Or upload file
      <input type="file" accept=".txt,.md,.pdf" onchange={handleFileUpload} />
    </label>

    <div class="form-actions">
      <button type="button" onclick={startAnalysis} disabled={analyzing}>
        {#if analyzing}Analyzing...{:else}Start Analysis{/if}
      </button>
      <button type="button" onclick={resetForm}>Reset</button>
    </div>
  </form>

  <section class="analysis-status" aria-live="polite">
    <div class="progress-bar" role="status">
      <label for="analysis-progress">Progress: {progress}%</label>
      <progress id="analysis-progress" max="100" value={progress}></progress>
    </div>

    <div class="steps">
      {#each steps as step, i}
        <div class="step {step.status}">
          <div class="step-icon">{step.icon}</div>
          <div class="step-body">
            <div class="step-name">{step.name}</div>
            <div class="step-desc">{step.description}</div>
            <div class="step-meta">{step.duration} • {step.status}</div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  {#if showResults && results}
    <section class="analysis-results">
      <h2>Results</h2>
      <div><strong>Session:</strong> {results.sessionId}</div>
      <div><strong>Status:</strong> {results.status}</div>
      <div><strong>Summary:</strong> {results.analysisResults.summary ?? '—'}</div>
      <div><strong>Confidence:</strong> {results.analysisResults.confidence ?? '—'}</div>

      <button type="button" onclick={() => viewDetailedResults(results!.analysisResults)}>
        View Details
      </button>
    </section>
  {/if}

  {#if error}
    <div class="error" role="alert">{error}</div>
  {/if}
</main>

<style>
  /* Minimal styling to keep layout readable */
  .page-analyze {
    padding: 1.25rem;
    font-family: system-ui, sans-serif;
  }
  form label {
    display: block;
    margin-bottom: 0.75rem;
  }
  input,
  textarea,
  select {
    width: 100%;
    padding: 0.5rem;
    margin-top: 0.25rem;
    box-sizing: border-box;
  }
  .form-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .progress-bar {
    margin-top: 1rem;
  }
  .steps {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .step {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.5rem;
    border: 1px solid #eee;
    border-radius: 6px;
  }
  .step .step-icon {
    font-size: 1.25rem;
  }
  .analysis-results {
    margin-top: 1.25rem;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #fafafa;
  }
  .error {
    margin-top: 1rem;
    color: #b91c1c;
  }
</style>
