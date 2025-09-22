<script lang="ts">
  // Enhanced UI Preview with Session-Aware Components
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  // NES UI Components
  import Button from '$lib/components/nes/Button.svelte';
  import Card from '$lib/components/nes/Card.svelte';
  import Dialog from '$lib/components/nes/Dialog.svelte';
  import Avatar from '$lib/components/nes/Avatar.svelte';

  // Global Components
  import GlobalSidebar from '$lib/components/GlobalSidebar.svelte';

  // Stores and Utilities
  import { sessionActions, user, isAuthenticated } from '$lib/stores/sessionStore.svelte.js';
  import { userStats } from '$lib/stores/userDataStore.svelte.js';
  import {
    formatRelativeTime,
    formatDetailedTimestamp,
    truncateFilename,
    truncateText,
    getFileIcon,
    getPriorityColor,
    getStatusColor
  } from '$lib/utils/formatting';

  // Component state
  let showDialog = $state(false);
  let selectedTab = $state('buttons');
  let showSidebar = $state(true);
  let mockSessionActive = $state(false);

  // Mock user data for demo
  let mockUser = $state({
    id: 'demo-user-123',
    email: 'demo@legalai.com',
    role: 'prosecutor' as const
  });

  interface TabItem { id: string; label: string }
  const tabs: TabItem[] = [
    { id: 'buttons', label: 'Buttons' },
    { id: 'avatars', label: 'Avatars' },
    { id: 'dialog', label: 'Dialog' },
    { id: 'cards', label: 'Cards' },
    { id: 'session', label: 'Session Demo' },
    { id: 'formatting', label: 'Formatting' },
    { id: 'sidebar', label: 'Global Sidebar' }
  ];

  function openDialog() { showDialog = true }
  function closeDialog() { showDialog = false }

  const buttonVariants = ['primary','success','warning','error','info','disabled'] as const
  type ButtonVariant = typeof buttonVariants[number]

  const avatarSizes = ['small','medium','large'] as const
  type AvatarSize = typeof avatarSizes[number]

  // Session demo functions
  function simulateLogin() {
    mockSessionActive = true;
    sessionActions.setSession(mockUser, {
      id: 'demo-session-123',
      user: mockUser,
      fresh: true
    });
  }

  function simulateLogout() {
    mockSessionActive = false;
    sessionActions.clearSession();
  }

  // Initialize page store data simulation
  onMount(() => {
    // Initialize session store with page data (simulated)
    if ($page.data?.user) {
      sessionActions.init($page.data);
    }
  });

  // Reactive data
  $: currentUser = user;
  $: authenticated = isAuthenticated;
  $: stats = userStats;

  // Mock data for formatting demos
  const mockTimestamps = [
    new Date(),
    new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
  ];

  const mockFilenames = [
    'contract_analysis_report_final_v3.pdf',
    'evidence_photo_001_crime_scene.jpg',
    'witness_statement_john_doe_transcript.docx',
    'financial_records_audit_summary.xlsx',
    'legal_precedent_research_notes.txt',
    'deposition_video_plaintiff_testimony.mp4'
  ];

  const mockCases = [
    { title: 'Corporate Fraud Investigation - Multinational Tech Company', status: 'open', priority: 'high' },
    { title: 'Contract Dispute Resolution', status: 'pending', priority: 'medium' },
    { title: 'Criminal Defense - Armed Robbery Case', status: 'closed', priority: 'critical' },
    { title: 'Family Law Custody Battle', status: 'open', priority: 'low' }
  ];

  let focusReady = false;
  $effect(() => { focusReady = true });
</script>

