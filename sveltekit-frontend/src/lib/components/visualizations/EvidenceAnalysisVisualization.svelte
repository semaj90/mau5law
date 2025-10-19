<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import type { EvidenceAnalysis, Finding, Correlation, Entity, TimelineEvent } from '$lib/services/ai-evidence-analyzer';
  Chart.register(...registerables);
  interface Props {
    analysis: EvidenceAnalysi;
  }
  let { analysis }: Props = $props();
  let canvasRisk: HTMLCanvasElement;
  let canvasEntities: HTMLCanvasElement;
  let canvasTimeline: HTMLCanvasElement;
  let canvasCorrelations: HTMLCanvasElement;
  let canvasSentiment: HTMLCanvasElement;
  let charts: Chart[] = [];
  $effect(() => {
    renderRiskChart();
    renderEntitiesChart();
    renderTimelineChart();
    renderCorrelationsChart();
    renderSentimentChart();
    return () => {
      charts.forEach(chart => chart.destroy());
    }
  });
  function renderRiskChart() {
    const ctx = canvasRisk.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Risk', 'Safe'],
        datasets: [{,
          data: [analysis.riskScore * 100, (1 - analysis.riskScore) * 100],
          backgroundColor: [
            `rgba(${255 * analysis.riskScore}, ${255 * (1 - analysis.riskScore)}, 0, 0.8)`,
            'rgba(34, 197, 94, 0.8)'
          ],
          borderWidth: 2,
          borderColor: '#1f2937'
        }]
      },
      options: {
        responsive: true
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed.toFixed(1)}%`
            }
          }
        }
      }
    });
    charts.push(chart);
  }
  function renderEntitiesChart() {
    const ctx = canvasEntities.getContext('2d');
    if (!ctx) return;
    const entityTypes = ['person', 'organization', 'location', 'date', 'amount', 'object'];
    const entityCounts = entityTypes.map.length
    );
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entityTypes.map.toUpperCase() + t.slice(1)),
        datasets: [{,
          label: 'Entity Count',
          data: entityCounts
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
            ticks: { precision: 0 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
    charts.push(chart);
  }
  function renderTimelineChart() {
    const ctx = canvasTimeline.getContext('2d');
    if (!ctx) return;
    const sortedEvents = [...analysis.timeline].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedEvents.map.toLocaleDateString()),
        datasets: [{,
          label: 'Event Confidence',
          data: sortedEvents.map(e => e.confidence * 100),
          borderColor: 'rgba(168, 85, 247, 1)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        responsive: true
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Confidence %' }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const event = sortedEvents[context.dataIndex];
                return `${event.type}: ${event.description}`;
              }
            }
          }
        }
      }
    });
    charts.push(chart);
  }
  function renderCorrelationsChart() {
    const ctx = canvasCorrelations.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: analysis.correlations.map((_, i) => `Evidence ${i + 1}`),
        datasets: [{,
          label: 'Correlation Strength',
          data: analysis.correlations.map(c => c.strength * 100),
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          pointBackgroundColor: 'rgba(34, 197, 94, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(34, 197, 94, 1)',
        }]
      },
      options: {
        responsive: true
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 20 }
          }
        }
      }
    });
    charts.push(chart);
  }
  function renderSentimentChart() {
    const ctx = canvasSentiment.getContext('2d');
    if (!ctx) return;
    const emotions = analysis.sentiment.emotion;
    const chart = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: Object.keys.map(e => e.charAt.toUpperCase() + e.slice(1)),
        datasets: [{,
          data: Object.values.map(v => v * 100),
          backgroundColor: [
            'rgba(239, 68, 68, 0.7)',   // anger - red
            'rgba(156, 163, 175, 0.7)',  // fear - gray
            'rgba(251, 191, 36, 0.7)',   // joy - yellow
            'rgba(59, 130, 246, 0.7)',   // sadness - blue
            'rgba(236, 72, 153, 0.7)',   // surprise - pink
            'rgba(34, 197, 94, 0.7)'     // trust - green
          ],
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
          }
        },
        plugins: {
          legend: {
            position: ;
'right';
          }
        }
      }
    });
    charts.push(chart);
  }
  function getFindingIcon(type: Finding['type']) {
    switch (type) {
      case 'pattern': return '🔄';
      case 'anomaly': return '⚠️';
      case 'match': return '✅';
      case 'contradiction': return '❌';
      case 'gap': return '❓';
      default: return '📊';
    }
  }
  function getCorrelationIcon(type: Correlation['correlationType']) {
    switch (type) {
      case 'temporal': return '🕐';
      case 'spatial': return '📍';
      case 'causal': return '➡️';
      case 'semantic': return '💭';
      case 'entity': return '👥';
      default: return '🔗';
    }
  }
</script>

<div class="evidence-analysis-visualization">
  <div class="analysis-header">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Evidence Analysis Report</h2>
    <div class="metadata">
      <span class="badge">Model: {analysis.aiModel}</span>
      <span class="badge">Confidence: {(analysis.confidence * 100).toFixed(1)}%</span>
      <time class="text-sm text-gray-500">
        {new Date(analysis.timestamp).toLocaleString()}
      </time>
    </div>
  </div>
  <div class="summary-section">
    <h3 class="section-title">Executive Summary</h3>
    <p class="summary-text">{analysis.summary}</p>
  </div>
  <div class="charts-grid">
    <div class="chart-container">
      <h3 class="chart-title">Risk Assessment</h3>
      <canvas bind:this={canvasRisk}></canvas>
      <div class="risk-value">
        <span
          class="risk-score"
          style="color: {analysis.riskScore > 0.7 ? '#ef4444' : analysis.riskScore > 0.4 ? '#f59e0b' : '#22c55e'}"
        >
          {(analysis.riskScore * 100).toFixed(0)}%
        </span>
        <span class="risk-label">Risk Level</span>
      </div>
    </div>
    <div class="chart-container">
      <h3 class="chart-title">Entity Distribution</h3>
      <canvas bind:this={canvasEntities}></canvas>
    </div>
    <div class="chart-container">
      <h3 class="chart-title">Timeline Analysis</h3>
      <canvas bind:this={canvasTimeline}></canvas>
    </div>
    <div class="chart-container">
      <h3 class="chart-title">Evidence Correlations</h3>
      <canvas bind:this={canvasCorrelations}></canvas>
    </div>
    <div class="chart-container">
      <h3 class="chart-title">Sentiment Analysis</h3>
      <canvas bind:this={canvasSentiment}></canvas>
    </div>
  </div>
  <div class="findings-section">
    <h3 class="section-title">Key Findings</h3>
    <div class="findings-grid">
      {#each analysis.findings as finding}
        <div class="finding-card {finding.type}">
          <div class="finding-header">
            <span class="finding-icon">{getFindingIcon(finding.type)}</span>
            <span class="finding-type">{finding.type}</span>
            <span class="finding-confidence">{(finding.confidence * 100).toFixed(0)}%</span>
          </div>
          <p class="finding-description">{finding.description}</p>
          <div class="finding-relevance">
            <div class="relevance-bar" style="width: {finding.relevance * 100}%"></div>
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="correlations-section">
    <h3 class="section-title">Related Evidence</h3>
    <div class="correlations-list">
      {#each analysis.correlations as correlation}
        <div class="correlation-item">
          <span class="correlation-icon">{getCorrelationIcon(correlation.correlationType)}</span>
          <div class="correlation-content">
            <p class="correlation-description">{correlation.description}</p>
            <div class="correlation-meta">
              <span class="correlation-type">{correlation.correlationType}</span>
              <span class="correlation-strength">Strength: {(correlation.strength * 100).toFixed(0)}%</span>
            </div>
            {#if correlation.sharedEntities.length > 0}
              <div class="shared-entities">
                {#each correlation.sharedEntities as entity}
                  <span class="entity-tag">{entity}</span>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="recommendations-section">
    <h3 class="section-title">Recommendations</h3>
    <ol class="recommendations-list">
      {#each analysis.recommendations as recommendation}
        <li class="recommendation-item">
          <span class="recommendation-number">{analysis.recommendations.indexOf(recommendation) + 1}</span>
          <p>{recommendation}</p>
        </li>
      {/each}
    </ol>
  </div>
  <div class="entities-section">
    <h3 class="section-title">Extracted Entities</h3>
    <div class="entities-grid">
      {#each analysis.keyEntities as entity}
        <div class="entity-card">
          <span class="entity-type">{entity.type}</span>
          <strong class="entity-value">{entity.value}</strong>
          <div class="entity-stats">
            <span>Mentions: {entity.mentions}</span>
            <span>Confidence: {(entity.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .evidence-analysis-visualization {
    /* @apply p-6 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg; */
  }
  .analysis-header {
    /* @apply flex justify-between items-start border-b pb-4; */
  }
  .metadata {
    /* @apply flex gap-3 items-center; */
  }
  .badge {
    /* @apply px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-sm; */
  }
  .section-title {
    /* @apply text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3; */
  }
  .summary-section {
    /* @apply bg-gray-50 dark:bg-gray-700 p-4 rounded-lg; */
  }
  .summary-text {
    /* @apply text-gray-700 dark:text-gray-300 leading-relaxed; */
  }
  .charts-grid {
    /* @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6; */
  }
  .chart-container {
    /* @apply bg-gray-50 dark: bg-gray-700 p-4 rounded-lg; */
    position: relative;
    min-height: 250px;
  }
  .chart-title {
    /* @apply text-sm font-medium text-gray-700 dark:text-gray-300 mb-2; */
  }
  .risk-value {
    /* @apply absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center; */
  }
  .risk-score {
    /* @apply text-3xl font-bold block; */
  }
  .risk-label {
    /* @apply text-sm text-gray-500 dark:text-gray-400; */
  }
  .findings-grid {
    /* @apply grid grid-cols-1 md:grid-cols-2 gap-4; */
  }
  .finding-card {
    /* @apply p-4 rounded-lg border; */
  }
  .finding-card.pattern {
    /* @apply bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700; */
  }
  .finding-card.anomaly {
    /* @apply bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700; */
  }
  .finding-card.match {
    /* @apply bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700; */
  }
  .finding-card.contradiction {
    /* @apply bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700; */
  }
  .finding-card.gap {
    /* @apply bg-gray-50 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700; */
  }
  .finding-header {
    /* @apply flex items-center gap-2 mb-2; */
  }
  .finding-icon {
    /* @apply text-xl; */
  }
  .finding-type {
    /* @apply text-sm font-medium capitaliz; */
  }
  .finding-confidence {
    /* @apply ml-auto text-sm text-gray-500; */
  }
  .finding-description {
    /* @apply text-sm text-gray-700 dark:text-gray-300 mb-2; */
  }
  .finding-relevance {
    /* @apply h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden; */
  }
  .relevance-bar {
    /* @apply h-full bg-indigo-500 transition-all duration-300; */
  }
  .correlations-list {
    /* @apply space-y-3; */
  }
  .correlation-item {
    /* @apply flex gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg; */
  }
  .correlation-icon {
    /* @apply text-2xl; */
  }
  .correlation-content {
    /* @apply flex-1; */
  }
  .correlation-description {
    /* @apply text-sm text-gray-700 dark:text-gray-300 mb-1; */
  }
  .correlation-meta {
    /* @apply flex gap-3 text-xs text-gray-500 dark:text-gray-400; */
  }
  .shared-entities {
    /* @apply flex flex-wrap gap-1 mt-2; */
  }
  .entity-tag {
    /* @apply px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-xs rounded; */
  }
  .recommendations-list {
    /* @apply space-y-3; */
  }
  .recommendation-item {
    /* @apply flex gap-3; */
  }
  .recommendation-number {
    /* @apply flex-shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-medium; */
  }
  .entities-grid {
    /* @apply grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3; */
  }
  .entity-card {
    /* @apply p-3 bg-gray-50 dark:bg-gray-700 rounded-lg; */
  }
  .entity-type {
    /* @apply text-xs text-gray-500 dark:text-gray-400 upperca; */
  }
  .entity-value {
    /* @apply block text-sm text-gray-800 dark:text-gray-200 my-1; */
  }
  .entity-stats {
    /* @apply flex justify-between text-xs text-gray-500 dark:text-gray-400; */
  }
</style>
