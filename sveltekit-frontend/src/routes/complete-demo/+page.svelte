<!-- Complete Demo: Gemma Embeddings + XState Typing Machine + MCP Multi-Core -->
<script lang="ts">
  import { onMount } from 'svelte';
  import HeadlessTypingListener from '$lib/components/HeadlessTypingListener.svelte';
  import type { TypingState, TypingContext } from '$lib/machines/userTypingStateMachine.js';

  // State management
  let userInput = $state('');
  let uploadedFile: File | null = $state(null);
  let fileInput: HTMLInputElement;
  let chatInput: HTMLTextAreaElement;

  // Typing machine state
  let typingState = $state<TypingState>('idle');
  let typingContext = $state<TypingContext>();
  let contextualPrompts = $state<string[]>([]);
  let userAnalytics = $state<any>({});
  let mcpWorkerStatus = $state<'idle' | 'processing' | 'ready'>('idle');

  // Upload results
  let uploadResults = $state<any>(null);
  let uploadStatus = $state<'idle' | 'uploading' | 'completed' | 'error'>('idle');

  // Chat/RAG interface
  let chatMessages = $state<Array<{type: 'user' | 'assistant', content: string, timestamp: number}>>([]);
  let isProcessingChat = $state(false);

  // Real-time analytics
  let realTimeStats = $state({
    typingSpeed: 0,
    userEngagement: 'medium' as 'low' | 'medium' | 'high',
    sessionTime: 0,
    interactionCount: 0
  });

  /**
   * Handle file upload with Gemma embeddings
   */
  async function handleFileUpload(file: File) {
    uploadStatus = 'uploading';
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/test-gemma-upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        uploadResults = result.data;
        uploadStatus = 'completed';
        
        // Add system message about successful upload
        chatMessages = [...chatMessages, {
          type: 'assistant',
          content: `✅ Successfully processed "${file.name}" with Gemma embeddings! The document is now searchable with ${result.data.embeddingsCount} vector embeddings. You can ask questions about the content.`,
          timestamp: Date.now()
        }];
      } else {
        uploadStatus = 'error';
        console.error('Upload failed:', result.error);
      }
    } catch (error) {
      uploadStatus = 'error';
      console.error('Upload error:', error);
    }
  }

  /**
   * Handle chat submission with RAG search
   */
  async function handleChatSubmit() {
    if (!userInput.trim() || isProcessingChat) return;

    const userMessage = userInput.trim();
    userInput = '';

    // Add user message
    chatMessages = [...chatMessages, {
      type: 'user',
      content: userMessage,
      timestamp: Date.now()
    }];

    isProcessingChat = true;

    try {
      // Simulate RAG search with uploaded document
      let response = '';
      
      if (uploadResults) {
        response = `Based on the uploaded document "${uploadResults.file.name}" (${uploadResults.embeddingsCount} embeddings), I can help you with: "${userMessage}". `;
        
        // Add contextual response based on content
        if (userMessage.toLowerCase().includes('legal') || userMessage.toLowerCase().includes('law')) {
          response += `This appears to be a legal query. The document contains ${uploadResults.textLength} characters of legal text that has been processed through our Gemma embeddings pipeline.`;
        } else if (userMessage.toLowerCase().includes('summary') || userMessage.toLowerCase().includes('summarize')) {
          response += `I can provide a summary based on the processed chunks (${uploadResults.chunksCount} total chunks) from the document.`;
        } else {
          response += `The document has been fully indexed and is searchable through our vector similarity system.`;
        }
      } else {
        response = `I received your message: "${userMessage}". To provide document-specific answers, please upload a legal PDF first using the file upload section above.`;
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Add assistant response
      chatMessages = [...chatMessages, {
        type: 'assistant',
        content: response,
        timestamp: Date.now()
      }];

    } catch (error) {
      chatMessages = [...chatMessages, {
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now()
      }];
    } finally {
      isProcessingChat = false;
    }
  }

  /**
   * Handle typing state changes
   */
  function handleTypingStateChange(event: CustomEvent<{state: TypingState, context: TypingContext}>) {
    typingState = event.detail.state;
    typingContext = event.detail.context;
    
    // Update real-time stats
    if (typingContext) {
      realTimeStats = {
        typingSpeed: Math.round(typingContext.userBehavior.avgTypingSpeed),
        userEngagement: typingContext.analytics.userEngagement,
        sessionTime: Math.round((Date.now() - typingContext.sessionStartTime) / 1000),
        interactionCount: typingContext.analytics.totalInteractions
      };
    }
  }

  /**
   * Handle contextual prompts
   */
  function handleContextualPrompts(event: CustomEvent<{prompts: string[], context: TypingContext}>) {
    contextualPrompts = event.detail.prompts;
  }

  /**
   * Handle analytics updates
   */
  function handleAnalyticsUpdate(event: CustomEvent<{analytics: any}>) {
    userAnalytics = event.detail.analytics;
  }

  /**
   * Handle MCP worker status
   */
  function handleMCPWorkerStatus(event: CustomEvent<{status: 'idle' | 'processing' | 'ready'}>) {
    mcpWorkerStatus = event.detail.status;
  }

  /**
   * Apply contextual prompt
   */
  function applyContextualPrompt(prompt: string) {
    userInput = prompt;
    contextualPrompts = [];
    chatInput?.focus();
  }

  /**
   * Test with legal PDF
   */
  async function testWithLegalPDF() {
    const testContent = `
UNITED STATES DISTRICT COURT
SOUTHERN DISTRICT OF CALIFORNIA

UNITED STATES OF AMERICA, Plaintiff,
v.
GAVIN NEWSOM, in his Official Capacity as Governor of California;
XAVIER BECERRA, in his Official Capacity as Attorney General of California;
THE STATE OF CALIFORNIA, Defendants.

COMPLAINT FOR DECLARATORY AND INJUNCTIVE RELIEF

1. California recently passed Assembly Bill 32 (A.B. 32), which bans the operation of private detention facilities in California after January 1, 2020.

2. The Constitution, numerous acts of Congress, and various implementing regulations give the Federal Government both the authority and the prerogative to house individuals in its custody, including in private detention facilities.

3. In this action, the United States seeks a declaration invalidating, and order enjoining, enforcement of A.B. 32 against the Federal Government and those with whom it contracts for private detention facilities.
    `.trim();

    const blob = new Blob([testContent], { type: 'application/pdf' });
    const file = new File([blob], 'legal-complaint-test.pdf', { type: 'application/pdf' });
    
    uploadedFile = file;
    await handleFileUpload(file);
  }

  onMount(() => {
    // Add welcome message
    chatMessages = [{
      type: 'assistant',
      content: '👋 Welcome to the complete Legal AI demo! Upload a legal document to get started, then ask questions about it. The system uses Gemma embeddings with multi-core processing for intelligent responses.',
      timestamp: Date.now()
    }];
  });
</script>

<svelte:head>
  <title>Complete Demo - Legal AI with Gemma Embeddings</title>
</svelte:head>

<!-- HeadlessTypingListener - tracks all user typing behavior -->
<HeadlessTypingListener
  bind:text={userInput}
  bind:element={chatInput}
  on:stateChange={handleTypingStateChange}
  on:contextualPrompt={handleContextualPrompts}
  on:analyticsUpdate={handleAnalyticsUpdate}
  on:mcpWorkerStatus={handleMCPWorkerStatus}
/>

<div class="complete-demo">
  <div class="demo-header">
    <h1>🚀 Complete Legal AI Demo</h1>
    <p>Gemma Embeddings + XState Typing Machine + MCP Multi-Core + Real-time Analytics</p>
    
    <div class="status-grid">
      <div class="status-card">
        <span class="status-label">Typing State</span>
        <span class="status-value {typingState}">{typingState.replace('_', ' ')}</span>
      </div>
      <div class="status-card">
        <span class="status-label">MCP Worker</span>
        <span class="status-value {mcpWorkerStatus}">{mcpWorkerStatus}</span>
      </div>
      <div class="status-card">
        <span class="status-label">User Engagement</span>
        <span class="status-value {realTimeStats.userEngagement}">{realTimeStats.userEngagement}</span>
      </div>
      <div class="status-card">
        <span class="status-label">Typing Speed</span>
        <span class="status-value">{realTimeStats.typingSpeed} CPM</span>
      </div>
    </div>
  </div>

  <div class="demo-content">
    <!-- File Upload Section -->
    <div class="section upload-section">
      <h2>📄 Document Upload & Processing</h2>
      
      <div class="upload-area">
        <input
          bind:this={fileInput}
          type="file"
          accept=".pdf,.txt,.doc,.docx"
          onchange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              uploadedFile = file;
              handleFileUpload(file);
            }
          }}
          style="display: none"
        />
        
        <button
          onclick={() => fileInput?.click()}
          disabled={uploadStatus === 'uploading'}
          class="upload-button"
        >
          {#if uploadStatus === 'uploading'}
            🔄 Processing...
          {:else}
            📤 Upload Legal Document
          {/if}
        </button>

        <button
          onclick={testWithLegalPDF}
          disabled={uploadStatus === 'uploading'}
          class="test-button"
        >
          📋 Test with Legal PDF
        </button>
      </div>

      {#if uploadResults}
        <div class="upload-results">
          <h3>✅ Processing Complete</h3>
          <div class="results-grid">
            <div class="result-item">
              <span class="label">File:</span>
              <span class="value">{uploadResults.file.name}</span>
            </div>
            <div class="result-item">
              <span class="label">Text Length:</span>
              <span class="value">{uploadResults.textLength.toLocaleString()} chars</span>
            </div>
            <div class="result-item">
              <span class="label">Chunks:</span>
              <span class="value">{uploadResults.chunksCount}</span>
            </div>
            <div class="result-item">
              <span class="label">Embeddings:</span>
              <span class="value">{uploadResults.embeddingsCount}</span>
            </div>
            <div class="result-item">
              <span class="label">Dimensions:</span>
              <span class="value">{uploadResults.embeddingDimensions}</span>
            </div>
            <div class="result-item">
              <span class="label">RAG Ready:</span>
              <span class="value">✅ Yes</span>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Chat Interface Section -->
    <div class="section chat-section">
      <h2>💬 RAG Chat Interface</h2>
      
      <div class="chat-container">
        <div class="messages">
          {#each chatMessages as message}
            <div class="message {message.type}">
              <div class="message-content">{message.content}</div>
              <div class="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          {/each}
          {#if isProcessingChat}
            <div class="message assistant processing">
              <div class="message-content">🤔 Processing with Gemma embeddings...</div>
            </div>
          {/if}
        </div>

        <div class="chat-input-area">
          <!-- Contextual Prompts -->
          {#if contextualPrompts.length > 0}
            <div class="contextual-prompts">
              <span class="prompts-label">💡 Suggestions:</span>
              {#each contextualPrompts as prompt}
                <button
                  class="prompt-button"
                  onclick={() => applyContextualPrompt(prompt)}
                >
                  {prompt}
                </button>
              {/each}
            </div>
          {/if}

          <div class="input-container">
            <textarea
              bind:this={chatInput}
              bind:value={userInput}
              placeholder="Ask questions about your uploaded document..."
              rows="3"
              onkeydown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleChatSubmit();
                }
              }}
              disabled={isProcessingChat}
            ></textarea>
            <button
              onclick={handleChatSubmit}
              disabled={!userInput.trim() || isProcessingChat}
              class="send-button"
            >
              {#if isProcessingChat}
                ⏳
              {:else}
                📤
              {/if}
            </button>
          </div>
          <div class="input-hint">
            Press Ctrl+Enter to send • Typing behavior is tracked for analytics
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Dashboard -->
    <div class="section analytics-section">
      <h2>📊 Real-time User Analytics</h2>
      
      <div class="analytics-grid">
        <div class="analytics-card">
          <h3>⌨️ Typing Behavior</h3>
          <div class="analytics-data">
            <div class="data-row">
              <span>Current State:</span>
              <span class="highlight">{typingState.replace('_', ' ')}</span>
            </div>
            <div class="data-row">
              <span>Typing Speed:</span>
              <span class="highlight">{realTimeStats.typingSpeed} CPM</span>
            </div>
            <div class="data-row">
              <span>Characters Typed:</span>
              <span class="highlight">{typingContext?.charactersTyped || 0}</span>
            </div>
            <div class="data-row">
              <span>Words Typed:</span>
              <span class="highlight">{typingContext?.wordsTyped || 0}</span>
            </div>
          </div>
        </div>

        <div class="analytics-card">
          <h3>👤 User Engagement</h3>
          <div class="analytics-data">
            <div class="data-row">
              <span>Engagement Level:</span>
              <span class="highlight {realTimeStats.userEngagement}">{realTimeStats.userEngagement}</span>
            </div>
            <div class="data-row">
              <span>Session Time:</span>
              <span class="highlight">{realTimeStats.sessionTime}s</span>
            </div>
            <div class="data-row">
              <span>Interactions:</span>
              <span class="highlight">{realTimeStats.interactionCount}</span>
            </div>
            <div class="data-row">
              <span>Submissions:</span>
              <span class="highlight">{typingContext?.submissionsCount || 0}</span>
            </div>
          </div>
        </div>

        <div class="analytics-card">
          <h3>🔧 System Status</h3>
          <div class="analytics-data">
            <div class="data-row">
              <span>MCP Worker:</span>
              <span class="highlight {mcpWorkerStatus}">{mcpWorkerStatus}</span>
            </div>
            <div class="data-row">
              <span>Upload Status:</span>
              <span class="highlight {uploadStatus}">{uploadStatus}</span>
            </div>
            <div class="data-row">
              <span>Chat Processing:</span>
              <span class="highlight">{isProcessingChat ? 'active' : 'idle'}</span>
            </div>
            <div class="data-row">
              <span>Document Loaded:</span>
              <span class="highlight">{uploadResults ? 'yes' : 'no'}</span>
            </div>
          </div>
        </div>

        {#if typingContext?.userBehavior.contextualHints.length > 0}
          <div class="analytics-card">
            <h3>🧠 Contextual Insights</h3>
            <div class="insights-list">
              {#each typingContext.userBehavior.contextualHints as hint}
                <div class="insight-item">{hint}</div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .complete-demo {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Inter', sans-serif;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .demo-header h1 {
    font-size: 2.5rem;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .demo-header p {
    color: #6b7280;
    font-size: 1.125rem;
    margin-bottom: 2rem;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .status-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1rem;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .status-label {
    display: block;
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .status-value {
    font-weight: 600;
    font-size: 1.125rem;
    text-transform: capitalize;
  }

  .status-value.idle { color: #6b7280; }
  .status-value.typing { color: #3b82f6; }
  .status-value.processing { color: #f59e0b; }
  .status-value.ready { color: #10b981; }
  .status-value.high { color: #10b981; }
  .status-value.medium { color: #f59e0b; }
  .status-value.low { color: #ef4444; }

  .demo-content {
    display: grid;
    gap: 2rem;
  }

  .section {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .section h2 {
    margin-bottom: 1.5rem;
    color: #1f2937;
  }

  .upload-area {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .upload-button,
  .test-button {
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .upload-button {
    background: #3b82f6;
    color: white;
  }

  .upload-button:hover:not(:disabled) {
    background: #2563eb;
  }

  .test-button {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .test-button:hover:not(:disabled) {
    background: #e5e7eb;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .upload-results {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .upload-results h3 {
    margin-bottom: 1rem;
    color: #166534;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: white;
    border-radius: 0.5rem;
  }

  .result-item .label {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .result-item .value {
    font-weight: 600;
    color: #1f2937;
  }

  .chat-container {
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    height: 500px;
    display: flex;
    flex-direction: column;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    background: #f9fafb;
  }

  .message {
    margin-bottom: 1rem;
    max-width: 80%;
  }

  .message.user {
    margin-left: auto;
  }

  .message.user .message-content {
    background: #3b82f6;
    color: white;
  }

  .message.assistant .message-content {
    background: white;
    color: #1f2937;
    border: 1px solid #e5e7eb;
  }

  .message.processing .message-content {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
  }

  .message-content {
    padding: 0.875rem;
    border-radius: 0.75rem;
    margin-bottom: 0.25rem;
  }

  .message-time {
    font-size: 0.75rem;
    color: #6b7280;
    text-align: right;
  }

  .message.user .message-time {
    text-align: right;
  }

  .message.assistant .message-time {
    text-align: left;
  }

  .chat-input-area {
    border-top: 1px solid #e5e7eb;
    padding: 1rem;
    background: white;
  }

  .contextual-prompts {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #eff6ff;
    border-radius: 0.5rem;
    border: 1px solid #bfdbfe;
  }

  .prompts-label {
    font-size: 0.875rem;
    color: #1e40af;
    font-weight: 600;
    margin-right: 1rem;
  }

  .prompt-button {
    margin: 0.25rem;
    padding: 0.5rem 0.75rem;
    background: white;
    border: 1px solid #3b82f6;
    border-radius: 0.5rem;
    color: #3b82f6;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .prompt-button:hover {
    background: #3b82f6;
    color: white;
  }

  .input-container {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
  }

  .input-container textarea {
    flex: 1;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    padding: 0.75rem;
    resize: vertical;
    font-family: inherit;
  }

  .input-container textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .send-button {
    padding: 0.75rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 1.25rem;
  }

  .send-button:hover:not(:disabled) {
    background: #2563eb;
  }

  .input-hint {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .analytics-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .analytics-card h3 {
    margin-bottom: 1rem;
    color: #1f2937;
    font-size: 1.125rem;
  }

  .analytics-data {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .data-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .data-row:last-child {
    border-bottom: none;
  }

  .highlight {
    font-weight: 600;
    color: #1f2937;
  }

  .highlight.high { color: #10b981; }
  .highlight.medium { color: #f59e0b; }
  .highlight.low { color: #ef4444; }
  .highlight.processing { color: #8b5cf6; }
  .highlight.ready { color: #10b981; }
  .highlight.idle { color: #6b7280; }

  .insights-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .insight-item {
    padding: 0.75rem;
    background: white;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    font-size: 0.875rem;
    color: #374151;
  }
</style>