<script lang="ts">
  import { ButtonBits, CardBits, InputBits } from '$lib/components/ui/bits-ui';
  import CitationsSaveButton from '$lib/components/citations/CitationsSaveButton.svelte';
  import { authDemo } from '$lib/modules/auth-demo';
  import { citationsManager } from '$lib/modules/citations-manager';

  let citations = $state([
    {
      id: '001',
      title: 'Miranda v. Arizona',
      citation: '384 U.S. 436 (1966)',
      court: 'Supreme Court',
      year: '1966',
      category: 'Criminal Procedure',
      relevance: 'high',
      keyPoints: ['Right to remain silent', 'Right to counsel', 'Police warnings'],
      cited: 47
    },
    {
      id: '002',
      title: 'Brown v. Board of Education',
      citation: '347 U.S. 483 (1954)',
      court: 'Supreme Court',
      year: '1954',
      category: 'Civil Rights',
      relevance: 'medium',
      keyPoints: ['Separate but equal', 'Educational discrimination', '14th Amendment'],
      cited: 23
    },
    {
      id: '003',
      title: 'Roe v. Wade',
      citation: '410 U.S. 113 (1973)',
      court: 'Supreme Court',
      year: '1973',
      category: 'Constitutional Law',
      relevance: 'low',
      keyPoints: ['Privacy rights', 'Due process', 'State regulation'],
      cited: 12
    },
    {
      id: '004',
      title: 'Gideon v. Wainwright',
      citation: '372 U.S. 335 (1963)',
      court: 'Supreme Court',
      year: '1963',
      category: 'Criminal Defense',
      relevance: 'high',
      keyPoints: ['Right to counsel', '6th Amendment', 'Public defender'],
      cited: 34
    }
  ]);

  let searchQuery = $state('');
  let selectedCategory = $state('all');
  let selectedCourt = $state('all');
  let currentUser = $state(authDemo.getCurrentUser());
  let showAuthDemo = $state(false);

  // Listen for auth changes
  citationsManager.onAuthChange((user) => {
    currentUser = user;
  });

  // Demo authentication for testing
  async function handleDemoSignIn(email: string) {
    await authDemo.signIn(email);
    currentUser = authDemo.getCurrentUser();
    showAuthDemo = false;
  }

  async function handleSignOut() {
    await authDemo.signOut();
    currentUser = null;
  }
</script>

<svelte:head>
  <title>Citations Database - YoRHa Legal AI</title>
</svelte:head>

