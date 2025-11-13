<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import Button from '$lib/components/ui/button';
  import Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { appActions, appStore } from '$lib/stores/app-store';
  import * as Lucide from 'lucide-svelte';
  import { onMount } from 'svelte';

  // Reactive state from app store
  let evidence: any[] = $state([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  let searchQuery = $state<string>('');
  let selectedType = $state<string>('all');
  let selectedStatus = $state<string>('all');

  // Subscribe to app store
  $effect(() => {
    const unsubscribe = appStore.subscribe((state) => {
      evidence = state.evidence;
      isLoading = state.isLoading;
      error = state.error;
    });
    return unsubscribe;
  });

  // Filter evidence based on search and filters
  let filteredEvidence = $derived(() => {
    let filtered = evidence ? [...evidence] : [];
    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (item) =>
          (item.filename || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q) ||
          (item.caseId || '').toLowerCase().includes(q)
      );
    }
    if (selectedType && selectedType !== 'all') {
      filtered = filtered.filter((item) => item.type === selectedType);
    }
    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter((item) => item.status === selectedStatus);
    }
    return filtered;
  });

  function resolveIcon(name: string) {
    const ns = Lucide as Record<string, any>;
    return ns[name] ?? ns[name.toLowerCase()] ?? ns.default?.[name] ?? ns.default ?? undefined;
  }

  const Search = resolveIcon('Search');
  const FileText = resolveIcon('FileText');
  const Image = resolveIcon('Image');
  const Video = resolveIcon('Video');
  const File = resolveIcon('File');
  const Eye = resolveIcon('Eye');
  const Download = resolveIcon('Download');
  const Trash2 = resolveIcon('Trash2');

  function getEvidenceIcon(type: string) {
    switch (type?.toLowerCase()) {
      case 'document':
      case 'pdf':
        return FileText;
      case 'image':
      case 'photo':
        return Image;
      case 'video':
        return Video;
      default:
        return File;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'processed':
        return 'bg-green-500 text-white';
      case 'processing':
        return 'bg-blue-500 text-white';
      case 'flagged':
        return 'bg-red-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-gray-500 text-white';
    }
  }

  function getTypeColor(type: string) {
    switch (type?.toLowerCase()) {
      case 'document':
        return 'bg-blue-600 text-white';
      case 'image':
        return 'bg-purple-600 text-white';
      case 'video':
        return 'bg-red-600 text-white';
      case 'audio':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  }

  onMount(async () => {
    await appActions.loadEvidence();

    // Refresh data periodically
    const interval = setInterval(async () => {
      await appActions.loadEvidence();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>EVIDENCE LIBRARY - YoRHa Detective Interface</title>
</svelte:head>

<!-- YoRHa Interface -->
<div class="yorha-interface">
  <!-- Left Sidebar -->
  <aside class="yorha-sidebar">
    <div class="yorha-logo">
      <div class="yorha-title">YORHA</div>
      <div class="yorha-subtitle">DETECTIVE</div>
      <div class="yorha-subtext">Investigation Interface</div>
    </div>
    <nav class="yorha-nav">
      <div class="nav-section">
        <a href="/yorha-command-center" class="nav-item">
          <span class="nav-icon">⌘</span> COMMAND CENTER
        </a>
        <a href="/yorha/detective" class="nav-item">
          <span class="nav-text">ACTIVE CASES</span>
          <span class="nav-count">3</span>
        </a>
        <a href="/yorha/evidence" class="nav-item evidence-active">
          <span class="nav-icon">📋</span> EVIDENCE LIBRARY
        </a>
        <a href="/yorha/persons" class="nav-item">
          <span class="nav-icon">👤</span> PERSONS OF INTEREST
        </a>
        <a href="/yorha/analysis" class="nav-item">
          <span class="nav-icon">📊</span> ANALYSIS
        </a>
        <a href="/yorha/search" class="nav-item">
          <span class="nav-icon">🔍</span> GLOBAL SEARCH
        </a>
        <a href="/yorha/terminal" class="nav-item">
          <span class="nav-icon">></span> TERMINAL
        </a>
      </div>
      <div class="nav-section">
        <a href="/yorha/config" class="nav-item">
          <span class="nav-icon">⚙️</span> SYSTEM CONFIG
        </a>
      </div>
    </nav>
    <div class="yorha-status">
      <div class="status-item">Online</div>
      <div class="status-time">{new Date().toLocaleTimeString()}</div>
      <div class="status-text">System: Operational</div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="yorha-main">
    <!-- Header -->
    <header class="evidence-header">
      <div class="header-left">
        <button class="header-icon">📋</button>
        <h1 class="evidence-title">EVIDENCE LIBRARY</h1>
        <div class="evidence-subtitle">Digital Evidence Management System</div>
      </div>
      <div class="header-right">
        <Button class="header-btn bits-btn" type="button">
          UPLOAD EVIDENCE
        </Button>
      </div>
    </header>

    <!-- Search and Filters -->
    <div class="search-toolbar">
      <div class="search-section">
        <div class="search-input-wrapper">
          <Search class="search-icon w-4" />
          <Input
            type="text"
            placeholder="Search evidence by filename, description, case ID..."
            bind:value={searchQuery}
            class="search-input"
          />
        </div>
        <select bind:value={selectedType} class="filter-select">
          <option value="all">All Types</option>
          <option value="document">Documents</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
        </select>
        <select bind:value={selectedStatus} class="filter-select">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="processed">Processed</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-number">{evidence.length}</span>
          <span class="stat-label">Total Evidence</span>
        </div>
        <div class="stat-item processed">
          <span class="stat-number">{evidence.filter(e => e.status === 'processed').length}</span>
          <span class="stat-label">Processed</span>
        </div>
        <div class="stat-item flagged">
          <span class="stat-number">{evidence.filter(e => e.status === 'flagged').length}</span>
          <span class="stat-label">Flagged</span>
        </div>
      </div>
    </div>

    <!-- Error State -->
    {#if error}
      <div class="error-banner">
        Error loading evidence: {error}
      </div>
    {/if}

    <!-- Evidence Grid -->
    <div class="evidence-grid">
      {#if isLoading}
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading evidence library...</div>
        </div>
      {:else}
        {#each filteredEvidence as item (item.id)}
          <Card class="evidence-card">
            <div class="evidence-header">
              <div class="evidence-icon">
                <svelte:component this={getEvidenceIcon(item.type)} class="w-8 h-8" />
              </div>
              <div class="evidence-info">
                <div class="evidence-filename">{item.filename || 'Unknown File'}</div>
                <div class="evidence-case">Case: {item.caseId || 'Unassigned'}</div>
              </div>
              <div class="evidence-badges">
                <Badge class={getTypeColor(item.type)}>
                  {item.type?.toUpperCase() || 'UNKNOWN'}
                </Badge>
                <Badge class={getStatusColor(item.status)}>
                  {item.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </div>
            </div>
            <div class="evidence-content">
              <div class="evidence-details">
                <span class="detail-label">Size:</span>
                <span class="detail-value">{item.fileSize ? `${Math.round(item.fileSize / 1024)} KB` : 'Unknown'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Uploaded:</span>
                <span class="detail-value">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
              {#if item.description}
                <div class="evidence-description">{item.description}</div>
              {/if}
            </div>
            <div class="evidence-actions">
              <Button class="bits-btn" size="sm" variant="ghost" type="button">
                <Eye class="w-4" /> View
              </Button>
              <Button class="bits-btn" size="sm" variant="ghost" type="button">
                <Download class="w-4" /> Download
              </Button>
              <Button class="bits-btn" size="sm" variant="destructive" type="button">
                <Trash2 class="w-4" /> Delete
              </Button>
            </div>
          </Card>
        {/each}
      {/if}
    </div>

    {#if filteredEvidence.length === 0 && !isLoading}
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No Evidence Found</div>
        <div class="empty-subtitle">
          {searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
            ? 'Try adjusting your search criteria'
            : 'Upload evidence files to begin building your case'}
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .yorha-interface {
    display: flex;
    height: 100vh;
    background: #2a2a2a;
    color: #d4af37;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
  }

  .yorha-sidebar {
    width: 200px;
    background: #1a1a1a;
    border-right: 1px solid #3a3a3a;
    display: flex;
    flex-direction: column;
  }

  .yorha-logo {
    padding: 20px 15px;
  }

  .yorha-title,
  .yorha-subtitle {
    font-size: 18px;
    font-weight: bold;
    color: #d4af37;
    line-height: 1;
  }

  .yorha-subtext {
    font-size: 10px;
    color: #888;
    padding-top: 8px;
    border-bottom: 1px solid #3a3a3a;
  }

  .yorha-nav {
    padding: 10px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-left: 8px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    color: #888;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    justify-content: space-between;
    font-size: 11px;
  }

  .nav-item:hover {
    background: #2a2a2a;
    color: #d4af37;
  }

  .nav-item.evidence-active {
    background: #162016;
    color: #d4af37;
    border-left: 3px solid #d4af37;
    padding-left: 9px;
  }

  .nav-count {
    font-size: 10px;
    background: #d4af37;
    color: #000;
    padding: 1px 6px;
    border-radius: 2px;
  }

  .yorha-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #2a2a2a;
    overflow: hidden;
  }

  .evidence-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #3a3a3a;
    background: #2a2a2a;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-icon {
    background: none;
    border: 1px solid #555;
    color: #d4af37;
    padding: 6px 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
  }

  .evidence-title {
    font-size: 24px;
    font-weight: bold;
    color: #d4af37;
    margin: 0;
  }

  .evidence-subtitle {
    font-size: 12px;
    color: #888;
  }

  .search-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: #242424;
    border-bottom: 1px solid #3a3a3a;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .search-icon {
    position: absolute;
    left: 10px;
  }

  .search-input {
    padding-left: 36px !important;
    background: #1a1a1a !important;
    border: 1px solid #555 !important;
    color: #d4af37 !important;
    min-width: 300px;
  }

  .filter-select {
    background: #1a1a1a;
    border: 1px solid #555;
    color: #d4af37;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 12px;
  }

  .stats-section {
    display: flex;
    gap: 20px;
    color: #d4af37;
    align-items: center;
  }

  .stat-item {
    text-align: center;
    font-size: 11px;
  }

  .stat-number {
    display: block;
    font-size: 18px;
    font-weight: bold;
    color: #d4af37;
  }

  .stat-item.processed .stat-number {
    color: #4ade80;
  }

  .stat-item.flagged .stat-number {
    color: #ef4444;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 20px;
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .evidence-card {
    background: #1a1a1a !important;
    border: 1px solid #3a3a3a !important;
    padding: 16px;
  }

  .evidence-header {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .evidence-icon {
    color: #d4af37;
  }

  .evidence-info {
    flex: 1;
  }

  .evidence-filename {
    font-size: 16px;
    font-weight: bold;
    color: #d4af37;
    margin-bottom: 2px;
  }

  .evidence-case {
    font-size: 10px;
    color: #666;
    font-family: 'JetBrains Mono', monospace;
  }

  .evidence-badges {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .evidence-content {
    margin: 12px 0;
  }

  .evidence-details {
    color: #888;
    margin-bottom: 6px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 11px;
  }

  .detail-label {
    color: #888;
  }

  .detail-value {
    color: #d4af37;
  }

  .evidence-description {
    font-size: 11px;
    color: #ccc;
    line-height: 1.4;
    margin: 8px 0;
  }

  .evidence-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #666;
    text-align: center;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .empty-title {
    font-size: 18px;
    color: #888;
    margin-bottom: 8px;
  }

  .empty-subtitle {
    font-size: 12px;
    color: #999;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #4a1a1a;
    border: 1px solid #ef4444;
    color: #fca5a5;
    font-size: 12px;
    margin: 15px 20px;
    border-radius: 4px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #888;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #3a3a3a;
    border-top: 2px solid #d4af37;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>