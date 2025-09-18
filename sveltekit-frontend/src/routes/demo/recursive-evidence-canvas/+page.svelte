<!-- Demo Page for Recursive Evidence Visualization Component -->
<script lang="ts">
  import { onMount } from 'svelte';
  import RecursiveEvidenceVisualization from '$lib/components/canvas/RecursiveEvidenceVisualization.svelte';

  interface Props {
    // No props needed for demo page
  }

  let : Props = $props();

  // Demo state using Svelte 5 runes
  let selectedCaseId = $state('DEMO_CASE_001');
  let selectedEvidence = $state(null);
  let canvasWidth = $state(1400);
  let canvasHeight = $state(900);
  let showMetrics = $state(true);
  let enableInteraction = $state(true);

  // Demo evidence data for testing
  let demoEvidenceData = $state({
    evidenceId: 'EVIDENCE_ROOT_001',
    title: 'Primary Contract Document',
    type: 'documentary',
    chainOfCustody: {
      completeness: 0.95,
      lastHandler: 'Legal Clerk Johnson',
      timestamp: '2024-01-15T14:30:00Z'
    },
    legalImplications: ['contract_validity', 'signature_authentication', 'date_verification'],
    relationships: {
      childEvidence: ['EVIDENCE_002', 'EVIDENCE_003', 'EVIDENCE_004'],
      correlatedEvidence: ['EVIDENCE_005'],
      averageStrength: 0.87
    },
    metadata: {
      caseId: 'DEMO_CASE_001',
      priority: 'critical',
      admissibility: 0.92,
      relevanceScore: 0.89
    },
    position: { x: 700, y: 100, level: 0 },
    children: [
      {
        evidenceId: 'EVIDENCE_002',
        title: 'Signature Analysis Report',
        type: 'digital',
        chainOfCustody: { completeness: 0.88, lastHandler: 'Expert A. Smith', timestamp: '2024-01-16T09:15:00Z' },
        legalImplications: ['signature_authentication', 'expert_testimony'],
        relationships: { childEvidence: ['EVIDENCE_006'], correlatedEvidence: [], averageStrength: 0.91 },
        metadata: { caseId: 'DEMO_CASE_001', priority: 'high', admissibility: 0.85, relevanceScore: 0.94 },
        position: { x: 500, y: 250, level: 1 },
        children: [
          {
            evidenceId: 'EVIDENCE_006',
            title: 'Digital Signature Certificate',
            type: 'digital',
            chainOfCustody: { completeness: 0.99, lastHandler: 'IT Forensics', timestamp: '2024-01-16T10:00:00Z' },
            legalImplications: ['digital_authentication', 'timestamp_verification'],
            relationships: { childEvidence: [], correlatedEvidence: ['EVIDENCE_007'], averageStrength: 0.96 },
            metadata: { caseId: 'DEMO_CASE_001', priority: 'critical', admissibility: 0.97, relevanceScore: 0.88 },
            position: { x: 400, y: 400, level: 2 }
          }
        ]
      },
      {
        evidenceId: 'EVIDENCE_003',
        title: 'Witness Testimony - Party A',
        type: 'testimonial',
        chainOfCustody: { completeness: 0.75, lastHandler: 'Court Reporter', timestamp: '2024-01-17T11:30:00Z' },
        legalImplications: ['witness_credibility', 'timeline_verification'],
        relationships: { childEvidence: ['EVIDENCE_008'], correlatedEvidence: ['EVIDENCE_009'], averageStrength: 0.73 },
        metadata: { caseId: 'DEMO_CASE_001', priority: 'medium', admissibility: 0.78, relevanceScore: 0.82 },
        position: { x: 700, y: 250, level: 1 },
        children: [
          {
            evidenceId: 'EVIDENCE_008',
            title: 'Corroborating Email Thread',
            type: 'digital',
            chainOfCustody: { completeness: 0.91, lastHandler: 'Digital Forensics', timestamp: '2024-01-17T15:45:00Z' },
            legalImplications: ['timeline_verification', 'communication_evidence'],
            relationships: { childEvidence: [], correlatedEvidence: [], averageStrength: 0.84 },
            metadata: { caseId: 'DEMO_CASE_001', priority: 'medium', admissibility: 0.86, relevanceScore: 0.79 },
            position: { x: 600, y: 400, level: 2 }
          }
        ]
      },
      {
        evidenceId: 'EVIDENCE_004',
        title: 'Physical Contract Copy',
        type: 'physical',
        chainOfCustody: { completeness: 0.67, lastHandler: 'Evidence Locker', timestamp: '2024-01-18T08:00:00Z' },
        legalImplications: ['document_integrity', 'chain_gap'],
        relationships: { childEvidence: ['EVIDENCE_010'], correlatedEvidence: [], averageStrength: 0.59 },
        metadata: { caseId: 'DEMO_CASE_001', priority: 'low', admissibility: 0.65, relevanceScore: 0.71 },
        position: { x: 900, y: 250, level: 1 },
        children: [
          {
            evidenceId: 'EVIDENCE_010',
            title: 'Handwriting Analysis',
            type: 'digital',
            chainOfCustody: { completeness: 0.83, lastHandler: 'Handwriting Expert', timestamp: '2024-01-18T14:20:00Z' },
            legalImplications: ['handwriting_verification', 'expert_analysis'],
            relationships: { childEvidence: [], correlatedEvidence: ['EVIDENCE_002'], averageStrength: 0.76 },
            metadata: { caseId: 'DEMO_CASE_001', priority: 'medium', admissibility: 0.81, relevanceScore: 0.74 },
            position: { x: 1000, y: 400, level: 2 }
          }
        ]
      }
    ]
  });

  // Demo cases for selection
  let availableCases = $state([
    { id: 'DEMO_CASE_001', name: 'Contract Dispute - XYZ Corp vs ABC Inc', status: 'active' },
    { id: 'DEMO_CASE_002', name: 'Patent Infringement - Tech Solutions', status: 'pending' },
    { id: 'DEMO_CASE_003', name: 'Employment Contract - Confidentiality Breach', status: 'completed' }
  ]);

  let highlightPath = $state(['EVIDENCE_ROOT_001', 'EVIDENCE_002', 'EVIDENCE_006']);

  function handleEvidenceSelect(evidence: unknown) {
    selectedEvidence = evidence;
    console.log('🎯 Evidence selected in demo:', evidence);
  }

  function clearSelection() {
    selectedEvidence = null;
    highlightPath = [];
  }

  function highlightSignatureChain() {
    highlightPath = ['EVIDENCE_ROOT_001', 'EVIDENCE_002', 'EVIDENCE_006'];
  }

  function highlightTestimonyChain() {
    highlightPath = ['EVIDENCE_ROOT_001', 'EVIDENCE_003', 'EVIDENCE_008'];
  }

  function resizeCanvas(size: 'small' | 'medium' | 'large') {
    switch (size) {
      case 'small':
        canvasWidth = 1000;
        canvasHeight = 600;
        break;
      case 'medium':
        canvasWidth = 1400;
        canvasHeight = 900;
        break;
      case 'large':
        canvasWidth = 1800;
        canvasHeight = 1200;
        break;
    }
  }

  onMount(() => {
    console.log('📊 Recursive Evidence Canvas Demo loaded with Svelte 5 patterns');
  });
