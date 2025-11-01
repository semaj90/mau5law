<!-- @migration-task Error while migrating Svelte code: Unexpected toke;
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<!-- YoRHa AI Chat Component with Enhanced RAG Integration -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { aiChatStore  } from '$lib/stores/unified';

  // Stores / state
  const messages = writable<any[]>([]);
  let messageInput = '';
  let chatContainer: HTMLDivElement | null = null;
  let isConnected = false;
  let isTyping = false;
  let isLoading = false;

  const RAG_SERVICE_URL = 'http://localhost:8093';

  function pushMessage(msg: any) {
    messages.update(m => [...m, msg]);
    aiChatStore.addMessage?.(msg);
  }

  onMount(async () => {
    try {
      const response = await fetch(`${RAG_SERVICE_URL}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      isConnected = true;
      messages.set([
        {
          id: 'welcome',
          role: 'assistant',
          content: `🤖 YoRHa AI Assistant Online
Enhanced RAG System Connected
- Service Status: ✅ OPERATIONAL
- GPU Acceleration ✅ ACTIVE
- Vector Database: ✅ CONNECTED
How can I assist with your legal AI operations?`,
          timestamp: new Date(),
          type: 'system',
        },
      ]);
    } catch (error) {
      isConnected = false;
      messages.set([
        {
          id: 'error',
          role: 'assistant',
          content: `⚠️ Connection Failed
Enhanced RAG service is not available at ${RAG_SERVICE_URL}
Troubleshooting:
1. Ensure the Go service is running
2. Check service health: curl ${RAG_SERVICE_URL}/health
Offline Mode Available — Basic chat functionality only.`,
          timestamp: new Date(),
          type: 'error',
        },
      ]);
    }

    // Load chat history (if any)
    const savedChats = await aiChatStore.loadChatHistory?.();
    if (Array.isArray(savedChats) && savedChats.length > 0) {
      messages.update(m => [...m, ...savedChats]);
    }

    // scroll initial
    scrollToBottom();
  });

  async function sendMessage() {
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      type: 'user',
    };

    pushMessage(userMessage);
    messageInput = '';
    isLoading = true;
    isTyping = true;

    // Handle commands locally
    if (trimmed.startsWith('/')) {
      await handleCommand(trimmed);
      isLoading = false;
      isTyping = false;
      scrollToBottom();
      return;
    }

    try {
      const resp = await fetch(`${RAG_SERVICE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context: 'legal-ai',
          user_id: 'yorha-user',
          session_id: 'yorha-session',
          include_vector_search: true,
          max_tokens: 1000,
        }),
      });

      if (!resp.ok) throw new Error(`RAG service error: ${resp.status} ${resp.statusText}`);
      const result = await resp.json();

      const assistantMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: formatRAGResponse(result),
        timestamp: new Date(),
        type: 'assistant',
        metadata: result?.metadata ?? {},
      };

      pushMessage(assistantMessage);
    } catch (err: any) {
      const errorMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Error Processing Request\n${err?.message || String(err)}\nTry checking service status or using /help.`,
        timestamp: new Date(),
        type: 'error',
      };
      pushMessage(errorMessage);
    } finally {
      isLoading = false;
      isTyping = false;
      scrollToBottom();
    }
  }

  async function handleCommand(command: string) {
    const parts = command.slice(1).split(' ');
    const cmd = parts.shift()?.toLowerCase() || '';
    const arg = parts.join(' ');

    let responseText = '';

    switch (cmd) {
      case 'help':
        responseText = `🆘 YoRHa AI Commands
/analysis <text> - Analyze legal text
/search <query> - Vector search documents
/status - System health
/clear - Clear chat history`;
        break;
      case 'status':
        try {
          const health = await fetch(`${RAG_SERVICE_URL}/health`);
          const status = await health.json();
          responseText = `📊 System Status
Enhanced RAG Service: ${status?.status === 'ok' ? '✅ HEALTHY' : '❌ ERROR'}
Connection ${isConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}`;
        } catch {
          responseText = '❌ System Offline — Unable to connect to Enhanced RAG service';
        }
        break;
      case 'clear':
        // keep welcome message if present
        messages.update(m => (m.length > 0 ? [m[0]] : []));
        aiChatStore.clearHistory?.();
        responseText = '🧹 Chat History Cleared';
        break;
      case 'analyze':
      case 'analysis':
        if (!arg) {
          responseText = '❌ Missing Text — Usage: /analyze <text>';
        } else {
          try {
            const r = await fetch(`${RAG_SERVICE_URL}/api/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: arg, type: 'legal' }),
            });
            const res = await r.json();
            responseText = `📋 Analysis Result\nType: ${res?.document_type ?? 'Unknown'}\nConfidence: ${res?.confidence ?? 'N/A'}\nSummary: ${res?.summary ?? 'None'}`;
          } catch {
            responseText = '❌ Analysis Failed — Enhanced RAG service unavailable';
          }
        }
        break;
      default:
        responseText = `❓ Unknown command: ${cmd}\nType /help for available commands.`;
    }

    const commandResponse = {
      id: Date.now().toString(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
      type: 'command',
    };
    pushMessage(commandResponse);
  }

  function formatRAGResponse(result: any): string {
    if (typeof result === 'string') return result;
    let out = '🤖 YoRHa AI Response\n\n';
    if (result?.response) out += `${result.response}\n\n`;
    if (Array.isArray(result?.sources) && result.sources.length > 0) {
      out += '📚 Sources:\n';
      result.sources.forEach((s: any, i: number) => {
        out += `${i + 1}. ${s.title ?? s.filename ?? 'Unknown'}\n`;
      });
      out += '\n';
    }
    if (typeof result?.confidence === 'number') {
      out += `🎯 Confidence: ${Math.round(result.confidence * 100)}%\n`;
    }
    if (typeof result?.processing_time !== 'undefined') {
      out += `⏱️ Processing Time: ${result.processing_time}ms\n`;
    }
    return out;
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 50);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function getMessageTypeClass(type: string | undefined): string {
    switch (type) {
      case 'user':
        return 'bg-yorha-accent-cool/20 border-yorha-accent-cool text-white ml-auto';
      case 'assistant':
        return 'bg-yorha-accent-warm/20 border-yorha-accent-warm text-yorha-light';
      case 'system':
        return 'bg-blue-500/20 border-blue-400 text-blue-100';
      case 'error':
        return 'bg-red-500/20 border-red-400 text-red-100';
      case 'command':
        return 'bg-green-500/20 border-green-400 text-green-100';
      default: return 'bg-neutral-800 border-neutral-700 text-yorha-light';
    }
  }
