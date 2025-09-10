<!--
  WebSocket Test Page
  Test the DetectiveWebSocketManager functionality
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import DetectiveWebSocketManager, { type CollaborativeUser } from '$lib/websocket/DetectiveWebSocketManager.js';
  
  // Test state
  let wsManager: DetectiveWebSocketManager | null = null;
  let isConnected = $state(false);
  let connectionStatus = $state('Disconnected');
  let collaborativeUsers = $state<CollaborativeUser[]>([]);
  let messageLog = $state<string[]>([]);
  let testCaseId = $state('test-case-123');
  let testMessage = $state('This is a test typing message for detective analysis...');
  let sendTyping = $state(false);
  
  // Mock user data
  const userId = `test-user-${Math.random().toString(36).substr(2, 6)}`;
  
  onMount(() => {
    initializeWebSocket();
  });
  
  onDestroy(() => {
    if (wsManager) {
      wsManager.disconnect();
    }
  });
  
  function initializeWebSocket() {
    try {
      wsManager = new DetectiveWebSocketManager(testCaseId, userId);
      
      // Connection status handler
      wsManager.onConnectionStatus((connected) => {
        isConnected = connected;
        connectionStatus = connected ? 'Connected' : 'Disconnected';
        addToLog(`Connection status: ${connected ? 'Connected' : 'Disconnected'}`);
      });
      
      // User joined handler
      wsManager.onUserJoined((user) => {
        collaborativeUsers = [...collaborativeUsers, user];
        addToLog(`User joined: ${user.name} (${user.id})`);
      });
      
      // User left handler
      wsManager.onUserLeft((userId) => {
        collaborativeUsers = collaborativeUsers.filter(u => u.id !== userId);
        addToLog(`User left: ${userId}`);
      });
      
      // Message handlers
      wsManager.onMessage('user_typing', (data) => {
        addToLog(`User typing: ${data.isTyping ? 'started' : 'stopped'} typing`);
      });
      
      wsManager.onMessage('connection_map_update', (data) => {
        addToLog(`Connection map updated: ${data.action}`);
      });
      
      wsManager.onMessage('evidence_analysis', (data) => {
        addToLog(`Evidence analysis: ${data.evidenceId} - ${data.action}`);
      });
      
      wsManager.onMessage('contextual_prompt', (data) => {
        addToLog(`Contextual prompt: ${data.prompts.join(', ')}`);
      });
      
      // Attempt to connect
      wsManager.connect();
      addToLog('Attempting to connect to WebSocket server...');
      
    } catch (error) {
      addToLog(`WebSocket initialization error: ${error}`);
    }
  }
  
  function addToLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    messageLog = [`[${timestamp}] ${message}`, ...messageLog].slice(0, 20); // Keep last 20 messages
  }
  
  function reconnect() {
    if (wsManager) {
      wsManager.disconnect();
    }
    initializeWebSocket();
  }
  
  function sendTestTyping() {
    if (wsManager) {
      // Mock typing context
      const mockContext = {
        currentText: testMessage,
        lastActivity: Date.now(),
        typingStartTime: Date.now() - 5000,
        typingEndTime: Date.now(),
        typingDuration: 5000,
        charactersTyped: testMessage.length,
        wordsTyped: testMessage.split(' ').length,
        deletionsCount: 0,
        submissionsCount: 0,
        sessionStartTime: Date.now() - 60000,
        userBehavior: {
          avgTypingSpeed: 200,
          avgPauseTime: 1000,
          patternRecognition: ['legal_analysis'],
          contextualHints: ['Consider evidence connections']
        },
        analytics: {
          sessionDuration: 60000,
          totalInteractions: 5,
          typingPatterns: [],
          contextSwitches: 1,
          userEngagement: 'high' as const
        },
        mcpWorkerStatus: 'ready' as const,
        lastProcessedText: '',
        contextualPrompts: []
      };
      
      wsManager.sendTypingUpdate(sendTyping ? 'typing' : 'not_typing', mockContext);
      addToLog(`Sent typing update: ${sendTyping ? 'typing' : 'not typing'}`);
    }
  }
  
  function sendTestConnectionMap() {
    if (wsManager) {
      const mockConnectionMap = {
        nodes: [
          { id: 'evidence_1', label: 'Test Evidence', type: 'evidence' },
          { id: 'person_1', label: 'Test Person', type: 'person' }
        ],
        edges: [
          { id: 'edge_1', source: 'evidence_1', target: 'person_1', weight: 0.8 }
        ],
        clusters: [],
        statistics: { totalNodes: 2, totalEdges: 1 }
      };
      
      const metadata = { generatedAt: new Date().toISOString(), nodeCount: 2 };
      
      wsManager.sendConnectionMapUpdate(mockConnectionMap, metadata);
      addToLog('Sent test connection map update');
    }
  }
  
  function sendTestEvidenceAnalysis() {
    if (wsManager) {
      const analysis = {
        keyTerms: ['legal', 'evidence', 'analysis'],
        classification: 'legal_document',
        importance: 0.8,
        entities: ['Legal Entity', 'Evidence Item'],
        summary: 'Test evidence analysis summary'
      };
      
      wsManager.sendEvidenceAnalysis('test-evidence-123', analysis);
      addToLog('Sent test evidence analysis');
    }
  }
  
  function sendTestContextualPrompt() {
    if (wsManager) {
      const prompts = [
        'Analyze evidence connections?',
        'Generate timeline for this case?',
        'Review suspect relationships?'
      ];
      
      const mockContext = {
        currentText: testMessage,
        lastActivity: Date.now(),
        typingStartTime: Date.now() - 5000,
        typingEndTime: Date.now(),
        typingDuration: 5000,
        charactersTyped: testMessage.length,
        wordsTyped: testMessage.split(' ').length,
        deletionsCount: 0,
        submissionsCount: 0,
        sessionStartTime: Date.now() - 60000,
        userBehavior: {
          avgTypingSpeed: 200,
          avgPauseTime: 1000,
          patternRecognition: ['legal_analysis'],
          contextualHints: prompts
        },
        analytics: {
          sessionDuration: 60000,
          totalInteractions: 5,
          typingPatterns: [],
          contextSwitches: 1,
          userEngagement: 'high' as const
        },
        mcpWorkerStatus: 'ready' as const,
        lastProcessedText: '',
        contextualPrompts: prompts
      };
      
      wsManager.sendContextualPrompt(prompts, mockContext);
      addToLog(`Sent contextual prompts: ${prompts.join(', ')}`);
    }
  }
  
  function clearLog() {
    messageLog = [];
  }
