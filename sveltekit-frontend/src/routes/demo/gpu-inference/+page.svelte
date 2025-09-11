<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { cognitiveSmartRouter } from '$lib/ai/cognitive-smart-router';
  import { Button } from '$lib/components/ui/enhanced-bits';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
  } from '$lib/components/ui/enhanced-bits';;
  // Stores for reactive UI
  const messages = writable([]);
  const engineStatus = writable({
    webgpu: { online: false, responseTime: 0 },
    ollama: { online: false, responseTime: 0 },
    vllm: { online: false, responseTime: 0 },
    fastembed: { online: false, responseTime: 0 }
  });
  const performanceMetrics = writable({
    totalRequests: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    activeEngines: 0
  });

  // Component state
  let currentInput = '';
  let isProcessing = false;
  let currentSessionId = '';
  let selectedEngine = 'auto'; // auto, webgpu, ollama, vllm, fastembed
  let chatContainer;

  // Engine options
  const engineOptions = [
    { value: 'auto', label: '🧠 Smart Router (Auto)' },
    { value: 'webgpu', label: '🎮 WebGPU (Browser)' },
    { value: 'ollama', label: '🦙 Ollama (Local)' },
    { value: 'vllm', label: '⚡ vLLM (CUDA)' },
    { value: 'fastembed', label: '🚀 FastEmbed (GPU)' }
  ];

  onMount(async () => {
    // Initialize new session
    await createNewSession();
    // Check engine status
    await checkAllEngineStatus();
    // Set up periodic status updates
    const statusInterval = setInterval(checkAllEngineStatus, 30000); // Every 30s
    return () => {
      clearInterval(statusInterval);
    };
  });

  async function createNewSession() {
    try {
      const response = await fetch('/demo/gpu-inference/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: `GPU Demo Session ${new Date().toLocaleString()}`,
          userId: 'demo-user'
        })
      });
      if (response.ok) {
        const session = await response.json();
        currentSessionId = session.id;
        console.log('✅ Created new session:', currentSessionId);
      }
    } catch (error) {
      console.error('❌ Failed to create session:', error);
    }
  }

  async function checkAllEngineStatus() {
    const engines = ['webgpu', 'ollama', 'vllm', 'fastembed'];
    const status = {};
    for (const engine of engines) {
      try {
        const startTime = Date.now();
        const response = await fetch(`/demo/gpu-inference/api/health/${engine}`, {
          method: 'GET',
          timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        status[engine] = {
          online: response.ok,
          responseTime,
          status: response.ok ? await response.json() : null
        };
      } catch (error) {
        status[engine] = { online: false, responseTime: 0, error: error.message };
      }
    }
    engineStatus.set(status);
    // Update performance metrics
    const onlineEngines = Object.values(status).filter(s => s.online).length;
    performanceMetrics.update(m => ({
      ...m,
      activeEngines: onlineEngines
    }));
  }

  async function sendMessage() {
    if (!currentInput.trim() || isProcessing) return;
    const userMessage = currentInput.trim();
    currentInput = '';
    isProcessing = true;
    // Add user message to chat
    messages.update(msgs => [...msgs, {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      engine: 'user'
    }]);
    try {
      const startTime = Date.now();
      let response;
      if (selectedEngine === 'auto') {
        // Use cognitive smart router
        response = await cognitiveSmartRouter.route({
          prompt: userMessage,
          requestType: 'legal-analysis',
          priority: 'normal',
          maxLatency: 10000
        });
      } else {
        // Use specific engine
        response = await fetch('/demo/gpu-inference/api/inference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            message: userMessage,
            engine: selectedEngine,
            generateEmbedding: true
          })
        });
        response = await response.json();
      }
      const responseTime = Date.now() - startTime;
      // Add assistant response to chat
      messages.update(msgs => [...msgs, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.response || response.content || 'No response received',
        timestamp: new Date(),
        engine: response.engineUsed || selectedEngine,
        responseTime,
        tokensGenerated: response.tokensGenerated,
        cacheHit: response.cacheHit || false,
        metadata: response.metadata
      }]);
      // Update performance metrics
      performanceMetrics.update(m => ({
        totalRequests: m.totalRequests + 1,
        averageResponseTime: ((m.averageResponseTime * m.totalRequests) + responseTime) / (m.totalRequests + 1),
        cacheHitRate: response.cacheHit ? 
          ((m.cacheHitRate * m.totalRequests) + 1) / (m.totalRequests + 1) :
          (m.cacheHitRate * m.totalRequests) / (m.totalRequests + 1),
        activeEngines: m.activeEngines
      }));
      // Scroll to bottom
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('❌ Inference error:', error);
      messages.update(msgs => [...msgs, {
        id: crypto.randomUUID(),
        role: 'assistant', 
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        engine: 'error',
        isError: true
      }]);
    } finally {
      isProcessing = false;
    }
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    messages.set([]);
    createNewSession();
  }

  function getEngineEmoji(engine) {
    const emojis = {
      webgpu: '🎮',
      ollama: '🦙', 
      vllm: '⚡',
      fastembed: '🚀',
      auto: '🧠',
      error: '❌',
      user: '👤'
    };
    return emojis[engine] || '🤖';
  }

  function getEngineColor(engine) {
    const colors = {
      webgpu: 'text-blue-600',
      ollama: 'text-green-600',
      vllm: 'text-purple-600', 
      fastembed: 'text-orange-600',
      auto: 'text-indigo-600',
      error: 'text-red-600',
      user: 'text-gray-600'
    };
    return colors[engine] || 'text-gray-600';
  }
