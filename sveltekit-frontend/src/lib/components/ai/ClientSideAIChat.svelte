<script lang="ts">
</script>
  import { onMount } from 'svelte';
  import { webAssemblyAIAdapter } from '$lib/adapters/webasm-ai-adapter';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  import { Badge } from '$lib/components/ui/badge';
  import { MessageSquare, Brain, Zap, Cpu } from 'lucide-svelte';

  // Props
  interface Props {
    collapsed?: boolean;
    showStatus?: boolean;
  }

  let { collapsed = false, showStatus = true }: Props = $props();

  // State
  let chatInput = $state('');
  let messages = $state<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: number}>>([]);
  let isProcessing = $state(false);
  let isInitialized = $state(false);
  let error = $state<string | null>(null);
  
  // System status
  let systemStatus = $state({
    webgpu: false,
    webasm: false,
    model: false,
    adapter: false
  });

  // Quick prompts
  let quickPrompts = [
    'What are the key legal considerations for AI in healthcare?',
    'Explain GDPR compliance for AI systems.',
    'How do AI liability laws work?',
    'What are the privacy risks of machine learning?'
  ];

  async function initializeAI() {
    try {
      console.log('🤖 Initializing client-side AI...');
      
      const initialized = await webAssemblyAIAdapter.initialize();
      if (initialized) {
        const health = webAssemblyAIAdapter.getHealthStatus();
        systemStatus = {
          webgpu: health.webgpuEnabled || false,
          webasm: health.wasmSupported || false,
          model: health.modelLoaded || false,
          adapter: health.initialized || false
        };
        
        isInitialized = true;
        console.log('✅ Client-side AI ready:', health);
        
        // Add welcome message
        messages.push({
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I\'m running locally in your browser using WebAssembly and the Gemma 270MB model. Ask me anything about legal AI, compliance, or contract analysis.',
          timestamp: Date.now()
        });
      } else {
        throw new Error('Failed to initialize AI adapter');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown initialization error';
      console.error('❌ AI initialization failed:', err);
    }
  }

  async function sendMessage(prompt?: string) {
    const message = prompt || chatInput.trim();
    if (!message || isProcessing || !isInitialized) return;
    
    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user' as const,
      content: message,
      timestamp: Date.now()
    };
    
    messages.push(userMessage);
    messages = [...messages]; // Trigger reactivity
    
    isProcessing = true;
    error = null;
    
    // Clear input if it was user-typed
    if (!prompt) chatInput = '';
    
    try {
      console.log('🚀 Processing:', message);
      
      const response = await webAssemblyAIAdapter.sendMessage(message, {
        maxTokens: 300,
        temperature: 0.1,
        useGPUAcceleration: systemStatus.webgpu,
        conversationHistory: messages.slice(-6).map(msg => ({
          type: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      });
      
      const assistantMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant' as const,
        content: response.content,
        timestamp: Date.now()
      };
      
      messages.push(assistantMessage);
      messages = [...messages]; // Trigger reactivity
      
      console.log('✅ Response generated:', {
        method: response.metadata?.method,
        processingTime: response.metadata?.processingTime
      });
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to process message';
      console.error('❌ Message processing failed:', err);
    } finally {
      isProcessing = false;
    }
  }

  function clearChat() {
    messages = [{
      id: 'welcome',
      role: 'assistant',
      content: 'Chat cleared. How can I help you with legal AI questions?',
      timestamp: Date.now()
    }];
    error = null;
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  onMount(() => {
    initializeAI();
  });
</script>

<div class="client-ai-chat" class:collapsed data-testid="ai-chat-container">
  <Card class="bg-gray-900/90 backdrop-blur-md border-yellow-500/30 shadow-xl">
    <CardHeader class="pb-3">
      <CardTitle class="flex items-center gap-2 text-yellow-400 text-sm font-mono">
        <Brain class="w-4 h-4" />
        Client-Side AI Chat
        {#if showStatus}
          <div class="flex items-center gap-1 ml-auto">
            <Badge class={systemStatus.model ? 'bg-green-600' : 'bg-red-600'} variant="secondary">
              {systemStatus.model ? 'Gemma 270MB' : 'Loading...'}
            </Badge>
          </div>
        {/if}
      </CardTitle>
      
      {#if showStatus && !collapsed}
        <div class="flex items-center gap-2 text-xs">
          <span class="flex items-center gap-1">
            <Zap class={`w-3 h-3 ${systemStatus.webgpu ? 'text-green-400' : 'text-red-400'}`} />
            WebGPU
          </span>
          <span class="flex items-center gap-1">
            <Cpu class={`w-3 h-3 ${systemStatus.webasm ? 'text-green-400' : 'text-red-400'}`} />
            WebAssembly
          </span>
          <span class="text-gray-500">•</span>
          <span class="text-gray-400">
            {isInitialized ? 'Ready' : 'Initializing...'}
          </span>
        </div>
      {/if}
    </CardHeader>
    
    <CardContent class="p-3 space-y-3">
      {#if !collapsed}
        <!-- Messages -->
        <div class="messages-container h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-600" data-testid="chat-messages">
          {#each messages as message (message.id)}
            <div class="message {message.role}">
              <div class="flex items-start gap-2">
                <div class="icon {message.role}">
                  {#if message.role === 'user'}
                    <MessageSquare class="w-3 h-3" />
                  {:else}
                    <Brain class="w-3 h-3" />
                  {/if}
                </div>
                <div class="content">
                  <div class="text-xs text-gray-400 mb-1 font-mono">
                    {message.role === 'user' ? 'You' : 'Gemma 270MB'} • 
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                  <div class="text-sm {message.role === 'user' ? 'text-blue-300' : 'text-green-300'}">
                    {message.content}
                  </div>
                </div>
              </div>
            </div>
          {/each}
          
          {#if isProcessing}
            <div class="message assistant processing">
              <div class="flex items-start gap-2">
                <div class="icon assistant animate-pulse">
                  <Brain class="w-3 h-3" />
                </div>
                <div class="content">
                  <div class="text-xs text-gray-400 mb-1 font-mono">Gemma 270MB</div>
                  <div class="text-sm text-yellow-300">
                    <div class="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Quick Prompts -->
        {#if messages.length <= 1}
          <div class="quick-prompts">
            <div class="text-xs text-gray-400 mb-2 font-mono">Quick prompts:</div>
            <div class="flex flex-wrap gap-1">
              {#each quickPrompts.slice(0, 2) as prompt}
                <button
                  onclick={() => sendMessage(prompt)}
                  disabled={isProcessing || !isInitialized}
                  class="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 hover:border-yellow-500 transition-colors disabled:opacity-50"
                >
                  {prompt.slice(0, 35)}...
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Error Display -->
        {#if error}
          <div class="error-message bg-red-900/30 border border-red-500/50 rounded p-2">
            <div class="text-xs text-red-400 font-mono">⚠️ {error}</div>
          </div>
        {/if}

        <!-- Input -->
        <div class="input-container">
          <div class="flex gap-2">
            <textarea
              bind:value={chatInput}
              onkeypress={handleKeyPress}
              placeholder={isInitialized ? "Ask about legal AI, compliance, contracts..." : "Initializing AI..."}
              disabled={isProcessing || !isInitialized}
              rows="2"
              class="flex-1 text-xs bg-gray-800 border border-gray-600 rounded px-2 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none disabled:opacity-50"
              data-testid="chat-input"
            ></textarea>
            <button
              onclick={() => sendMessage()}
              disabled={!chatInput.trim() || isProcessing || !isInitialized}
              class="px-3 py-1 bg-yellow-600 text-black text-xs font-mono rounded hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="send-button"
            >
              {isProcessing ? '...' : 'Send'}
            </button>
          </div>
          
          <div class="flex justify-between items-center mt-2">
            <div class="text-xs text-gray-500 font-mono">
              Running locally • No data sent to servers
            </div>
            <button
              onclick={clearChat}
              class="text-xs text-gray-400 hover:text-gray-300 font-mono"
            >
              Clear
            </button>
          </div>
        </div>
      {:else}
        <div class="text-center">
          <div class="text-xs text-gray-400 font-mono">
            {isInitialized ? `${messages.length} messages` : 'Initializing...'}
          </div>
          {#if isInitialized && systemStatus.model}
            <Badge class="bg-green-600 mt-2" variant="secondary">Gemma 270MB Ready</Badge>
          {/if}
        </div>
      {/if}
    </CardContent>
  </Card>
</div>

<style>
  .client-ai-chat {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    max-width: 320px;
  }

  .client-ai-chat.collapsed {
    max-width: 200px;
  }

  .messages-container {
    scrollbar-width: thin;
    scrollbar-color: #4B5563 transparent;
  }

  .messages-container::-webkit-scrollbar {
    width: 4px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .messages-container::-webkit-scrollbar-thumb {
    background: #4B5563;
    border-radius: 2px;
  }

  .message {
    padding: 8px;
    border-radius: 6px;
    margin: 4px 0;
  }

  .message.user {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .message.assistant {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .message.processing {
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .icon.user {
    background: rgba(59, 130, 246, 0.2);
    color: #60A5FA;
  }

  .icon.assistant {
    background: rgba(16, 185, 129, 0.2);
    color: #34D399;
  }

  .content {
    flex: 1;
    min-width: 0;
  }

  .typing-indicator {
    display: flex;
    gap: 2px;
    align-items: center;
  }

  .typing-indicator span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #FCD34D;
    animation: typing 1.4s ease-in-out infinite;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.7;
    }
    30% {
      transform: translateY(-6px);
      opacity: 1;
    }
  }

  .quick-prompts button {
    font-size: 10px;
    transition: all 0.2s ease;
  }

  .quick-prompts button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .error-message {
    animation: shake 0.5s ease-in-out;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
  }
</style>
