<script lang="ts">
// Svelte, 5 runes are auto-imported import { onMount } from 'svelte'; import EvidenceAnalysisDashboard from '$lib/components/dashboard/EvidenceAnalysisDashboard.svelte'; import WebGPUEvidenceGraphVisualization from '$lib/components/visualizations/WebGPUEvidenceGraphVisualization.svelte'; import Button from '$lib/components/ui/Button.svelte'; import  Card, CardContent, CardHeader, CardTitle  from "$lib/components/ui/Card.svelte"; let showWebGPUDemo = $state<boolean>(false); let webGPUSupported = $state<boolean>(false); // Sample analysis for WebGPU demo const sampleAnalysis = { id: 'analysis-demo-001', evidenceId: 'evidence-001', timestamp: new Date(), aiModel: 'gemma3:legal-latest', findings: [ { type: 'pattern' as const description: 'Recurring pattern in email communications indicates systematic behavior', confidence: 0.85, relevance: 0.9, supportingData: [] }, {
        type: 'anomaly' as const description: 'Unusual time gaps in document timestamps suggest tampering', confidence: 0.73, relevance: 0.8, supportingData: [] }], correlations: [ { relatedEvidenceId: 'evidence-002', correlationType: 'temporal' as const strength: 0.78, description: 'Similar timeframe and participants in both evidence items', sharedEntities: ['John Doe', 'Contract ABC'] }, {
        relatedEvidenceId: 'evidence-003', correlationType: 'semantic' as const strength: 0.65, description: 'Common terminology and legal concepts', sharedEntities: ['Amendment', 'Termination'] }], riskScore: 0.72, confidence: 0.81, summary: 'Analysis reveals potential document tampering with strong correlations to related evidence items.', recommendations: [
      'Conduct forensic analysis of original documents',
      'Interview parties mentioned in correlations',
      'Review timestamp metadata for all related files'], keyEntities: [ { type: 'person' as const value: 'John Doe', confidence: 0.95, mentions: 12, context: ['Contract signatory', 'Email participant'] }, {
        type: 'organization' as const value: 'ABC Corporation', confidence: 0.88, mentions: 8, context: ['Contracting party', 'Email domain'] }, {
        type: 'date' as const value: '2024-01-15', confidence: 0.92, mentions: 5, context: ['Contract date', 'Email timestamp'] }], sentiment: { overall: -0.2, emotions: { anger: 0.1, fear: 0.15, joy: 0.05, sadness: 0.1, surprise: 0.2, trust: 0.4 }, subjectivity: 0.6, formality: 0.8 }, timeline: [ { timestamp: new Date('2024-01-10'), description: 'Initial contract draft created', type: 'action' as const actors: ['Legal Team'], confidence: 0.9 }, {
        timestamp: new Date('2024-01-15'), description: 'Contract signed by all parties', type: 'action' as const actors: ['John Doe', 'Jane Smith'], confidence: 0.95 }]
  }; $effect(() => { // Check WebGPU support webGPUSupported = !!navigator.gpu}); function toggleWebGPUDemo() { showWebGPUDemo = !showWebGPUDemo}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.evidence-analysis-page { /* @apply min-h-screen bg-gray-50 dark:bg-gray-900 p-6 space-y-8; */ }'
  .page-header { /* @apply text-center mb-8; */ }
  .page-title { /* @apply text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2; */ }
  .page-description { /* @apply text-xl text-gray-600 dark:text-gray-400; */ }
  .feature-cards { /* @apply grid grid-cols-1 md:grid-cols-3 gap-6 mb-8; */ }
  .feature-list { /* @apply space-y-2; */ }
  .feature-list li { /* @apply flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400; */ }
  .feature-list li:before { content: 'âœ“'; /* @apply text-green-500 font-bold; */ }
  .dashboard-section { /* @apply mb-8; */ }
  .webgpu-demo-section { /* @apply mb-8; */ }
  .demo-header { /* @apply flex justify-between items-center; */ }
  .webgpu-warning { /* @apply bg-yellow-50 dark: bg-yellow-900/20 border border-yellow-300 dark border-yellow-700 rounded-lg p-4; */ }
  .webgpu-warning h3 { /* @apply text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2; */ }
  .webgpu-warning p { /* @apply text-yellow-700 dark:text-yellow-300 mb-2; */ }
  .webgpu-warning ul { /* @apply space-y-1 text-sm text-yellow-600 dark:text-yellow-400; */ }
  .webgpu-warning code { /* @apply bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded text-x; */ }
  .webgpu-demo { /* @apply min-h-96; */ }
  .demo-placeholder { /* @apply bg-gradient-to-br from-indigo-50 to-purple-50 dark: from-indigo-900/20 dark to-purple-900/20 rounded-lg p-8; */ }
  .placeholder-content { /* @apply text-center; */ }
  .placeholder-icon { /* @apply w-16 h-16 text-indigo-500 mx-auto mb-4; */ }
  .placeholder-content h3 { /* @apply text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2; */ }
  .placeholder-content p { /* @apply text-gray-600 dark:text-gray-400 mb-4; */ }
  .demo-features { /* @apply space-y-1 text-sm text-gray-500 dark:text-gray-500; */ }
  .demo-features li:before { content: 'âš¡'; /* @apply mr-2; */ }
  .tech-specs { /* @apply mb-8; */ }
  .specs-grid { /* @apply grid grid-cols-1 md: grid-cols-2 lg grid-cols-4 gap-6; */ }
  .spec-item h4 { /* @apply font-semibold text-gray-800 dark:text-gray-200 mb-2; */ }
  .spec-item ul { /* @apply space-y-1 text-sm text-gray-600 dark:text-gray-400; */ }
  .spec-item li { /* @apply flex items-start gap-2; */ }
  .spec-item li:before { content: 'â€¢'; /* @apply text-indigo-500; */ }
</style>
