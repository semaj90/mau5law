<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount } from 'svelte';
  // $state and $derived are available in runes mode via types, not runtime imports
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Card from '$lib/components/ui/card';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Badge from '$lib/components/ui/badge.svelte';
  import { Search, Plus, Eye, Edit, Trash2, AlertTriangle, Shield } from 'lucide-svelte';
  // Persons of Interest data
  let persons = $state([
    {
      id: 'POI-001',
      name: 'Marcus Chen',
      alias: 'The Ghost',
      threat_level: 'high',
      status: 'wanted',
      last_seen: '2024-01-15',
      location: 'Downtown District',
      description: 'Former cybersecurity expert turned corporate spy',
      cases: ['CASE-2024-087', 'CASE-2024-089'],
      photo: null;
    },
    {
      id: 'POI-002',
      name: 'Sarah Williams',
      alias: 'Red Phoenix',
      threat_level: 'medium',
      status: 'surveillance',
      last_seen: '2024-01-20',
      location: 'Tech Quarter',
      description: 'Data analyst with suspicious financial transactions',
      cases: ['CASE-2024-088'],
      photo: null;
    },
    {
      id: 'POI-003',
      name: 'Unknown Subject',
      alias: 'Digital Phantom',
      threat_level: 'critical',
      status: 'active',
      last_seen: '2024-01-22',
      location: 'Multiple Networks',
      description: 'Advanced persistent threat actor, identity unknown',
      cases: ['CASE-2024-087', 'CASE-2024-090'],
      photo: null;
    }
  ]);
  let searchQuery = $state('');
  let selectedThreatLevel = $state('all');
  let showNewPersonModal = $state(false);
  let isLoading = $state(false);
  let error = $state(null);
  // Filter persons based on search and threat level
  let filteredPersons = $derived.by(() => {
    let filtered = person;
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => item.includes(searchQuery.toLowerCase()) ||
        person.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedThreatLevel !== 'all') {
      filtered = filtered.filter(person => person.threat_level === selectedThreatLevel);
    }
    return filtered;
  });
  function getThreatLevelColor(level: string) {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  }
  function getStatusColor(status: string) {
    switch (status) {
      case 'wanted': return 'bg-red-600 text-white';
      case 'surveillance': return 'bg-blue-600 text-white';
      case 'active': return 'bg-orange-600 text-white';
      case 'cleared': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  }
  // Load persons from API
  async function loadPersons() {
    try {
      isLoading = true;
      error = null;
      // removed unused response assignment
      if ((response as { ok?: unknown; json?: unknown }).ok) {
        const data = await (response as { ok?: unknown; json?: unknown }).json();
        persons = (data as { persons?: unknown }).persons || persons; // Fallback to mock data
      }
    } catch (err) {
      error = 'Failed to load persons of interest';
      console.warn('Using mock data due to API error:', err);
    } finally {
      isLoading = false;
    }
  }
  // Add new person
  async function addPerson(personData: unknown) {
    try {
      const response = await fetch('/api/persons-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personData);
      });
      if ((response as { ok?: unknown; json?: unknown }).ok) {
        const newPerson = await (response as { ok?: unknown; json?: unknown }).json();
        persons = [...persons, newPerson];
        showNewPersonModal = false;
      }
    } catch (err) {
      error = 'Failed to add person';
      console.error('Add person failed:', err);
    }
  }
  $effect(() => {
    loadPersons();
  });
