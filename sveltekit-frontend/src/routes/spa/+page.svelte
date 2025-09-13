<script lang="ts">
  /**
   * Single Page App Demo Route
   * Full-screen canvas UX with gemma3:legal-latest integration
   */

  import { onMount } from 'svelte';
  import SPACanvasRenderer from '$lib/components/ui/enhanced-bits/SPACanvasRenderer.svelte';
  import { LegalAILogic, type LegalDocument, type EvidenceItem } from '$lib/core/logic/legal-ai-logic';

  // Sample legal data for demonstration
  let legalData = {
    documents: [] as LegalDocument[],
    evidence: [] as EvidenceItem[],
    cases: [],
    chatMessages: []
  };

  let currentView: 'dashboard' | 'evidence' | 'documents' | 'chat' | 'cases' = 'dashboard';
  let isLoading = true;

  onMount(async () => {
    // Simulate loading legal data
    await loadSampleData();
    isLoading = false;
  });

  async function loadSampleData() {
    // Generate sample legal documents
    legalData.documents = Array.from({ length: 150 }, (_, i) => ({
      id: `doc-${i}`,
      title: `Legal Document ${i + 1}: ${getRandomDocumentType()}`,
      content: generateSampleLegalContent(),
      confidence: Math.floor(Math.random() * 40) + 60, // 60-100%
      priority: getRandomPriority(),
      metadata: {
        gemmaModel: 'gemma3:legal-latest',
        processingTime: Math.floor(Math.random() * 500) + 100,
        analysisDate: new Date().toISOString()
      }
    }));

    // Generate sample evidence items
    legalData.evidence = Array.from({ length: 75 }, (_, i) => ({
      id: `evidence-${i}`,
      title: `Evidence Item ${i + 1}: ${getRandomEvidenceType()}`,
      type: getRandomEvidenceTypeEnum(),
      priority: getRandomPriority(),
      confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
      metadata: {
        collectedBy: 'Legal AI Assistant',
        verifiedBy: 'gemma3:legal-latest',
        chainOfCustody: true
      }
    }));

    // Generate sample cases
    legalData.cases = Array.from({ length: 25 }, (_, i) => ({
      id: `case-${i}`,
      title: `Case ${i + 1}: ${getRandomCaseType()}`,
      status: getRandomCaseStatus(),
      priority: getRandomPriority(),
      aiAnalysis: {
        model: 'gemma3:legal-latest',
        confidence: Math.floor(Math.random() * 20) + 80,
        riskAssessment: getRandomRisk()
      }
    }));

    console.log('📊 Sample legal data loaded for SPA Canvas', {
      documents: legalData.documents.length,
      evidence: legalData.evidence.length,
      cases: legalData.cases.length,
      useGamingCanvas: LegalAILogic.requiresGlyphEngine(legalData)
    });
  }

  function getRandomDocumentType(): string {
    const types = [
      'Employment Contract Analysis',
      'Merger Agreement Review',
      'Patent Application Filing',
      'Criminal Case Evidence',
      'Civil Litigation Brief',
      'Corporate Compliance Audit',
      'Real Estate Contract',
      'Intellectual Property License',
      'Environmental Impact Report',
      'Tax Liability Assessment'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  function getRandomEvidenceType(): string {
    const types = [
      'Financial Records Examination',
      'Digital Forensics Analysis',
      'Witness Statement Verification',
      'Document Authentication',
      'Email Communication Review',
      'Video Evidence Processing',
      'Audio Transcript Analysis',
      'Physical Evidence Catalog',
      'Chain of Custody Documentation',
      'Expert Opinion Report'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  function getRandomEvidenceTypeEnum(): "document" | "image" | "video" | "audio" | "transcript" {
    const types: ("document" | "image" | "video" | "audio" | "transcript")[] =
      ['document', 'image', 'video', 'audio', 'transcript'];
    return types[Math.floor(Math.random() * types.length)];
  }

  function getRandomCaseType(): string {
    const types = [
      'Contract Dispute Resolution',
      'Criminal Defense Strategy',
      'Corporate Merger Oversight',
      'Patent Infringement Claim',
      'Employment Law Violation',
      'Environmental Compliance',
      'Tax Evasion Investigation',
      'Personal Injury Lawsuit',
      'Intellectual Property Theft',
      'Securities Fraud Case'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  function getRandomPriority(): "critical" | "high" | "medium" | "low" {
    const priorities: ("critical" | "high" | "medium" | "low")[] =
      ['critical', 'high', 'medium', 'low'];
    const weights = [0.1, 0.2, 0.4, 0.3]; // Critical is rare
    const rand = Math.random();
    let cumulative = 0;

    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (rand <= cumulative) {
        return priorities[i];
      }
    }
    return 'medium';
  }

  function getRandomCaseStatus(): string {
    const statuses = ['active', 'pending', 'under_review', 'closed', 'on_hold'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  function getRandomRisk(): string {
    const risks = ['low', 'moderate', 'high', 'critical'];
    return risks[Math.floor(Math.random() * risks.length)];
  }

  function generateSampleLegalContent(): string {
    const samples = [
      'This employment agreement contains non-compete clauses that may be enforceable in certain jurisdictions. Analysis by gemma3:legal-latest indicates potential conflicts with state employment laws...',
      'The merger agreement includes provisions for due diligence that require comprehensive review of financial statements, intellectual property portfolios, and regulatory compliance records...',
      'Patent application filing demonstrates novelty and non-obviousness criteria. Prior art search conducted using AI-enhanced legal research shows minimal overlap with existing patents...',
      'Criminal case evidence chain of custody has been verified through digital forensics analysis. All documentation meets federal evidence admissibility standards...',
      'Civil litigation brief presents compelling arguments based on established precedent. Legal research indicates 85% probability of favorable outcome based on similar cases...'
    ];
    return samples[Math.floor(Math.random() * samples.length)];
  }

  function handleNavigation(event: CustomEvent) {
    currentView = event.detail.view;
    console.log('🧭 Navigation:', event.detail);

    // Simulate AI processing with gemma3:legal-latest
    if (event.detail.view === 'chat') {
      simulateAIResponse();
    }
  }

  function handleInteraction(event: CustomEvent) {
    console.log('🖱️ Canvas interaction:', event.detail);

    // Handle canvas clicks and interactions
    const { type, position, view, data } = event.detail;

    if (type === 'click' && view === 'documents') {
      // Simulate document analysis with gemma3:legal-latest
      console.log('📄 Analyzing document with gemma3:legal-latest at position:', position);
    }
  }

  async function simulateAIResponse() {
    // Simulate gemma3:legal-latest processing time
    await new Promise(resolve => setTimeout(resolve, 800));

    const aiResponses = [
      'Based on gemma3:legal-latest analysis, I\'ve identified 3 key legal considerations in your case...',
      'The legal precedent search using advanced AI models shows strong support for your position...',
      'Document review complete. Gemma3:legal-latest found 2 potential compliance issues that require attention...',
      'Risk assessment indicates moderate exposure. I recommend reviewing sections 4.2 and 7.1 of the agreement...',
      'Legal entity extraction successful. Found 12 parties, 8 jurisdictions, and 15 key dates for timeline analysis...'
    ];

    const response = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    console.log('🤖 AI Response (gemma3:legal-latest):', response);
  }
</script>

<!-- Page metadata -->
<svelte:head>
  <title>Legal AI SPA - Single Page Canvas Application</title>
  <meta name="description" content="Full-screen legal AI canvas application powered by gemma3:legal-latest" />
</svelte:head>

{#if isLoading}
  <!-- Loading screen with NES styling -->
  <div class="loading-screen nes-container is-dark">
    <div class="loading-content">
      <h1 class="nes-text is-primary">⚖️ LEGAL AI SPA</h1>
      <p class="nes-text">Loading gemma3:legal-latest...</p>
      <div class="nes-text loading-dots">
        <span class="loading-dot">●</span>
        <span class="loading-dot">●</span>
        <span class="loading-dot">●</span>
      </div>
      <div class="loading-stats">
        <p class="nes-text is-success">Documents: {legalData.documents.length}</p>
        <p class="nes-text is-warning">Evidence: {legalData.evidence.length}</p>
        <p class="nes-text is-error">Cases: {legalData.cases.length}</p>
      </div>
    </div>
  </div>
{:else}
  <!-- Full-screen SPA Canvas -->
  <SPACanvasRenderer
    {legalData}
    {currentView}
    fullscreen={true}
    on:navigate={handleNavigation}
    on:interact={handleInteraction}
  />

  <!-- Debug info (remove in production) -->
  <div class="debug-info">
    <p>🎮 Gaming Canvas: {LegalAILogic.requiresGlyphEngine(legalData) ? 'Active' : 'Inactive'}</p>
    <p>🤖 AI Model: gemma3:legal-latest</p>
    <p>📊 Data: {legalData.documents.length} docs, {legalData.evidence.length} evidence</p>
  </div>
{/if}

<style>
  /* Import hybrid theme */
  @import '$lib/styles/hybrid-theme.css';

  .loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--yorha-black);
    z-index: 2000;
  }

  .loading-content {
    text-align: center;
    max-width: 400px;
  }

  .loading-content h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
    font-family: 'Courier New', monospace;
  }

  .loading-dots {
    font-size: 1.5rem;
    margin: 1rem 0;
  }

  .loading-dot {
    animation: blink 1.5s infinite;
    margin: 0 0.2rem;
  }

  .loading-dot:nth-child(2) {
    animation-delay: 0.3s;
  }

  .loading-dot:nth-child(3) {
    animation-delay: 0.6s;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
  }

  .loading-stats {
    margin-top: 2rem;
  }

  .loading-stats p {
    margin: 0.5rem 0;
    font-family: 'Courier New', monospace;
  }

  .debug-info {
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: var(--yorha-white);
    padding: 0.5rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    z-index: 1001;
    pointer-events: none;
  }

  .debug-info p {
    margin: 0.2rem 0;
  }

  /* Hide debug info on mobile */
  @media (max-width: 768px) {
    .debug-info {
      display: none;
    }
  }

  /* Ensure full-screen coverage */
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>