<div class="citations-dashboard">
  <div class="header nes-container with-title">
    <p class="title">📚 CITATIONS LIBRARY</p>
    <p class="subtitle">Legal Precedent & Case Law Database</p>
  </div>

  <div class="controls">
    <InputBits bind:value={searchQuery} placeholder="Search citations..." class="search-input" />

    <div class="filters">
      <select bind:value={selectedCategory} class="nes-select">
        <option value="all">All Categories</option>
        <option value="Criminal Procedure">Criminal Procedure</option>
        <option value="Civil Rights">Civil Rights</option>
        <option value="Constitutional Law">Constitutional Law</option>
        <option value="Criminal Defense">Criminal Defense</option>
      </select>

      <select bind:value={selectedCourt} class="nes-select">
        <option value="all">All Courts</option>
        <option value="Supreme Court">Supreme Court</option>
        <option value="Appellate Court">Appellate Court</option>
        <option value="District Court">District Court</option>
      </select>
    </div>

    <div class="auth-controls">
      {#if currentUser}
        <span class="user-info">👤 {currentUser.name}</span>
        <ButtonBits variant="ghost" size="sm" onclick={handleSignOut}>
Sign Out</ButtonBits>
      {:else}
        <ButtonBits variant="secondary" size="sm" onclick={() => showAuthDemo = true}>
          🔐 Demo Sign In
        </ButtonBits>
      {/if}
      <ButtonBits variant="primary">➕ ADD CITATION</ButtonBits>
    </div>
  </div>

  <div class="citations-grid">
    {#each citations as citation (citation.id)}
      <CardBits class="citation-card">
        <div class="citation-header">
          <div class="citation-title">
            <h3>{citation.title}</h3>
            <span class="citation-number">{citation.citation}</span>
          </div>
          <span class="relevance-badge nes-badge">
            <span class={citation.relevance === 'high' ? 'is-error' : citation.relevance === 'medium' ? 'is-warning' : 'is-success'}>
              {citation.relevance.toUpperCase()}
            </span>
          </span>
        </div>

        <div class="citation-meta">
          <div class="meta-item">
            <span class="meta-label">Court:</span>
            <span class="meta-value">{citation.court}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Year:</span>
            <span class="meta-value">{citation.year}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Category:</span>
            <span class="meta-value">{citation.category}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Cited:</span>
            <span class="meta-value">{citation.cited} times</span>
          </div>
        </div>

        <div class="key-points">
          <h4>Key Points:</h4>
          <div class="points-list">
            {#each citation.keyPoints as point}
              <span class="point-tag">{point}</span>
            {/each}
          </div>
        </div>

        <div class="citation-actions">
          <CitationsSaveButton
            {citation}
            size="sm"
            onsaved={(e) => console.log('Citation saved:', e.detail)}
            onerror={(e) => console.error('Save error:', e.detail)}
          />
          <ButtonBits variant="primary" size="sm">
            📖 Full Text
          </ButtonBits>
          <ButtonBits variant="ghost" size="sm">📋 Copy Citation</ButtonBits>
          <ButtonBits variant="ghost" size="sm">🔗 Related Cases</ButtonBits>
        </div>
      </CardBits>
    {/each}
  </div>
</div>

<!-- Demo Authentication Modal -->
{#if showAuthDemo}
  <div class="auth-modal-overlay" onclick={() => showAuthDemo = false}>
    <div class="auth-modal" onclick={(e) => e.stopPropagation()}>
      <div class="auth-header">
        <h3>🔐 Demo Authentication</h3>
        <button class="close-btn" onclick={() => showAuthDemo = false}>✕

      </div>
      <div class="auth-content">
        <p>Choose a demo user to test citation saving:</p>
        <div class="demo-users">
          {#each authDemo.getDemoUsers() as user}
            <button
              class="demo-user-btn"
              onclick={() => handleDemoSignIn(user.email)}
            >
              <div class="user-details">
                <strong>{user.name}</strong>
                <span class="user-role">{user.role}</span>
                <span class="user-email">{user.email}</span>
              </div>

          {/each}
        </div>
        <p class="demo-note">
          <em>Note: This is demo authentication. Replace with real auth system once built.</em>
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  .citations-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .header {
    background: linear-gradient(135deg, #4a90e2, #7ed321) !important;
    text-align: center;
  }

  .header .title {
    color: white !important;
    font-family: 'Press Start 2P', cursive !important;
    font-size: 1.25rem !important;
  }

  .header .subtitle {
    color: rgba(255, 255, 255, 0.9) !important;
    font-size: 0.75rem;
  }

  .controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .auth-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .user-info {
    color: var(--nier-text-primary);
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: rgba(126, 227, 33, 0.1);
    border: 1px solid rgba(126, 227, 33, 0.3);
    border-radius: 4px;
  }

  .search-input {
    flex: 1;
    min-width: 250px;
  }

  .filters {
    display: flex;
    gap: 0.5rem;
  }

  .nes-select {
    padding: 0.5rem;
    font-size: 0.75rem;
  }

  .citations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1rem;
  }

  .citation-card {
    background: rgba(26, 26, 46, 0.6) !important;
    border: 2px solid var(--n64-primary) !important;
    padding: 1rem;
    transition: all 0.3s ease;
  }

  .citation-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(74, 144, 226, 0.2);
    border-color: var(--n64-secondary) !important;
  }

  .citation-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .citation-title h3 {
    color: var(--nier-text-primary);
    font-family: 'Press Start 2P', cursive;
    font-size: 0.875rem;
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
  }

  .citation-number {
    color: var(--nier-text-secondary);
    font-size: 0.75rem;
    font-weight: bold;
  }

  .citation-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgba(15, 15, 35, 0.5);
    border-radius: 4px;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .meta-label {
    color: var(--nier-text-secondary);
    font-size: 0.625rem;
    font-weight: bold;
    text-transform: uppercase;
  }

  .meta-value {
    color: var(--nier-text-primary);
    font-size: 0.75rem;
  }

  .key-points {
    margin-bottom: 1rem;
  }

  .key-points h4 {
    color: var(--nier-text-primary);
    font-family: 'Press Start 2P', cursive;
    font-size: 0.625rem;
    margin: 0 0 0.5rem 0;
  }

  .points-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .point-tag {
    background: rgba(74, 144, 226, 0.2);
    color: var(--n64-primary);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.625rem;
    border: 1px solid rgba(74, 144, 226, 0.3);
  }

  .citation-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    .citations-grid {
      grid-template-columns: 1fr;
    }

    .controls {
      flex-direction: column;
      align-items: stretch;
    }

    .filters {
      justify-content: center;
    }

    .citation-meta {
      grid-template-columns: 1fr;
    }

    .citation-actions {
      justify-content: center;
    }
  }

  /* Demo Authentication Modal */
  .auth-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .auth-modal {
    background: rgba(26, 26, 46, 0.95);
    border: 2px solid var(--n64-primary);
    border-radius: 8px;
    padding: 1.5rem;
    width: 90vw;
    max-width: 500px;
    backdrop-filter: blur(10px);
  }

  .auth-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(74, 144, 226, 0.3);
  }

  .auth-header h3 {
    color: var(--nier-text-primary);
    font-family: 'Press Start 2P', cursive;
    font-size: 0.875rem;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--nier-text-secondary);
    cursor: pointer;
    font-size: 1.25rem;
    padding: 0.25rem;
  }

  .close-btn:hover {
    color: var(--n64-error);
  }

  .auth-content p {
    color: var(--nier-text-primary);
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .demo-users {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .demo-user-btn {
    background: rgba(15, 15, 35, 0.5);
    border: 1px solid rgba(74, 144, 226, 0.3);
    border-radius: 4px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
  }

  .demo-user-btn:hover {
    background: rgba(74, 144, 226, 0.2);
    border-color: var(--n64-primary);
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .user-details strong {
    color: var(--nier-text-primary);
    font-size: 0.875rem;
  }

  .user-role {
    color: var(--n64-secondary);
    font-size: 0.75rem;
    text-transform: capitalize;
  }

  .user-email {
    color: var(--nier-text-secondary);
    font-size: 0.625rem;
  }

  .demo-note {
    color: var(--nier-text-secondary);
    font-size: 0.75rem;
    text-align: center;
    margin: 0;
  }
</style>

