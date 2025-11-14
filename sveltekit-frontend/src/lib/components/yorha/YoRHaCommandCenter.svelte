<script lang="ts">
  interface SystemMetrics {
    cpu_usage: number;
    memory_usage: number;
    gpu_utilization: number;
    network_latency: number;
    active_processes: number;
    security_level?: string;
    quantum_state?: string;
    neural_activity: number;
  }

  export let systemData: SystemMetrics = {
    cpu_usage: 47,
    memory_usage: 63,
    gpu_utilization: 71,
    network_latency: 28,
    active_processes: 12,
    security_level: 'HIGH',
    quantum_state: 'STABLE',
    neural_activity: 78,
  };

  const navSections = [
    'Command Center',
    'Active Cases',
    'Evidence Library',
    'Persons of Interest',
    'Analysis Center',
    'Global Search',
    'Terminal',
    'System Configuration',
  ];

  const activeCases = [
    { id: 'CASE-71A', title: 'Corporate Espionage', status: 'active' },
    { id: 'CASE-02X', title: 'Financial Fraud Analysis', status: 'pending' },
    { id: 'CASE-19B', title: 'Missing Person - Dr. Chen', status: 'active' },
  ];

  const chatTranscript = [
    {
      role: 'assistant',
      ts: '19:02:52',
      text: 'VoRHa AI Assistant online. Detective support systems calibrated.',
    },
    {
      role: 'assistant',
      ts: '19:02:57',
      text: 'Greetings, Detective. I am 9S, your retro AI investigation analyst. How can I assist?',
    },
    {
      role: 'assistant',
      ts: '19:02:59',
      text: 'Analyzing surveillance feeds, LangExtract memory, and legal precedents...',
      thinking: true,
    },
    { role: 'user', ts: '19:03:04', text: 'Crosslink witness contradictions with the CFO timeline.' },
  ];

  const boardEvidence = [
    {
      id: 'video',
      title: 'Security Cam - Dock 4',
      detail: 'Subject enters restricted zone 02:13',
      badge: 'VIDEO',
    },
    {
      id: 'doc',
      title: 'Witness Statement - K. Lee',
      detail: 'Describes red scarf + satchel',
      badge: 'DOCUMENT',
    },
    {
      id: 'file',
      title: 'Financial Ledger Delta',
      detail: 'Wire transfers flagged in pgvector',
      badge: 'FILE',
    },
  ];
</script>

