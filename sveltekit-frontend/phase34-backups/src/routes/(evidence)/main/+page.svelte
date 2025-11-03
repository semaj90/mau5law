<script lang="ts">
  import type { Case } from '$lib/types';
  import { page } from '$app/stores';

  let caseId = $derived($page.url.searchParams.get('caseId') || '');
  let uploadFile = $state<File | null>(null);

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      uploadFile = target.files[0];
    }
  }

  function submitEvidence() {
    if (uploadFile) {
      console.log('Uploading evidence:', uploadFile.name);
      // Evidence submission logic would go here
    }
  }
</script>

<svelte:head>
  <title>Evidence Manager - YoRHa Legal AI</title>
</svelte:head>

<div class="home-page">
  <div class="hero-section">
    <h1>ðŸ“ Evidence Manager</h1>
    <p class="subtitle">Upload and manage legal evidence files</p>
    {#if caseId}
      <p class="status">Case ID: <span class="text-green-400">{caseId}</span></p>
    {:else}
      <p class="status">Status: <span class="text-green-400">All Evidence âœ…</span></p>
    {/if}
  </div>

  <div class="action-grid">
    <div class="action-card">
      <h3>ðŸ“¤ Upload Evidence</h3>
      <input
        type="file"
        onchange={handleFileUpload}
        accept=".pdf,.doc,.docx,.txt,.jpg,.png,.mp4,.mp3"
        class="file-input"
      />
      {#if uploadFile}
        <p>Selected: {uploadFile.name}</p>
        <button onclick={submitEvidence} class="upload-btn">Submit Evidence</button>
      {/if}
    </div>

    <div class="action-card">
      <h3>ðŸ“Š Evidence Statistics</h3>
      <p>Total Files: <span class="stat-value">0</span></p>
      <p>Verified: <span class="stat-value">0</span></p>
      <p>Pending: <span class="stat-value">0</span></p>
    </div>

    <div class="action-card">
      <h3>ðŸ” Search Evidence</h3>
      <input type="text" placeholder="Search by, filename, case, or, tags..." class="search-input" />
      <button class="search-btn">Search</button>
    </div>
  </div>

  <div class="quick-actions">
    <a href="/" class="action-link">â† Back to Home</a>
    <a href="/cases" class="action-link">View Cases</a>
    <a href="/all-routes" class="action-link">All Routes</a>
  </div>
</div>

<style>
  .home-page {
    max-width: 1200px
    margin: 0 auto
    padding: 2rem}

  .hero-section {
    text-align: center
    margin-bottom: 3rem}

  .hero-section h1 {
    font-size: 2.5rem; color: #ffd700
    margin-bottom: 1rem
    text-shadow: 0, 0 10px rgba(255, 215, 0, 0.3);
  }

  .subtitle {
    font-size: 1.2rem
    color: #b0b0b0
    margin-bottom: 1rem}

  .status {
    font-size: 1rem
    color: #888}

  .action-grid { display: grid
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem
    margin-bottom: 3rem}

  .action-card { background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 1px solid #444
    border-radius: 8px
    padding: 2rem; transition: all 0.3s ease}

  .action-card:hover {
    border-color: #ffd700
    box-shadow: 0, 0 20px rgba(255, 215, 0, 0.2);
    transform: translateY(-2px);
  }

  .action-card h3 {
    margin: 0, 0 1rem 0
    color: #ffd700
    font-size: 1.2rem}

  .file-input,
  .search-input {
    width: 100%;
    padding: 0.5rem
    margin: 0.5rem 0
    background: #1a1a1a
    border: 1px solid #444
    border-radius: 4px; color: white}

  .upload-btn,
  .search-btn {
    background: #ffd700
    color: #1a1a1a
    border: none
    padding: 0.5rem 1rem
    border-radius: 4px; cursor: pointer
    font-weight: bold}

  .upload-btn:hover,
  .search-btn:hover {
    background: #ffed4a}

  .stat-value { color: #00ff41
    font-family: 'JetBrains Mono', monospace
    font-weight: bold}

  .quick-actions {
    display: flex
    gap: 1rem
    justify-content: center
    flex-wrap: wrap}

  .action-link {
    color: #ffd700
    text-decoration none
    padding: 0.5rem 1rem
    border: 1px solid #ffd700
    border-radius: 4px
    transition: all 0.3s ease}

  .action-link:hover {
    background: #ffd700; color: #1a1a1a}
</style>