</script>

<svelte:head>
  <title>WebSocket Test - Detective Collaboration</title>
</svelte:head>

<div class="websocket-test">
  <header class="test-header">
    <h1>WebSocket Test - Detective Collaboration</h1>
    <div class="connection-status">
      <span class="status-indicator" class:connected={isConnected}></span>
      <span class="status-text">{connectionStatus}</span>
      {#if !isConnected}
        <button type="button" on:click={reconnect} class="reconnect-btn">Reconnect</button>
      {/if}
    </div>
  </header>

  <main class="test-content">
    <!-- Test Configuration -->
    <section class="test-config">
      <h2>Test Configuration</h2>
      <div class="config-grid">
        <div class="config-item">
          <label for="case-id">Case ID:</label>
          <input id="case-id" type="text" bind:value={testCaseId} readonly />
        </div>
        <div class="config-item">
          <label for="user-id">User ID:</label>
          <input id="user-id" type="text" value={userId} readonly />
        </div>
        <div class="config-item">
          <label for="test-message">Test Message:</label>
          <textarea id="test-message" bind:value={testMessage} rows="3"></textarea>
        </div>
      </div>
    </section>

    <!-- Test Actions -->
    <section class="test-actions">
      <h2>Test Actions</h2>
      <div class="actions-grid">
        <div class="action-group">
          <h3>Typing Simulation</h3>
          <div class="typing-controls">
            <label>
              <input type="checkbox" bind:checked={sendTyping} />
              Simulate typing state
            </label>
            <button type="button" on:click={sendTestTyping} disabled={!isConnected}>
              Send Typing Update
            </button>
          </div>
        </div>
        
        <div class="action-group">
          <h3>Connection Map</h3>
          <button type="button" on:click={sendTestConnectionMap} disabled={!isConnected}>
            Send Test Connection Map
          </button>
        </div>
        
        <div class="action-group">
          <h3>Evidence Analysis</h3>
          <button type="button" on:click={sendTestEvidenceAnalysis} disabled={!isConnected}>
            Send Test Evidence Analysis
          </button>
        </div>
        
        <div class="action-group">
          <h3>Contextual Prompts</h3>
          <button type="button" on:click={sendTestContextualPrompt} disabled={!isConnected}>
            Send Test Contextual Prompts
          </button>
        </div>
      </div>
    </section>

    <!-- Collaborative Users -->
    <section class="collaborative-users">
      <h2>Collaborative Users ({collaborativeUsers.length})</h2>
      {#if collaborativeUsers.length > 0}
        <div class="users-grid">
          {#each collaborativeUsers as user}
            <div class="user-card">
              <div class="user-info">
                <span class="user-name">{user.name}</span>
                <span class="user-id">{user.id}</span>
              </div>
              <div class="user-status">
                {#if user.typing}
                  <span class="typing-indicator">Typing...</span>
                {/if}
                {#if user.currentFocus}
                  <span class="focus-indicator">{user.currentFocus}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="no-users">No other users connected</p>
      {/if}
    </section>

    <!-- Message Log -->
    <section class="message-log">
      <div class="log-header">
        <h2>Message Log ({messageLog.length})</h2>
        <button type="button" on:click={clearLog} class="clear-btn">Clear Log</button>
      </div>
      <div class="log-content">
        {#if messageLog.length > 0}
          {#each messageLog as message}
            <div class="log-entry">{message}</div>
          {/each}
        {:else}
          <div class="no-messages">No messages yet</div>
        {/if}
      </div>
    </section>
  </main>
</div>

<style>
  .websocket-test {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .test-header h1 {
    margin: 0;
    color: #1e293b;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #dc2626;
    transition: background-color 0.3s;
  }

  .status-indicator.connected {
    background: #059669;
  }

  .status-text {
    font-weight: 500;
    color: #374151;
  }

  .reconnect-btn {
    padding: 0.25rem 0.75rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .reconnect-btn:hover {
    background: #2563eb;
  }

  .test-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  section {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  section h2 {
    margin: 0 0 1rem 0;
    color: #1e293b;
    font-size: 1.25rem;
  }

  section h3 {
    margin: 0 0 0.75rem 0;
    color: #374151;
    font-size: 1rem;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .config-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .config-item label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }

  .config-item input,
  .config-item textarea {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-family: monospace;
    font-size: 0.875rem;
  }

  .config-item input:read-only {
    background: #f9fafb;
    color: #6b7280;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .action-group {
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
  }

  .typing-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .typing-controls label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  button:hover:not(:disabled) {
    background: #2563eb;
  }

  button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .users-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  .user-card {
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: #f8fafc;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .user-name {
    font-weight: 500;
    color: #1e293b;
  }

  .user-id {
    font-size: 0.75rem;
    color: #6b7280;
    font-family: monospace;
  }

  .user-status {
    display: flex;
    gap: 0.5rem;
  }

  .typing-indicator {
    font-size: 0.75rem;
    color: #059669;
    font-weight: 500;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .focus-indicator {
    font-size: 0.75rem;
    color: #7c3aed;
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
  }

  .no-users {
    color: #6b7280;
    font-style: italic;
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .clear-btn {
    padding: 0.25rem 0.75rem;
    background: #ef4444;
    font-size: 0.875rem;
  }

  .clear-btn:hover {
    background: #dc2626;
  }

  .log-content {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: #f8fafc;
  }

  .log-entry {
    padding: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
    font-family: monospace;
    font-size: 0.875rem;
    color: #374151;
  }

  .log-entry:last-child {
    border-bottom: none;
  }

  .no-messages {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    font-style: italic;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>