</script>

<svelte:head>
  <title>GPU Inference Demo - Legal AI Platform</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
  <div class="mx-auto max-w-7xl">
    
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-4xl font-bold text-slate-800 mb-2">
        🎮 GPU Inference Engine Demo
      </h1>
      <p class="text-slate-600 text-lg">
        Experience our enterprise-grade multi-engine AI inference system with real-time performance monitoring
      </p>
    </div>

    <!-- Engine Status Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {#each Object.entries($engineStatus) as [engine, status]}
        <Card class="transition-all hover:shadow-md">
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">{getEngineEmoji(engine)}</span>
                <div>
                  <p class="font-semibold text-sm text-slate-700 capitalize">{engine}</p>
                  <p class="text-xs text-slate-500">
                    {status.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <div class={`w-3 h-3 rounded-full ${status.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {#if status.online}
                  <p class="text-xs text-slate-500 mt-1">{status.responseTime}ms</p>
                {/if}
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>

    <!-- Performance Metrics -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>📊 Real-time Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <p class="text-2xl font-bold text-blue-600">{$performanceMetrics.totalRequests}</p>
            <p class="text-sm text-slate-600">Total Requests</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-green-600">
              {Math.round($performanceMetrics.averageResponseTime)}ms
            </p>
            <p class="text-sm text-slate-600">Avg Response Time</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-purple-600">
              {Math.round($performanceMetrics.cacheHitRate * 100)}%
            </p>
            <p class="text-sm text-slate-600">Cache Hit Rate</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-orange-600">{$performanceMetrics.activeEngines}/4</p>
            <p class="text-sm text-slate-600">Active Engines</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Main Chat Interface -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Chat Messages -->
      <div class="lg:col-span-2">
        <Card class="h-[600px] flex flex-col">
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle>💬 AI Assistant Chat</CardTitle>
              <div class="flex gap-2">
                <Button class="bits-btn" 
                  variant="outline" 
                  size="sm"
                  onclick={clearChat}
                >
                  🗑️ Clear
                </Button>
                <select 
                  bind:value={selectedEngine}
                  class="px-3 py-1 text-sm border rounded-md bg-white"
                >
                  {#each engineOptions as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent class="flex-1 flex flex-col p-0">
            
            <!-- Messages Container -->
            <div 
              bind:this={chatContainer}
              class="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {#each $messages as message}
                <div class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div class={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : message.isError
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-800'
                  }`}>
                    
                    <!-- Message Header -->
                    <div class="flex items-center justify-between mb-2 text-xs opacity-75">
                      <span class="flex items-center gap-1">
                        <span>{getEngineEmoji(message.engine)}</span>
                        <span class="capitalize">{message.engine}</span>
                      </span>
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                    </div>
                    
                    <!-- Message Content -->
                    <div class="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                    
                    <!-- Message Metadata -->
                    {#if message.role === 'assistant' && !message.isError}
                      <div class="flex items-center justify-between mt-2 text-xs opacity-75">
                        <span class="flex items-center gap-2">
                          {#if message.responseTime}
                            <span>⏱️ {message.responseTime}ms</span>
                          {/if}
                          {#if message.tokensGenerated}
                            <span>🔢 {message.tokensGenerated} tokens</span>
                          {/if}
                          {#if message.cacheHit}
                            <span>💾 Cache Hit</span>
                          {/if}
                        </span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
              
              {#if $messages.length === 0}
                <div class="text-center text-slate-500 mt-8">
                  <p class="text-lg mb-2">👋 Welcome to the GPU Inference Demo!</p>
                  <p>Ask me anything about legal analysis, contracts, or test the AI engines.</p>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 max-w-md mx-auto">
                    <Button class="bits-btn" 
                      variant="outline" 
                      size="sm"
                      onclick={() => currentInput = "Analyze the key elements of a valid contract"}
                    >
                      📝 Contract Analysis
                    </Button>
                    <Button class="bits-btn" 
                      variant="outline" 
                      size="sm"
                      onclick={() => currentInput = "What are common legal risks in mergers?"}
                    >
                      ⚖️ Legal Risks
                    </Button>
                    <Button class="bits-btn" 
                      variant="outline" 
                      size="sm"
                      onclick={() => currentInput = "Test GPU performance with vector embeddings"}
                    >
                      🎮 GPU Test
                    </Button>
                    <Button class="bits-btn" 
                      variant="outline" 
                      size="sm"
                      onclick={() => currentInput = "Compare different AI engines"}
                    >
                      🚀 Engine Comparison
                    </Button>
                  </div>
                </div>
              {/if}
            </div>
            
            <!-- Input Area -->
            <div class="border-t p-4">
              <div class="flex gap-2">
                <textarea
                  bind:value={currentInput}
                  on:keypress={handleKeyPress}
                  placeholder="Ask about legal analysis, contracts, or test the AI engines..."
                  class="flex-1 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  disabled={isProcessing}
                ></textarea>
                <Button
                  onclick={sendMessage}
                  disabled={!currentInput.trim() || isProcessing}
                  class="px-6 bits-btn bits-btn"
                >
                  {#if isProcessing}
                    ⏳ Processing...
                  {:else}
                    ➤ Send
                  {/if}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- System Information -->
      <div class="space-y-4">
        
        <!-- Current Session -->
        <Card>
          <CardHeader>
            <CardTitle>🔍 Session Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2 text-sm">
              <div>
                <span class="font-medium">Session ID:</span>
                <span class="font-mono text-xs text-slate-600 block">
                  {currentSessionId || 'Initializing...'}
                </span>
              </div>
              <div>
                <span class="font-medium">Selected Engine:</span>
                <span class="capitalize {getEngineColor(selectedEngine)}">
                  {getEngineEmoji(selectedEngine)} {selectedEngine}
                </span>
              </div>
              <div>
                <span class="font-medium">Messages:</span>
                <span>{$messages.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Engine Capabilities -->
        <Card>
          <CardHeader>
            <CardTitle>⚡ Engine Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-blue-600">🎮</span>
                <div>
                  <div class="font-medium">WebGPU</div>
                  <div class="text-xs text-slate-600">Browser compute shaders</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-green-600">🦙</span>
                <div>
                  <div class="font-medium">Ollama</div>
                  <div class="text-xs text-slate-600">Local GGUF models</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-purple-600">⚡</span>
                <div>
                  <div class="font-medium">vLLM CUDA</div>
                  <div class="text-xs text-slate-600">Enterprise streaming</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-orange-600">🚀</span>
                <div>
                  <div class="font-medium">FastEmbed</div>
                  <div class="text-xs text-slate-600">GPU embeddings</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Performance Tips -->
        <Card>
          <CardHeader>
            <CardTitle>💡 Performance Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2 text-sm text-slate-600">
              <div>• Use <strong>Smart Router</strong> for optimal performance</div>
              <div>• <strong>WebGPU</strong> is fastest for short queries</div>
              <div>• <strong>vLLM</strong> handles complex analysis best</div>
              <div>• Cache hits provide <strong>sub-5ms</strong> responses</div>
              <div>• All engines support vector embeddings</div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  </div>
</div>
