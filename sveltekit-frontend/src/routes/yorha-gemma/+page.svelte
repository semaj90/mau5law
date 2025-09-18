<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { onMount } from 'svelte';
  import { Database, Search, Activity, Brain, Zap, Terminal, User, Bot } from 'lucide-svelte';
  import {
    Button,
    Card,
    Input,
    EmbeddingForm,
    EmbeddingSearch,
    GemmaEmbeddingDemo
  } from '$lib/components/ui/enhanced-bits';

  // YoRHa Detective state
  let activeSection = $state<'chat' | 'embeddings' | 'analysis'>('chat');
  let chatMessages = $state<Array<{
    id: string;
    sender: 'detective' | '9s_assistant';
    content: string;
    timestamp: string;
    processing?: boolean;
  }>>([
    {
      id: '1',
      sender: '9s_assistant',
      content: 'YoRHa AI Assistant Online - Detective Support System Active',
      timestamp: '19:02:52'
    },
    {
      id: '2',
      sender: '9s_assistant',
      content: 'Greetings, Detective. I am 9S, your AI investigation assistant. How may I assist with your case analysis today?',
      timestamp: '19:02:52'
    },
    {
      id: '3',
      sender: '9s_assistant',
      content: 'Hello, Detective! I am 9S, your retro AI investigation assistant. How can',
      timestamp: '19:02:57'
    }
  ]);

  let currentMessage = $state('');
  let isProcessing = $state(false);
  let systemStatus = $state('Operational');
  let activeTime = $state('19:02');

  // Embedding generation state
  let embeddingContent = $state('');
  let embeddingResult = $state<any>(null);
  let isGeneratingEmbedding = $state(false);

  // Search state
  let searchQuery = $state('');
  let searchResults = $state<any[]>([]);
  let isSearching = $state(false);

  // Generate embedding using Gemma API
  async function generateEmbedding() {
    if (!embeddingContent.trim()) return;

    isGeneratingEmbedding = true;

    // Add processing message
    const processingMsg = {
      id: Date.now().toString(),
      sender: '9s_assistant' as const,
      content: '9S IS ANALYZING...',
      timestamp: getCurrentTime(),
      processing: true
    };
    chatMessages.push(processingMsg);

    try {
      const response = await fetch('/api/embeddings/gemma?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: embeddingContent,
          metadata: {
            source: 'yorha_detective',
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();

      if (data.success && data.embedding) {
        embeddingResult = data;

        // Remove processing message and add result
        chatMessages = chatMessages.filter(msg => !msg.processing);
        chatMessages.push({
          id: Date.now().toString(),
          sender: '9s_assistant',
          content: `EMBEDDING ANALYSIS COMPLETE. Generated 512-dimensional vector from ${embeddingContent.length} characters. Vector signature: [${data.embedding.slice(0, 3).map((n: number) => n.toFixed(4)).join(', ')}...]. Data stored in investigation database.`,
          timestamp: getCurrentTime()
        });

        // Store in enhanced database
        await fetch('/api/embeddings/enhanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: embeddingContent,
            embedding: data.embedding,
            metadata: { source: 'yorha_detective', variant: 'investigation' },
            source: 'yorha_terminal'
          })
        });

        embeddingContent = '';
      }
    } catch (error) {
      chatMessages = chatMessages.filter(msg => !msg.processing);
      chatMessages.push({
        id: Date.now().toString(),
        sender: '9s_assistant',
        content: 'ERROR: Gemma API connection failed. Attempting WASM fallback processing...',
        timestamp: getCurrentTime()
      });
    } finally {
      isGeneratingEmbedding = false;
    }
  }

  // Perform semantic search
  async function performSearch() {
    if (!searchQuery.trim()) return;

    isSearching = true;

    chatMessages.push({
      id: Date.now().toString(),
      sender: 'detective',
      content: `Search investigation database: "${searchQuery}"`,
      timestamp: getCurrentTime()
    });

    chatMessages.push({
      id: Date.now().toString(),
      sender: '9s_assistant',
      content: '9S IS ANALYZING...',
      timestamp: getCurrentTime(),
      processing: true
    });

    try {
      // Generate search embedding
      const embeddingResponse = await fetch('/api/embeddings/gemma?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: searchQuery })
      });

      const embeddingData = await embeddingResponse.json();

      if (embeddingData.success) {
        // Search similar content
        const searchResponse = await fetch(
          `/api/embeddings/enhanced?action=search&query=${encodeURIComponent(searchQuery)}&embedding=${encodeURIComponent(JSON.stringify(embeddingData.embedding))}&limit=3&threshold=0.6`
        );

        const searchData = await searchResponse.json();

        chatMessages = chatMessages.filter(msg => !msg.processing);

        if (searchData.success && searchData.data.length > 0) {
          searchResults = searchData.data;

          let resultText = `INVESTIGATION DATABASE SEARCH COMPLETE. Found ${searchData.data.length} relevant entries:\n\n`;
          searchData.data.forEach((result: any, index: number) => {
            const similarity = Math.round(result.similarity * 100);
            const preview = result.content.substring(0, 100);
            resultText += `[${index + 1}] MATCH: ${similarity}% - ${preview}...\n`;
          });

          chatMessages.push({
            id: Date.now().toString(),
            sender: '9s_assistant',
            content: resultText,
            timestamp: getCurrentTime()
          });
        } else {
          chatMessages.push({
            id: Date.now().toString(),
            sender: '9s_assistant',
            content: 'SEARCH COMPLETE. No relevant entries found in investigation database. Consider expanding search parameters.',
            timestamp: getCurrentTime()
          });
        }
      }
    } catch (error) {
      chatMessages = chatMessages.filter(msg => !msg.processing);
      chatMessages.push({
        id: Date.now().toString(),
        sender: '9s_assistant',
        content: 'ERROR: Search operation failed. Database connection unstable.',
        timestamp: getCurrentTime()
      });
    } finally {
      isSearching = false;
      searchQuery = '';
    }
  }

  // Send chat message
  async function sendMessage() {
    if (!currentMessage.trim()) return;

    // Add user message
    chatMessages.push({
      id: Date.now().toString(),
      sender: 'detective',
      content: currentMessage,
      timestamp: getCurrentTime()
    });

    const userMsg = currentMessage;
    currentMessage = '';
    isProcessing = true;

    // Add processing indicator
    chatMessages.push({
      id: Date.now().toString(),
      sender: '9s_assistant',
      content: '9S IS ANALYZING...',
      timestamp: getCurrentTime(),
      processing: true
    });

    // Simulate AI response
    setTimeout(() => {
      chatMessages = chatMessages.filter(msg => !msg.processing);

      let response = '';
      if (userMsg.toLowerCase().includes('embedding') || userMsg.toLowerCase().includes('vector')) {
        response = 'Detective, I can assist with embedding generation using our Gemma-based neural networks. Please provide the text content you wish to analyze, and I will generate a 512-dimensional vector representation for investigation purposes.';
      } else if (userMsg.toLowerCase().includes('search') || userMsg.toLowerCase().includes('find')) {
        response = 'Initiating semantic search protocols. I can search our investigation database using vector similarity matching. What specific content or case details are you looking for?';
      } else if (userMsg.toLowerCase().includes('case') || userMsg.toLowerCase().includes('evidence')) {
        response = 'Accessing case management systems. Our AI-enhanced evidence analysis capabilities include document similarity detection, witness statement correlation, and pattern recognition across multiple case files.';
      } else {
        response = 'Understood, Detective. I am equipped with advanced legal AI capabilities including semantic document analysis, case precedent matching, and evidence correlation. How may I assist with your investigation?';
      }

      chatMessages.push({
        id: Date.now().toString(),
        sender: '9s_assistant',
        content: response,
        timestamp: getCurrentTime()
      });

      isProcessing = false;
    }, 1500);
  }

  function getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Update time every second
  onMount(() => {
    const interval = setInterval(() => {
      activeTime = getCurrentTime().substring(0, 5);
    }, 1000);

    return () => clearInterval(interval);
  });

  // Handle Enter key for messages
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
</script>