</script>

<div class="demo-page">
  <!-- Header -->
  <div class="demo-header">
    <h1>🔍 Recursive Evidence Visualization Demo</h1>
    <p>Advanced legal evidence hierarchy visualization using modern Svelte 5 patterns</p>
    <div class="pattern-badges">
      <span class="badge">✅ $props() interface</span>
      <span class="badge">✅ $state() runes</span>
      <span class="badge">✅ onclick handlers</span>
      <span class="badge">✅ Recursive components</span>
      <span class="badge">✅ Canvas visualization</span>
    </div>
  </div>

  <!-- Demo Controls -->
  <div class="demo-controls">
    <div class="control-section">
      <h3>📋 Case Selection</h3>
      <select bind:value={selectedCaseId}>
        {#each availableCases as case}
          <option value={case.id}>{case.name}</option>
        {/each}
      </select>
    </div>

    <div class="control-section">
      <h3>🎨 Canvas Controls</h3>
      <div class="button-group">
        <button onclick={() => resizeCanvas('small')} class:active={canvasWidth === 1000}>
          Small (1000×600)
        </button>
        <button onclick={() => resizeCanvas('medium')} class:active={canvasWidth === 1400}>
          Medium (1400×900)
        </button>
        <button onclick={() => resizeCanvas('large')} class:active={canvasWidth === 1800}>
          Large (1800×1200)
        </button>
      </div>
    </div>

    <div class="control-section">
      <h3>🔗 Evidence Chains</h3>
      <div class="button-group">
        <button onclick={highlightSignatureChain}>
          🖋️ Signature Chain
        </button>
        <button onclick={highlightTestimonyChain}>
          👥 Testimony Chain
        </button>
        <button onclick={clearSelection}>
          🧹 Clear Selection
        </button>
      </div>
    </div>

    <div class="control-section">
      <h3>⚙️ Visualization Options</h3>
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={showMetrics} />
        Show Performance Metrics
      </label>
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={enableInteraction} />
        Enable Canvas Interaction
      </label>
    </div>
  </div>

  <!-- Evidence Visualization Component -->
  <div class="visualization-container">
    <RecursiveEvidenceVisualization
      caseId={selectedCaseId}
      width={canvasWidth}
      height={canvasHeight}
      enableInteraction={enableInteraction}
      showMetrics={showMetrics}
      onEvidenceSelect={handleEvidenceSelect}
      highlightPath={highlightPath}
      maxRecursionDepth={25}
    />
  </div>

  <!-- Selected Evidence Details -->
  {#if selectedEvidence}
    <div class="evidence-details">
      <h3>🔍 Selected Evidence Details</h3>
      <div class="details-grid">
        <div class="detail-item">
          <label>Evidence ID:</label>
          <span class="evidence-id">{selectedEvidence.evidenceId}</span>
        </div>
        <div class="detail-item">
          <label>Title:</label>
          <span>{selectedEvidence.title}</span>
        </div>
        <div class="detail-item">
          <label>Type:</label>
          <span class="evidence-type">{selectedEvidence.type}</span>
        </div>
        <div class="detail-item">
          <label>Chain Integrity:</label>
          <span class="integrity-score">
            {Math.round((selectedEvidence.chainOfCustody?.completeness || 0) * 100)}%
          </span>
        </div>
        <div class="detail-item">
          <label>Admissibility:</label>
          <span class="admissibility-score">
            {Math.round((selectedEvidence.metadata?.admissibility || 0) * 100)}%
          </span>
        </div>
        <div class="detail-item">
          <label>Priority:</label>
          <span class="priority-level">{selectedEvidence.metadata?.priority}</span>
        </div>
        <div class="detail-item">
          <label>Legal Implications:</label>
          <div class="implications-list">
            {#each selectedEvidence.legalImplications || [] as implication}
              <span class="implication-tag">{implication}</span>
            {/each}
          </div>
        </div>
        <div class="detail-item">
          <label>Last Handler:</label>
          <span>{selectedEvidence.chainOfCustody?.lastHandler}</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Demo Information -->
  <div class="demo-info">
    <h3>🚀 Modern Svelte 5 Implementation Highlights</h3>
    <div class="info-grid">
      <div class="info-card">
        <h4>📱 Reactive Props</h4>
        <p>Uses <code>$props()</code> interface with TypeScript for type-safe component props</p>
        <code>let { caseId, width = 1400 }: Props = $props();</code>
      </div>

      <div class="info-card">
        <h4>🎛️ State Management</h4>
        <p>Leverages <code>$state()</code> runes for reactive canvas and UI state</p>
        <code>let selectedEvidence = $state(null);</code>
      </div>

      <div class="info-card">
        <h4>🖱️ Event Handling</h4>
        <p>Modern <code>onclick</code> handlers instead of deprecated <code>on:click</code></p>
        <code>&lt;button onclick={clearSelection}&gt;</code>
      </div>

      <div class="info-card">
        <h4>🔄 Recursive Patterns</h4>
        <p>Self-importing recursive components for evidence hierarchy visualization</p>
        <code>import RecursiveEvidenceVisualization from './RecursiveEvidenceVisualization.svelte';</code>
      </div>

      <div class="info-card">
        <h4>🎨 Canvas Integration</h4>
        <p>Advanced Fabric.js canvas with interactive evidence nodes and relationship lines</p>
        <code>fabricCanvas.on('object:selected', handler);</code>
      </div>

      <div class="info-card">
        <h4>⚡ Performance Optimized</h4>
        <p>Web Workers for recursive evidence processing, circular reference detection</p>
        <code>evidenceWorker.postMessage({ type: 'PROCESS_EVIDENCE_CHAIN' });</code>
      </div>
    </div>
  </div>

  <!-- Technical Specifications -->
  <div class="tech-specs">
    <h3>🔧 Technical Specifications</h3>
    <ul>
      <li><strong>Canvas Rendering:</strong> Fabric.js for high-performance interactive visualization</li>
      <li><strong>Layout Algorithms:</strong> Tree, Radial, and Force-Directed positioning</li>
      <li><strong>Evidence Processing:</strong> Recursive chain analysis with circular reference detection</li>
      <li><strong>Chain of Custody:</strong> Real-time integrity monitoring and validation</li>
      <li><strong>Legal Implications:</strong> Visual indicators for legal significance and admissibility</li>
      <li><strong>Scalability:</strong> Handles complex evidence hierarchies with 25+ levels of recursion</li>
      <li><strong>Export Capabilities:</strong> PNG export for legal documentation and reports</li>
      <li><strong>Performance Metrics:</strong> Real-time render time and node count tracking</li>
    </ul>
  </div>
</div>

<style>
  .demo-page {
    max-width: 100%;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 2rem;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
  }

  .demo-header h1 {
    margin: 0 0 1rem 0;
    font-size: 2.5rem;
    font-weight: 700;
  }

  .demo-header p {
    margin: 0 0 1.5rem 0;
    font-size: 1.2rem;
    opacity: 0.9;
  }

  .pattern-badges {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .badge {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .demo-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .control-section h3 {
    margin: 0 0 1rem 0;
    color: #374151;
    font-size: 1rem;
    font-weight: 600;
  }

  .control-section select {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #E5E7EB;
    border-radius: 8px;
    background: white;
    font-size: 0.875rem;
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .button-group button {
    padding: 0.5rem 1rem;
    border: 2px solid #E5E7EB;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .button-group button:hover {
    background: #F3F4F6;
    border-color: #D1D5DB;
  }

  .button-group button.active {
    background: #3B82F6;
    color: white;
    border-color: #3B82F6;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .checkbox-label input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
  }

  .visualization-container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    margin-bottom: 2rem;
  }

  .evidence-details {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .evidence-details h3 {
    margin: 0 0 1.5rem 0;
    color: #059669;
    font-weight: 600;
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-item label {
    font-weight: 500;
    color: #6B7280;
    font-size: 0.875rem;
  }

  .evidence-id {
    font-family: 'JetBrains Mono', monospace;
    color: #3B82F6;
    font-weight: 600;
  }

  .evidence-type {
    text-transform: capitalize;
    color: #059669;
    font-weight: 500;
  }

  .integrity-score {
    color: #059669;
    font-weight: 600;
  }

  .admissibility-score {
    color: #DC2626;
    font-weight: 600;
  }

  .priority-level {
    text-transform: uppercase;
    font-weight: 600;
    color: #F59E0B;
  }

  .implications-list {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .implication-tag {
    background: #EBF8FF;
    color: #1E40AF;
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .demo-info {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .demo-info h3 {
    margin: 0 0 1.5rem 0;
    color: #374151;
    font-weight: 600;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }

  .info-card {
    padding: 1rem;
    border: 2px solid #E5E7EB;
    border-radius: 8px;
    background: #F9FAFB;
  }

  .info-card h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
    font-size: 1rem;
    font-weight: 600;
  }

  .info-card p {
    margin: 0 0 0.5rem 0;
    color: #6B7280;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .info-card code {
    display: block;
    background: #F3F4F6;
    padding: 0.5rem;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: #374151;
    border: 1px solid #E5E7EB;
  }

  .tech-specs {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .tech-specs h3 {
    margin: 0 0 1rem 0;
    color: #374151;
    font-weight: 600;
  }

  .tech-specs ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .tech-specs li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #F3F4F6;
    font-size: 0.875rem;
    color: #374151;
  }

  .tech-specs li:last-child {
    border-bottom: none;
  }

  .tech-specs strong {
    color: #059669;
  }
</style>