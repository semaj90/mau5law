<!--
  Decoupled Architecture Example
  
  This component demonstrates the complete separation of:
  1. Logic Layer (stores/services)
  2. Presentation Layer (accessibility actions)  
  3. UI Layer (dumb Svelte component)
-->

<script lang="ts">
  import { onMount } from 'svelte';
  
  // Logic Layer imports
  import { 
    langchainService, 
    documentProcessing, 
    langchainServiceLogic 
  } from '$lib/stores/langchain-service-store.js';
  import { createChatAdapter } from '$lib/stores/component-adapter-store.js';
  import { createMachineService } from '$lib/stores/xstate-service-adapter.js';
  
  // Presentation Layer imports
  import { 
    accessibleClick, 
    focusManagement, 
    ariaState,
    compositeActions,
    a11yUtils
  } from '$lib/actions/accessibility-actions.js';

  // ===== LOGIC LAYER =====
  // Pure reactive state, no UI concerns
  
  $: langchainState = $langchainService;
  $: documentState = $documentProcessing;
  
  // Chat adapter for complex state management
  const chatAdapter = createChatAdapter([
    { role: 'assistant', content: 'Hello! I can help you with legal document analysis.' }
  ]);
  
  $: chatState = chatAdapter.state;
  
  // Document processing logic
  let documentText = '';
  let isProcessing = false;
  
  async function processDocument() {
    if (!documentText.trim()) return;
    
    isProcessing = true;
    try {
      await langchainServiceLogic.processDocument(documentText, 'contract');
    } finally {
      isProcessing = false;
    }
  }
  
  async function sendMessage() {
    const input = $chatState.data.currentInput;
    if (!input.trim()) return;
    
    chatAdapter.actions.addMessage({ role: 'user', content: input });
    chatAdapter.actions.updateInput('');
    chatAdapter.actions.setTyping(true);
    
    try {
      await langchainServiceLogic.processDocument(input, 'case');
      const result = $documentProcessing.result;
      
      if (result?.summary) {
        chatAdapter.actions.addMessage({ 
          role: 'assistant', 
          content: result.summary 
        });
      }
    } finally {
      chatAdapter.actions.setTyping(false);
    }
  }
  
  // ===== PRESENTATION LAYER =====
  // Accessibility and interaction logic, no business logic
  
  let dialogOpen = false;
  let chatInput: HTMLInputElement;
  
  // Clean handler functions (pure logic)
  const handlers = {
    openDialog: () => dialogOpen = true,
    closeDialog: () => dialogOpen = false,
    clearChat: () => chatAdapter.actions.reset(),
    focusInput: () => chatInput?.focus()
  };
  
  // Computed ARIA state (derived from logic)
  $: ariaProps = {
    expanded: dialogOpen,
    disabled: isProcessing || !langchainState.isAvailable,
    label: isProcessing ? 'Processing document...' : 'Analyze document',
    live: isProcessing ? 'polite' : 'off'
  };
  
  onMount(() => {
    // Announce service availability
    if (langchainState.isAvailable) {
      a11yUtils.announce('Legal AI service is ready');
    }
  });
</script>

<!-- ===== UI LAYER ===== -->
<!-- Pure presentation, no logic or state management -->

