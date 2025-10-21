<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { createMachine, assign, fromPromise } from 'xstate';
  import { useMachine } from '@xstate/svelte';
  import { writable, derived, get } from 'svelte/store';
  // Toast notifications removed - using simple state instead
  import Textarea from '$lib/components/ui/textarea/Textarea.svelte';
  import EnhancedButton from '$lib/components/ui/EnhancedButton.svelte';
  // Legal AI Assistant State Machine (XState Best Practices)
  const legalAIMachine = createMachine(
    {
      id: 'legalAI',
      initial: 'idle',
      context: {
        prompt: '',
        response: '',
        error: null,
        conversationHistory: [],
      },
      states: {
        idle: {
          on {
            QUERY: {
              target: 'querying',
              guard: (_ctx, evt) => !!(evt as any)?.prompt?.trim(),
              actions: assign({
                prompt: (_ctx, evt) => (evt as any).prompt,
                error: () => null,
              }),
            },
          },
        },
        querying: {
          invoke: {
            // wrap the async promise with fromPromise so XState accepts the actor logic type
            src: fromPromise(async (ctx: any) => {
              const payload = {
                model: 'gemma3-legal:latest',
                prompt: `As a legal AI assistant, please provide accurate and helpful information about: ${ctx.prompt}`,
                stream: false,
                options: {
                  temperature: 0.3,
                  max_tokens: 2048,
                  top_p: 0.9,
                  frequency_penalty: 0.0,
                  presence_penalty: 0.0,
                },
              };

              const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              const data = await response.json();
              return { response: data.response ?? data.output ?? JSON.stringify(data) };
            }),
            onDone: {
              target: 'success',
              actions: assign((ctx: any, evt: any) => {
                const result = (evt?.data as any)?.response ?? '';
                return {
                  response: result,
                  conversationHistory: [
                    ...(ctx?.conversationHistory ?? []),
                    { prompt: ctx?.prompt ?? '', response: result, timestamp: Date.now() },
                  ],
                };
              }),
            },
            onError: {
              target: 'error',
              actions: assign((_ctx: any, evt: any) => ({
                error: (evt?.data?.message as string) ?? (evt?.message as string) ?? 'Failed to connect to Legal AI',
              })),
            },
          },
        },
        success: {
          on {
            QUERY: {
              target: 'querying',
              guard: (_ctx, evt) => !!(evt as any)?.prompt?.trim(),
              actions: assign({
                prompt: (_ctx, evt) => (evt as any).prompt,
                error: () => null,
              }),
            },
            CLEAR: {
              target: 'idle',
              actions: assign({
                prompt: () => '',
                response: () => '',
                error: () => null,
              }),
            },
          },
        },
        error: {
          on {
            RETRY: {
              target: 'querying',
            },
            QUERY: {
              target: 'querying',
              guard: (_ctx, evt) => !!(evt as any)?.prompt?.trim(),
              actions: assign({
                prompt: (_ctx, evt) => (evt as any).prompt,
                error: () => null,
              }),
            },
          },
        },
      },
    } /* removed second-argument implementations; invoke uses inline src */
  );
  // Initialize XState machine - use 'snapshot' returned by @xstate/svelte
  const { snapshot, send } = useMachine(legalAIMachine);

  // Use explicit Svelte stores for local UI state
  // Local writable stores
  const promptInput = writable('');
  type Notification = { id: number; title: string; description string };
  const notifications = writable<Notification[]>([]);

  // Derived stores based on the XState snapshot store
  const isLoading = derived(snapshot, $snapshot => $snapshot.matches('querying'));
  const currentResponse = derived(snapshot, $snapshot => $snapshot.context.response);
  const errorMessage = derived(snapshot, $snapshot => $snapshot.context.error);
  const canSubmit = derived(
    [promptInput, isLoading],
    ([$promptInput, $isLoading]) => $promptInput.trim().length > 0 && !$isLoading
  );

  function showNotification(title: string, description string) {
    const id = Date.now();
    notifications.update(n => [...n, { id, title, description }]);
    // remove after timeout (run outside update callback for safety)
    setTimeout(() => notifications.update(m => m.filter(item => item.id !== id)), 5000);
  }
  // Enhanced query function with error handling
  function handleQuery() {
    const prompt = get(promptInput).trim();
    if (!prompt || get(isLoading)) return;
    send({ type: 'QUERY', prompt });
    showNotification('Legal AI Query', 'Processing your legal question...');
  }
  function handleRetry() {
    send({ type: 'RETRY' });
  }
  function handleClear() {
    send({ type: 'CLEAR' });
    promptInput.set('');
  }
  // Keyboard shortcuts (best practices)
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleQuery();
    }
  }

  // Add a permissive alias to bypass strict component event typings for Textarea
  const TextareaAny = Textarea as unknown as any;
  // Add a permissive alias to bypass strict component prop/event typings
  const EnhancedButtonAny = EnhancedButton as unknown as any;
</script>