<style>
  .layout { display: grid; gap: 1.25rem; padding: 1.5rem; }
  .tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .tab-btn { cursor: pointer; }
  .tab-btn.active { outline: 3px solid var(--nes-primary, #212529); }
  .grid { display: grid; gap: 1rem; }
  .grid.buttons { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
  .grid.avatars { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
  .cards-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .dialog-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.25rem; }
  h1 { font-family: 'Press Start 2P', monospace; font-size: 1.1rem; }
  h2.section { margin: 0 0 .75rem; font-size: .9rem; letter-spacing: .5px; }
  .section-wrap { padding: 1rem; border: 2px dashed #ccc; border-radius: 8px; background: #fff; }
  .meta { font-size: .65rem; opacity: .7; margin-top: .4rem; }

  /* Session Demo Styles */
  .session-controls { display: flex; flex-direction: column; gap: 1rem; }
  .status-display { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .user-details { display: flex; align-items: center; gap: 0.5rem; }
  .session-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .user-stats h4 { margin: 0.5rem 0; }
  .stats-grid-demo { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; }
  .stat-card { text-align: center; padding: 0.5rem; }
  .stat-number { display: block; font-weight: bold; font-size: 1.2rem; color: #007bff; }
  .stat-label { display: block; font-size: 0.8rem; opacity: 0.8; }

  /* Formatting Demo Styles */
  .formatting-demos { display: flex; flex-direction: column; gap: 1.5rem; }
  .demo-group h3 { margin: 0 0 0.75rem; font-size: 0.9rem; }
  .timestamp-examples, .filename-examples, .case-examples { display: flex; flex-direction: column; gap: 0.5rem; }
  .timestamp-row { display: grid; grid-template-columns: 1fr 100px 1fr; gap: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; }
  .timestamp-row span { font-size: 0.8rem; }
  .relative { font-weight: bold; color: #007bff; }
  .detailed { color: #666; cursor: help; }
  .filename-row { display: grid; grid-template-columns: 30px 1fr 1fr; gap: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; align-items: center; }
  .file-icon { font-size: 1.2rem; text-align: center; }
  .filename-row .original { font-family: monospace; font-size: 0.8rem; }
  .filename-row .truncated { font-family: monospace; font-size: 0.8rem; font-weight: bold; color: #007bff; }
  .case-row { margin-bottom: 0.5rem; }
  .case-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
  .case-title { font-weight: bold; }
  .case-meta { display: flex; gap: 0.5rem; }

  /* Sidebar Demo Styles */
  .sidebar-controls { display: flex; flex-direction: column; gap: 1rem; }
  .control-group { display: flex; gap: 1rem; align-items: center; }
  .sidebar-info { }
  .feature-list { list-style: none; padding: 0; margin: 0.5rem 0; }
  .feature-list li { margin: 0.25rem 0; padding: 0.25rem 0; }
  .integration-notes { margin-top: 1rem; }
  .integration-notes ol { margin: 0.5rem 0; padding-left: 1.5rem; }
  .integration-notes li { margin: 0.25rem 0; }
</style>

<div class="layout">
  <h1>NES UI Preview</h1>

  <nav class="tabs" aria-label="Preview Tabs">
    {#each tabs as t}
      <button
        class="nes-btn tab-btn {selectedTab === t.id ? 'is-primary active' : ''}"
        aria-pressed={selectedTab === t.id}
        onclick={() => selectedTab = t.id}
      >{t.label}</button>
    {/each}
  </nav>

  {#if selectedTab === 'buttons'}
    <section class="section-wrap">
      <h2 class="section">Buttons</h2>
      <div class="grid buttons">
        {#each buttonVariants as v}
          <div>
            <Button variant={v} disabled={v === 'disabled'}>{v}</Button>
            <div class="meta">variant: {v}</div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if selectedTab === 'avatars'}
    <section class="section-wrap">
      <h2 class="section">Avatars</h2>
      <div class="grid avatars">
        {#each avatarSizes as size}
          <div>
            <Avatar size={size} label={size + ' user'} />
            <div class="meta">size: {size}</div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if selectedTab === 'dialog'}
    <section class="section-wrap">
      <h2 class="section">Dialog</h2>
      <Button variant="primary" onclick={openDialog}>Open Dialog</Button>
      <div class="meta">Simple open/close controlled by boolean state.</div>
      {#if showDialog}
        <Dialog title="Sample Dialog" on:close={closeDialog}>
          <p>This dialog demonstrates the NES modal style and accessibility hooks.</p>
          <div class="dialog-actions">
            <Button variant="error" onclick={closeDialog}>Cancel</Button>
            <Button variant="success" onclick={closeDialog}>Confirm</Button>
          </div>
        </Dialog>
      {/if}
    </section>
  {/if}

  {#if selectedTab === 'cards'}
    <section class="section-wrap">
      <h2 class="section">Cards</h2>
      <div class="cards-grid">
        <Card title="Legal Document" subtitle="Primary Source" footer="#1024A">
          <p>Representative example of a legal primary source container with NES styling.</p>
        </Card>
        <Card title="Embeddings" subtitle="Vector Ops" footer="Updated">
          <p>Showcase how vector search summaries might be wrapped in a retro card style.</p>
        </Card>
        <Card title="GPU Task" subtitle="Queued" footer="ETA: 3s">
          <p>Example status card for GPU inference or preprocessing jobs.</p>
        </Card>
      </div>
    </section>
  {/if}

  {#if selectedTab === 'session'}
    <section class="section-wrap">
      <h2 class="section">Session Management Demo</h2>

      <div class="session-controls">
        <h3>Current Session Status:</h3>
        <div class="status-display">
          <span class="nes-badge {authenticated ? 'is-success' : 'is-error'}">
            {authenticated ? 'Authenticated' : 'Not Authenticated'}
          </span>
          {#if currentUser}
            <div class="user-details">
              <span>👤 {currentUser.email || currentUser.id}</span>
              <span class="nes-badge is-small {getPriorityColor(currentUser.role)}">{currentUser.role}</span>
            </div>
          {/if}
        </div>

        <div class="session-actions">
          {#if !authenticated}
            <Button variant="primary" onclick={simulateLogin}>Simulate Login</Button>
          {:else}
            <Button variant="error" onclick={simulateLogout}>Simulate Logout</Button>
          {/if}
          <Button variant="info" onclick={() => sessionStore.refreshSession()}>Refresh Session</Button>
        </div>

        <div class="user-stats">
          <h4>User Data Stats:</h4>
          <div class="stats-grid-demo">
            <div class="stat-card nes-container">
              <span class="stat-number">{stats.totalCases}</span>
              <span class="stat-label">Cases</span>
            </div>
            <div class="stat-card nes-container">
              <span class="stat-number">{stats.totalEvidence}</span>
              <span class="stat-label">Evidence</span>
            </div>
            <div class="stat-card nes-container">
              <span class="stat-number">{stats.totalCitations}</span>
              <span class="stat-label">Citations</span>
            </div>
            <div class="stat-card nes-container">
              <span class="stat-number">{stats.totalReports}</span>
              <span class="stat-label">Reports</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  {/if}

  {#if selectedTab === 'formatting'}
    <section class="section-wrap">
      <h2 class="section">Formatting Utilities</h2>

      <div class="formatting-demos">
        <div class="demo-group">
          <h3>Timestamp Formatting:</h3>
          <div class="timestamp-examples">
            {#each mockTimestamps as timestamp, i}
              <div class="timestamp-row">
                <span class="original">Original: {timestamp.toISOString()}</span>
                <span class="relative">Relative: {formatRelativeTime(timestamp)}</span>
                <span class="detailed" title={formatDetailedTimestamp(timestamp, 'demo-user')}>
                  Detailed: {formatDetailedTimestamp(timestamp, 'demo-user')}
                </span>
              </div>
            {/each}
          </div>
        </div>

        <div class="demo-group">
          <h3>Filename Truncation:</h3>
          <div class="filename-examples">
            {#each mockFilenames as filename}
              <div class="filename-row">
                <span class="file-icon">{getFileIcon(filename.split('.').pop() || '')}</span>
                <span class="original" title={filename}>{filename}</span>
                <span class="truncated" title={filename}>{truncateFilename(filename, 30)}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="demo-group">
          <h3>Case Title & Status Formatting:</h3>
          <div class="case-examples">
            {#each mockCases as case_}
              <div class="case-row nes-container">
                <div class="case-header">
                  <span class="case-title" title={case_.title}>
                    {truncateText(case_.title, 50)}
                  </span>
                  <span class="nes-badge is-small {getStatusColor(case_.status)}">{case_.status}</span>
                </div>
                <div class="case-meta">
                  <span class="nes-badge is-small {getPriorityColor(case_.priority)}">{case_.priority}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>
  {/if}

  {#if selectedTab === 'sidebar'}
    <section class="section-wrap">
      <h2 class="section">Global Sidebar Demo</h2>

      <div class="sidebar-controls">
        <h3>Sidebar Configuration:</h3>
        <div class="control-group">
          <label class="nes-text">
            <input
              type="checkbox"
              class="nes-checkbox"
              bind:checked={showSidebar}
            />
            <span>Show Sidebar</span>
          </label>
        </div>

        <div class="sidebar-info">
          <p class="nes-text">The GlobalSidebar component provides:</p>
          <ul class="feature-list">
            <li>🔐 Session-aware user profile display</li>
            <li>📊 Real-time user data statistics</li>
            <li>🔍 Universal search across all user content</li>
            <li>📁 Quick access to cases, evidence, citations</li>
            <li>📋 Reports and AI conversation history</li>
            <li>⚡ Quick actions for common tasks</li>
            <li>📱 Responsive design with collapse/expand</li>
            <li>💾 Persistent storage and caching</li>
          </ul>
        </div>

        <div class="integration-notes nes-container">
          <h4>Integration Notes:</h4>
          <p>To use GlobalSidebar app-wide:</p>
          <ol>
            <li>Import in your layout file</li>
            <li>Initialize session store in +layout.ts</li>
            <li>Ensure drizzle-orm API endpoints exist</li>
            <li>Configure user data sync preferences</li>
          </ol>
        </div>
      </div>
    </section>
  {/if}
</div>

<!-- Conditional Global Sidebar Demo -->
{#if selectedTab === 'sidebar' && showSidebar}
  <GlobalSidebar
    isOpen={showSidebar}
    defaultSection="dashboard"
    showQuickActions={true}
    compactMode={false}
  />
{/if}