<svelte:head>
  <title>YoRHa Detective Command Center | AI Investigation Assistant</title>
</svelte:head>

<div class="yorha-interface">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="yorha-logo">
      <div class="logo-text">YORHA</div>
      <div class="logo-subtitle">DETECTIVE</div>
      <div class="logo-close">×</div>
    </div>

    <div class="interface-label">Investigation Interface</div>

    <nav class="nav-menu">
      <button class="nav-item active">
        <Terminal class="nav-icon" />
        COMMAND CENTER
      </button>

      <button class="nav-item">
        <Database class="nav-icon" />
        ACTIVE CASES <span class="nav-count">3</span>
      </button>

      <button class="nav-item">
        <Search class="nav-icon" />
        EVIDENCE LIBRARY
      </button>

      <button class="nav-item">
        <User class="nav-icon" />
        PERSONS OF INTEREST
      </button>

      <button class="nav-item">
        <Activity class="nav-icon" />
        ANALYSIS CENTER
      </button>

      <button class="nav-item">
        <Brain class="nav-icon" />
        GLOBAL SEARCH
      </button>

      <button class="nav-item active-terminal">
        <Terminal class="nav-icon" />
        TERMINAL
      </button>
    </nav>

    <div class="system-config">
      <button class="config-btn">
        <Database class="nav-icon" />
        SYSTEM CONFIGURATION
      </button>
    </div>

    <div class="system-status">
      <div class="status-line">Online</div>
      <div class="status-time">{activeTime}</div>
      <div class="status-system">System: {systemStatus}</div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    <!-- Header -->
    <header class="main-header">
      <div class="header-title">YORHA COMMAND CENTER</div>
      <div class="header-subtitle">Detective Interface • Neural Network Active</div>

      <div class="header-controls">
        <div class="search-bar">
          <input
            type="text"
            placeholder="Search cases, evidence, persons..."
            class="search-input"
          />
          <select class="search-filter">
            <option>All</option>
          </select>
          <button class="search-btn">🔍</button>
        </div>

        <div class="header-buttons">
          <button class="header-btn">📊</button>
          <button class="header-btn">🔗 LOGIN</button>
          <button class="header-btn">📝 REGISTER</button>
        </div>
      </div>
    </header>

    <!-- Main Interface Section -->
    <section class="main-interface">
      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <Button
          variant={activeSection === 'chat' ? 'evidence' : 'default'}
          nesStyle={true}
          onclick={() => activeSection = 'chat'}
        >
          <Terminal class="tab-icon" />
          ⭐ TERMINAL
        </Button>

        <Button
          variant={activeSection === 'embeddings' ? 'evidence' : 'default'}
          nesStyle={true}
          onclick={() => activeSection = 'embeddings'}
        >
          <Brain class="tab-icon" />
          🤖 AI CHAT
        </Button>

        <Button
          variant={activeSection === 'analysis' ? 'evidence' : 'default'}
          nesStyle={true}
          onclick={() => activeSection = 'analysis'}
        >
          <Activity class="tab-icon" />
          🗑️ CLEAR
        </Button>
      </div>

      <!-- Content Areas -->
      {#if activeSection === 'chat'}
        <!-- Enhanced-Bits Chat Interface -->
        <Card
          title="🤖 9S AI ASSISTANT"
          nesStyle={true}
          variant="evidence"
        >
          {#snippet children()}
            <div class="system-banner nes-container is-dark">
              <p class="nes-text is-success">
                <Bot class="inline-icon" />
                YoRHa AI Assistant Online - Detective Support System Active
              </p>
            </div>

            <div class="chat-messages-container">
              {#each chatMessages as message}
                <div class="nes-container {message.sender === 'detective' ? 'is-rounded' : 'is-dark is-rounded'}">
                  <div class="message-header">
                    <span class="nes-text {message.sender === 'detective' ? 'is-primary' : 'is-success'}">
                      {message.sender === 'detective' ? '🔍 DETECTIVE' : '🤖 9S ASSISTANT'}
                    </span>
                    <span class="nes-text is-disabled">- {message.timestamp}</span>
                  </div>
                  <p class="nes-text message-content {message.processing ? 'processing' : ''}">
                    {message.content}
                  </p>
                </div>
              {/each}
            </div>

            <div class="chat-input-section">
              <div class="input-group">
                <span class="nes-text is-success input-prompt">🔍</span>
                <input
                  type="text"
                  bind:value={currentMessage}
                  onkeydown={handleKeydown}
                  placeholder="Ask 9S about your investigation..."
                  class="nes-input chat-input-field"
                  disabled={isProcessing}
                />
                <Button
                  variant="evidence"
                  nesStyle={true}
                  onclick={sendMessage}
                  disabled={isProcessing || !currentMessage.trim()}
                >
                  {isProcessing ? 'Processing...' : '📤 SEND'}
                </Button>
              </div>
            </div>
          {/snippet}
        </Card>
      {/if}

      {#if activeSection === 'embeddings'}
        <!-- Enhanced-Bits Embedding Interface -->
        <div class="embeddings-grid">
          <Card
            title="🧠 Neural Network Analysis"
            nesStyle={true}
            variant="dark"
          >
            {#snippet children()}
              <EmbeddingForm
                variant="evidence"
                showRecentEmbeddings={false}
                onSuccess={(result) => {
                  chatMessages.push({
                    id: Date.now().toString(),
                    sender: '9s_assistant',
                    content: `EMBEDDING ANALYSIS COMPLETE. Generated 512-dimensional vector. ID: ${result.id}`,
                    timestamp: getCurrentTime()
                  });
                }}
                onError={(error) => {
                  chatMessages.push({
                    id: Date.now().toString(),
                    sender: '9s_assistant',
                    content: `ERROR: ${error}`,
                    timestamp: getCurrentTime()
                  });
                }}
              />
            {/snippet}
          </Card>

          <Card
            title="🔍 Database Investigation"
            nesStyle={true}
            variant="evidence"
          >
            {#snippet children()}
              <EmbeddingSearch
                variant="evidence"
                showAdvanced={true}
                onResultSelect={(result) => {
                  chatMessages.push({
                    id: Date.now().toString(),
                    sender: '9s_assistant',
                    content: `INVESTIGATION RESULT: Found ${Math.round(result.similarity * 100)}% match - ${result.content.substring(0, 100)}...`,
                    timestamp: getCurrentTime()
                  });
                }}
              />
            {/snippet}
          </Card>
        </div>
      {/if}

      {#if activeSection === 'analysis'}
        <!-- Full Gemma Demo -->
        <div class="analysis-container">
          <GemmaEmbeddingDemo
            variant="evidence"
            showAdvancedSearch={true}
          />
        </div>
      {/if}

      <!-- Detective Status Panel -->
      <Card
        title="🔍 DETECTIVE STATUS"
        nesStyle={true}
        variant="dark"
      >
        {#snippet children()}
          <div class="detective-status-content">
            <p class="nes-text is-primary">Time: {getCurrentTime()}</p>
            <p class="nes-text is-success">Status: Online</p>
            <p class="nes-text">System: {systemStatus}</p>
            <div class="status-indicators">
              <span class="nes-badge is-success">AI Active</span>
              <span class="nes-badge {isProcessing ? 'is-warning' : 'is-primary'}">
                {isProcessing ? 'Processing' : 'Ready'}
              </span>
            </div>
          </div>
        {/snippet}
      </Card>
    </section>
  </main>
</div>

<style>
  .yorha-interface {
    display: flex;
    height: 100vh;
    background: #2c2c2c;
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    overflow: hidden;
  }

  /* Sidebar */
  .sidebar {
    width: 200px;
    background: #3d3d3d;
    border-right: 1px solid #555;
    display: flex;
    flex-direction: column;
  }

  .yorha-logo {
    background: #4a4a4a;
    padding: 10px;
    border-bottom: 1px solid #555;
    position: relative;
  }

  .logo-text {
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
  }

  .logo-subtitle {
    font-size: 11px;
    color: #cccccc;
  }

  .logo-close {
    position: absolute;
    right: 10px;
    top: 10px;
    cursor: pointer;
  }

  .interface-label {
    padding: 8px 10px;
    font-size: 11px;
    color: #888;
    border-bottom: 1px solid #555;
  }

  .nav-menu {
    flex: 1;
    padding: 5px 0;
  }

  .nav-item {
    width: 100%;
    background: none;
    border: none;
    color: #cccccc;
    padding: 8px 15px;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    font-size: 11px;
    transition: background-color 0.2s;
  }

  .nav-item:hover {
    background: #4a4a4a;
  }

  .nav-item.active {
    background: #5a5a5a;
    color: #ffffff;
  }

  .nav-item.active-terminal {
    background: #2a2a2a;
    color: #ffffff;
  }

  .nav-icon {
    width: 12px;
    height: 12px;
  }

  .nav-count {
    margin-left: auto;
    background: #666;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
  }

  .system-config {
    border-top: 1px solid #555;
    padding: 5px 0;
  }

  .config-btn {
    width: 100%;
    background: none;
    border: none;
    color: #cccccc;
    padding: 8px 15px;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    font-size: 11px;
  }

  .system-status {
    border-top: 1px solid #555;
    padding: 10px;
    font-size: 10px;
    color: #888;
  }

  .status-line {
    color: #4CAF50;
  }

  /* Main Content */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #2c2c2c;
  }

  .main-header {
    background: #3d3d3d;
    border-bottom: 1px solid #555;
    padding: 10px 20px;
  }

  .header-title {
    font-size: 18px;
    font-weight: bold;
    color: #ffffff;
  }

  .header-subtitle {
    font-size: 11px;
    color: #888;
    margin-bottom: 10px;
  }

  .header-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .search-bar {
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .search-input {
    background: #2c2c2c;
    border: 1px solid #555;
    color: #ffffff;
    padding: 5px 10px;
    width: 300px;
    font-family: inherit;
    font-size: 11px;
  }

  .search-filter {
    background: #2c2c2c;
    border: 1px solid #555;
    color: #ffffff;
    padding: 5px;
    font-family: inherit;
    font-size: 11px;
  }

  .search-btn {
    background: #4a4a4a;
    border: 1px solid #666;
    color: #ffffff;
    padding: 5px 10px;
    cursor: pointer;
    font-family: inherit;
  }

  .header-buttons {
    display: flex;
    gap: 10px;
  }

  .header-btn {
    background: #4a4a4a;
    border: 1px solid #666;
    color: #ffffff;
    padding: 5px 10px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
  }

  /* Main Interface Section */
  .main-interface {
    flex: 1;
    margin: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .tab-navigation {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 20px;
  }

  .tab-icon {
    width: 14px;
    height: 14px;
    margin-right: 5px;
  }

  .embeddings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .analysis-container {
    width: 100%;
  }

  .chat-messages-container {
    max-height: 400px;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 11px;
  }

  .message-content {
    white-space: pre-wrap;
    line-height: 1.4;
  }

  .message-content.processing {
    animation: pulse 1.5s infinite;
  }

  .chat-input-section {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #333;
  }

  .input-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .input-prompt {
    font-weight: bold;
  }

  .chat-input-field {
    flex: 1;
  }

  .detective-status-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .status-indicators {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .inline-icon {
    width: 16px;
    height: 16px;
    display: inline;
    vertical-align: text-bottom;
    margin-right: 5px;
  }

  .chat-container {
    flex: 1;
    background: #1a1a1a;
    border: 2px solid #4CAF50;
    display: flex;
    flex-direction: column;
  }

  .chat-header {
    background: #2a2a2a;
    padding: 10px 15px;
    border-bottom: 1px solid #4CAF50;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .chat-title {
    font-size: 14px;
    font-weight: bold;
    color: #4CAF50;
    margin-left: 10px;
  }

  .chat-icon {
    width: 16px;
    height: 16px;
    color: #4CAF50;
  }

  .chat-controls {
    display: flex;
    gap: 10px;
  }

  .chat-control-btn {
    background: #3a3a3a;
    border: 1px solid #555;
    color: #ffffff;
    padding: 4px 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 10px;
  }

  .chat-control-btn.active {
    background: #4CAF50;
    color: #000000;
  }

  .assistant-header {
    background: #2a2a2a;
    padding: 8px 15px;
    border-bottom: 1px solid #4CAF50;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .assistant-icon {
    width: 14px;
    height: 14px;
    color: #4CAF50;
  }

  .assistant-title {
    color: #4CAF50;
    font-size: 12px;
    font-weight: bold;
  }

  .system-banner {
    background: #0d4d0d;
    padding: 8px 15px;
    color: #4CAF50;
    font-size: 11px;
    border-bottom: 1px solid #4CAF50;
  }

  .chat-messages {
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    min-height: 400px;
  }

  .message {
    margin-bottom: 15px;
    border: 1px solid #333;
    background: #1f1f1f;
  }

  .message.assistant-9s {
    border-color: #4CAF50;
  }

  .message.detective {
    border-color: #666;
    margin-left: 50px;
  }

  .message-header {
    background: #2a2a2a;
    padding: 5px 10px;
    font-size: 10px;
    color: #888;
  }

  .message-sender {
    color: #4CAF50;
    font-weight: bold;
  }

  .message-content {
    padding: 10px;
    line-height: 1.4;
    white-space: pre-wrap;
  }

  .message-content.processing {
    color: #4CAF50;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .chat-input-area {
    border-top: 1px solid #4CAF50;
    background: #2a2a2a;
    padding: 10px 15px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .input-prompt {
    color: #4CAF50;
    font-weight: bold;
  }

  .chat-input {
    flex: 1;
    background: #1a1a1a;
    border: 1px solid #555;
    color: #ffffff;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 12px;
  }

  .chat-input:focus {
    outline: none;
    border-color: #4CAF50;
  }

  .send-btn {
    background: #4CAF50;
    border: none;
    color: #000000;
    padding: 8px 15px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    font-weight: bold;
  }

  .send-btn:disabled {
    background: #333;
    color: #666;
    cursor: not-allowed;
  }

  /* Detective Panel */
  .detective-panel {
    width: 250px;
    background: #1a1a1a;
    border: 1px solid #555;
  }

  .detective-info {
    padding: 15px;
  }

  .detective-header {
    color: #4CAF50;
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 5px;
  }

  .detective-status {
    color: #888;
    font-size: 11px;
  }

  /* Quick Actions */
  .quick-actions {
    padding: 20px;
    background: #1a1a1a;
    border-top: 1px solid #555;
  }

  .action-group {
    margin-bottom: 20px;
  }

  .action-group h3 {
    color: #4CAF50;
    margin-bottom: 10px;
    font-size: 12px;
  }

  .action-textarea {
    width: 100%;
    height: 80px;
    background: #2a2a2a;
    border: 1px solid #555;
    color: #ffffff;
    padding: 8px;
    font-family: inherit;
    font-size: 11px;
    resize: none;
  }

  .action-input {
    width: 100%;
    background: #2a2a2a;
    border: 1px solid #555;
    color: #ffffff;
    padding: 8px;
    font-family: inherit;
    font-size: 11px;
  }

  .action-btn {
    background: #4CAF50;
    border: none;
    color: #000000;
    padding: 8px 15px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    margin-top: 5px;
  }

  .action-btn:disabled {
    background: #333;
    color: #666;
    cursor: not-allowed;
  }

  /* Enhanced-Bits + YoRHa Theme Integration */
  :global(.yorha-interface .nes-container) {
    background: #1a1a1a;
    border-color: #4CAF50;
    color: #ffffff;
  }

  :global(.yorha-interface .nes-container.is-dark) {
    background: #0d1a0d;
    border-color: #4CAF50;
  }

  :global(.yorha-interface .nes-container.is-rounded) {
    background: #2a2a2a;
    border-color: #333;
  }

  :global(.yorha-interface .nes-btn) {
    background: #2a2a2a;
    border-color: #4CAF50;
    color: #ffffff;
    font-family: 'Courier New', monospace;
  }

  :global(.yorha-interface .nes-btn.is-primary) {
    background: #4CAF50;
    border-color: #4CAF50;
    color: #000000;
  }

  :global(.yorha-interface .nes-btn:hover) {
    background: #3a3a3a;
  }

  :global(.yorha-interface .nes-input) {
    background: #1a1a1a;
    border-color: #4CAF50;
    color: #ffffff;
    font-family: 'Courier New', monospace;
  }

  :global(.yorha-interface .nes-input:focus) {
    border-color: #66ff66;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
  }

  :global(.yorha-interface .nes-textarea) {
    background: #1a1a1a;
    border-color: #4CAF50;
    color: #ffffff;
    font-family: 'Courier New', monospace;
  }

  :global(.yorha-interface .nes-text.is-success) {
    color: #4CAF50;
  }

  :global(.yorha-interface .nes-text.is-primary) {
    color: #66b3ff;
  }

  :global(.yorha-interface .nes-text.is-warning) {
    color: #ffcc00;
  }

  :global(.yorha-interface .nes-text.is-error) {
    color: #ff6666;
  }

  :global(.yorha-interface .nes-text.is-disabled) {
    color: #666;
  }

  :global(.yorha-interface .nes-badge) {
    font-family: 'Courier New', monospace;
    font-size: 10px;
  }

  :global(.yorha-interface .nes-badge.is-success) {
    background: #4CAF50;
    color: #000000;
  }

  :global(.yorha-interface .nes-badge.is-primary) {
    background: #66b3ff;
    color: #000000;
  }

  :global(.yorha-interface .nes-badge.is-warning) {
    background: #ffcc00;
    color: #000000;
  }

  /* System Banner Styling */
  .system-banner {
    margin-bottom: 15px;
  }

  /* Enhanced-Bits Card Overrides */
  :global(.yorha-interface .enhanced-bits-card) {
    background: #1a1a1a;
    border: 2px solid #4CAF50;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .sidebar {
      width: 150px;
    }

    .main-interface {
      margin: 10px;
    }

    .embeddings-grid {
      grid-template-columns: 1fr;
    }

    .tab-navigation {
      flex-wrap: wrap;
    }
  }

  @media (max-width: 768px) {
    .sidebar {
      width: 120px;
    }

    .nav-item {
      font-size: 10px;
      padding: 6px 10px;
    }

    .header-controls {
      flex-direction: column;
      gap: 10px;
    }

    .search-bar {
      width: 100%;
    }

    .search-input {
      width: 100%;
    }
  }
</style>