<!--
GlobalSidebar.svelte - Universal user-centric sidebar for the entire application
Provides access to user's cases, evidence, citations, reports, AI assistant, and more
Enhanced with session management, persistent storage, and drizzle-orm integration
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { userCases,
    userEvidence,
    userCitations,
    userReports,
    userAIConversations,
    userStats,
   } from '$lib/stores/unified';
  import {
    formatRelativeTime,
    formatDetailedTimestamp,
    truncateFilename,
    truncateText,
    truncateCaseTitle,
    getFileIcon,
    getPriorityColor,
    getStatusColor,
    MINI_TEXT_LENGTHS,
  } from '$lib/utils/formatting';
  // Props for sidebar configuration and user data
  let {
    user,
    session,
    isOpen = true,
    defaultSection = 'dashboard',
    showQuickActions = true,
    compactMode = false,
  }: {
    user: any;
    session: any;
    isOpen?: boolean;
    defaultSection?: string;
    showQuickActions?: boolean;
    compactMode?: boolean;
  } = $props();
  // Sidebar state management
  let isOpenState = $state(isOpen);
  let activeSection = $state(defaultSection);
  let searchQuery = $state('');
  let isCollapsed = $state(compactMode);
  // Section toggles
  let showCases = $state(true);
  let showEvidence = $state(false);
  let showCitations = $state(false);
  let showReports = $state(false);
  let showAIAssistant = $state(false);
  // Derived reactive data
  let currentUser = $derived(user);
  let authenticated = $derived(isAuthenticated);
  let stats = $derived(userStats);
  // Filtered data based on search
  let filteredCases = $derived(
    userCases
      .filter(
        c =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (c.caseNumber && c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .slice(0, 10)
  );
  let filteredEvidence = $derived(
    userEvidence
      .filter(
        e =>
          e.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
          e.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .slice(0, 10)
  );
  let filteredCitations = $derived(
    userCitations
      .filter(
        c =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .slice(0, 10)
  );
  let filteredReports = $derived(
    userReports
      .filter(
        r =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .slice(0, 10)
  );
  // Initialize sidebar when component mounts
  onMount(() => {
    if (currentUser?.id) {
      userDataActions.init(currentUser.id);
    }
  });
  // Helper functions
  function toggleSection(section: string) {
    if (activeSection === section) {
      isCollapsed = !isCollapsed;
    } else {
      activeSection = section;
      isCollapsed = false;
    }
  }
  function navigateTo(path: string) {
    window.location.href = path;
  }
  function openAIAssistant(contextType?: string, contextId?: string) {
    // TODO: Implement AI assistant modal/panel
    console.log('Opening AI Assistant:', { contextType, contextId });
  }
  function createQuickCase() {
    navigateTo('/cases/create');
  }
  function uploadEvidence() {
    navigateTo('/evidence/upload');
  }
  function createReport() {
    navigateTo('/reports/create');
  }
</script>

<aside class="global-sidebar" class:collapsed={isCollapsed} class:closed={!isOpen}>
  <!-- User Profile Section -->
  {#if authenticated && currentUser}
    <div class="user-profile nes-container is-dark">
      <div class="profile-header">
        <div class="avatar">👤</div>
        <div class="user-info">
          {#if !isCollapsed}
            <div class="user-name">{truncateText(currentUser.email || currentUser.id, 20)}</div>
            <div class="user-role nes-badge is-small {getPriorityColor(currentUser.role)}">{currentUser.role}</div>
          {/if}
        </div>
        <button
          class="nes-btn is-small collapse-btn"
          onclick={() => (isCollapsed = !isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
    </div>
  {:else}
    <div class="auth-prompt nes-container is-dark">
      {#if !isCollapsed}
        <p class="nes-text">Please sign in to access your legal workspace</p>
        <a href="/auth/login" class="nes-btn is-primary">Sign In</a>
      {:else}
        <button class="nes-btn is-small" onclick={() => (isCollapsed = false)}>⚡</button>
      {/if}
    </div>
  {/if}
  {#if authenticated && !isCollapsed}
    <!-- Search Section -->
    <div class="search-section nes-container is-dark">
      <div class="nes-field">
        <input
          type="text"
          class="nes-input is-small search-input"
          placeholder="Search cases, evidence, citations..."
          bind:value={searchQuery}
        />
      </div>
    </div>
    <!-- Dashboard Stats -->
    <div class="stats-section nes-container is-dark with-title">
      <p class="title">📊 Overview</p>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-number">{stats.totalCases}</span>
          <span class="stat-label">Cases</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{stats.totalEvidence}</span>
          <span class="stat-label">Evidence</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{stats.totalCitations}</span>
          <span class="stat-label">Citations</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{stats.totalReports}</span>
          <span class="stat-label">Reports</span>
        </div>
      </div>
    </div>
    <!-- Quick Actions -->
    {#if showQuickActions}
      <div class="quick-actions nes-container is-dark with-title">
        <p class="title">⚡ Quick Actions</p>
        <div class="action-buttons">
          <button class="nes-btn is-small is-primary" onclick={createQuickCase}> 📁 New Case </button>
          <button class="nes-btn is-small is-success" onclick={uploadEvidence}> 📤 Upload Evidence </button>
          <button class="nes-btn is-small is-warning" onclick={createReport}> 📋 New Report </button>
          <button class="nes-btn is-small" onclick={() => openAIAssistant()}> 🤖 AI Assistant </button>
        </div>
      </div>
    {/if}
    <!-- Cases Section -->
    <div class="section cases-section nes-container is-dark with-title">
      <p class="title" onclick={() => toggleSection('cases')}>
        📁 Cases ({stats.totalCases})
        <span class="toggle-icon">{showCases ? '−' : '+'}</span>
      </p>
      {#if showCases}
        <div class="section-content">
          {#if filteredCases.length > 0}
            {#each filteredCases as case_ (case_.id)}
              <div class="item case-item" onclick={() => navigateTo(`/cases/${case_.id}`)}>
                <div class="item-header">
                  <span class="item-title" title={case_.title}>
                    {truncateCaseTitle(case_.title, MINI_TEXT_LENGTHS.TITLE)}
                  </span>
                  <span class="nes-badge is-small {getStatusColor(case_.status)}">{case_.status}</span>
                </div>
                <div class="item-meta">
                  <span class="nes-text is-disabled mini-text">{case_.caseNumber || 'No case #'}</span>
                  <span class="nes-text is-disabled mini-text" title={formatDetailedTimestamp(case_.updatedAt)}>
                    {formatRelativeTime(case_.updatedAt)}
                  </span>
                </div>
                {#if case_.priority !== 'medium'}
                  <div class="priority-indicator nes-badge is-small {getPriorityColor(case_.priority)}">
                    {case_.priority}
                  </div>
                {/if}
              </div>
            {/each}
            {#if stats.totalCases > 10}
              <div class="view-all">
                <a href="/cases" class="nes-btn is-small">View All Cases</a>
              </div>
            {/if}
          {:else}
            <div class="empty-state">
              <p class="nes-text is-disabled">No cases found</p>
              <button class="nes-btn is-small" onclick={createQuickCase}>Create First Case</button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
    <!-- Evidence Section -->
    <div class="section evidence-section nes-container is-dark with-title">
      <p class="title" onclick={() => toggleSection('evidence')}>
        📎 Evidence ({stats.totalEvidence})
        <span class="toggle-icon">{showEvidence ? '−' : '+'}</span>
      </p>
      {#if showEvidence}
        <div class="section-content">
          {#if filteredEvidence.length > 0}
            {#each filteredEvidence as evidence (evidence.id)}
              <div
                class="item evidence-item"
                onclick={() => navigateTo(`/cases/${evidence.caseId}/evidence/${evidence.id}`)}
              >
                <div class="item-header">
                  <span class="file-icon">{getFileIcon(evidence.fileType)}</span>
                  <span class="item-title" title={evidence.filename}>
                    {truncateFilename(evidence.filename, MINI_TEXT_LENGTHS.FILENAME)}
                  </span>
                </div>
                <div class="item-meta">
                  <span class="nes-text is-disabled mini-text">
                    {evidence.fileSize ? (evidence.fileSize / 1024).toFixed(1) + 'KB' : 'Unknown size'}
                  </span>
                  <span
                    class="nes-text is-disabled mini-text"
                    title={formatDetailedTimestamp(evidence.uploadedAt, evidence.uploadedBy)}
                  >
                    {formatRelativeTime(evidence.uploadedAt)}
                  </span>
                </div>
                {#if evidence.tags.length > 0}
                  <div class="tags">
                    {#each evidence.tags.slice(0, 2) as tag}
                      <span class="nes-badge is-small">{tag}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
            {#if stats.totalEvidence > 10}
              <div class="view-all">
                <a href="/evidence" class="nes-btn is-small">View All Evidence</a>
              </div>
            {/if}
          {:else}
            <div class="empty-state">
              <p class="nes-text is-disabled">No evidence found</p>
              <button class="nes-btn is-small" onclick={uploadEvidence}>Upload Evidence</button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
    <!-- Citations Section -->
    <div class="section citations-section nes-container is-dark with-title">
      <p class="title" onclick={() => toggleSection('citations')}>
        📚 Citations ({stats.totalCitations})
        <span class="toggle-icon">{showCitations ? '−' : '+'}</span>
      </p>
      {#if showCitations}
        <div class="section-content">
          {#if filteredCitations.length > 0}
            {#each filteredCitations as citation (citation.id)}
              <div class="item citation-item" onclick={() => navigateTo(`/citations/${citation.id}`)}>
                <div class="item-header">
                  <span class="item-title" title={citation.title}>
                    {truncateText(citation.title, MINI_TEXT_LENGTHS.TITLE)}
                  </span>
                  {#if citation.isFavorite}
                    <span class="favorite-icon">⭐</span>
                  {/if}
                </div>
                <div class="item-meta">
                  <span class="nes-text is-disabled mini-text">{citation.citationType}</span>
                  <span class="nes-text is-disabled mini-text">{citation.year || 'No year'}</span>
                </div>
                <div class="citation-source">
                  <span class="nes-text is-disabled mini-text" title={citation.source}>
                    {truncateText(citation.source, MINI_TEXT_LENGTHS.DESCRIPTION)}
                  </span>
                </div>
              </div>
            {/each}
            {#if stats.totalCitations > 10}
              <div class="view-all">
                <a href="/citations" class="nes-btn is-small">View All Citations</a>
              </div>
            {/if}
          {:else}
            <div class="empty-state">
              <p class="nes-text is-disabled">No citations found</p>
              <a href="/citations/create" class="nes-btn is-small">Add Citation</a>
            </div>
          {/if}
        </div>
      {/if}
    </div>
    <!-- Reports Section -->
    <div class="section reports-section nes-container is-dark with-title">
      <p class="title" onclick={() => toggleSection('reports')}>
        📋 Reports ({stats.totalReports})
        <span class="toggle-icon">{showReports ? '−' : '+'}</span>
      </p>
      {#if showReports}
        <div class="section-content">
          {#if filteredReports.length > 0}
            {#each filteredReports as report (report.id)}
              <div class="item report-item" onclick={() => navigateTo(`/reports/${report.id}`)}>
                <div class="item-header">
                  <span class="item-title" title={report.title}>
                    {truncateText(report.title, MINI_TEXT_LENGTHS.TITLE)}
                  </span>
                  <span class="nes-badge is-small {getStatusColor(report.status)}">{report.status}</span>
                </div>
                <div class="item-meta">
                  <span class="nes-text is-disabled mini-text">{report.reportType}</span>
                  <span class="nes-text is-disabled mini-text">{report.wordCount} words</span>
                  <span class="nes-text is-disabled mini-text" title={formatDetailedTimestamp(report.updatedAt)}>
                    {formatRelativeTime(report.updatedAt)}
                  </span>
                </div>
              </div>
            {/each}
            {#if stats.totalReports > 10}
              <div class="view-all">
                <a href="/reports" class="nes-btn is-small">View All Reports</a>
              </div>
            {/if}
          {:else}
            <div class="empty-state">
              <p class="nes-text is-disabled">No reports found</p>
              <button class="nes-btn is-small" onclick={createReport}>Create Report</button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
    <!-- AI Assistant Section -->
    <div class="section ai-section nes-container is-dark with-title">
      <p class="title" onclick={() => toggleSection('ai')}>
        🤖 AI Assistant ({stats.aiConversations})
        <span class="toggle-icon">{showAIAssistant ? '−' : '+'}</span>
      </p>
      {#if showAIAssistant}
        <div class="section-content">
          {#if userAIConversations.length > 0}
            {#each userAIConversations.slice(0, 5) as conversation (conversation.id)}
              <div class="item ai-item" onclick={() => navigateTo(`/ai/conversations/${conversation.id}`)}>
                <div class="item-header">
                  <span class="item-title" title={conversation.title}>
                    {truncateText(conversation.title, MINI_TEXT_LENGTHS.TITLE)}
                  </span>
                </div>
                <div class="item-meta">
                  <span class="nes-text is-disabled mini-text">{conversation.messageCount} messages</span>
                  <span
                    class="nes-text is-disabled mini-text"
                    title={formatDetailedTimestamp(conversation.lastMessageAt)}
                  >
                    {formatRelativeTime(conversation.lastMessageAt)}
                  </span>
                </div>
              </div>
            {/each}
            <div class="view-all">
              <a href="/ai/conversations" class="nes-btn is-small">View All Conversations</a>
            </div>
          {:else}
            <div class="empty-state">
              <p class="nes-text is-disabled">No AI conversations yet</p>
              <button class="nes-btn is-small" onclick={() => openAIAssistant()}>Start Chat</button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</aside>

<style>
  .global-sidebar {
    width: 320px;
    min-height: 100vh;
    background: #1a1a1a;
    border-right: 2px solid #495057;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    overflow-y: auto;
    transition: all 0.3s ease;
    position: fixed;
    left: 0;
    top: 0;
    z-index: 1000;
  }
  .global-sidebar.collapsed {
    width: 80px;
  }
  .global-sidebar.closed {
    transform: translateX(-100%);
  }
  /* User Profile */
  .user-profile {
    flex-shrink: 0;
  }
  .profile-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .avatar {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  .user-info {
    flex: 1;
    min-width: 0;
  }
  .user-name {
    font-weight: bold;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }
  .user-role {
    font-size: 0.7rem;
  }
  .collapse-btn {
    flex-shrink: 0;
    padding: 0.25rem 0.5rem;
    min-height: auto;
  }
  /* Search */
  .search-section {
    flex-shrink: 0;
  }
  .search-input {
    width: 100%;
    font-size: 0.8rem;
  }
  /* Stats */
  .stats-section {
    flex-shrink: 0;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .stat-item {
    text-align: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  .stat-number {
    display: block;
    font-weight: bold;
    font-size: 1.1rem;
    color: #00ff00;
  }
  .stat-label {
    display: block;
    font-size: 0.7rem;
    opacity: 0.8;
  }
  /* Quick Actions */
  .quick-actions {
    flex-shrink: 0;
  }
  .action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .action-buttons .nes-btn {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }
  /* Sections */
  .section {
    flex-shrink: 0;
  }
  .section .title {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0;
    padding: 0.5rem;
    user-select: none;
  }
  .toggle-icon {
    font-family: monospace;
    font-weight: bold;
  }
  .section-content {
    max-height: 300px;
    overflow-y: auto;
  }
  /* Items */
  .item {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .item:hover {
    border-color: #007bff;
    background: rgba(0, 123, 255, 0.1);
  }
  .item-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .item-title {
    flex: 1;
    font-weight: bold;
    font-size: 0.85rem;
    line-height: 1.2;
  }
  .item-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.25rem;
  }
  .file-icon {
    flex-shrink: 0;
    font-size: 1rem;
  }
  .favorite-icon {
    flex-shrink: 0;
    color: #ffd700;
  }
  .priority-indicator {
    margin-top: 0.25rem;
  }
  .tags {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }
  .citation-source {
    margin-top: 0.25rem;
  }
  /* Mini text */
  .mini-text {
    font-size: 0.7rem !important;
    line-height: 1.2;
  }
  /* Empty states */
  .empty-state {
    text-align: center;
    padding: 1rem;
  }
  .empty-state .nes-btn {
    margin-top: 0.5rem;
  }
  /* View all */
  .view-all {
    text-align: center;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  /* Auth prompt */
  .auth-prompt {
    text-align: center;
    flex-shrink: 0;
  }
  /* Scrollbar */
  .global-sidebar::-webkit-scrollbar,
  .section-content::-webkit-scrollbar {
    width: 6px;
  }
  .global-sidebar::-webkit-scrollbar-track,
  .section-content::-webkit-scrollbar-track {
    background: #2a2a2a;
  }
  .global-sidebar::-webkit-scrollbar-thumb,
  .section-content::-webkit-scrollbar-thumb {
    background: #495057;
    border-radius: 3px;
  }
  .global-sidebar::-webkit-scrollbar-thumb:hover,
  .section-content::-webkit-scrollbar-thumb:hover {
    background: #6c757d;
  }
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .global-sidebar {
      width: 280px;
    }
    .global-sidebar.collapsed {
      width: 60px;
    }
  }
</style>
