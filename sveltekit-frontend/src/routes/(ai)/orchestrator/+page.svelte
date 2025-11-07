<script lang="ts">
  import type { Case } from '$lib/types';
  import type { Document } from '$lib/types';
  import { onMount } from 'svelte';

  // Keep only icons actually used; remove unused ones to silence linter warnings.
  import {
    Cpu,
    Brain,
    Zap,
    Database,
    Activity
  } from 'lucide-svelte';

  // Removed unused UI imports (Button/Badge/Textarea/LLMSelector) to avoid "declared but never read".
  import type { AITask, LLMModel } from '$lib/types/ai-worker.js';

  // Use namespace import to avoid TS errors when the module has different export shapes.
  import * as aiWorkerService from '$lib/services/ai-worker-manager.js';

  // dynamic orchestrator component (workaround for modules without a typed default export)
  let OrchestratorComponent: unknown = null;

  onMount(() => {
    (async () => {
      try {
        const mod = await import('$lib/components/ai/MultiLLMOrchestrator.svelte');
        // prefer default export, then named export, then module itself
        OrchestratorComponent = (mod as unknown as { default?: unknown; MultiLLMOrchestrator?: unknown }).default
          ?? (mod as unknown as { default?: unknown; MultiLLMOrchestrator?: unknown }).MultiLLMOrchestrator
          ?? mod;
      } catch (err) {
        console.warn('Failed to load orchestrator component dynamically:', err);
      }
    })();
  });

  interface DemoResult {
    task: AITask;
    response?: unknown;
    error?: string;
  }

  // Local demo state
  let selectedModel: LLMModel | undefined = undefined;
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
  async function runDemoScenario(scenario: unknown): Promise<void> {
    if (!selectedModel) return;
    isProcessing = true;
    demoResults = [];
    try {
      const tasks: AITask[] = (scenario as any).tasks?.map((taskConfig: any) =>
        // use namespace import - aiWorkerService.createAnalysisTask
        (aiWorkerService as any).createAnalysisTask(
          `${(scenario as any).prompt}\n\nFocus: ${taskConfig.focus}`,
          taskConfig.focus,
          taskConfig.model,
          taskConfig.provider,
          {
            priority: 'high',
            maxTokens: 512,
            params: { temperature: 0.1 }
          }
        )
      ) ?? [];

      demoResults = tasks.map((task) => ({ task }));

      const taskPromises = tasks.map(async (task) => {
        try {
          // use namespace import for submit/wait
          const taskId = await (aiWorkerService as any).submitTask(task);
          const result = await (aiWorkerService as any).waitForTask(taskId);
          demoResults = demoResults.map((r) =>
            r.task === task ? { ...r, response: result } : r
          );
          return result;
        } catch (error) {
          console.error('Task failed:', error);
          demoResults = demoResults.map((r) =>
            r.task === task ? { ...r, error: (error as Error)?.message ?? String(error) } : r
          );
        }
      });

      await Promise.all(taskPromises);
      console.log(`Demo scenario: "${(scenario as any).name}" completed`);
    } catch (error) {
      console.error('Demo scenario failed:', error);
    } finally {
      isProcessing = false;
    }
  }

  async function submitCustomTask(): Promise<void> {
    if (!selectedModel || !userPrompt?.trim()) return;
    isProcessing = true;
    let task: AITask | undefined;
    try {
      // use namespace import - createGenerationTask
      task = (aiWorkerService as any).createGenerationTask(
        userPrompt,
        (selectedModel as any).name ?? (selectedModel as any).id ?? 'unknown-model',
        (selectedModel as any).provider ?? 'ollama',
        {
          priority: 'high',
          maxTokens: 1024,
          params: { temperature: 0.1 }
        }
      ) as unknown as AITask;

      const taskId = await (aiWorkerService as any).submitTask(task);
      const result = await (aiWorkerService as any).waitForTask(taskId);

      // prepend result to demoResults
      demoResults = [{ task, response: result }, ...demoResults];
    } catch (err) {
      console.error('Custom task failed:', err);
      demoResults = [
        { task: (task as AITask) ?? (undefined as unknown as AITask), error: (err as Error)?.message ?? String(err) },
        ...demoResults
      ];
    } finally {
      isProcessing = false;
    }
  }

  function providerIcon(providerId: string) {
    // Map provider IDs to lucide-svelte icon components imported earlier
    switch (providerId) {
      case 'ollama':
        return Brain;
      case 'vllm':
        return Cpu;
      case 'autogen':
        return Zap;
      case 'crewai':
        return Database;
      default:
        return Activity;
    }
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
/* @unocss-include */
</style>
