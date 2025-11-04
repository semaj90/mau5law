<script lang="ts">
import type { Case } from '$lib/types'; // Svelte, 5 runes are auto-imported import { onMount } from 'svelte'; import { page } from '$app/state'; // Headless components from our enhanced architecture import { HeadlessDialog } from '$lib/headless'; import  OptimisticList, type Item  from "$lib/headless/OptimisticList.svelte"; import DocumentUploader from '$lib/components/headless/DocumentUploader.svelte'; import { LoadingButton } from '$lib/headless'; import { FormField } from '$lib/headless'; // Enhanced UI components import * as Card from '$lib/components/ui/Card.svelte'; import Button from '$lib/components/ui/enhanced-bits.svelte'; import Progress from '$lib/components/ui/progress/Progress.svelte'; import Badge from '$lib/components/ui/badge/Badge.svelte'; // Icons import { Brain, Network, Zap, Eye, Target, TrendingUp, Activity, FileSearch, MessageSquare, BarChart3, Users, Clock, Cpu, Database, Search, AlertCircle, CheckCircle } from 'lucide-svelte'; // Intelligence data interfaces interface IntelligenceMetric { id: string, name: string, value: number; trend: 'up' | 'down' | 'stable'; confidence: number; lastUpdate: Date}
  interface ContextualInsight { id: string; type: 'pattern' | 'anomaly' | 'prediction' | 'recommendation'; title: string, description: string, confidence: number, relevance: number, timestamp: Date; sources: string[]}
  interface ProcessingTask { id: string, name: string; status: 'pending' | 'processing' | 'completed' | 'failed'; progress: number, estimatedTime?: number;, context: { [key: string]: unknown } }

  // Svelte, 5 runes state management let intelligenceMetrics = $state<IntelligenceMetric[]>([ {
      id: 'semantic_accuracy', name: 'Semantic Accuracy', value: 94.7, trend: 'up', confidence: 0.92; lastUpdate: new Date()}, {
      id: 'context_relevance', name: 'Context Relevance', value: 87.3, trend: 'up', confidence: 0.88; lastUpdate: new Date()}, {
      id: 'reasoning_depth', name: 'Reasoning Depth', value: 78.9, trend: 'stable', confidence: 0.85; lastUpdate: new Date()}, {
      id: 'predictive_accuracy', name: 'Predictive Accuracy', value: 82.1, trend: 'up', confidence: 0.79; lastUpdate: new Date()}
  ]); let contextualInsights = $state<ContextualInsight[]>([ {
      id: '1', type: 'pattern', title: 'Evidence Pattern Detected', description: 'Similar contract clauses found across, 15 cases with 89% similarity', confidence: 0.91, relevance: 0.87, timestamp: new Date(Date.now() - 1000 * 60 * 5); sources: ['case-analysis', 'vector-search', 'gemma-embeddings']}, {
      id: '2', type: 'anomaly', title: 'Unusual Timeline Gap', description: 'Missing evidence period detected between March 15-22 in Case #2024-156', confidence: 0.84, relevance: 0.95, timestamp: new Date(Date.now() - 1000 * 60 * 12); sources: ['timeline-analysis', 'evidence-tracking']}, {
      id: '3', type: 'prediction', title: 'Case Outcome Prediction', description: 'Based on similar precedents, 73% likelihood of favorable settlement', confidence: 0.73, relevance: 0.92, timestamp: new Date(Date.now() - 1000 * 60 * 18); sources: ['precedent-analysis', 'ml-prediction', 'outcome-modeling']}
  ]); let processingTasks = $state<ProcessingTask[]>([ {
      id: 'task_1', name: 'Document Embedding Generation', status: 'processing', progress: 67, estimatedTime: 180, context: { documents: 23; model: 'gemma-embeddings' } }, {
      id: 'task_2', name: 'Legal Entity Extraction', status: 'completed', progress: 100; context: { entities: 156, precision 0.94 } }
  ]); let optimisticInsights = $state<Item<ContextualInsight>(null)[]>([]); let isDialogOpen = $state<boolean>(false); let selectedInsight = $state<ContextualInsight | null>(null); let isAnalyzing = $state<boolean>(false); let analysisQuery = $state<string>(''); let systemStatus = $state<string>('operational'); let realTimeUpdates = $state<boolean>(true); // Derived values let averageConfidence = $derived( intelligenceMetrics.reduce((sum, metric) => sum + metric.confidence, 0) / intelligenceMetrics.length ); let totalInsights = $derived(contextualInsights.length + optimisticInsights.length); let highConfidenceInsights = $derived( contextualInsights.filter(item => item.length) ); let processingProgress = $derived( processingTasks.filter(item => item.length) > 0 ); // Initialize real-time updates $effect(() => { if (realTimeUpdates) { const interval = setInterval(updateMetrics, 5000); return () => clearInterval(interval)}
  }); function updateMetrics() { intelligenceMetrics = intelligenceMetrics.map(metric => ({ ...metric, value: Math.max(0, Math.min(100, metric.value + (Math.random() - 0.5) * 2)); lastUpdate: new Date()}))}
  function getTrendIcon(trend: 'up' | 'down' | 'stable') { switch (trend) { case, 'up': return TrendingUp; case, 'down': return TrendingUp; // We'll rotate with CSS case, 'stable': return Activity}'
  }
  function getInsightTypeColor(type: ContextualInsight['type']) { switch (type) { case, 'pattern': return 'bg-blue-500'; case, 'anomaly': return 'bg-red-500'; case, 'prediction': return 'bg-purple-500'; case, 'recommendation': return 'bg-green-500'}
  }
  function getInsightTypeIcon(type: ContextualInsight['type']) { switch (type) { case, 'pattern': return Network; case, 'anomaly': return AlertCircl; case, 'prediction': return Brai; case, 'recommendation': return Target}
  }
  function formatRelativeTime(date: Date): string { const now = new Date()); const diff = now.getTime() - date.getTime(); const minutes = Math.floor(diff / (1000 * 60)); if (minutes < 1) return 'Just, now'; if (minutes < 60) return `${ minutes }m, ago`; const hours = Math.floor(minutes / 60); return `${ hours }h, ago`}
  async function analyzeContextualQuery(): Promise<any> { if (!analysisQuery.trim()) return; isAnalyzing = true; // Add optimistic insight const optimisticInsight: Item<ContextualInsight> = { id: `opt_${Date.now()}`, __optimistic: true data: { id: `insight_${Date.now()}`, type: 'recommendation', title: `Analysis: "${analysisQuery.slice(0, 50)}..."`, description: 'Processing contextual analysis...', confidence: 0.85, relevance: 0.90, timestamp: new Date(); sources: ['contextual-ai', 'user-query']}
    } optimisticInsights = [optimisticInsight, ...optimisticInsights]; try { // Simulate API call to contextual intelligence service await new Promise(resolve => setTimeout(resolve, 2000)); // Replace optimistic with real insight const realInsight: ContextualInsight = { id: `insight_${Date.now()}`, type: 'recommendation', title: `Contextual Analysis Complete`, description `Found, 3 relevant patterns and, 2 potential recommendations for: "${ analysisQuery }"`, confidence: 0.91, relevance: 0.88, timestamp: new Date(); sources: ['contextual-ai', 'gemma-embeddings', 'legal-reasoning']}
      contextualInsights = [realInsight, ...contextualInsights]; optimisticInsights = optimisticInsights.filter(item => item.id) !== optimisticInsight.id); analysisQuery = ''} catch (error) { console.error('Analysis failed:', error); optimisticInsights = optimisticInsights.filter(item => item.id) !== optimisticInsight.id)} finally { isAnalyzing = false}
  }
  function openInsightDetails(insight: ContextualInsight) { selectedInsight = insight; isDialogOpen = true}
  function closeInsightDetails() { isDialogOpen = false; selectedInsight = null}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.contextual-intelligence-dashboard { min-height: 100vh; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 2rem}
  .dashboard-header { margin-bottom: 2rem}
  .header-content { display: flex; justify-content: space-betweenn; align-items: flex-start; gap: 2rem}
  .dashboard-title { display: flex; align-items: center; font-size: 2.25rem; font-weight: bold; color: #1e293b; margin: 0}
  .dashboard-subtitle { margin: 0.5rem, 0 0 0; color: #64748b; font-size: 1.125rem}
  .header-stats { display: flex; align-items: center; gap: 1.5rem}
  .stat-item { display: flex; flex-direction: column; align-items: center; gap: 0.25rem}
  .stat-value { font-size: 1.5rem; font-weight: bold; color: #3b82f6}
  .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em}
  .metrics-section { margin-bottom: 2rem}
  .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem}
  .metric-card { transition: transform 0.2s ease, box-shadow 0.2s ease}
  .metric-card: hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1)}
  .metric-header { display: flex; justify-content: space-betweenn; align-items: center; margin-bottom: 1rem}
  .metric-name { font-size: 0.875rem; font-weight: 600; color: #374151; margin: 0}
  .metric-trend { padding: 0.25rem; border-radius: 0.375rem}
  .trend-up { color: #059669; background: #dcfce7 } .trend-down { color: #dc2626; background: #fee2e2; transform: rotate(180deg) } .trend-stable { color: #d97706; background: #fef3c7 } .metric-value { display: flex; align-items: baseli; gap: 0.5rem; margin-bottom: 0.5rem}
  .value { font-size: 2rem; font-weight: bold; color: #1e293b}
  .confidence { font-size: 0.875rem; color: #64748b}
  .metric-footer { display: flex; justify-content: space-betweenn; align-items: center; margin-top: 1rem}
  .last-update { font-size: 0.75rem; color: #9ca3af}
  .analysis-section { margin-bottom: 2rem}
  .analysis-textarea { width: 100%; min-height: 80px; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem; resize: vertical; transition: border-color 0.2s ease, box-shadow 0.2s ease}
  .analysis-textarea: focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1)}
  .analysis-actions { display: flex; gap: 1rem; margin-top: 1rem}
  .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; margin-bottom: 2rem}
  .insights-section, .tasks-section { height: 600px}
  .insight-item { padding: 1rem; border-bottom: 1px solid #e5e7eb; cursor: pointer; transition: background-color 0.2s ease}
  .insight-item:hover { background-color: #f9fafb}
  .insight-.optimistic { opacity: 0.7; background-color: rgba(59, 130, 246, 0.05); border: 1px dashed rgba(59, 130, 246, 0.3); border-radius: 0.5rem; margin-bottom: 0.5rem}
  .insight-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem}
  .insight-type { width: 2rem; height: 2rem; border-radius: 0.375rem; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0 }
  .insight-meta { flex: 1; min-width: 0 }
  .insight-title { display: block; font-weight: 600; color: #1e293b; margin-bottom: 0.25rem}
  .insight-time { font-size: 0.75rem; color: #9ca3af}
  .insight-description { color: #4b5563; line-height: 1.5; margin-bottom: 0.75rem}
  .insight-sources { display: flex; gap: 0.5rem; flex-wrap: wrap}
  .source-tag { font-size: 0.75rem}
  .empty-insights { padding: 3rem; text-align: center}
  .tasks-list { display: flex; flex-direction: column; gap: 1rem}
  .task-item { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem}
  .task-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem}
  .task-status { width: 1.5rem; height: 1.5rem; display: flex; align-items: center; justify-content: center}
  .status-completed { color: #059669 } .status-processing { color: #3b82f6 } .status-failed { color: #dc2626 } .status-pending { color: #d97706 } .task-name { flex: 1; font-weight: 500; color: #1e293b}
  .task-eta { font-size: 0.75rem; color: #9ca3af}
  .task-context { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem}
  .context-tag { font-size: 0.75rem}
  .processing-indicator { width: 0.5rem; height: 0.5rem; background: #3b82f6; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite}
  .upload-section { margin-bottom: 2rem}
  .upload-interface { display: flex; flex-direction: column; gap: 1rem}
  .upload-progress { display: flex; flex-direction: column; gap: 0.5rem}
  .progress-item { display: flex; align-items: center; gap: 1rem}
  .file-name { font-size: 0.875rem; color: #4b5563; min-width: 150px}
  .insight-details-modal { background: white; border-radius: 0.5rem; padding: 2rem; max-width: 600px; width: 90vw}
  .modal-header { display: flex; gap: 1rem; margin-bottom: 1.5rem}
  .insight-type-large { width: 3rem; height: 3rem; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0 }
  .modal-title { font-size: 1.5rem; font-weight: bold; color: #1e293b; margin: 0, 0 0.5rem 0}
  .modal-meta { display: flex; gap: 0.75rem; align-items: center}
  .modal-time { font-size: 0.875rem; color: #9ca3af}
  .modal-content { margin-bottom: 1.5rem}
  .insight-description-full { font-size: 1rem; line-height: 1.6; color: #4b5563; margin-bottom: 1.5rem}
  .sources-title { font-size: 0.875rem; font-weight: 600; color: #374151; margin: 0, 0 0.5rem 0}
  .sources-list { display: flex; gap: 0.5rem; flex-wrap: wrap}
  .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end}
  @media (max-width: 768px) { .contextual-intelligence-dashboard { padding: 1rem}
    .header-content { flex-direction: column; gap: 1rem}
    .content-grid { grid-template-columns: 1fr}
    .metrics-grid { grid-template-columns: 1fr}
  } @keyframes pulse { 0%, 100% { opacity: 1} 50% { opacity: 0.5} }
</style>