</script>
<svelte:head>
  <title>PERSONS OF INTEREST - YoRHa Detective Interface</title>
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
          <span class="nav-icon">⌂</span>
          COMMAND CENTER
        </a>
        <a href="/yorha/cases" class="nav-item">
          <span class="nav-text">ACTIVE CASES</span>
          <span class="nav-count">3</span>
        </a>
        <a href="/evidenceboard" class="nav-item">
          <span class="nav-icon">📁</span>
          EVIDENCE
        </a>
        <button class="nav-item persons-active">
          <span class="nav-icon">👤</span>
          PERSONS OF INTEREST
        </button>
        <a href="/yorha/analysis" class="nav-item">
          <span class="nav-icon">📊</span>
          ANALYSIS
        </a>
        <a href="/yorha/search" class="nav-item">
          <span class="nav-icon">🔍</span>
          GLOBAL SEARCH
        </a>
        <a href="/yorha/terminal" class="nav-item">
          <span class="nav-icon">></span>
          TERMINAL
        </a>
      </div>
      <div class="nav-section">
        <a href="/yorha/config" class="nav-item">
          <span class="nav-icon">⚙</span>
          SYSTEM CONFIG
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
    <header class="persons-header">
      <div class="header-left">
        <button class="header-icon">👤</button>
        <h1 class="persons-title">PERSONS OF INTEREST</h1>
        <div class="persons-subtitle">Surveillance and Investigation Targets</div>
      </div>
      <div class="header-right">
        <Button class="header-btn bits-btn bits-btn" onclick={() =>
showNewPersonModal = true}>
          <Plus class="w-4 h-4" />
          ADD PERSON