<div class="legal-ai-demo">
  <header>
    <h1>Legal AI Document Analyzer</h1>
    <p class="status" aria-live="polite">
      {#if !langchainState.isAvailable}
        Service unavailable
      {:else if isProcessing}
        Processing document...
      {:else}
        Ready for analysis
      {/if}
    </p>
  </header>

  <!-- Document Input Section -->
  <section class="document-input">
    <label for="document-text">Legal Document Text</label>
    <textarea
      id="document-text"
      bind:value={documentText}
      disabled={isProcessing}
      placeholder="Paste your legal document here for analysis..."
      rows="8"
      class="document-textarea"
    />
    
    <!-- Process Button with Accessibility Action -->
    <button
      use:accessibleClick={{
        handler: processDocument,
        label: ariaProps.label,
        disabled: ariaProps.disabled
      }}
      use:ariaState={ariaProps}
      disabled={isProcessing || !documentText.trim()}
      class="process-btn"
    >
      {#if isProcessing}
        <span aria-hidden="true">⟳</span> Processing...
      {:else}
        📄 Analyze Document
      {/if}
    </button>
  </section>

  <!-- Results Section -->
  {#if documentState.result}
    <section class="results" aria-labelledby="results-heading">
      <h2 id="results-heading">Analysis Results</h2>
      
      <div class="result-grid">
        <div class="result-card">
          <h3>Summary</h3>
          <p>{documentState.result.summary}</p>
        </div>
        
        {#if documentState.result.keyTerms?.length}
          <div class="result-card">
            <h3>Key Terms</h3>
            <ul>
              {#each documentState.result.keyTerms as term}
                <li>{term}</li>
              {/each}
            </ul>
          </div>
        {/if}
        
        {#if documentState.result.entities?.length}
          <div class="result-card">
            <h3>Legal Entities</h3>
            <ul>
              {#each documentState.result.entities as entity}
                <li>{entity.text || entity}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Chat Interface -->
  <section class="chat-section">
    <button
      use:accessibleClick={{
        handler: handlers.openDialog,
        label: 'Open AI chat assistant'
      }}
      class="chat-toggle"
    >
      💬 Chat with AI
    </button>
    
    <!-- Chat Dialog with Composite Accessibility -->
    {#if dialogOpen}
      <div
        class="chat-dialog"
        use:compositeActions.modal={{
          onClose: handlers.closeDialog,
          title: 'Legal AI Assistant',
          description: 'Chat with the AI about your legal documents'
        }}
      >
        <div class="chat-header">
          <h2 id="chat-title">Legal AI Assistant</h2>
          <button
            use:accessibleClick={{
              handler: handlers.closeDialog,
              label: 'Close chat'
            }}
            class="close-btn"
            type="button"
          >
            ✕
          </button>
        </div>
        
        <div class="chat-messages" role="log" aria-label="Chat messages">
          {#each $chatState.data.messages as message}
            <div 
              class="message {message.role}"
              role="listitem"
            >
              <strong>{message.role === 'user' ? 'You' : 'AI'}:</strong>
              {message.content}
            </div>
          {/each}
          
          {#if $chatState.data.isTyping}
            <div class="message assistant typing" aria-live="polite">
              <strong>AI:</strong> <span aria-label="AI is typing">⟳ Thinking...</span>
            </div>
          {/if}
        </div>
        
        <div class="chat-input">
          <input
            bind:this={chatInput}
            bind:value={$chatState.data.currentInput}
            on:keydown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about legal documents..."
            aria-label="Chat message input"
            disabled={$chatState.data.isTyping}
          />
          <button
            use:accessibleClick={{
              handler: sendMessage,
              label: 'Send message',
              disabled: $chatState.data.isTyping || !$chatState.data.currentInput.trim()
            }}
            disabled={$chatState.data.isTyping || !$chatState.data.currentInput.trim()}
          >
            Send
          </button>
        </div>
      </div>
      
      <!-- Dialog backdrop -->
      <div 
        class="dialog-overlay"
        use:accessibleClick={{
          handler: handlers.closeDialog,
          label: 'Close dialog'
        }}
        role="button"
        tabindex="0"
      />
    {/if}
  </section>

  <!-- Error Display -->
  {#if langchainState.error || documentState.error || $chatState.error}
    <div 
      class="error-banner" 
      role="alert"
      aria-live="assertive"
    >
      <strong>Error:</strong>
      {langchainState.error || documentState.error || $chatState.error}
    </div>
  {/if}
</div>

<style>
  .legal-ai-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }
  
  .status {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 500;
  }
  
  .document-input {
    margin: 2rem 0;
  }
  
  .document-textarea {
    width: 100%;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
    resize: vertical;
  }
  
  .process-btn {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .process-btn:hover:not(:disabled) {
    background: #0052a3;
  }
  
  .process-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .results {
    margin: 2rem 0;
    padding: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #f9f9f9;
  }
  
  .result-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .result-card {
    background: white;
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }
  
  .chat-toggle {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.2s;
  }
  
  .chat-toggle:hover {
    transform: translateY(-2px);
  }
  
  .chat-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 600px;
    height: 80vh;
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 1001;
    display: flex;
    flex-direction: column;
  }
  
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
  }
  
  .close-btn:hover {
    background: #f0f0f0;
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .message {
    padding: 0.75rem;
    border-radius: 8px;
    max-width: 80%;
  }
  
  .message.user {
    background: #e3f2fd;
    align-self: flex-end;
  }
  
  .message.assistant {
    background: #f5f5f5;
    align-self: flex-start;
  }
  
  .message.typing {
    opacity: 0.7;
    font-style: italic;
  }
  
  .chat-input {
    display: flex;
    padding: 1rem;
    border-top: 1px solid #e0e0e0;
    gap: 0.5rem;
  }
  
  .chat-input input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .chat-input button {
    padding: 0.75rem 1.5rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
  }
  
  .error-banner {
    margin: 1rem 0;
    padding: 1rem;
    background: #ffebee;
    border: 1px solid #f44336;
    border-radius: 4px;
    color: #c62828;
  }
  
  /* Accessibility: Enhanced focus styles for interactive elements */
  [role="button"]:focus-visible,
  [role="dialog"]:focus-visible {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
    border-radius: 4px;
  }

  .dialog-overlay[role="button"] {
    cursor: pointer;
    user-select: none;
  }
</style>