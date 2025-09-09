<!-- TokenUsageManager.svelte - Advanced Token Management with Slider -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';

  // Props
  interface Props {
    currentModel?: string;
    initialLimit?: number;
    class?: string;
  }

  let {
    currentModel = 'gemma3-legal',
    initialLimit = 8000,
    class: className = ''
  }: Props = $props();

  const dispatch = createEventDispatcher();

  // Reactive state using Svelte 5 runes
  let tokenLimit = $state(initialLimit);
  let tokensUsed = $state(0);
  let showHistory = $state(false);
  let showOptimization = $state(true);
  let autoOptimize = $state(true);

  // Token usage history
  let usageHistory = $state<Array<{
    id: string;
    timestamp: Date;
    prompt: string;
    response: string;
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    model: string;
    processingTime: number;
  }>>([]);

  // Token usage breakdown
  let currentSession = $state({
    promptTokens: 0,
    responseTokens: 0,
    totalTokens: 0,
    messageCount: 0,
    averageTokensPerMessage: 0,
    peakUsage: 0,
    efficiency: 100
  });

  // Model token limits
  const modelLimits = {
    'gemma3:2b': 2048,
    'gemma3:7b': 4096,
    'gemma3:13b': 8192,
    'gemma3-legal': 8000,
    'gemma3-quick': 4096
  };

  // Reactive calculations
  let tokensRemaining = $derived(tokenLimit - tokensUsed);
  let usagePercentage = $derived((tokensUsed / tokenLimit) * 100);
  let isNearLimit = $derived(usagePercentage > 80);
  let isAtLimit = $derived(tokensUsed >= tokenLimit);

  let warningLevel = $derived(
    usagePercentage > 95 ? 'critical' :
    usagePercentage > 80 ? 'warning' :
    usagePercentage > 60 ? 'caution' : 'normal'
  );

  let progressColor = $derived(
    warningLevel === 'critical' ? 'bg-red-500' :
    warningLevel === 'warning' ? 'bg-orange-500' :
    warningLevel === 'caution' ? 'bg-yellow-500' : 'bg-green-500'
  );

  let estimatedMessagesRemaining = $derived(
    currentSession.averageTokensPerMessage > 0
      ? Math.floor(tokensRemaining / currentSession.averageTokensPerMessage)
      : 0
  );

  // Functions
  function updateTokenLimit(newLimit: number) {
    tokenLimit = newLimit;

    // Auto-adjust if current usage exceeds new limit
    if (tokensUsed > tokenLimit) {
      optimizeTokenUsage();
    }

    dispatch('tokenLimitChanged', { newLimit, tokensUsed });
  }

  function recordTokenUsage(usage: {
    promptTokens: number;
    responseTokens: number;
    model: string;
    prompt: string;
    response: string;
    processingTime: number;
  }) {
    const totalTokens = usage.promptTokens + usage.responseTokens;

    // Add to history
    usageHistory = [
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        totalTokens,
        ...usage
      },
      ...usageHistory.slice(0, 99) // Keep last 100 entries
    ];

    // Update current session
    tokensUsed += totalTokens;
    currentSession.promptTokens += usage.promptTokens;
    currentSession.responseTokens += usage.responseTokens;
    currentSession.totalTokens += totalTokens;
    currentSession.messageCount += 1;

    if (totalTokens > currentSession.peakUsage) {
      currentSession.peakUsage = totalTokens;
    }

    currentSession.averageTokensPerMessage =
      currentSession.totalTokens / currentSession.messageCount;

    // Calculate efficiency
    const expectedTokens = currentSession.messageCount * 150; // Baseline
    currentSession.efficiency = Math.max(0,
      100 - ((currentSession.totalTokens - expectedTokens) / expectedTokens * 100)
    );

    dispatch('tokenUsageUpdated', {
      tokensUsed,
      tokensRemaining,
      usagePercentage,
      session: currentSession
    });
  }

  function optimizeTokenUsage() {
    if (!autoOptimize) return;

    // Compress history if needed
    if (usageHistory.length > 50) {
      const compressed = compressHistory(usageHistory);
      usageHistory = compressed;

      // Recalculate token usage
      const totalFromHistory = compressed.reduce(
        (sum, entry) => sum + entry.totalTokens, 0
      );
      tokensUsed = totalFromHistory;
    }

    dispatch('tokensOptimized', {
      method: 'history_compression',
      tokensSaved: Math.max(0, tokensUsed - tokenLimit * 0.8)
    });
  }

  function compressHistory(history: typeof usageHistory) {
    // Keep recent important entries, summarize older ones
    const recent = history.slice(0, 20);
    const older = history.slice(20);

    if (older.length === 0) return recent;

    // Create summary entry for older messages
    const totalOlder = older.reduce((sum, entry) => ({
      promptTokens: sum.promptTokens + entry.promptTokens,
      responseTokens: sum.responseTokens + entry.responseTokens,
      totalTokens: sum.totalTokens + entry.totalTokens
    }), { promptTokens: 0, responseTokens: 0, totalTokens: 0 });

    const summaryEntry = {
      id: 'summary-' + Date.now(),
      timestamp: older[0].timestamp,
      prompt: `[Summary of ${older.length} messages]`,
      response: `Compressed ${older.length} historical messages`,
      promptTokens: totalOlder.promptTokens,
      responseTokens: totalOlder.responseTokens,
      totalTokens: totalOlder.totalTokens,
      model: 'system',
      processingTime: 0
    };

    return [...recent, summaryEntry];
  }

  function resetSession() {
    tokensUsed = 0;
    usageHistory = [];
    currentSession = {
      promptTokens: 0,
      responseTokens: 0,
      totalTokens: 0,
      messageCount: 0,
      averageTokensPerMessage: 0,
      peakUsage: 0,
      efficiency: 100
    };

    dispatch('sessionReset', {});
  }

  function exportUsageData() {
    const data = {
      session: currentSession,
      history: usageHistory,
      settings: {
        tokenLimit,
        currentModel,
        autoOptimize
      },
      timestamp: new Date()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `token-usage-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Note: recordTokenUsage function is available for calling from parent components

  onMount(() => {
    // Auto-set limit based on current model
    const modelLimit = modelLimits[currentModel as keyof typeof modelLimits];
    if (modelLimit && tokenLimit === initialLimit) {
      tokenLimit = modelLimit;
    }
  });
</script>

<Card class="bits-card token-usage-manager {className}" variant="default" legal={true}>
  <CardHeader class="bits-card-header">
    <CardTitle class="bits-card-title flex items-center justify-between">
      <div class="flex items-center gap-2">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        Token Usage Manager
      </div>
      <div class="bits-badge bits-badge-{warningLevel === 'normal' ? 'default' : 'destructive'} px-2 py-1 rounded text-xs font-bold">
        {Math.round(usagePercentage)}%
      </div>
    </CardTitle>
  </CardHeader>

  <CardContent class="bits-card-content space-y-4">
    <!-- Token Limit Slider -->
    <div class="space-y-2" data-testid="token-limit-section">
      <label for="token-limit-slider" class="text-sm font-medium">
        Token Limit: <span data-testid="token-limit-display">{tokenLimit.toLocaleString()}</span>
      </label>
      <input
        id="token-limit-slider"
        type="range"
        min="500"
        max="32000"
        step="100"
        bind:value={tokenLimit}
        onchange={(e: Event) => updateTokenLimit(parseInt((e.target as HTMLInputElement).value))}
        data-testid="token-limit-slider"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
      <div class="flex justify-between text-xs text-gray-500">
        <span>500</span>
        <span>32K</span>
      </div>
    </div>

    <!-- Usage Progress -->
    <div class="space-y-2" data-testid="token-tracker">
      <div class="flex justify-between text-sm">
        <span>Used: <span data-testid="tokens-used">{tokensUsed.toLocaleString()}</span></span>
        <span>Remaining: <span data-testid="tokens-remaining">{tokensRemaining.toLocaleString()}</span></span>
      </div>

      <div class="w-full bg-gray-200 rounded-full h-3 {progressColor}" data-testid="usage-progress">
        <div
          class="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style="width: {Math.min(usagePercentage, 100)}%"
        ></div>
      </div>

      <div class="text-xs text-gray-500">
        Est. {estimatedMessagesRemaining} messages remaining
      </div>
    </div>

    <!-- Warning Alerts -->
    {#if isNearLimit}
      <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800" data-testid="token-warning">
        <svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <span>
          {#if isAtLimit}
            Token limit reached! Consider optimizing or increasing limit.
          {:else}
            Approaching token limit ({Math.round(usagePercentage)}% used)
          {/if}
        </span>
      </div>
    {/if}

    <!-- Token Breakdown -->
    {#if currentSession.messageCount > 0}
      <div class="grid grid-cols-3 gap-4 text-sm" data-testid="token-breakdown">
        <div class="text-center">
          <div class="font-semibold" data-testid="prompt-tokens">
            {currentSession.promptTokens.toLocaleString()}
          </div>
          <div class="text-gray-500">Prompt</div>
        </div>
        <div class="text-center">
          <div class="font-semibold" data-testid="response-tokens">
            {currentSession.responseTokens.toLocaleString()}
          </div>
          <div class="text-gray-500">Response</div>
        </div>
        <div class="text-center">
          <div class="font-semibold" data-testid="total-tokens">
            {currentSession.totalTokens.toLocaleString()}
          </div>
          <div class="text-gray-500">Total</div>
        </div>
      </div>
    {/if}

    <!-- Session Stats -->
    {#if currentSession.messageCount > 0}
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center gap-2">
          <svg class="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
          </svg>
          <span class="text-sm">Session Stats</span>
        </div>
        <div class="text-right text-sm">
          <div>{currentSession.messageCount} messages</div>
          <div class="text-gray-500">
            {Math.round(currentSession.averageTokensPerMessage)} avg tokens
          </div>
        </div>
      </div>
    {/if}

    <!-- Controls -->
    <div class="flex gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        class="bits-btn bits-btn-outline bits-btn bits-btn"
        onclick={() => showHistory = !showHistory}
        data-testid="token-history-button"
      >
        <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        History
      </Button>

      <Button
        size="sm"
        variant="outline"
        class="bits-btn bits-btn-outline bits-btn bits-btn"
        onclick={optimizeTokenUsage}
        disabled={!autoOptimize}
      >
        <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        Optimize
      </Button>

      <Button
        size="sm"
        variant="outline"
        class="bits-btn bits-btn-outline bits-btn bits-btn"
        onclick={resetSession}
      >
        Reset
      </Button>

      <Button
        size="sm"
        variant="outline"
        class="bits-btn bits-btn-outline bits-btn bits-btn"
        onclick={exportUsageData}
      >
        Export
      </Button>
    </div>

    <!-- Optimization Toggle -->
    <div class="flex items-center justify-between">
      <label for="auto-optimize" class="text-sm">Auto-optimize conversation</label>
      <input
        id="auto-optimize"
        type="checkbox"
        bind:checked={autoOptimize}
        data-testid="optimize-conversation-toggle"
        class="toggle"
      />
    </div>

    <!-- History Modal/Panel -->
    {#if showHistory}
      <div class="mt-4 p-4 border rounded-lg max-h-64 overflow-y-auto" data-testid="token-history-modal">
        <h4 class="font-semibold mb-2">Token Usage History</h4>
        {#if usageHistory.length === 0}
          <p class="text-gray-500 text-sm">No usage history yet</p>
        {:else}
          <div class="space-y-2">
            {#each usageHistory.slice(0, 10) as entry}
              <div class="flex justify-between items-start p-2 bg-gray-50 rounded text-sm" data-testid="history-entry">
                <div class="flex-1">
                  <div class="font-medium truncate">{entry.prompt.slice(0, 50)}...</div>
                  <div class="text-gray-500 text-xs" data-testid="entry-timestamp">
                    {entry.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-semibold" data-testid="entry-tokens">{entry.totalTokens}</div>
                  <div class="text-gray-500 text-xs">{entry.model}</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Optimization Metrics -->
    {#if showOptimization && currentSession.messageCount > 2}
      <div class="p-3 border rounded-lg" data-testid="optimization-metrics">
        <div class="flex items-center gap-2 mb-2">
          <svg class="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
          <span class="text-sm font-medium">Optimization Metrics</span>
        </div>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div class="text-gray-500">Efficiency</div>
            <div class="font-semibold">{Math.round(currentSession.efficiency)}%</div>
          </div>
          <div>
            <div class="text-gray-500">Peak Usage</div>
            <div class="font-semibold">{currentSession.peakUsage}</div>
          </div>
        </div>

        {#if autoOptimize}
          <div class="mt-2 text-xs text-green-600" data-testid="context-compressed">
            ✓ Context optimization enabled
          </div>
        {/if}
      </div>
    {/if}
  </CardContent>
</Card>

<style>
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .toggle {
    appearance: none;
    width: 40px;
    height: 20px;
    background: #e5e7eb;
    border-radius: 20px;
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
  }

  .toggle:checked {
    background: #3b82f6;
  }

  .toggle::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    top: 1px;
    left: 1px;
    transition: transform 0.2s;
  }

  .toggle:checked::before {
    transform: translateX(20px);
  }
</style>
