<script lang="ts">
  // Svelte, 5 runes are auto-imported
  // Card removed to avoid slot typing issues; wrapper divs supply styling instead
  import { Progress } from '$lib/components/ui/progress';
  import { appActions, appStore } from '$lib/stores/app-store';
  import { Activity } from "lucide-svelte";
import { AlertCircle } from "lucide-svelte";
import { Brain } from "lucide-svelte";
import { Clock } from "lucide-svelte";
import { Database } from "lucide-svelte";
import { TrendingUp } from "lucide-svelte";;
  import { onMount } from 'svelte';

  // Reactive state from app store
  let analysisData = $state({
    caseMetrics: { total: 0, active: 0, pending: 0, closed: 0, success_rate: 0 },
    evidenceAnalysis: {
      total_pieces: 0,
      processed: 0,
      ai_analyzed: 0,
      flagged: 0,
      processing_queue: 0,
    },
    threatAssessment: { critical: 0, high: 0, medium: 0, low: 0, cleared: 0 },
    aiPerformance: {
      accuracy: 0,
      processing_speed: 0,
      confidence: 0,
      last_update: '',
    },
  });

  let recentAnalyses = $state([]);
  let isLoading = $state(false);
  let error = $state <string | null>(null);

  // Subscribe to app store
  $effect(() => {() => {
    const unsubscribe = appStore.subscribe((state) => {
      // Update case metrics
      const cases = state.cases || [];
      const total = cases.length;
      const active = cases.filter(c => c.status === 'open' || c.status === 'investigating').length;
      const pending = cases.filter(c => c.status === 'pending').length;
      const closed = cases.filter(c => c.status === 'closed').length;
      const successRate = total > 0 ? Math.round((closed / total) * 100) : 0;

      // Update evidence analysis
      const evidence = state.evidence || [];
      const totalEvidence = evidence.length;
      // evidence.status uses 'analyzed' in the domain types, map processed -> analyzed
      const processed = evidence.filter((e: any) => e.status === 'analyzed').length;
      // some evidence objects expose an analyzedAt timestamp instead of a boolean
      const aiAnalyzed = evidence.filter((e: any) => !!e.analyzedAt).length;
      // flagged may be named differently across types; coerce to any and check common keys
      const flagged = evidence.filter((e: any) => !!(e.flagged || e.isFlagged)).length;

      // Update threat assessment from POIs
      const pois = state.pois || [];
      const critical = pois.filter((p: any) => p.threatLevel === 'critical').length;
      const high = pois.filter((p: any) => p.threatLevel === 'high').length;
      const medium = pois.filter((p: any) => p.threatLevel === 'medium').length;
      const low = pois.filter((p: any) => p.threatLevel === 'low').length;
      // POI statuses may use 'inactive' or 'archived' instead of 'cleared'
      const cleared = pois.filter((p: any) => p.status === 'inactive' || p.status === 'archived').length;

      // Update AI performance from system metrics
      const systemMetrics = state.systemMetrics as any;
      // system metrics shape can vary; use a best-effort lookup with fallbacks
      const accuracy = systemMetrics?.ai?.accuracy ?? systemMetrics?.aiAccuracy ?? 94.2;
      const processingSpeed = systemMetrics?.ai?.processingSpeed ?? systemMetrics?.processingSpeed ?? 1.3;
      const confidence = systemMetrics?.ai?.confidence ?? systemMetrics?.confidence ?? 91.8;
      const lastUpdate = systemMetrics?.lastUpdated ?? systemMetrics?.lastUpdate ?? new Date().toISOString();

      analysisData = {
        caseMetrics: { total, active, pending, closed, success_rate: successRate },
        evidenceAnalysis: {
          total_pieces: totalEvidence,
          processed,
          ai_analyzed: aiAnalyzed,
          flagged,
          processing_queue: totalEvidence - processed,
        },
        threatAssessment: { critical, high, medium, low, cleared },
        aiPerformance: {
          accuracy,
          processing_speed: processingSpeed,
          confidence,
          last_update: new Date(lastUpdate).toLocaleString(),
        },
      };

      // Generate recent analyses from cases and evidence
      recentAnalyses = cases.slice(0, 5).map((case_, index) => ({
        id: `ANA-${String(index + 1).padStart(3, '0')}`,
        case_id: case_.id,
        type: case_.priority === 'critical' ? 'Threat Assessment' :
              case_.priority === 'high' ? 'Pattern Recognition' :
              case_.priority === 'medium' ? 'Behavioral Analysis' : 'Financial Correlation',
        status: case_.status === 'closed' ? 'completed' : case_.status === 'open' ? 'processing' : 'pending',
        confidence: case_.status === 'closed' ? Math.floor(Math.random() * 20) + 80 : null,
        findings: case_.description || 'Analysis in progress...',
        timestamp: case_.updatedAt ? new Date(case_.updatedAt).toLocaleString() : 'Recently',
      }));

      isLoading = state.isLoading;
      error = state.error;
    });
    return unsubscribe;
  });

  onMount(() => {
    (async () => {
      await appActions.loadCases();
      await appActions.loadEvidence();
      await appActions.loadPOIs();
      await appActions.loadSystemMetrics();

      // Refresh data periodically
      const interval = setInterval(async () => {
        await appActions.loadCases();
        await appActions.loadEvidence();
        await appActions.loadPOIs();
        await appActions.loadSystemMetrics();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    })();
  });
</script>

<svelte:head><title>ANALYSIS - YoRHa Detective Interface</title></svelte:head>
<div class="yorha-interface">
  <!-- Sidebar -->
  <aside class="yorha-sidebar">
    <div class="yorha-logo">
      <div class="yorha-title">YORHA</div>
      <div class="yorha-subtitle">DETECTIVE</div>
      <div class="yorha-subtext">Investigation Interface</div>
    </div>
    <nav class="yorha-nav">
      <div class="nav-section">
        <a href="/yorha-command-center" class="nav-item">
          <span class="nav-icon">🛰️</span> COMMAND CENTER
        </a>
        <a href="/yorha/cases" class="nav-item">
          <span class="nav-text">ACTIVE CASES</span> <span class="nav-count">8</span>
        </a>
        <a href="/yorha/evidence" class="nav-item"> <span class="nav-icon">📁</span> EVIDENCE </a>
        <a href="/yorha/persons" class="nav-item">
          <span class="nav-icon">👥</span> PERSONS OF INTEREST
        </a>
        <a href="/yorha/analysis" class="nav-item analysis-active">
          <span class="nav-icon">🔎</span> ANALYSIS
        </a>
        <a href="/yorha/search" class="nav-item">
          <span class="nav-icon">🔎</span> GLOBAL SEARCH
        </a>
        <a href="/yorha/terminal" class="nav-item"> <span class="nav-icon">&gt;</span> TERMINAL </a>
      </div>
      <div class="nav-section">
        <a href="/yorha/config" class="nav-item">
          <span class="nav-icon">⚙️</span> SYSTEM CONFIG
        </a>
      </div>
    </nav>
    <div class="yorha-status">
      <div class="status-item">Online</div>
      <div class="status-time">{new Date().toLocaleTimeString()}</div>
      <div class="status-text">System: Operational</div>
    </div>
  </aside>
  <!-- Main, Content -->
  <main class="yorha-main">
    <!-- Header -->
    <header class="analysis-header">
      <div class="header-left">
        <button class="header-icon">ðŸ“Š</button>
        <h1 class="analysis-title">ANALYSIS</h1>
        <div class="analysis-subtitle">AI-Powered Investigation Intelligence</div>
      </div>
      <div class="header-right">
        <!-- use native button to avoid typed-prop conflicts with the Button component -->
        <div class="header-btn bits-btn">
          <button class="run-analysis-btn">
            <Brain class="w-4" /> RUN ANALYSIS
          </button>
        </div>
      </div>
    </header>
    <!-- Analysis, Dashboard -->
    <div class="analysis-dashboard">
      <!-- Top, Row - Key, Metrics -->
      <div class="metrics-row">
        <!-- Top metrics, card (Case: Metrics) -->
        <div class="metric-nier-bits-card">
          <!-- Card tag removed: keep inner markup; wrapper provides visual styling -->
          <div class="metric-header">
            <TrendingUp class="metric-icon" />
            <div>
              <h3 class="card-title">Case Metrics</h3>
              <p class="card-description">Investigati‍on Progress</p>
            </div>
          </div>
          <div class="metric-content">
            <div class="metric-grid">
              <div class="metric-item">
                <span class="metric-number">{analysisData.caseMetrics.total}</span>
                <span class="metric-label">Total Cases</span>
              </div>
              <div class="metric-item">
                <span class="metric-number active">{analysisData.caseMetrics.active}</span>
                <span class="metric-label">Active</span>
              </div>
              <div class="metric-item">
                <span class="metric-number">{analysisData.caseMetrics.success_rate}%</span>
                <span class="metric-label">Success Rate</span>
              </div>
            </div>
          </div>
          <!-- end metric content -->
        </div>

        <!-- Evidence, Analysis, card -->
        <div class="metric-nier-bits-card">
          <!-- Card removed -->
          <div class="metric-header">
            <Database class="metric-icon" />
            <div>
              <h3 class="card-title">Evidence Analysis</h3>
              <p class="card-description">Processing Status</p>
            </div>
          </div>
          <div class="metric-content">
            <div class="progress-section">
              <div class="progress-item">
                <span class="progress-label"
                  >Processed ({analysisData.evidenceAnalysis.processed}/{analysisData
                    .evidenceAnalysis.total_pieces})</span
                >
                <Progress
                  value={(analysisData.evidenceAnalysis.processed /
                    analysisData.evidenceAnalysis.total_pieces) *
                    100}
                  class="progress-bar"
                />
              </div>
              <div class="progress-item">
                <span class="progress-label"
                  >AI Analyzed ({analysisData.evidenceAnalysis.ai_analyzed})</span
                >
                <Progress
                  value={(analysisData.evidenceAnalysis.ai_analyzed /
                    analysisData.evidenceAnalysis.total_pieces) *
                    100}
                  class="progress-bar"
                />
              </div>
            </div>
          </div>
          <!-- end evidence content -->
        </div>

        <!-- Threat, Assessment, card -->
        <div class="metric-nier-bits-card">
          <!-- Card removed -->
          <div class="metric-header">
            <!-- use AlertCircle instead of deprecated AlertTriangle -->
            <AlertCircle class="metric-icon" />
            <div>
              <h3 class="card-title">Threat Assessment</h3>
              <p class="card-description">Risk Analysis</p>
            </div>
          </div>
          <div class="metric-content">
            <div class="threat-grid">
              <div class="threat-item critical">
                <span class="threat-number">{analysisData.threatAssessment.critical}</span>
                <span class="threat-label">Critical</span>
              </div>
              <div class="threat-item high">
                <span class="threat-number">{analysisData.threatAssessment.high}</span>
                <span class="threat-label">High</span>
              </div>
              <div class="threat-item medium">
                <span class="threat-number">{analysisData.threatAssessment.medium}</span>
                <span class="threat-label">Medium</span>
              </div>
              <div class="threat-item low">
                <span class="threat-number">{analysisData.threatAssessment.low}</span>
                <span class="threat-label">Low</span>
              </div>
            </div>
          </div>
          <!-- end threat content -->
        </div>
      </div>
      <!-- AI, Performance, Panel -->
      <div class="ai-performance-nier-bits-card">
        <!-- Card removed -->
        <div class="nes-container">
          <div class="flex items-center gap-2">
            <Brain class="w-5" /> <span>AI PERFORMANCE METRICS</span>
          </div>
        </div>
        <div class="ai-performance-content">
          <div class="performance-metrics">
            <div class="performance-item">
              <div class="performance-label">Accuracy</div>
              <div class="performance-value">{analysisData.aiPerformance.accuracy}%</div>
              <Progress value={analysisData.aiPerformance.accuracy} class="performance-progress" />
            </div>
            <div class="performance-item">
              <div class="performance-label">Processing Speed</div>
              <div class="performance-value">
                {analysisData.aiPerformance.processing_speed}s avg
              </div>
              <Progress
                value={100 - analysisData.aiPerformance.processing_speed * 20}
                class="performance-progress"
              />
            </div>
            <div class="performance-item">
              <div class="performance-label">Confidence Score</div>
              <div class="performance-value">{analysisData.aiPerformance.confidence}%</div>
              <Progress
                value={analysisData.aiPerformance.confidence}
                class="performance-progress"
              />
            </div>
          </div>
          <div class="performance-footer">
            <Clock class="w-4" /> Last Updated: {analysisData.aiPerformance.last_update}
          </div>
        </div>
        <!-- end AI performance -->
      </div>

      <!-- Recent, Analyses -->
      <div class="recent-analyses-nier-bits-card">
        <!-- Card removed -->
        <div class="nes-container">
          <h3 class="card-title">RECENT ANALYSES</h3>
          <p class="card-description">Latest AI-powered investigations</p>
        </div>
        <div>
          <div class="analyses-content">
            <div class="analyses-list">
              {#each recentAnalyses as analysis (analysis.id)}
                <div class="analysis-item">
                  <div class="analysis-header">
                    <div class="analysis-basic-info">
                      <span class="analysis-id">{analysis.id}</span>
                      <span class="analysis-case">{analysis.case_id}</span>
                      <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300"
                        >{analysis.type}</span
                      >
                    </div>
                    <div class="analysis-status">
                      {#if analysis.status === 'completed'}
                        <span class="px-2 py-1 rounded text-xs font-medium bg-green-600"
                          >COMPLETED</span
                        >
                        <span class="confidence-score">{analysis.confidence}% confidence</span>
                      {:else if analysis.status === 'processing'}
                        <span class="px-2 py-1 rounded text-xs font-medium bg-blue-600"
                          >PROCESSING</span
                        >
                        <Activity class="w-4 h-4" />
                      {:else}
                        <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200"
                          >{analysis.status.toUpperCase()}</span
                        >
                      {/if}
                    </div>
                  </div>
                  <div class="analysis-findings">{analysis.findings}</div>
                  <div class="analysis-footer">
                    <span class="analysis-timestamp">{analysis.timestamp}</span>
                    <div class="bits-btn">
                      <button class="view-details-btn">View Details</button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
        <!-- end recent analyses -->
      </div>
    </div>
  </main>
</div>

<style>
  .yorha-interface {
    display: flex;
    height: 100vh;
    background: #2a2a2a;
    color: #d4af37;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 12px;
    overflow: hidden;
  }
  .yorha-sidebar {
    width: 200px;
    background: #1a1a1a;
    border-right: 1px solid #3a3a3a;
    display: flex;
    flex-direction: column;
  }
  .yorha-logo {
    padding: 20px 15px;
    border-bottom: 1px solid #3a3a3a;
  }
  .yorha-title,
  .yorha-subtitle {
    font-size: 18px;
    font-weight: bold;
    color: #d4af37;
    line-height: 1;
  }
  .yorha-subtext {
    font-size: 10px;
    color: #888;
    margin-top: 5px;
  }
  .yorha-nav {
    flex: 1;
    padding: 15px 15px; /* Changed from 15px 0; to provide consistent horizontal padding for the nav container */;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .nav-section {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav-item {
    display: flex;
    align-items: center;
    padding: 8px 0; /* Removed horizontal padding from item itself */;
    padding-left: 15px; /* Added explicit left padding for content alignment */;
    background: none;
    border: none;
    color: #888;
    text-decoration: none;
    text-align: left;
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
    justify-content: space-between;
  }
  .nav-item:hover {
    background: #2a2a2a;
    color: #d4af37;
  }
  .nav-item.analysis-active {
    background: #1a2a1a;
    color: #d4af37;
    border-left: 3px solid #d4af37;
    padding-left: 12px; /* Adjust padding to account for 3px border, maintaining 15px content alignment */
  }
  .nav-icon {
    margin-right: 8px;
  }
  .nav-count {
    font-size: 10px;
    background: #d4af37;
    color: #000;
    padding: 1px 6px;
    border-radius: 2px;
  }
  .yorha-status {
    padding: 15px;
    border-top: 1px solid #3a3a3a;
    font-size: 10px;
    color: #666;
  }
  .status-item {
    color: #d4af37;
  }
  .yorha-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #2a2a2a;
    overflow: hidden;
  }
  .analysis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #3a3a3a;
    background: #2a2a2a;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  .header-icon {
    background: none;
    border: 1px solid #555;
    color: #d4af37;
    padding: 6px 8px;
    font-family: inherit;
    cursor: pointer;
  }
  .analysis-title {
    font-size: 24px;
    font-weight: bold;
    color: #d4af37;
    margin: 0;
  }
  .analysis-subtitle {
    font-size: 12px;
    color: #888;
  }
  .analysis-dashboard {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .metrics-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  :global(.metric-nier-bits-card) {
    background: #1a1a1a !important;
    border: 1px solid #3a3a3a !important;
    color: #d4af37 !important;
  }
  :global(.metric-header) {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  :global(.metric-icon) {
    color: #d4af37;
    width: 20px;
    height: 20px;
  }
  :global(.metric-content) {
    padding-top: 10px;
  }
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
  }
  .metric-item {
    text-align: center;
  }
  .metric-number {
    display: block;
    font-size: 18px;
    font-weight: bold;
    color: #d4af37;
    margin-bottom: 4px;
  }
  .metric-number.active {
    color: #4ade80;
  }
  .metric-label {
    font-size: 10px;
    color: #888;
  }
  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  .progress-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .progress-label {
    font-size: 11px;
    color: #ccc;
  }
  .threat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .threat-item {
    text-align: center;
    padding: 8px;
    border: 1px solid #555;
    border-radius: 4px;
  }
  .threat-number {
    display: block;
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 4px;
  }
  .threat-label {
    font-size: 10px;
  }
  .threat-item.critical .threat-number {
    color: #ef4444;
  }
  .threat-item.high .threat-number {
    color: #f97316;
  }
  .threat-item.medium .threat-number {
    color: #fbbf24;
  }
  .threat-item.low .threat-number {
    color: #4ade80;
  }
  :global(.ai-performance-nier-bits-card),
  :global(.recent-analyses-nier-bits-card) {
    background: #1a1a1a !important;
    border: 1px solid #3a3a3a !important;
    color: #d4af37 !important;
  }
  :global(.ai-performance-content) {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  .analyses-content {
    max-height: 400px;
    overflow-y: auto;
  }
  .performance-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .performance-item {
    text-align: center;
  }
  .performance-label {
    font-size: 11px;
    color: #888;
    margin-bottom: 5px;
  }
  .performance-value {
    font-size: 16px;
    font-weight: bold;
    color: #d4af37;
    margin-bottom: 8px;
  }
  .performance-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 10px;
    color: #666;
    padding-top: 15px;
    border-top: 1px solid #3a3a3a;
  }
  .analyses-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  .analysis-item {
    padding: 15px;
    border: 1px solid #3a3a3a;
    border-radius: 6px;
    background: #2a2a2a;
  }
  .analysis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .analysis-basic-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .analysis-id {
    font-size: 10px;
    color: #666;
    font-family: 'JetBrains Mono', monospace;
  }
  .analysis-case {
    font-size: 11px;
    color: #d4af37;
    font-weight: bold;
  }
  .analysis-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .confidence-score {
    font-size: 10px;
    color: #4ade80;
  }
  .analysis-findings {
    font-size: 12px;
    color: #ccc;
    margin: 10px 0;
    line-height: 1.4;
  }
  .analysis-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
  }
  .analysis-timestamp {
    font-size: 10px;
    color: #666;
  }
</style>
