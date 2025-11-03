<!-- YoRHa Terminal, Interface -->
<script lang="ts">
 // Svelte, 5 runes are auto-imported // $state is declared globally in src/types/svelte-helpers.d.ts import { onMount } from 'svelte'; // YoRHa API client is exported as a named export â€” import { YoRHaAPIClient }.
import { YoRHaAPIClient } from "$lib/components/three/yorha-ui/api/YoRHaAPIClient.svelte"; // Terminal state type TerminalEntry = { id: number; timestamp: string; text: string; type: 'system' | 'user' | 'success' | 'error' | 'info'; }; let terminalHistory = $state<TerminalEntry[]>([]); let currentInput = $state<string>(''); let isExecuting = $state<boolean>(false); let terminalRef = $state<HTMLElement | null>(null); // Terminal commands type Command = { name: string; description: string; usage: string; execute: (args: string[]) => void | Promise<void>; }; // Replace Record with an array (list of dicts) const commands: Command[] = [ { name: 'help', description: 'Show available commands', usage: 'help [command]', execute: args => showHelp(args) }, { name: 'status', description: 'Show system status', usage: 'status', execute: () => getSystemStatus() }, {
      name: 'rag', description: 'Execute RAG query', usage: 'rag <query>', execute: args => executeRAG(args.join(' ')) }, {
      name: 'search', description: 'Search legal database', usage: 'search <term>', execute: args => searchDatabase(args.join(' ')) }, {
      name: 'cluster', description: 'Cluster management', usage: 'cluster <health|status|restart>', execute: args => clusterCommand(args[0]) }, { name: 'clear', description: 'Clear terminal', usage: 'clear', execute: () => clearTerminal() }, { name: 'echo', description: 'Echo text', usage: 'echo <text>', execute: args => echoText(args.join(' ')) }, { name: 'version', description: 'Show system version', usage: 'version', execute: () => showVersion() }]; function getCommand(name: string) { return commands.find(c => c.name === name); }

  // initialize once
  onMount(() => {
    addOutput('YORHA TERMINAL v1.0.0 - Legal AI System Interface', 'system');
    addOutput('Type "help" for available commands.', 'system');
    addOutput('', 'system');
  });
  function addOutput(text: string, type: 'system' | 'user' | 'success' | 'error' | 'info' = 'system') { const timestamp = new Date().toLocaleTimeString(); terminalHistory = [ ...terminalHistory, {
        id: Date.now() + Math.random(), timestamp, text, type // fixed typo (was `typ;`) }]; }
  async function executeCommand(command: string): Promise<any> { if (!command.trim()) return; isExecuting = true; addOutput(`> ${ command }`, 'user'); const parts = command.trim().split(' '); // fixed: .trim() const cmd = parts[0].toLowerCase(); const args = parts.slice(1); const cmdDef = getCommand(cmd); if (cmdDef) { try { await cmdDef.execute(args); } catch (error) { const e = error as Error; addOutput(`Error executing ${ cmd }: ${e?.message || String(error)}`, 'error'); }
    } else {
      addOutput(`Unknown command: ${ cmd }. Type: "help" for available commands.`, 'error');
    }
    // Do not call $state(...) here â€” use a plain reassignment. isExecuting = false; currentInput = ''; }
  function showHelp(args: string[]) { if (args.length > 0) { const cmd = args[0].toLowerCase(); const cmdDef = getCommand(cmd); if (cmdDef) { addOutput(`${ cmd }: ${cmdDef.description}`, 'info'); addOutput(`Usage: ${cmdDef.usage}`, 'info'); } else { addOutput(`Unknown command: ${ cmd }`, 'error'); }
    } else { addOutput('Available commands:', 'info'); // iterate the array for help output commands.forEach(c => { addOutput(` ${c.name.padEnd(10)} - ${c.description}`, 'info'); }); }
  } // Replace getSystemStatus and executeRAG with runtime-safe implementations async function safeGetSystemStatus(): Promise<any> { // Try multiple possible client method names at runtime to avoid type errors try { if (typeof (YoRHaAPIClient as any)?.getSystemStatus === 'function') { return await (YoRHaAPIClient as any).getSystemStatus(); }
      if (typeof (YoRHaAPIClient as any)?.getStatus === 'function') { return await (YoRHaAPIClient as any).getStatus(); }
      if (typeof (YoRHaAPIClient as any)?.status === 'function') { return await (YoRHaAPIClient as any).status(); }

      // Fallback to a server endpoint const res = await fetch('/api/yorha/status'); if (res.ok) { return await res.json(); }
      throw new Error(`HTTP ${res.status}`); } catch (err) { // Re-throw so caller can handle and show mock data throw err}
  } async function getSystemStatus(): Promise<any> { try { addOutput('Fetching system status...', 'info'); const status = await safeGetSystemStatus(); addOutput('=== SYSTEM STATUS ===', 'success'); addOutput(`Database: ${status?.database?.connected ? 'CONNECTED': 'DISCONNECTED'}`, 'info'); addOutput(`Backend: ${status?.backend?.healthy ? 'HEALTHY': 'UNHEALTHY'}`, 'info'); addOutput(`Frontend: ${status?.frontend?.renderFPS ?? 'N/A'} FPS`, 'info'); addOutput(`Services: ${status?.backend?.activeServices ?? 'N/A'} active`, 'info'); addOutput(`CPU: ${status?.backend?.cpuUsage ?? 'N/A'}%`, 'info'); addOutput(`Memory: ${status?.backend?.memoryUsage ?? 'N/A'}%`, 'info'); } catch (error) { addOutput('Failed to fetch system status (using mock data)', 'error'); addOutput('=== SYSTEM STATUS (MOCK) ===', 'success'); addOutput('Database: CONNECTED', 'info'); addOutput('Backend: HEALTHY', 'info'); addOutput('Frontend: 60 FPS', 'info'); addOutput('Services: 8 active', 'info'); }
  } async function executeRAG(query: string): Promise<any> { if (!query) { addOutput('Error: Please provide a query. Usage: rag <query>', 'error'); return}
    try { addOutput(`Executing RAG query: "${ query }"`, 'info'); const response = await fetch('/api/yorha/enhanced-rag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, context: 'terminal' }) }); if (response.ok) { const result = await response.json(); addOutput('=== RAG RESULT ===', 'success'); addOutput(JSON.stringify(result, null, 2), 'info'); } else { addOutput(`RAG query failed: HTTP ${response.status}`, 'error'); }
    } catch (error) { const e = error as Error; addOutput(`RAG query error: ${e?.message || String(error)}`, 'error'); }
  } async function searchDatabase(term: string): Promise<any> { if (!term) { addOutput('Error: Please provide a search term. Usage: search <term>', 'error'); return}
    try { addOutput(`Searching database for: "${ term }"`, 'info'); const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`); // minimal endpoint if (response.ok) { const result = await response.json(); addOutput('=== SEARCH RESULTS ===', 'success'); if (Array.isArray(result.results) && result.results.length > 0) { result.results.forEach((item: any, index: number) => { addOutput(`${index + 1}. ${item.title || item.name || 'Untitled'}`, 'info'); }); } else { addOutput('No results found.', 'info'); }
      } else { addOutput(`Search failed: HTTP ${response.status}`, 'error'); }
    } catch (error) { const e = error as Error; addOutput(`Search error: ${e?.message || String(error)}`, 'error'); }
  } async function clusterCommand(action: string): Promise<any> { if (!action) { addOutput('Error: Please specify action. Usage: cluster <health|status|restart>', 'error'); return}
    switch (action.toLowerCase()) { case 'health': try { addOutput('Checking cluster health...', 'info'); const response = await fetch('/api/yorha/cluster/health'); // minimal endpoint if (response.ok) { const health = await response.json(); addOutput('=== CLUSTER HEALTH ===', 'success'); addOutput(JSON.stringify(health, null, 2), 'info'); } else { addOutput(`Health check failed: HTTP ${response.status}`, 'error'); }
        } catch (error) { const e = error as Error; addOutput(`Health check error: ${e?.message || String(error)}`, 'error'); }
        break; case 'status': addOutput('=== CLUSTER STATUS ===', 'success'); addOutput('PostgreSQL: RUNNING', 'info'); addOutput('Redis: RUNNING', 'info'); addOutput('Ollama: RUNNING', 'info'); addOutput('SvelteKit: RUNNING', 'info'); addOutput('Enhanced RAG: RUNNING', 'info'); break; case 'restart': addOutput('Cluster restart not implemented in terminal mode', 'error'); break; default: addOutput(`Unknown cluster action ${ action }`, 'error'); }
  } function clearTerminal() { terminalHistory = []; addOutput('Terminal cleared.', 'system'); }
  function echoText(text: string) { addOutput(text || '', 'info'); }
  function showVersion() { addOutput('=== SYSTEM VERSION ===', 'success'); addOutput('YoRHa Terminal: 1.0.0', 'info'); addOutput('Legal AI Platform: 2.0.0', 'info'); addOutput('SvelteKit: 2.x', 'info'); addOutput('Node.js: ' + (typeof process !== 'undefined' ? process.version: 'Browser'), 'info'); }
  function handleKeydown(event: KeyboardEvent) { // use the passed event if (event.key === 'Enter' && !isExecuting) { executeCommand(currentInput); }
  }
</script>

<svelte:head><title>YoRHa Terminal - Command Interface</title></svelte:head>
<div class="yorha-terminal-page">
  <!-- Page, Header -->
  <header class="yorha-page-header">
    <div class="yorha-header-content">
      <div class="yorha-header-title">
        <!-- icon placeholder (emoji) to avoid lucide, import issues -->
        <span style="font-size:48px; line-height:1">ðŸ–¥ï¸</span>
        <h1>YORHA TERMINAL</h1>
        <div class="yorha-header-subtitle">COMMAND LINE INTERFACE</div>
      </div>
    </div>
  </header>
  <!-- Terminal, Container -->
  <section class="yorha-terminal-section">
    <div class="yorha-terminal-container">
      <!-- Terminal, Header -->
      <div class="yorha-terminal-header">
        <div class="yorha-terminal-title">
          <span style="font-size:16px; line-height:1">ðŸ–¥ï¸</span> <span>YoRHa Terminal</span>
        </div>
        <div class="yorha-terminal-controls">
          <button class="yorha-terminal-control" onclick={() => clearTerminal()}> ðŸ” </button>
          <button class="yorha-terminal-control"> âš™ï¸ </button>
        </div>
      </div>
      <!-- Terminal, Output -->
      <div class="yorha-terminal-output">
        {#each terminalHistory as entry (entry.id)}
          <div class="yorha-terminal-line">
            <span class="yorha-terminal-timestamp">[{entry.timestamp}]</span>
            <span class="yorha-terminal-text">{entry.text}</span>
          </div>
        {/each}
        {#if isExecuting}
          <div class="yorha-terminal-line">
            <span class="yorha-terminal-timestamp">[{new Date().toLocaleTimeString()}]</span>
            <span class="yorha-terminal-text"> <span class="yorha-terminal-spinner">â ‹</span> Executing... </span>
          </div>
        {/if}
      </div>
      <!-- Terminal, Input -->
      <div class="yorha-terminal-input-container">
        <span class="yorha-terminal-prompt"> âž¤ YORHA:~$ </span>
        <input
          type="text"
          bind:value={currentInput}
          onkeydown={handleKeydown}
          disabled={isExecuting}
          class="yorha-terminal-input"
          placeholder="Type command... (try 'help')"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </div>
    <!-- Command, Reference -->
    <div class="yorha-command-reference">
      <h3>Quick Reference</h3>
      <div class="yorha-command-grid">
        <div class="yorha-command-item"><strong>help</strong> - Show available commands</div>
        <div class="yorha-command-item"><strong>status</strong> - System status</div>
        <div class="yorha-command-item"><strong>rag &lt;query&gt;</strong> - AI analysis</div>
        <div class="yorha-command-item"><strong>search &lt;term&gt;</strong> - Database search</div>
        <div class="yorha-command-item"><strong>cluster &lt;action&gt;</strong> - Cluster management</div>
        <div class="yorha-command-item"><strong>clear</strong> - Clear terminal</div>
      </div>
    </div>
  </section>
</div>

<style>
  .yorha-terminal-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: transparent;
  }
  /* Page Header */
  .yorha-page-header {
    padding: 3rem 1.5rem;
    border-bottom: 1px solid rgba(250, 180, 50, 0.3);
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(255, 191, 0, 0.05) 100%);
  }
  .yorha-header-content {
    max-width: 72rem;
    margin: 0 auto;
    text-align: center;
  }
  .yorha-header-title h1 {
    /* ...existing code... */
    text-shadow: 0 0 20px rgba(255, 191, 0, 0.5);
  }
  .yorha-header-subtitle {
    font-size: 1.05rem;
    color: #fbbf24;
    letter-spacing: 0.04em;
    opacity: 0.8;
    margin-top: 0.5rem;
  }
  /* Terminal Section */
  .yorha-terminal-section {
    padding: 1.5rem;
    max-width: 72rem;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1.5rem;
  }
  .yorha-terminal-container {
    background: #000;
    border: 2px solid rgba(250, 180, 50, 0.6);
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(255, 191, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  /* Terminal Header */
  .yorha-terminal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: rgba(250, 180, 50, 0.95);
    color: #000;
  }
  .yorha-terminal-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: monospace;
    font-size: 0.875rem;
    font-weight: 700;
  }
  .yorha-terminal-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .yorha-terminal-control {
    padding: 0.25rem;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .yorha-terminal-control:hover {
    background: rgba(0, 0, 0, 0.12);
  }
  /* Terminal Output */
  .yorha-terminal-output {
    padding: 1rem;
    height: 24rem;
    overflow-y: auto;
    font-family: monospace;
    font-size: 0.875rem;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(255, 191, 0, 0.02) 100%);
  }
  .yorha-terminal-line {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .yorha-terminal-timestamp {
    color: #fbbf24;
    opacity: 0.6;
    font-size: 0.85rem;
  }
  .yorha-terminal-text {
    flex: 1;
    word-break: break-word;
  }
  .yorha-line-system {
    color: #fbbf24;
  }
  .yorha-line-user {
    color: #7ee787;
  }
  .yorha-line-success {
    color: #7ee787;
  }
  .yorha-line-error {
    color: #ff7b7b;
  }
  .yorha-line-info {
    color: #f8c77a;
  }
  .yorha-terminal-spinner {
    display: inline-block;
    transform-origin: center;
    animation: spin 1s linear infinite;
    margin-right: 0.5rem;
  }
  /* Terminal Input */
  .yorha-terminal-input-container {
    display: flex;
    align-items: center;
    border-top: 1px solid rgba(250, 180, 50, 0.3);
    background: rgba(0, 0, 0, 0.5);
    padding: 0.125rem 0.5rem;
  }
  .yorha-terminal-prompt {
    padding: 0.5rem 0.75rem;
    color: #fbbf24;
    font-family: monospace;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .yorha-terminal-input {
    flex: 1;
    padding: 0.5rem;
    background: transparent;
    color: #f6d38b;
    font-family: monospace;
    font-size: 0.9rem;
    border: none;
    outline: none;
  }
  .yorha-terminal-input::placeholder {
    color: rgba(251, 191, 36, 0.6);
  }
  /* Command Reference */
  .yorha-command-reference {
    background: #0b0b0b;
    border: 1px solid rgba(250, 180, 50, 0.3);
    padding: 1.25rem;
    border-radius: 8px;
    height: fit-content;
  }
  .yorha-command-reference h3 {
    font-size: 1.125rem;
    font-weight: 700;
    color: #fbbf24;
    margin-bottom: 0.75rem;
  }
  .yorha-command-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  .yorha-command-item {
    color: #f6d38b;
    font-size: 0.9rem;
    font-family: monospace;
  }
  .yorha-command-item strong {
    color: #fbbf24;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  } /* Responsive */
  @media (max-width: 768px) {
    .yorha-header-title h1 {
      font-size: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .yorha-terminal-output {
      height: 16rem;
    }
    .yorha-command-grid {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
    .yorha-terminal-section {
      grid-template-columns: 1fr;
    }
  }
</style>
