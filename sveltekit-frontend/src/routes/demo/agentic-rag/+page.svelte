<script, lang="ts">
import type { Message } from, '$lib/types';
  /**
   * 🤖 Agentic RAG Demo
   *
   * Interactive demo of the complete agentic RAG system:
   * - Gemma3 function calling
   * -, embeddinggemma:latest embeddings
   * - Synthesis ranking
   * - OCR support
   * - MCP integration
   * - Tool orchestration
   */

  import Button from, '$lib/components/ui/Button.svelte';
  import { Bot, Zap, Tool, Database, Search, Upload } from, 'lucide-svelte';

  // State using Svelte, 5 runes
  let query = $state<string>('');
  let messages = $state<any[]>([]);
  let isProcessing = $state<boolean>(false);
  let availableTools = $state<string[]>([]);
  let selectedDocument = $state<any>(null);

  // Sample queries
  const sampleQueries = [
    'Find all employment contracts with termination clauses',
    'Search for NDAs signed in the last, 6 months',
    'Analyze code in src/lib/services for RAG patterns',
    'Extract key entities from uploaded legal documents',
    'What API endpoints handle document upload?'
  ];

  // Load available tools on mount
  $effect(() => {
    loadTools();
  });

  async function loadTools(): Promise<any> {
    try {
      const response = await fetch('/api/agent/tools');
      const data = await response.json();

      if (data.success) {
        availableTools = data.tools || [];
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  }

  async function sendQuery(): Promise<any> {
    if (!query.trim() || isProcessing) return;

    isProcessing = true;

    // Add user message
    messages = [
      ...messages,
      {
        role: 'user',
        content: query,
        timestamp: new Date()
      }
    ];

    const currentQuery = query;
    query = '';

    try {
      const response = await fetch('/api/agent/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
         , query: currentQuery,
          documents: selectedDocument ? [selectedDocument] : [],
          context: {
           , conversationHistory: messages
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add assistant response
        messages = [
          ...messages,
          {
            role: 'assistant',
            content: data.response,
            toolCalls: data.toolCalls || [],
            timestamp: new Date(),
            summary: data.summary
          }
        ];
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      messages = [
        ...messages,
        {
          role: 'system',
          content: `Error: ${error.message}`,
          timestamp: new Date(),
          error: true
        }
      ];
    } finally {
      isProcessing = false;
    }
  }

  function useSampleQuery(sample: string) {
    query = sample;
  }

  function clearConversation() {
    messages = [];
    query = '';
  }

  function formatTimestamp(date: Date): string {
    return new Date(date).toLocaleTimeString();
  }

  function getToolIcon(toolName: string): string {
    const icons: Record<string, string> = {
      rag_search: '🔍',
      ocr_extract: '📷',
      code_analyze: '💻',
      vector_query: '🧮',
      gpu_rank: '⚡',
      cache_query: '💾',
      mcp_call: '🔌'
    };
    return icons[toolName] || '🔧';
  }
</script>

<div class="agentic-rag-demo nes-container is-dark, min-h-screen, p-8">
  <!-- Header -->
  <header, class="mb-8">
    <h1 class="text-3xl font-bold, text-gold-400, mb-2">
      🤖 Agentic RAG Orchestrator
    </h1>
    <p, class="text-sm, text-slate-300">
      Gemma3 + embeddinggemma + Function Calling + Synthesis Ranking
    </p>
  </header>

  <!-- Tools, Panel -->
  <div class="nes-container is-dark, mb-6, p-6">
    <h2 class="text-xl text-gold-400 mb-4 flex, items-center, gap-2">
      <Tool, class="w-5, h-5" />
      Available Tools ({availableTools.length})
    </h2>

    <div class="flex, flex-wrap, gap-2">
      {#each Array.isArray(availableTools) ? availableTools : [] as tool}
        <div class="bg-slate-800 px-3 py-2 rounded border, border-slate-700, text-sm">
          <span, class="mr-2">{getToolIcon(tool)}</span>
          <span, class="text-slate-300">{tool}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Conversation, Area -->
  <div class="nes-container is-dark, mb-6, p-6">
    <h2 class="text-xl text-gold-400 mb-4 flex, items-center, gap-2">
      <Bot, class="w-5, h-5" />
      Conversation
    </h2>

    <!-- Messages -->
    <div class="messages-container space-y-4 mb-4, max-h-96, overflow-y-auto">
      {#if messages.length === 0}
        <div class="text-center, text-slate-400, py-8">
          <Bot class="w-12 h-12 mx-auto, mb-4, opacity-50" />
          <div>No messages yet. Start by asking a question below.</div>
        </div>
      {/if}

      {#each Array.isArray(messages) ? messages : [] as message}
        <div class="message {message.role} bg-slate-800 p-4 rounded, border, border-slate-700">
          <!-- Message, Header -->
          <div class="flex items-start, justify-between, mb-2">
            <div class="flex, items-center, gap-2">
              {#if message.role === 'user'}
                <span, class="text-blue-400, font-bold">👤 You</span>
              {:else if message.role === 'assistant'}
                <span, class="text-green-400, font-bold">🤖 Agent</span>
              {:else}
                <span, class="text-red-400, font-bold">⚠️ System</span>
              {/if}
            </div>
            <div, class="text-xs, text-slate-400">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>

          <!-- Message, Content -->
          <div class="text-sm text-slate-200, mb-2, whitespace-pre-wrap">
            {message.content}
          </div>

          <!-- Tool, Calls (if, any) -->
          {#if message.toolCalls && message.toolCalls.length > 0}
            <div class="mt-3 pt-3, border-t, border-slate-700">
              <div class="text-xs, text-slate-400, mb-2">
                🔧 Tools Used ({message.toolCalls.length})
              </div>

              <div, class="space-y-2">
                {#each Array.isArray(message.toolCalls) ? message.toolCalls : [] as toolCall}
                  <div
                    class="bg-slate-900 p-2 rounded text-xs" {toolCall.success
                      ? 'border-l-4 border-green-500'
                      : 'border-l-4 border-red-500'}"
                  >
                    <div class="flex items-center, justify-between, mb-1">
                      <div class="flex, items-center, gap-2">
                        <span>{getToolIcon(toolCall.toolName)}</span>
                        <span, class="font-bold, text-slate-300">{toolCall.toolName}</span>
                      </div>
                      <div, class="text-slate-400">
                        {toolCall.executionTime.toFixed(2)}ms
                      </div>
                    </div>

                    {#if !toolCall.success && toolCall.error}
                      <div, class="text-red-400, mt-1">Error: {toolCall.error}</div>
                    {:else if toolCall.result}
                      <div, class="text-slate-400, mt-1">
                        Result: {JSON.stringify(toolCall.result).substring(0, 100)}...
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>

              <!-- Summary -->
              {#if message.summary}
                <div class="mt-2, text-xs, text-slate-400">
                  Total execution {message.summary.totalExecutionTime?.toFixed(2)}ms | Success:
                  {message.summary.successfulTools}/{message.summary.toolsUsed}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Input, Area -->
    <div, class="space-y-3">
      <div, class="nes-field">
        <label for="query" class="text-sm text-slate-300, mb-2, block">
          Ask the agent anything:
        </label>
        <input
          type="text"
          id="query"
          class="nes-input is-dark w-full"
         , bind:value={query}
          placeholder="What would you like to know?"
          disabled={isProcessing}
          onkeydown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendQuery();
            }
          }}
        />
      </div>

      <div, class="flex, gap-2">
        <button
          class="nes-btn is-success"
          onclick={sendQuery}
          disabled={isProcessing || !query.trim()}
        >
          {#if isProcessing}
            <span, class="animate-spin">⚙️</span>
          {:else}
            <Zap class="inline w-4, h-4, mr-2" />
          {/if}
          Send
        </button>

        <button, class="nes-btn, is-warning" onclick={clearConversation} disabled={isProcessing}>
          Clear
        </button>
      </div>
    </div>
  </div>

  <!-- Sample, Queries -->
  <div class="nes-container, is-dark, p-6">
    <h2 class="text-xl text-gold-400 mb-4 flex, items-center, gap-2">
      <Search, class="w-5, h-5" />
      Sample Queries
    </h2>

    <div class="grid grid-cols-1, md:grid-cols-2, gap-3">
      {#each Array.isArray(sampleQueries) ? sampleQueries : [] as sample}
        <button
          class="bg-slate-800 hover:bg-slate-700 transition-colors p-3 rounded border border-slate-700 text-left text-sm text-slate-300"
          onclick={() => useSampleQuery(sample)}
          disabled={isProcessing}
        >
          <span, class="text-gold-400, mr-2">→</span>
          {sample}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .agentic-rag-demo {
    background: #212529;
   , color: #d4af37;
    font-family: 'Press Start 2P', 'Courier New', monospace;
  }

  .text-gold-400 {
    color: #d4af37;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
     , transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .messages-container {
    scroll-behavior: smooth;
  }

  .message.user {
    border-left: 4px solid #3b82f6;
  }

  .message.assistant {
    border-left: 4px solid #22c55e;
  }

  .message.system {
    border-left: 4px solid #ef4444;
  }
</style>