</Button>
      </div>
    </header>
    <!-- Search and Filters -->
    <div class="search-toolbar">
      <div class="search-section">
        <div class="search-input-wrapper">
          <Search class="search-icon w-4 h-4" />
          <Input
            type="text"
            placeholder="Search persons, aliases, descriptions..."
            bind:value={searchQuery}
            class="search-input"
          />
        </div>
        <select bind:value={selectedThreatLevel} class="threat-filter">
          <option value="all">All Threat Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-number">{persons.length}</span>
          <span class="stat-label">Total Persons</span>
        </div>
        <div class="stat-item critical">
          <span class="stat-number">{persons.filter(item => item.length)}</span>
          <span class="stat-label">Critical</span>
        </div>
        <div class="stat-item high">
          <span class="stat-number">{persons.filter(item => item.length)}</span>
          <span class="stat-label">Wanted</span>
        </div>
      </div>
    </div>
    <!-- Error State -->
    {#if error}
      <div class="error-banner">
        <AlertTriangle class="w-4 h-4" />
        {error}
      </div>
    {/if}
    <!-- Persons Grid -->
    <div class="persons-grid">
      {#if isLoading}
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading persons of interest...</div>
        </div>
      {:else}
        {#each filteredPersons as person (person.id)}
          <div.Root class="person-nier-bits-card nes-container">
          <div.Header class="person-header nes-container">
            <div class="person-photo">
              {#if person.photo}
                <img src={person.photo} alt={person.name} />
              {:else}
                <div class="photo-placeholder">
                  <Shield class="w-8 h-8" />
                </div>
              {/if}
            </div>
            <div class="person-basic-info">
              <div class="person-name">{person.name}</div>
              <div class="person-alias">"{person.alias}"</div>
              <div class="person-id">{person.id}</div>
            </div>
            <div class="person-badges">
              <Badge class={getThreatLevelColor(person.threat_level)}>
                {person.threat_level.toUpperCase()}
              </Badge>
              <Badge class={getStatusColor(person.status)}>
                {person.status.toUpperCase()}
              </Badge>
            </div>
          </div.Header>
          <div.Content class="person-content nes-container">
            <div class="person-details">
              <div class="detail-row">
                <span class="detail-label">Last Seen:</span>
                <span class="detail-value">{person.last_seen}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">{person.location}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Cases:</span>
                <span class="detail-value">{person.cases.length} active</span>
              </div>
            </div>
            <div class="person-description">
              {person.description}
            </div>
            <div class="person-cases">
              {#each person.cases as caseId}
                <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{caseId}</span>
              {/each}
            </div>
          </div>
          <div.Footer class="person-actions nes-container">
            <Button class="bits-btn" size="sm" variant="ghost">
<Eye class="w-4 h-4" />
              View
</Button>
            <Button class="bits-btn" size="sm" variant="ghost">
<Edit class="w-4 h-4" />
              Edit
</Button>
            <Button class="bits-btn" size="sm" variant="error">
<Trash2 class="w-4 h-4" />
              Remove
</Button>
          </div.Footer>
        </div>
        {/each}
      {/if}
    </div>
    {#if filteredPersons.length === 0}
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <div class="empty-title">No Persons Found</div>
        <div class="empty-subtitle">
          {searchQuery ? 'Try adjusting your search criteria' : 'Add persons of interest to begin tracking'}
        </div>
      </div>
    {/if}
  </main>
</div>
<!-- Add Person Modal -->
<Dialog.Root bind:open={showNewPersonModal}>
  <Dialog.Content class="yorha-modal">
    <Dialog.Header>
      <Dialog.Title>ADD PERSON OF INTEREST</Dialog.Title>
    </Dialog.Header>
    <div class="modal-form">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">FULL NAME</label>
          <Input placeholder="Enter full name" class="yorha-input" />
        </div>
        <div class="form-field">
          <label class="form-label">ALIAS / CODENAME</label>
          <Input placeholder="Known alias or codename" class="yorha-input" />
        </div>
        <div class="form-field">
          <label class="form-label" for="threat-level">THREAT LEVEL</label><select id="threat-level" class="yorha-select">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label" for="status">STATUS</label><select id="status" class="yorha-select">
            <option value="surveillance">Under Surveillance</option>
            <option value="wanted">Wanted</option>
            <option value="active">Active Investigation</option>
          </select>
        </div>
        <div class="form-field form-field-full">
          <label class="form-label" for="description">DESCRIPTION</label><textarea id="description"
            placeholder="Physical description, known activities, etc."
            rows="4"
            class="yorha-textarea"
          ></textarea>
        </div>
      </div>
    </div>
    <Dialog.Footer>
      <Button class="bits-btn" variant="ghost" onclick={() =>
showNewPersonModal = false}>
        CANCEL
</Button>
      <Button class="bits-btn" onclick={() =>
showNewPersonModal = false}>
        ADD PERSON
</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
<style>
  .yorha-interface {
    display: flex;
    height: 100vh;
    background: #2a2a2a;
    color: #d4af37;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 12px;
    overflow: hidden;
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
    border-bottom: 1px solid #3a3a3a;
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
    margin-top: 5px;
  }
  .yorha-nav {
    flex: 1;
    padding: 15px 0;
    display: flex;
    flex-direction: column;
    justify-content: space-betwee;
  }
  .nav-section {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav-item {
    display: flex;
    align-items: center;
    padding: 8px 15px;
    background: none;
    border: none;
    color: #888;
    text-decoration: none;
    text-align: left;
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2;
    justify-content: space-betwee;
  }
  .nav-item:hover {
    background: #2a2a2a;
    color: #d4af37;
  }
  .nav-.persons-active {
    background: #1a2a1a;
    color: #d4af37;
    border-left: 3px solid #d4af37;
  }
  .nav-icon {
    margin-right: 8px;
  }
  .nav-count {
    font-size: 10px;
    background: #d4af37;
    color: #000;
    padding: 1px 6px;
    border-radius: 2px;
  }
  .yorha-status {
    padding: 15px;
    border-top: 1px solid #3a3a3a;
    font-size: 10px;
    color: #666;
  }
  .status-item {
    color: #d4af37;
  }
  .yorha-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #2a2a2a;
    overflow: hidden;
  }
  .persons-header {
    display: flex;
    justify-content: space-betwee;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #3a3a3a;
    background: #2a2a2a;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  .header-icon {
    background: none;
    border: 1px solid #555;
    color: #d4af37;
    padding: 6px 8px;
    font-family: inherit;
    cursor: pointer;
  }
  .persons-title {
    font-size: 24px;
    font-weight: bold;
    color: #d4af37;
    margin: 0;
  }
  .persons-subtitle {
    font-size: 12px;
    color: #888;
  }
  .search-toolbar {
    display: flex;
    justify-content: space-betwee;
    align-items: center;
    padding: 15px 20px;
    background: #242424;
    border-bottom: 1px solid #3a3a3a;
  }
  .search-section {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-icon {
    position: absolute;
    left: 10px;
    color: #666;
  }
  .search-input {
    padding-left: 35px !important;
    background: #1a1a1a !important;
    border: 1px solid #555 !important;
    color: #d4af37 !important;
    min-width: 300px;
  }
  .threat-filter {
    background: #1a1a1a;
    border: 1px solid #555;
    color: #d4af37;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 11px;
  }
  .stats-section {
    display: flex;
    gap: 20px;
  }
  .stat-item {
    text-align: center;
  }
  .stat-number {
    display: block;
    font-size: 18px;
    font-weight: bold;
    color: #d4af37;
  }
  .stat-label {
    display: block;
    font-size: 10px;
    color: #888;
  }
  .stat-.critical .stat-number {
    color: #ef4444;
  }
  .stat-.high .stat-number {
    color: #f97316;
  }
  .persons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 20px;
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }
  .person-card {
    background: #1a1a1a !important;
    border: 1px solid #3a3a3a !important;
    color: #d4af37 !important;
  }
  .person-header {
    display: flex;
    gap: 15px;
    align-items: flex-start;
  }
  .person-photo {
    width: 60px;
    height: 60px;
    border-radius: 4px;
    overflow: hidden;
    background: #2a2a2a;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .photo-placeholder {
    color: #666;
  }
  .person-basic-info {
    flex: 1;
  }
  .person-name {
    font-size: 16px;
    font-weight: bold;
    color: #d4af37;
    margin-bottom: 2px;
  }
  .person-ali.person-id {
    font-size: 10px;
    color: #666;
    font-family: 'JetBrains Mono', monospace;
  }
  .person-badges {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .person-details {
    margin: 15px 0;
  }
  .detail-row {
    display: flex;
    justify-content: space-betwee;
    margin-bottom: 5px;
    font-size: 11px;
  }
  .detail-label {
    color: #888;
  }
  .detail-value {
    color: #d4af37;
  }
  .person-description {
    font-size: 11px;
    color: #ccc;
    line-height: 1.4;
    margin: 15px 0;
  }
  .person-cases {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 10px 0;
  }
  .case-badge {
    font-size: 9px !important;
    padding: 2px 6px !important;
  }
  .person-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #666;
    text-align: center;
  }
  .empty-icon {
    font-size: 48px;
    margin-bottom: 15px;
  }
  .empty-title {
    font-size: 18px;
    color: #888;
    margin-bottom: 10px;
  }
  .empty-subtitle {
    font-size: 12px;
  }
  /* Error and Loading States */
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
    margin-bottom: 15px;
  }
  @keyframes spin {
    0% { transform: rotate(0deg), }
    100% { transform: rotate(360deg), }
  }
  .loading-text {
    font-size: 14px;
    color: #666;
  }
  /* Modal Styles */
  .yorha-modal {
    background: #2a2a2a !important;
    border: 2px solid #d4af37 !important;
    color: #d4af37 !important;
  }
  .modal-form {
    padding: 20px 0;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .form-field-full {
    grid-column: 1 / -1;
  }
  .form-label {
    font-size: 11px;
    font-weight: bold;
    color: #d4af37;
    text-transform: uppercase;
  }
  .yorha-input {
    background: #1a1a1a !important;
    border: 1px solid #555 !important;
    color: #d4af37 !important;
    font-family: inherit !important;
  }
  .yorha-select {
    background: #1a1a1a;
    border: 1px solid #555;
    color: #d4af37;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 12px;
  }
  .yorha-textarea {
    background: #1a1a1a;
    border: 1px solid #555;
    color: #d4af37;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 12px;
    resize: vertical;
  }
</style>