</script>

<!-- AI Chat Interface -->
<div class="h-full flex flex-col bg-yorha-darker text-yorha-light">
  <!-- Chat Messages -->
  <div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 space-y-4">
    {#each $messages as message (message.id)}
      <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
        <div class="max-w-3xl border rounded-lg p-4 {getMessageTypeClass(message.type)}">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-bold uppercase">
              {message.role === 'user' ? '👤 USER' : message.type === 'system' ? '⚙️ SYSTEM' : '🤖 YORHA AI'}
            </span>
            <span class="text-xs opacity-70">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
            {#if message.type === 'command'}
              <span class="text-xs bg-green-500 px-2 py-1 rounded">CMD</span>
            {/if}
          </div>
          <div class="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {@html String(message.content).replace(/\n/g, '<br/>')}
          </div>
        </div>
      </div>
    {/each}

    {#if isTyping}
      <div class="flex justify-start">
        <div class="bg-yorha-accent-warm/20 border border-yorha-accent-warm rounded-lg p-4 max-w-xs">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold">🤖 YORHA AI</span>
            <div class="flex gap-1">
              <div class="w-2 h-2 bg-yorha-accent-warm rounded-full animate-bounce"></div>
              <div class="w-2 h-2 bg-yorha-accent-warm rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-yorha-accent-warm rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Connection Status -->
  <div class="border-t border-yorha-accent-warm/30 p-2">
    <div class="flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full {isConnected ? 'bg-green-400' : 'bg-red-400'}"></div>
        <span>{isConnected ? 'Enhanced RAG Connected' : 'Offline Mode'}</span>
      </div>
      <div class="flex items-center gap-4">
        <span>Messages: {$messages.length}</span>
        <span>Session yorha-{String(Date.now()).slice(-6)}</span>
      </div>
    </div>
  </div>

  <!-- Message Input -->
  <div class="border-t border-yorha-accent-warm/30 p-4">
    <div class="flex gap-2">
      <textarea
        bind:value={messageInput}
        onkeydown={handleKeyDown}
        placeholder="Enter your message or /help for commands..."
        disabled={isLoading}
        class="flex-1 bg-yorha-dark border border-yorha-accent-warm/50 rounded px-4 py-3 text-yorha-light placeholder-yorha-muted/70 focus:outline-none focus:border-yorha-accent-warm focus:ring-1 focus:ring-yorha-accent-warm disabled:opacity-50"
        rows="2"
      ></textarea>
      <button
        onclick={sendMessage}
        disabled={isLoading || !messageInput.trim()}
        class="px-6 py-3 bg-yorha-accent-warm text-yorha-dark font-bold rounded hover:bg-yorha-accent-warm/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isLoading ? '⏳' : '📤'}
      </button>
    </div>
    <div class="text-xs text-yorha-muted mt-2">
      Press Enter to send • Shift+Enter for new line • Type /help for commands
    </div>
  </div>
</div>

<style>
  /* simplified scrollbar styling */
  :global(.simple-scrollbar) {
    /* non-empty ruleset: thin, subtle scrollbar suitable for dark theme */
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  }

  /* WebKit-based browsers */
  :global(.simple-scrollbar::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }
  :global(.simple-scrollbar::-webkit-scrollbar-track) {
    background: transparent;
  }
  :global(.simple-scrollbar::-webkit-scrollbar-thumb) {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  /* keep existing theme classes intact; minimal overrides */
</style>