<div class="yorha-shell">
  <aside class="side-rail">
    <div class="brand-block">
      <div class="brand-title">YoRHa</div>
      <div class="brand-sub">Detective</div>
      <p class="brand-meta">Neural Network Active</p>
    </div>
    <nav>
      {#each navSections as section, idx}
        <button class="rail-btn {idx === 0 ? 'active' : ''}" type="button">
          <span>{section}</span>
          {#if section === 'Active Cases'}
            <span class="badge">3</span>
          {/if}
        </button>
      {/each}
    </nav>
    <div class="system-footer">
      <div>System: Operational</div>
      <div>Local Time: 19:02</div>
    </div>
  </aside>

  <section class="main-stage">
    <header class="top-bar">
      <div>
        <h1>YoRHa Command Center</h1>
        <p>Investigation Interface | QUIC Session Stable</p>
      </div>
      <div class="top-controls">
        <label class="search">
          <span>Search cases, evidence, persons...</span>
          <input type="text" placeholder="All" />
        </label>
        <button class="terminal">* Terminal</button>
        <button class="ai-chat">+ AI Chat</button>
        <button class="clear">Clear</button>
      </div>
    </header>

    <div class="status-row">
      {#each activeCases as kase}
        <article class="case-card">
          <div class="case-header">
            <span>{kase.id}</span>
            <span class="status {kase.status}">{kase.status}</span>
          </div>
          <h3>{kase.title}</h3>
          <p>LangExtract memory synced | Graph hops ready</p>
        </article>
      {/each}
      <article class="metrics-card">
        <h4>System Metrics</h4>
        <div class="metrics-grid">
          <div>
            <label>CPU</label>
            <span>{systemData.cpu_usage}%</span>
          </div>
          <div>
            <label>GPU</label>
            <span>{systemData.gpu_utilization}%</span>
          </div>
          <div>
            <label>Memory</label>
            <span>{systemData.memory_usage}%</span>
          </div>
          <div>
            <label>Latency</label>
            <span>{systemData.network_latency} ms</span>
          </div>
        </div>
      </article>
    </div>

    <div class="workspace">
      <section class="chat-pane">
        <header>
          <div>
            <p class="prompt">> AI Chat Interface</p>
            <p class="subline">Gemma3-Legal | Graph RAG | QUIC streaming</p>
          </div>
          <span class="session-pill">Session 9S | Active</span>
        </header>
        <div class="chat-frame">
          <div class="prompt-line">>_</div>
          <div class="chat-window">
            {#each chatTranscript as msg}
              <article class="chat-bubble {msg.role}">
                <div class="bubble-meta">
                  <span>{msg.role === 'assistant' ? '9S ASSISTANT' : 'DETECTIVE'}</span>
                  <span>- {msg.ts}</span>
                </div>
                <p>{msg.text}</p>
                {#if msg.thinking}
                  <span class="thinking">9S is analyzing...</span>
                {/if}
              </article>
            {/each}
          </div>
          <footer class="chat-input">
            <input type="text" placeholder="Ask 9S about your investigation..." />
            <button>> Send</button>
          </footer>
        </div>
      </section>

      <section class="board-pane">
        <header>
          <div>
            <p class="prompt">Evidence Board</p>
            <p class="subline">Neo4j | Qdrant | Timeline sync</p>
          </div>
          <div class="board-controls">
            <button>+ Add Evidence</button>
            <button>Connect</button>
            <button>Library (0)</button>
          </div>
        </header>
        <div class="board-grid">
          <div class="grid-overlay"></div>
          <div class="board-canvas">
            {#each boardEvidence as card, index}
              <article class="board-card pos-{index}">
                <div class="card-badge">{card.badge}</div>
                <h4>{card.title}</h4>
                <p>{card.detail}</p>
                <div class="card-meta">
                  <span>connections | {index + 1}</span>
                  <span>pgv | {82 + index}%</span>
                </div>
              </article>
            {/each}
            <svg class="board-lines" viewBox="0 0 600 360" preserveAspectRatio="none">
              <line x1="120" y1="80" x2="300" y2="160" />
              <line x1="300" y1="160" x2="460" y2="110" />
              <line x1="120" y1="80" x2="460" y2="110" stroke-dasharray="6 6" />
            </svg>
          </div>
        </div>
      </section>
    </div>
  </section>
</div>

<style>
  :global(body) {
    background: #1c1b18;
  }

  .yorha-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 280px 1fr;
    background: #b8ab92;
    color: #151515;
    font-family: 'Space Mono', 'IBM Plex Mono', 'Courier New', monospace;
  }

  .side-rail {
    background: #cfc19f;
    border-right: 3px solid #151515;
    display: flex;
    flex-direction: column;
    padding: 1.5rem 1rem;
    gap: 1.5rem;
  }

  .brand-block {
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .brand-title {
    font-size: 1.6rem;
    font-weight: 700;
  }

  .brand-sub {
    font-size: 1.2rem;
  }

  .brand-meta {
    margin-top: 0.5rem;
    font-size: 0.75rem;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .rail-btn {
    position: relative;
    text-align: left;
    padding: 0.65rem 0.75rem;
    border: 1px solid #151515;
    background: #d8ccb1;
    font-weight: 600;
    letter-spacing: 0.04em;
    transition: background 0.2s;
  }

  .rail-btn.active,
  .rail-btn:hover {
    background: #151515;
    color: #e7dfcf;
  }

  .rail-btn .badge {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    padding: 0.1rem 0.35rem;
    border: 1px solid currentColor;
  }

  .system-footer {
    margin-top: auto;
    font-size: 0.75rem;
    border-top: 1px solid #151515;
    padding-top: 1rem;
  }

  .main-stage {
    display: flex;
    flex-direction: column;
    padding: 1.5rem 1.75rem 2rem;
    gap: 1.25rem;
    background: linear-gradient(180deg, #bfb294 0%, #9f9279 100%);
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border: 2px solid #151515;
    padding: 1rem;
    background: #d9cdb3;
  }

  .top-bar h1 {
    margin: 0;
    font-size: 1.4rem;
  }

  .top-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .search {
    display: flex;
    flex-direction: column;
    font-size: 0.75rem;
    border: 1px solid #151515;
    padding: 0.4rem 0.6rem;
  }

  .search input {
    border: 0;
    background: transparent;
    font-family: inherit;
    font-size: 0.85rem;
  }

  .search input:focus-visible {
    outline: none;
  }

  .top-controls button {
    border: 1px solid #151515;
    padding: 0.35rem 0.9rem;
    background: #151515;
    color: #e7dfcf;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
  }

  .terminal {
    background: #f1f1f1;
    color: #151515;
  }

  .ai-chat {
    background: #4caf50;
  }

  .clear {
    background: #a83232;
  }

  .status-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 0.75rem;
  }

  .case-card,
  .metrics-card {
    border: 2px solid #151515;
    background: #efe3c8;
    padding: 0.75rem;
    min-height: 120px;
  }

  .case-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    text-transform: uppercase;
  }

  .status {
    border: 1px solid currentColor;
    padding: 0 0.35rem;
  }

  .status.active {
    color: #2b8000;
  }

  .status.pending {
    color: #9e6b00;
  }

  .case-card h3 {
    margin: 0.5rem 0 0.25rem;
    font-size: 1rem;
  }

  .metrics-card h4 {
    margin: 0;
    font-size: 0.9rem;
    text-transform: uppercase;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(80px, 1fr));
    gap: 0.5rem;
    margin-top: 0.75rem;
    font-size: 0.85rem;
  }

  .metrics-grid label {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: #4a463c;
  }

  .workspace {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 1rem;
  }

  .chat-pane,
  .board-pane {
    border: 3px solid #151515;
    background: #11151c;
    color: #e6f6e6;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .board-pane {
    background: #d8ccb1;
    color: #151515;
  }

  .chat-pane header,
  .board-pane header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .prompt {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  .subline {
    margin: 0.2rem 0 0;
    font-size: 0.75rem;
    color: rgba(231, 223, 207, 0.8);
  }

  .board-pane header .subline {
    color: #3b382f;
  }

  .session-pill {
    border: 1px solid #55ff55;
    padding: 0.15rem 0.5rem;
    font-size: 0.75rem;
  }

  .chat-frame {
    border: 2px solid #55ff55;
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #080c12;
  }

  .prompt-line {
    position: absolute;
    left: 1rem;
    top: -0.8rem;
    font-size: 1.3rem;
    color: #55ff55;
    font-weight: 700;
  }

  .chat-window {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .chat-bubble {
    border: 1px solid rgba(255, 255, 255, 0.35);
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.45);
  }

  .chat-bubble.user {
    align-self: flex-end;
    max-width: 70%;
    background: rgba(85, 255, 85, 0.1);
  }

  .bubble-meta {
    font-size: 0.7rem;
    margin-bottom: 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }

  .chat-input {
    display: grid;
    grid-template-columns: 1fr 120px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }

  .chat-input input {
    border: none;
    background: transparent;
    padding: 0.75rem 1rem;
    color: #e6f6e6;
    font-family: inherit;
  }

  .chat-input input:focus-visible {
    outline: none;
  }

  .chat-input button {
    border: none;
    background: #55ff55;
    color: #041205;
    font-weight: 700;
    letter-spacing: 0.2em;
  }

  .thinking {
    display: inline-block;
    margin-top: 0.5rem;
    font-size: 0.65rem;
    color: #55ff55;
    letter-spacing: 0.2em;
  }

  .board-controls button {
    border: 1px solid #151515;
    background: transparent;
    text-transform: uppercase;
    font-size: 0.7rem;
    padding: 0.35rem 0.6rem;
  }

  .board-grid {
    position: relative;
    flex: 1;
    border: 2px solid #151515;
    background: #c4b692;
    overflow: hidden;
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(#00000020 1px, transparent 1px),
      linear-gradient(90deg, #00000020 1px, transparent 1px);
    background-size: 30px 30px;
    pointer-events: none;
  }

  .board-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    padding: 2rem;
  }

  .board-card {
    position: absolute;
    width: 180px;
    border: 2px solid #151515;
    background: #f4e9cc;
    padding: 0.75rem;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
  }

  .board-card h4 {
    margin: 0.25rem 0;
  }

  .board-card p {
    font-size: 0.8rem;
    margin: 0;
  }

  .card-badge {
    font-size: 0.7rem;
    border: 1px solid #151515;
    padding: 0.1rem 0.3rem;
  }

  .card-meta {
    font-size: 0.65rem;
    margin-top: 0.5rem;
    display: flex;
    justify-content: space-between;
  }

  .board-lines {
    position: absolute;
    inset: 0;
    stroke: #3b352b;
    stroke-width: 2;
    pointer-events: none;
  }

  .board-lines line {
    stroke-linecap: round;
  }

  .pos-0 {
    left: 60px;
    top: 70px;
  }

  .pos-1 {
    left: 280px;
    top: 160px;
  }

  .pos-2 {
    left: 420px;
    top: 60px;
  }

  @media (max-width: 1200px) {
    .yorha-shell {
      grid-template-columns: 220px 1fr;
    }

    .workspace {
      grid-template-columns: 1fr;
    }

    .board-pane {
      min-height: 380px;
    }
  }

  @media (max-width: 860px) {
    .yorha-shell {
      grid-template-columns: 1fr;
    }

    .side-rail {
      flex-direction: row;
      overflow-x: auto;
      border-right: none;
      border-bottom: 3px solid #151515;
    }

    nav {
      flex-direction: row;
      flex-wrap: wrap;
    }

    .main-stage {
      padding: 1rem;
    }

    .top-bar {
      flex-direction: column;
      gap: 1rem;
    }
  }
</style>
