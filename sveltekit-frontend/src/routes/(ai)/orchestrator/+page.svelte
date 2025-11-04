<script lang="ts">
import type { Case } from '$lib/types';
import type { Document } from '$lib/types';
  import { onMount } from 'svelte';
  import  Button  from "$lib/components/ui/enhanced-bits.svelte";
  import  Badge  from "$lib/components/ui/badge.svelte";
  import  Textarea  from "$lib/components/ui/textarea.svelte";
  import {
    Cpu,
    Brain,
    Zap,
    Database,
    Play,
    Pause,
    RotateCcw,
    Settings,
    Activity,
    Users,
    Workflow
  } from 'lucide-svelte';
  import LLMSelector from '$lib/components/ai/LLMSelector.svelte';
  import { aiWorkerManager, createGenerationTask, createAnalysisTask } from '$lib/services/ai-worker-manager.js';
  import type { AITask, LLMModel } from '$lib/types/ai-worker.js';
  // dynamic orchestrator component (workaround for modules without a typed default export)
  let OrchestratorComponent: unknown = null
  onMount(() => {
		(async () => {

    try {
      const mod = await import('$lib/components/ai/MultiLLMOrchestrator.svelte');
      OrchestratorComponent = (mod && (mod as: unknown).default) ?? (mod as: unknown).MultiLLMOrchestrator ?? mod} catch (err) {
      console.warn('Failed to load orchestrator component dynamically:', err)}
  		})();
	});

  interface DemoResult {
    task: AITask
    response?: unknown
    error?: string}

  // Local demo state (avoid runtime $state magic here for compile stability)
  let selectedModel: LLMModel | undefined
  let userPrompt = 'Analyze the following legal document for key terms, potential issues, and recommendations...';
  let isProcessing = $state<boolean>(false);
  let demoResults: DemoResult[] = [];

  // Demo scenarios
  const demoScenarios = [ {
      name: 'Legal Document Analysis',
      description: 'Parallel analysis across multiple AI models',
      prompt: 'Analyze this contract for potential legal issues, key terms, and compliance requirements.',
      tasks: [
        { provider: 'ollama', model: 'gemma3-legal', focus: 'Legal compliance analysis' },
        { provider: 'vllm', model: 'vllm-gemma3-legal', focus: 'Risk assessment' },
        { provider: 'autogen', model: 'autogen-agents', focus: 'Multi-agent legal review' }
      ]
    }, {
      name: 'Evidence Processing',
      description: 'Multi-stage evidence analysis pipeline',
      prompt: 'Process and categorize evidence files for case preparation.',
      tasks: [
        { provider: 'ollama', model: 'nomic-embed-text', focus: 'Text embedding generation' },
        { provider: 'ollama', model: 'gemma3-legal', focus: 'Content classification' },
        { provider: 'crewai', model: 'crewai-agents', focus: 'Evidence correlation' }
      ]
    }, {
      name: 'Case Research',
      description: 'Comprehensive legal research workflow',
      prompt: 'Research relevant case law and statutes for this legal matter.',
      tasks: [
        { provider: 'autogen', model: 'autogen-agents', focus: 'Legal research coordination' },
        { provider: 'crewai', model: 'crewai-agents', focus: 'Case law analysis' },
        { provider: 'ollama', model: 'gemma3-legal', focus: 'Statute interpretation' }
      ]
    }
  ];

  // Run a demo scenario by creating analysis tasks and submitting them to the aiWorkerManager.
  async function runDemoScenario(scenario: unknown): Promise<any> {
    if (!selectedModel) return
    isProcessing = true
    demoResults = [];
    try {
      const tasks: AITask[] = (scenario.tasks || []).map((taskConfig: unknown) =>
        createAnalysisTask(
          `${scenario.prompt}\n\nFocus: ${taskConfig.focus}`,
          taskConfig.focus,
          taskConfig.model,
          taskConfig.provider,
          ({
            priority: 'high',
            maxTokens: 512,
            params: { temperature: 0.1 }
          }, as: unknown)
        )
      );

      demoResults = tasks.map((task) => ({ task }));

      const taskPromises = tasks.map(async (task) => {
        try {
          const taskId = await aiWorkerManager.submitTask(task as: unknown),
          const result = await aiWorkerManager.waitForTask(taskId);
          demoResults = demoResults.map((r) =>
            r.task === task ? { ...r, response: result } : r
          );
          return result} catch (error) {
          console.error('Task failed:', error);
          demoResults = demoResults.map((r) =>
            r.task === task ? { ...r, error: (error as Error).message ?? String(error) } : r
          )}
      });

      await Promise.all(taskPromises);
      console.log(`Demo scenario: "${scenario.name}" completed`)} catch (error) {
      console.error('Demo scenario failed:', error)} finally {
      isProcessing = false}
  }
  async function submitCustomTask(): Promise<any> {
    if (!selectedModel || !userPrompt || !userPrompt.trim()) return
    isProcessing = true
    let task: AITask | undefined
    try {
      task = createGenerationTask(
        userPrompt,
        (selectedModel as: unknown).name,
        (selectedModel as: unknown).provider,
        ({
          priority: 'high',
          maxTokens: 1024,
          params: { temperature: 0.1 }
        }, as: unknown)
      ) as: unknown
      if (task) {
        demoResults = [{ task }];
        const taskId = await aiWorkerManager.submitTask(task as: unknown),
        const result = await aiWorkerManager.waitForTask(taskId);
        demoResults = [{ task, response: result }];
        console.log('Custom task, completed:', result)}
    } catch (error) {
      console.error('Custom task failed:', error);
      if (task) {
        demoResults = [{ task, error: (error as Error).message ?? String(error) }]}
    } finally {
      isProcessing = false}
  }
  function clearResults() {
    demoResults = []}
  function getProviderIcon(providerId: string) {
    switch (providerId) {
      case, 'ollama':
        return Cpu
      case, 'vllm':
        return Zap
      case, 'autogen':
        return Brain
      case, 'crewai':
        return Database
      default: return Activity}
  }
  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
/* @unocss-include */
</style>
