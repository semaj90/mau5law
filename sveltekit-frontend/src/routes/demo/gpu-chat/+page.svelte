<script lang="ts">
  let messages: { role: 'user' | 'assistant'; content: string }[] = [];
  let userInput = '';
  let isLoading = false;

  async function handleSubmit() {
    if (!userInput.trim() || isLoading) return;
    
    const currentInput = userInput;
    userInput = '';
    isLoading = true;
    
    // Add user message and empty assistant message
    messages = [...messages, 
      { role: 'user', content: currentInput },
      { role: 'assistant', content: '' }
    ];

    try {
      // Send request to our GPU proxy endpoint
      const response = await fetch('/api/gpu-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: currentInput,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk and add it to the last message
        const chunk = decoder.decode(value, { stream: true });
        messages[messages.length - 1].content += chunk;
        
        // Trigger reactivity
        messages = messages;
      }

    } catch (error) {
      console.error('Error:', error);
      messages[messages.length - 1].content = `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    } finally {
      isLoading = false;
    }
  }
</script>

<main class="max-w-4xl mx-auto p-6 space-y-6">
  <div class="border-b pb-4">
    <h1 class="text-2xl font-bold text-gray-900">GPU Chat Streaming Demo</h1>
    <p class="text-gray-600 mt-2">Real-time streaming chat powered by Go GPU server</p>
  </div>

  <!-- Chat Messages -->
  <div class="border rounded-lg bg-gray-50 h-96 overflow-auto p-4 space-y-4">
    {#each messages as message, i}
      <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
        <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg {
          message.role === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white border shadow-sm'
        }">
          <div class="text-xs font-medium mb-1 {
            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
          }">
            {message.role === 'user' ? 'You' : 'AI Assistant'}
          </div>
          <div class="text-sm whitespace-pre-wrap">
            {message.content || ''}
          </div>
        </div>
      </div>
    {/each}
    
    {#if isLoading}
      <div class="flex justify-start">
        <div class="bg-white border shadow-sm rounded-lg px-4 py-2">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Input Form -->
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(e); }} class="flex gap-3">
    <input 
      type="text"
      bind:value={userInput}
      placeholder="Type your message..."
      disabled={isLoading}
      class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
    />
    <button 
      type="submit"
      disabled={isLoading || !userInput.trim()}
      class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
    >
      {isLoading ? 'Sending...' : 'Send'}
    </button>
  </form>

  <!-- Status Info -->
  <div class="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
    <p><strong>Status:</strong> {isLoading ? 'Streaming response...' : 'Ready'}</p>
    <p><strong>Endpoint:</strong> /api/gpu-chat → Go GPU Server</p>
    <p><strong>Messages:</strong> {messages.length}</p>
  </div>
</main>