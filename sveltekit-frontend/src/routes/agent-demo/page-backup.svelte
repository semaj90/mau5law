<script lang="ts">
import type { User } from '$lib/types';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import Button from '$lib/components/ui/Button.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/Card.svelte';

  // Stores for reactive state
  const selectedTask = writable(null);
  const patches = writable([]);
  const agentStatus = writable('idle');
  const logs = writable([]);

  // Component state
  let availableTasks: any[] = [];
  let completedTasks: any[] = [];
  let stats = { totalTasks: 0, completedCount: 0, failedCount: 0, pendingCount: 0 };
  let currentPatch = null;

  // Agent simulation state
  let isAgentRunning = $state<boolean>(false);
  let currentAgentTask = null;
  let agentProgress = 0;

  onMount(async () => {
    await initializeDemo();
  });

  async function initializeDemo(): Promise<void> {
    addLog('🚀 Initializing Agent Demo...', 'info');

    try {
      // Load initial task data
      const response = await fetch('/api/agent/tasks');
      if (response.ok) {
        const data = await response.json();
        availableTasks = data.availableTasks || [];
        completedTasks = data.recentCompletedTasks || [];
        stats = data.stats || stats;
        addLog(`✅ Loaded ${availableTasks.length} available tasks`, 'success');
      } else {
        // Fallback: create demo tasks locally
        await createDemoTasks();
      }
    } catch (error) {
      addLog(`⚠️ Failed to load tasks: ${error.message}`, 'error');
      await createDemoTasks();
    }

    addLog('🎯 Agent Demo ready - Select a task to begin', 'info');
  }

  async function createDemoTasks(): Promise<any> {
    // Create some demo tasks for testing
    const demoTasks = [
      {
        id: 'demo-logout-button',
        title: 'Add Logout Button',
        description: 'Add logout button to navigation component',
        priority: 'medium',
        estimatedComplexity: 3,
        type: 'feature',
        status: 'pending',
        files: ['src/lib/components/Navigation.svelte'],
      },
      {
        id: 'demo-user-profile',
        title: 'Implement User Profile',
        description: 'Create user profile page with form validation',
        priority: 'high',
        estimatedComplexity: 7,
        type: 'feature',
        status: 'pending',
        files: ['src/routes/profile/+page.svelte', 'src/routes/profile/+page.server.ts'],
      },
    ];

    availableTasks = demoTasks;
    stats = {
      totalTasks: demoTasks.length,
      pendingCount: demoTasks.length,
      completedCount: 0,
      failedCount: 0,
    };

    addLog('📝 Created demo tasks for testing', 'info');
  }

  async function assignTaskToAgent(task): Promise<any> {
    if (isAgentRunning) {
      addLog('⚠️ Agent is already running a task', 'warning');
      return;
    }

    addLog(`📋 Assigning task: "${task.title}" to agent...`, 'info');

    currentAgentTask = task;
    isAgentRunning = true;
    agentProgress = 0;
    agentStatus.set('working');
    selectedTask.set(task);

    await simulateAgentProgress(task);
  }

  async function simulateAgentProgress(task): Promise<any> {
    const steps = [
      { progress: 10, message: 'Analyzing codebase structure...', duration 1000 },
      { progress: 50, message: 'Creating diff patches...', duration 1500 },
      { progress: 100, message: 'Task completed successfully!', duration 500 },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.duration));
      agentProgress = step.progress;
      addLog(`🤖 Agent: ${step.message}`, 'info');

      if (step.progress === 50) {
        await createDemoPatches(task);
      }

      if (step.progress === 100) {
        await completeAgentTask(task);
      }
    }
  }

  async function createDemoPatches(task): Promise<any> {
    const demoPatch = {
      id: `patch-${task.id}-${Date.now()}`,
      filePath: task.files[0] || 'src/lib/components/Navigation.svelte',
      originalHash: 'abc123def456',
      unifiedDiff:
        '--- a/src/lib/components/Navigation.svelte\n+++ b/src/lib/components/Navigation.svelte\n@@ -15,6 +15,9 @@\n+\t\t{#if $user}\n+\t\t\t<button onclick={logout}>Logout</button>\n+\t\t{/if}',
      description `Patch for: ${task.title}`,
      confidence: 0.95,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    patches.update(current => [...current, demoPatch]);
    currentPatch = demoPatch;
    addLog(`📄 Created patch: ${demoPatch.description}`, 'success');
  }

  async function completeAgentTask(task): Promise<any> {
    availableTasks = availableTasks.filter(t => t.id !== task.id);
    completedTasks = [{ ...task, status: 'completed', completedAt: new Date().toISOString() }, ...completedTasks];

    stats.pendingCount--;
    stats.completedCount++;

    isAgentRunning = false;
    agentStatus.set('idle');
    addLog(`✅ Task: "${task.title}" completed successfully!`, 'success');
  }

  async function applyPatch(patch): Promise<any> {
    addLog(`🔧 Applying patch: ${patch.description}`, 'info');

    try {
      const response = await fetch('/api/agent/apply-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId: patch.id }),
      });

      if (response.ok) {
        const result = await response.json();
        patch.status = 'applied';
        patch.appliedAt = new Date().toISOString();
        patches.update(current => [...current]);
        addLog(`✅ Patch applied successfully: ${result.message}`, 'success');
      } else {
        throw new Error(`Failed to apply patch: ${response.statusText}`);
      }
    } catch (error) {
      addLog(`❌ Failed to apply patch: ${error.message}`, 'error');
      patch.status = 'failed';
      patches.update(current => [...current]);
    }
  }

  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    logs.update(current => [{ timestamp, message, type, id: Date.now() + Math.random() }, ...current.slice(0, 49)]);
  }

  function getPriorityColor(priority) {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'applied':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }
</script>

<div class="agent-demo-container p-6 max-w-7xl mx-auto">
  <div class="header mb-8">
    <h1 class="text-3xl font-bold mb-2">🤖 Agentic Code Assistant Demo</h1>
    <p class="text-gray-600">RAG-powered autonomous coding with Gemma3 + TensorRT-LLM + pgvector</p>
  </div>

  <!-- Stats Dashboard -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
    <Card>
      <CardContent class="p-4 text-center">
        <div class="text-2xl font-bold text-blue-600">{stats.totalTasks}</div>
        <div class="text-sm text-gray-600">Total Tasks</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4 text-center">
        <div class="text-2xl font-bold text-orange-600">{stats.pendingCount}</div>
        <div class="text-sm text-gray-600">Pending</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4 text-center">
        <div class="text-2xl font-bold text-green-600">{stats.completedCount}</div>
        <div class="text-sm text-gray-600">Completed</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4 text-center">
        <div class="text-2xl font-bold text-red-600">{stats.failedCount}</div>
        <div class="text-sm text-gray-600">Failed</div>
      </CardContent>
    </Card>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Available Tasks -->
    <Card>
      <CardHeader>
        <CardTitle>🎯 Available Tasks</CardTitle>
      </CardHeader>
      <CardContent class="max-h-96 overflow-y-auto">
        {#each availableTasks as task (task.id)}
          <div class="task-card mb-3 p-4 border rounded-lg hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-2">
              <h4 class="font-semibold">{task.title}</h4>
              <span class="px-2 py-1 rounded text-xs {getPriorityColor(task.priority)}">
                {task.priority}
              </span>
            </div>
            <p class="text-sm text-gray-600 mb-2">{task.description}</p>
            <div class="flex justify-between items-center">
              <div class="text-xs text-gray-500">
                Complexity: {task.estimatedComplexity}/10
              </div>
              <Button size="sm" onclick={() => assignTaskToAgent(task)} disabled={isAgentRunning}>
                {isAgentRunning ? 'Agent Busy' : 'Assign to Agent'}
              </Button>
            </div>
          </div>
        {/each}

        {#if availableTasks.length === 0}
          <div class="text-center text-gray-500 py-8">
            <div class="text-4xl mb-2">🎉</div>
            <p>No pending tasks! All work is complete.</p>
          </div>
        {/if}
      </CardContent>
    </Card>

    <!-- Agent Status & Progress -->
    <Card>
      <CardHeader>
        <CardTitle>🤖 Agent Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="agent-status mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="font-semibold">Status:</span>
            <span
              class="px-2 py-1 rounded text-xs" {$agentStatus === 'working'
                ? 'text-blue-600 bg-blue-50'
                : 'text-green-600 bg-green-50'}"
            >
              {$agentStatus}
            </span>
          </div>

          {#if currentAgentTask}
            <div class="mb-4">
              <div class="font-semibold mb-1">{currentAgentTask.title}</div>
              <div class="text-sm text-gray-600">{currentAgentTask.description}</div>
            </div>

            {#if isAgentRunning}
              <div class="progress-bar mb-4">
                <div class="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{agentProgress}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style="width: {agentProgress}%"
                  ></div>
                </div>
              </div>
            {/if}
          {:else}
            <div class="text-center text-gray-500 py-4">
              <div class="text-2xl mb-2">😴</div>
              <p>Agent is idle. Assign a task to begin.</p>
            </div>
          {/if}
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Generated Patches -->
  <div class="mt-8">
    <Card>
      <CardHeader>
        <CardTitle>📄 Generated Patches</CardTitle>
      </CardHeader>
      <CardContent>
        {#each $patches as patch (patch.id)}
          <div class="patch-card mb-4 p-4 border rounded-lg">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="font-semibold">{patch.description}</h4>
                <div class="text-sm text-gray-600">
                  {patch.filePath} • Confidence: {(patch.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <span class="px-2 py-1 rounded text-xs {getStatusColor(patch.status)}">
                {patch.status}
              </span>
            </div>

            <div class="diff-preview bg-gray-50 p-3 rounded text-xs font-mono mb-3 max-h-48 overflow-y-auto">
              <pre>{patch.unifiedDiff}</pre>
            </div>

            <div class="flex gap-2">
              {#if patch.status === 'pending'}
                <Button size="sm" onclick={() => applyPatch(patch)}>Apply Patch</Button>
              {/if}
            </div>
          </div>
        {/each}

        {#if $patches.length === 0}
          <div class="text-center text-gray-500 py-8">
            <div class="text-4xl mb-2">📝</div>
            <p>No patches generated yet. Assign a task to the agent.</p>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>

  <!-- Activity Log -->
  <div class="mt-8">
    <Card>
      <CardHeader>
        <CardTitle>📊 Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="log-container max-h-64 overflow-y-auto">
          {#each $logs as log (log.id)}
            <div class="log-entry flex items-start gap-2 py-1 text-sm">
              <span class="text-gray-400 text-xs">{log.timestamp}</span>
              <span
                class="flex-1" {log.type === 'error'
                  ? 'text-red-600'
                  : log.type === 'success'
                    ? 'text-green-600'
                    : log.type === 'warning'
                      ? 'text-yellow-600'
                      : 'text-gray-700'}"
              >
                {log.message}
              </span>
            </div>
          {/each}

          {#if $logs.length === 0}
            <div class="text-center text-gray-500 py-4">
              <p>No activity yet.</p>
            </div>
          {/if}
        </div>
      </CardContent>
    </Card>
  </div>
</div>

<style>
  .agent-demo-container {
    font-family: 'Segoe UI', system-ui, sans-serif;
  }

  .task-card:hover {
    border-color: #3b82f6;
  }

  .patch-card {
    border: 1px solid #e5e7eb;
  }

  .diff-preview {
    font-size: 11px;
    line-height: 1.4;
  }

  .log-container {
    font-family: 'JetBrains Mono', 'Consolas', monospace;
  }

  .progress-bar {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
</style>

