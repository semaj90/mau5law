<script lang="ts">
  import type { OllamaGetEndpoint  } from '$lib/server/ollama/client';
  import type { webgpuCapabilities  } from '$lib/webgpu/webgpu-init';
  import type { onMount  } from 'svelte';

  let commandInput = $state ('');
  let terminalHistory = $state <any[]>([]);
  let isProcessing = $state (false);
  let currentMode = $state <'chat' | 'command' | 'analysis'>('chat');
  let terminalRef: HTMLDivElement;

  // Terminal modes
  const terminalModes = [
    { id: 'chat', label: 'AI CHAT', icon: '💬', description: 'Natural language conversation' },
    { id: 'command', label: 'COMMANDS', icon: '⚡', description: 'System commands and queries' },
    { id: 'analysis', label: 'ANALYSIS', icon: '🔬', description: 'Legal analysis and reasoning' }
  ];

  // Command history
  let commandHistory = $state <string[]>([]);
  let historyIndex = $state (-1);

  // Available commands
  const availableCommands = {
    help: 'Show available commands',
    clear: 'Clear terminal history',
    status: 'Show system status',
    search: 'Search database (usage: search <query>)',
    analyze: 'Analyze evidence (usage: analyze <evidence_id>)',
    cases: 'List active cases',
    persons: 'List persons of interest',
    evidence: 'List evidence items',
    gpu: 'Show GPU status',
    memory: 'Show memory usage'
  };

  async function processInput() {
    if (!commandInput.trim() || isProcessing) return;

    const input = commandInput.trim();
    commandInput = '';
    commandHistory = [input, ...commandHistory];
    historyIndex = -1;

    // Add user input to history
    terminalHistory = [...terminalHistory, {
      type: 'input',
      content: input,
      timestamp: new Date(),
      mode: currentMode
    }];

    isProcessing = true;

    try {
      let response: string;

      if (currentMode === 'command') {
        response = await processCommand(input);
      } else {
        response = await processAIQuery(input);
      }

      terminalHistory = [...terminalHistory, {
        type: 'output',
        content: response,
        timestamp: new Date(),
        mode: currentMode
      }];
    } catch (error) {
      terminalHistory = [...terminalHistory, {
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        mode: currentMode
      }];
    } finally {
      isProcessing = false;
    }

    // Auto-scroll to bottom
    setTimeout(() => {
      if (terminalRef) {
        terminalRef.scrollTop = terminalRef.scrollHeight;
      }
    }, 100);
  }

  async function processCommand(input: string): Promise<string> {
    const parts = input.toLowerCase().split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case 'help':
        return Object.entries(availableCommands)
          .map(([cmd, desc]) => `${cmd.padEnd(10)} - ${desc}`)
          .join('\n');

      case 'clear':
        terminalHistory = [];
        return 'Terminal cleared.';

      case 'status':
        return `System Status:
GPU: ${webgpuCapabilities?.hasWebGPU ? 'Available' : 'Unavailable'}
Mode: ${currentMode.toUpperCase()}
History: ${terminalHistory.length} entries
Time: ${new Date().toLocaleString()}`;

      case 'search':
        if (!args.length) return 'Usage: search <query>';
        return `Searching for: "${args.join(' ')}"\nFound 3 results (mock data)`;

      case 'analyze':
        if (!args.length) return 'Usage: analyze <evidence_id>';
        return `Analyzing evidence ${args[0]}...\nAnalysis complete. Confidence: 87%`;

      case 'cases':
        return `Active Cases:
1. Corporate Fraud Investigation (High Priority)
2. Money Laundering Ring (Critical)
3. Cyber Crime Network (Medium)`;

      case 'persons':
        return `Persons of Interest:
1. John Doe - Wanted (High Threat)
2. Maria Smith - Monitoring (Medium Threat)
3. Victor Kane - Cooperative (Low Threat)`;

      case 'evidence':
        return `Evidence Items:
1. Financial Records (Verified)
2. Surveillance Footage (Analyzed)
3. Digital Communications (Flagged)`;

      case 'gpu':
        return `GPU Status:
WebGPU: ${webgpuCapabilities?.hasWebGPU ? 'Enabled' : 'Disabled'}
CUDA: Available
Memory: 8GB VRAM
Utilization: 45%`;

      case 'memory':
        return `Memory Usage:
System RAM: 16GB
Used: 12GB (75%)
Available: 4GB
GPU Memory: 8GB VRAM`;

      default:
        return `Unknown command: ${command}. Type 'help' for available commands.`;
    }
  }

  async function processAIQuery(input: string): Promise<string> {
    const endpoint = await OllamaGetEndpoint();

    const systemPrompt = currentMode === 'analysis'
      ? 'You are a legal AI assistant specializing in criminal investigation and evidence analysis. Provide detailed, professional analysis.'
      : 'You are an AI assistant for a legal investigation platform. Be helpful, professional, and focused on legal matters.';

    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3-legal:latest',
        prompt: `${systemPrompt}\n\nUser: ${input}\n\nAssistant:`,
        stream: false
      })
    });

    const result = await response.json();
    return result.response;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      processInput();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (commandHistory.length > 0) {
        historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        commandInput = commandHistory[historyIndex];
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        commandInput = commandHistory[historyIndex];
      } else if (historyIndex === 0) {
        historyIndex = -1;
        commandInput = '';
      }
    }
  }

  function clearTerminal() {
    terminalHistory = [];
  }

  function exportHistory() {
    const historyText = terminalHistory
      .map(entry => `[${entry.timestamp.toLocaleTimeString()}] ${entry.type.toUpperCase()}: ${entry.content}`)
      .join('\n');

    const blob = new Blob([historyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-history-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Initialize with welcome message
  onMount(() => {
    terminalHistory = [{
      type: 'system',
      content: `YoRHa Legal AI Terminal v2.0
Type 'help' for available commands.
Current mode: ${currentMode.toUpperCase()}`,
      timestamp: new Date(),
      mode: 'system'
    }];
  });
</script>

<main class="terminal-interface">
  <!-- Header -->
  <header class="terminal-header">
    <div class="header-title">
      <h1>AI TERMINAL</h1>
      <div class="terminal-status">
        <span class="status-indicator {webgpuCapabilities?.hasWebGPU ? 'active' : 'inactive'}">
          {webgpuCapabilities?.hasWebGPU ? 'GPU ACCELERATED' : 'CPU MODE'}
        </span>
        <span class="mode-indicator">{currentMode.toUpperCase()}</span>
      </div>
    </div>
    <div class="terminal-controls">
      <div class="mode-selector">
        {#each terminalModes as mode}
          <button
            class="mode-btn {currentMode === mode.id ? 'active' : ''}"
            onclick={() => currentMode = mode.id}
            title={mode.description}
          >
            <span class="mode-icon">{mode.icon}</span>
            <span class="mode-label">{mode.label}</span>
          </button>
        {/each}
      </div>
      <div class="terminal-actions">
        <button class="action-btn" onclick={clearTerminal} title="Clear Terminal">
          🗑️
        </button>
        <button class="action-btn" onclick={exportHistory} title="Export History">
          💾
        </button>
      </div>
    </div>
  </header>

  <!-- Terminal Display -->
  <div class="terminal-layout">
    <section class="terminal-display" bind:this={terminalRef}>
      <div class="terminal-output">
        {#each terminalHistory as entry}
          <div class="terminal-line {entry.type}">
            <span class="timestamp">[{entry.timestamp.toLocaleTimeString()}]</span>
            <span class="line-type {entry.type}">{entry.type.toUpperCase()}:</span>
            <span class="line-content">{entry.content}</span>
          </div>
        {/each}
        {#if isProcessing}
          <div class="terminal-line processing">
            <span class="timestamp">[{new Date().toLocaleTimeString()}]</span>
            <span class="line-type processing">PROCESSING:</span>
            <span class="line-content">
              <span class="processing-indicator"></span>
              Analyzing query...
            </span>
          </div>
        {/if}
      </div>
    </section>

    <!-- Command Input -->
    <section class="command-input-section">
      <div class="input-container">
        <span class="prompt">
          {currentMode === 'command' ? '>' : currentMode === 'analysis' ? '🔬' : '💬'}
        </span>
        <textarea
          class="command-input"
          placeholder={
            currentMode === 'command'
              ? "Enter command (type 'help' for commands)..."
              : currentMode === 'analysis'
              ? "Enter legal analysis query..."
              : "Ask me anything about the investigation..."
          }
          bind:value={commandInput}
          onkeydown={handleKeydown}
          rows="1"
          disabled={isProcessing}
        ></textarea>
        <button
          class="send-btn {isProcessing ? 'processing' : ''}"
          onclick={processInput}
          disabled={!commandInput.trim() || isProcessing}
        >
          {#if isProcessing}
            <span class="loading-spinner"></span>
          {:else}
            SEND
          {/if}
        </button>
      </div>
      <div class="input-hints">
        {#if currentMode === 'command'}
          <span class="hint">💡 Use ↑↓ arrows for command history</span>
        {:else}
          <span class="hint">💡 AI-powered {currentMode} mode active</span>
        {/if}
      </div>
    </section>

    <!-- Quick Commands Panel -->
    <aside class="quick-commands">
      <div class="commands-header">
        <h3>QUICK COMMANDS</h3>
      </div>
      <div class="commands-list">
        <button class="quick-cmd" onclick={() => { commandInput = 'status'; processInput(); }}>
          <span class="cmd-icon">📊</span>
          <span class="cmd-text">System Status</span>
        </button>
        <button class="quick-cmd" onclick={() => { commandInput = 'cases'; processInput(); }}>
          <span class="cmd-icon">📋</span>
          <span class="cmd-text">Active Cases</span>
        </button>
        <button class="quick-cmd" onclick={() => { commandInput = 'persons'; processInput(); }}>
          <span class="cmd-icon">👥</span>
          <span class="cmd-text">Persons of Interest</span>
        </button>
        <button class="quick-cmd" onclick={() => { commandInput = 'evidence'; processInput(); }}>
          <span class="cmd-icon">🔍</span>
          <span class="cmd-text">Evidence Items</span>
        </button>
        <button class="quick-cmd" onclick={() => { commandInput = 'gpu'; processInput(); }}>
          <span class="cmd-icon">🔋</span>
          <span class="cmd-text">GPU Status</span>
        </button>
        <button class="quick-cmd" onclick={() => { commandInput = 'help'; processInput(); }}>
          <span class="cmd-icon">❓</span>
          <span class="cmd-text">Help</span>
        </button>
      </div>
    </aside>
  </div>
</main>

<style>
  .terminal-interface {
    background: linear-gradient(135deg, #0d1117, #161b22);
    min-height: 100vh;
    color: #f0f6fc;
    font-family: 'JetBrains Mono', monospace;
    position: relative;
  }

  .terminal-interface::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
      linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px),
      linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
    z-index: -1;
  }

  .terminal-header {
    background: rgba(0, 0, 0, 0.8);
    border-bottom: 2px solid #10b981;
    padding: 1rem 2rem;
    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.2);
  }

  .header-title h1 {
    color: #10b981;
    font-family: 'Press Start 2P', cursive;
    font-size: 2rem;
    margin: 0;
    text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
  }

  .terminal-status {
    margin-top: 0.5rem;
    display: flex;
    gap: 1rem;
  }

  .status-indicator,
  .mode-indicator {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    border-radius: 4px;
    font-weight: bold;
  }

  .status-indicator.active {
    background: #10b981;
    color: #0d1117;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
  }

  .status-indicator.inactive {
    background: #6b7280;
    color: #f9fafb;
  }

  .mode-indicator {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid #10b981;
  }

  .terminal-controls {
    margin-top: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mode-selector {
    display: flex;
    gap: 0.5rem;
  }

  .mode-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #6b7280;
    color: #f0f6fc;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .mode-btn:hover,
  .mode-btn.active {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
  }

  .mode-icon {
    font-size: 1.25rem;
  }

  .terminal-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.5rem;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #6b7280;
    color: #f0f6fc;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .action-btn:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
  }

  .terminal-layout {
    display: grid;
    grid-template-columns: 1fr 250px;
    grid-template-rows: 1fr auto;
    height: calc(100vh - 140px);
    gap: 1rem;
    padding: 1rem;
  }

  .terminal-display {
    grid-column: 1;
    grid-row: 1;
    background: rgba(13, 17, 23, 0.9);
    border: 2px solid #10b981;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1);
    overflow-y: auto;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .terminal-output {
    min-height: 100%;
  }

  .terminal-line {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    word-wrap: break-word;
  }

  .timestamp {
    color: #6b7280;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .line-type {
    font-weight: bold;
    flex-shrink: 0;
    min-width: 80px;
  }

  .line-type.input {
    color: #10b981;
  }

  .line-type.output {
    color: #34d399;
  }

  .line-type.error {
    color: #dc2626;
  }

  .line-type.system {
    color: #f59e0b;
  }

  .line-type.processing {
    color: #8b5cf6;
  }

  .line-content {
    flex: 1;
    white-space: pre-wrap;
  }

  .processing-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid #8b5cf6;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s ease-in-out infinite;
    margin-right: 0.5rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .command-input-section {
    grid-column: 1;
    grid-row: 2;
    background: rgba(13, 17, 23, 0.9);
    border: 2px solid #10b981;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1);
  }

  .input-container {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
  }

  .prompt {
    color: #10b981;
    font-size: 1.25rem;
    font-weight: bold;
    flex-shrink: 0;
  }

  .command-input {
    flex: 1;
    min-height: 40px;
    max-height: 120px;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #6b7280;
    border-radius: 4px;
    color: #f0f6fc;
    font-family: 'JetBrains Mono', monospace;
    padding: 0.75rem;
    resize: vertical;
    font-size: 0.875rem;
  }

  .command-input:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
  }

  .command-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-btn {
    padding: 0.75rem 1rem;
    background: linear-gradient(90deg, #10b981, #34d399);
    border: none;
    border-radius: 4px;
    color: #0d1117;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  .send-btn:hover:not(:disabled) {
    filter: brightness(0.95);
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
  }

  .send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-btn.processing {
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
  }

  .loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid #0d1117;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s ease-in-out infinite;
    margin-right: 0.5rem;
  }

  .input-hints {
    margin-top: 0.5rem;
  }

  .hint {
    color: #9ca3af;
    font-size: 0.75rem;
  }

  .quick-commands {
    grid-column: 2;
    grid-row: 1 / -1;
    background: rgba(13, 17, 23, 0.9);
    border: 2px solid #10b981;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1);
  }

  .commands-header h3 {
    color: #10b981;
    font-family: 'Press Start 2P', cursive;
    font-size: 0.875rem;
    margin: 0 0 1rem 0;
    text-shadow: 0 0 5px rgba(16, 185, 129, 0.3);
  }

  .commands-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .quick-cmd {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid #6b7280;
    border-radius: 4px;
    color: #f0f6fc;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.875rem;
  }

  .quick-cmd:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
  }

  .cmd-icon {
    font-size: 1rem;
  }

  .cmd-text {
    flex: 1;
  }
</style>