<!-- Simple Notifications -->
{#each $notifications as notification (notification.id)}
  <div class="fixed top-4 right-4 bg-blue-500 text-white p-4 rounded shadow-lg z-50">
    <div class="font-semibold">{notification.title}</div>
    <div class="text-sm">{notification.description}</div>
    <button
      class="absolute top-2 right-2 text-white hover:text-gray-200"
      onclick={() => notifications.update(n => n.filter(item => item.id !== notification.id))}
    >
      ×
    </button>
  </div>
{/each}
<div class="w-full max-w-4xl yorha-nier-bits-card nes-container">
  <div class="yorha-panel-header yorha-header">
    <h3 class="nes-text is-primary flex items-center gap-2">
      <div
        class="w-3 h-3 rounded-full"
        class:bg-green-500={$snapshot.matches('idle')}
        class:bg-yellow-500={$isLoading}
        class:bg-red-500={$snapshot.matches('error')}
      ></div>
      YoRHa Legal AI Assistant - Gemma3 Legal Latest
    </h3>
    <div class="text-sm nes-text is-disabled">
      {#if $isLoading}
        Processing legal query with Gemma3-Legal model...
      {:else if $snapshot.matches('error')}
        Connection error - Please check Ollama service
      {:else}
        Ready for legal questions • Press Ctrl+Enter to submit
      {/if}
    </div>
  </div>
  <div class="yorha-panel-content space-y-6">
    <!-- Input Section -->
    <div class="space-y-2">
      <label for="legal-prompt" class="text-sm font-medium">Legal Question</label>
      <svelte:component
        this={TextareaAny}
        id="legal-prompt"
        bind:value={$promptInput}
        onkeydown={handleKeydown}
        placeholder="Ask a legal question (e.g., 'What are the key elements of a valid contract?', 'Explain force majeure clauses', etc.)"
        rows={4}
        class="yorha-textarea"
        disabled={$isLoading}
      />
      <div class="flex justify-between text-xs nes-text is-disabled">
        <span>Characters: {$promptInput.length}</span>
        <span>Ctrl+Enter to submit</span>
      </div>
    </div>
    <!-- Action Buttons -->
    <div class="flex gap-2">
      <svelte:component
        this={EnhancedButtonAny}
        variant="legal"
        onclick={handleQuery}
        disabled={!$canSubmit}
        loading={$isLoading}
        loadingText="Analyzing..."
        class="flex-1"
      >
        {$isLoading ? 'Processing Legal Query...' : 'Ask Legal AI'}
      </svelte:component>
      {#if $snapshot.matches('error')}
        <svelte:component this={EnhancedButtonAny} variant="ghost" onclick={handleRetry}>Retry</svelte:component>
      {/if}
      {#if $currentResponse}
        <svelte:component this={EnhancedButtonAny} variant="ghost" onclick={handleClear}>Clear</svelte:component>
      {/if}
    </div>
    <!-- Response Section -->
    {#if $errorMessage}
      <div class="p-4 bg-red-50 border border-red-200 rounded-lg yorha-error">
        <div class="flex items-center gap-2 text-red-700">
          <div class="w-4 h-4 text-red-500">⚠️</div>
          <span class="font-medium">Error</span>
        </div>
        <p class="mt-2 text-sm text-red-600">{$errorMessage}</p>
        <p class="mt-1 text-xs text-red-500">Please ensure Ollama is running with gemma3-legal:latest model</p>
      </div>
    {/if}
    {#if $currentResponse}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium">Legal AI Response</h3>
          <div class="flex items-center gap-2 text-xs nes-text is-disabled">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            Gemma3-Legal Latest
          </div>
        </div>
        <div class="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg yorha-response">
          <div class="prose max-w-none">
            <p class="whitespace-pre-wrap text-sm leading-relaxed">{$currentResponse}</p>
          </div>
        </div>
        <!-- Response Actions -->
        <div class="flex gap-2 text-xs">
          <button class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            Copy Response
          </button>
          <button class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"> Save to Case </button>
          <button class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            Follow-up Question
          </button>
        </div>
      </div>
    {/if}
    <!-- Conversation History Preview (defensive access) -->
    {#if ($snapshot.context?.conversationHistory ?? []).length > 0}
      <details class="mt-6">
        <summary class="text-sm font-medium cursor-pointer hover:text-blue-600">
          Conversation History ({($snapshot.context?.conversationHistory ?? []).length} queries)
        </summary>
        <div class="mt-4 space-y-3 max-h-40 overflow-y-auto">
          {#each ($snapshot.context?.conversationHistory ?? []).slice(-3) as item}
            <div class="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
              <div class="text-xs text-gray-500 mb-1">
                {new Date(item.timestamp).toLocaleTimeString()}
              </div>
              <div class="text-sm font-medium mb-1">Q: {item.prompt.slice(0, 100)}...</div>
              <div class="text-xs text-gray-600">A: {item.response.slice(0, 150)}...</div>
            </div>
          {/each}
        </div>
      </details>
    {/if}
  </div>
</div>

<style>
  /* YoRHa Legal AI Assistant Styling */
  :global(.yorha-card) {
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    border: 2px solid #e5e5e5;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }
  :global(.yorha-header) {
    background: linear-gradient(45deg, #ffbf00, #ffd700);
    color: #000;
    border-bottom: 2px solid #ffbf00;
  }
  :global(.yorha-textarea) {
    background: #ffffff;
    border: 2px solid #e5e5e5;
    transition all 0.2s ease;
    font-family: 'JetBrains Mono', monospace;
  }
  :global(.yorha-textarea:focus) {
    border-color: #ffbf00;
    box-shadow: 0 0 0 3px rgba(255, 191, 0, 0.1);
  }
  :global(.yorha-response) {
    position relative;
    overflow: hidden;
  }
  :global(.yorha-response::after) {
    content: '';
    position absolute;
    top: 0,
    left: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ffbf00, transparent);
    animation shimmer 2s infinite;
  }
  :global(.yorha-error) {
    border-left: 4px solid #ef4444;
    background: #fef2f2;
  }
  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
  /* Responsive Design */
  @media (max-width: 768px) {
    :global(.yorha-card) {
      max-width: 100%;
      margin: 0 16px;
    }
  }
</style>
