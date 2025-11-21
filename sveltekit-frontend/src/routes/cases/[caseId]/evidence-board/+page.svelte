<script lang="ts">
  import { page } from '$app/stores';
  import type { TopicNode } from '$lib/types/evidence-board';
  import { onMount } from 'svelte';

  let topics = $state<TopicNode[]>([]);
  let selectedTopic = $state<TopicNode | null>(null);
  let loading = $state<boolean>(true);
  let error = $state<string>('');

  let caseId = $derived(() => $page.params.caseId);

  onMount(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/topics`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch topics');
      }

      topics = data.topics || [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });

  function selectTopic(topic: TopicNode) {
    selectedTopic = topic;
  }

  function sendToChat() {
    if (!selectedTopic) return;

    // Dispatch custom event for AI chat integration
    window.dispatchEvent(new CustomEvent('topicToChat', {
      detail: selectedTopic
    }));
  }

  function severityColor(topic: TopicNode): string {
    const severity = topic.avgSeverity ?? 0.5;
    if (severity > 0.7) return 'bg-red-700 border-red-500';
    if (severity > 0.4) return 'bg-yellow-600 border-yellow-500';
    return 'bg-green-700 border-green-500';
  }

  function severityLabel(topic: TopicNode): string {
    const severity = topic.avgSeverity ?? 0.5;
    if (severity > 0.7) return 'HIGH';
    if (severity > 0.4) return 'MEDIUM';
    return 'LOW';
  }
</script>

<section class="h-[calc(100vh-80px)] bg-[#13100c] text-[#f5f0e2] flex">
  <!-- Topic Wall -->
  <div class="relative flex-1 border-r border-[#3a352a] overflow-hidden">
    <div class="absolute inset-6 bg-[#221e17] shadow-inner rounded">
      {#if loading}
        <div class="w-full h-full flex items-center justify-center text-sm opacity-70">
          Loading topic clusters...
        </div>
      {:else if error}
        <div class="p-4 text-red-400 text-sm">
          Error: {error}
        </div>
      {:else if topics.length === 0}
        <div class="w-full h-full flex items-center justify-center text-sm opacity-70">
          No topics found for this case
        </div>
      {:else}
        {#each topics as topic}
          <button
            class="absolute px-3 py-2 text-xs shadow-lg border-2 rounded transition-all hover:scale-105 hover:shadow-xl {severityColor(topic)}"
            style="left: {topic.somX * 85 + 5}%; top: {topic.somY * 80 + 10}%;"
            onclick={() => selectTopic(topic)}
          >
            <div class="font-mono tracking-wide font-semibold">
              {topic.title}
            </div>
            <div class="mt-1 opacity-80 text-[10px]">
              {topic.clusterSize} items
            </div>
            <div class="mt-1 text-[9px] uppercase tracking-wider">
              {severityLabel(topic)}
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Topic Details Panel -->
  <aside class="w-80 p-4 bg-[#1a1813] flex flex-col gap-4">
    <h2 class="font-mono text-sm tracking-wide">TOPIC ANALYSIS</h2>

    {#if selectedTopic}
      <div class="text-xs space-y-3">
        <div class="space-y-1">
          <div class="font-semibold text-sm">{selectedTopic.title}</div>
          <div class="text-[10px] opacity-70">Topic ID: {selectedTopic.topicId}</div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <div class="opacity-70">CLUSTER SIZE</div>
            <div class="font-mono">{selectedTopic.clusterSize}</div>
          </div>
          <div>
            <div class="opacity-70">AVG SEVERITY</div>
            <div class="font-mono">
              {selectedTopic.avgSeverity ? selectedTopic.avgSeverity.toFixed(2) : 'N/A'}
            </div>
          </div>
        </div>

        {#if selectedTopic.tags.length > 0}
          <div>
            <div class="opacity-70 text-[10px] mb-1">TAGS</div>
            <div class="flex flex-wrap gap-1">
              {#each selectedTopic.tags as tag}
                <span class="px-2 py-1 bg-[#3a352a] rounded text-[9px]">
                  {tag}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <button
          class="w-full mt-4 px-3 py-2 bg-lime-600 hover:bg-lime-500 text-black text-xs font-bold uppercase tracking-wide transition-colors"
          onclick={sendToChat}
        >
          Analyze in AI Terminal
        </button>
      </div>
    {:else}
      <div class="text-xs opacity-70">
        Select a topic cluster on the board to view details and send it to the AI terminal for analysis.
      </div>
    {/if}
  </aside>
</section>